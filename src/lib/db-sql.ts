import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { EntityType, DbInterface } from './db/types';

const connectionString = process.env.DATABASE_URL;

// Singleton prisma client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (!globalForPrisma.prisma) {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for Supabase/Vercel (self-signed certs in chain)
  });
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({ adapter });
} else {
  prismaInstance = globalForPrisma.prisma;
}

export const prisma = prismaInstance;
export const isAvailable = true; // generated client is present

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Recursively converts 'undefined' to 'null' for Prisma compatibility.
 * Prisma rejects 'undefined' but accepts 'null' for optional fields.
 */
function sanitizeData(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) return data.map((item) => sanitizeData(item));
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      // Special case: don't sanitize nested Prisma relation objects like 'connect', 'create'
      // But we still want to sanitize values inside them.
      sanitized[key] = sanitizeData(data[key]);
    }
    return sanitized;
  }
  return data;
}

function getModel(entity: EntityType) {
  if (!prisma) throw new Error('Prisma not initialized');
  switch (entity) {
    case 'ingredients':
      return prisma.ingredient;
    case 'recipes':
      return prisma.recipe;
    case 'orders':
      return prisma.order;
    case 'packs':
      return prisma.pack;
    case 'suppliers':
      return prisma.supplier;
    // case 'settings': return prisma.settings; // Settings is weird, might need special handling
    case 'audit-logs':
      return prisma.auditLog;
    case 'activity-logs':
      return prisma.activityLog;
    case 'movements':
      return prisma.stockMovement;
    case 'recipe-versions':
      return prisma.recipeVersion;
    case 'pack-versions':
      return prisma.packVersion;
    default:
      throw new Error(`Unknown entity type: ${entity}`);
  }
}

function getModelName(entity: EntityType) {
  switch (entity) {
    case 'ingredients':
      return 'ingredient';
    case 'recipes':
      return 'recipe';
    case 'orders':
      return 'order';
    case 'packs':
      return 'pack';
    case 'suppliers':
      return 'supplier';
    case 'audit-logs':
      return 'auditLog';
    case 'activity-logs':
      return 'activityLog';
    case 'movements':
      return 'stockMovement';
    case 'recipe-versions':
      return 'recipeVersion';
    case 'pack-versions':
      return 'packVersion';
    default:
      throw new Error(`Unknown entity type: ${entity}`);
  }
}

const PRISMA_ORDER_FIELDS = [
  'id',
  'organizationId',
  'orderNumber',
  'customerName',
  'status',
  'manualTotal',
  'totalAmount',
  'totalCost',
  'createdAt',
  'updatedAt',
  'source',
  'email',
  'shippingCarrier',
  'trackingNumber',
  'shippingPrice',
  'shippingCost',
  'packagingType',
  'packagingId',
  'discountCode',
  'discountPercent',
  'notes',
  'feesUrssaf',
  'feesShopify',
  'feesOther',
  'feesTotal',
  'cogsMaterials',
  'cogsPackaging',
  'netProfit',
  'margin',
];

const PRISMA_ORDER_ITEM_FIELDS = [
  'id',
  'type',
  'name',
  'quantity',
  'recipeId',
  'packId',
  'ingredientId',
  'format',
  'versionNumber',
  'unitPriceSnapshot',
  'unitCostSnapshot',
  'unitMaterialCostSnapshot',
  'unitPackagingCostSnapshot',
  'totalPrice',
];

export const sqlDb: DbInterface = {
  async readAll<T>(entity: EntityType, orgId?: string): Promise<T[]> {
    const model = getModel(entity);
    const where = orgId ? { organizationId: orgId } : {};

    // Include all relations by default for compatibility with JSON full-load
    // This is expensive but ensures "readData" behavior
    let include: any = undefined;
    if (entity === 'recipes') include = { items: true };
    if (entity === 'packs') include = { items: true };
    if (entity === 'orders') include = { items: true };
    if (entity === 'movements') include = {}; // No includes needed usually?

    // For settings, different logic?
    if (entity === 'settings') {
      const s = await prisma.settings.findUnique({ where: { id: 'global' } });
      return s ? [s as unknown as T] : [];
    }

    return (model as any).findMany({ where, include }) as unknown as T[];
  },

  async getById<T>(entity: EntityType, id: string, orgId?: string): Promise<T | null> {
    const model = getModel(entity);

    if (entity === 'settings') {
      return prisma.settings.findUnique({ where: { id: 'global' } }) as unknown as T;
    }

    let include: any = undefined;
    if (entity === 'recipes') include = { items: true };
    if (entity === 'packs') include = { items: true };
    if (entity === 'orders') include = { items: true };

    const item = await (model as any).findUnique({ where: { id }, include });
    if (item && orgId && item.organizationId !== orgId && entity !== 'activity-logs') {
      // Activity logs validation might be looser or strict?
      // Current schema has organizationId on ActivityLog, so checks are fine.
      return null;
    }
    return item as T;
  },

  async upsert<T extends { id: string }>(entity: EntityType, data: T, orgId?: string): Promise<T> {
    const model = getModel(entity);

    if (entity === 'settings') {
      return prisma.settings.upsert({
        where: { id: 'global' },
        create: { ...(data as any), id: 'global' },
        update: data as any,
      }) as unknown as T;
    }

    // Special handling for relations (Recipe Items, Pack Items, Order Items)
    const sanitized = sanitizeData(data);
    const { items, ...scalarData } = sanitized;

    // Goal A: Convert scalar IDs to connects for top-level object
    if (sanitized.ingredientId && entity === 'movements') {
      sanitized.ingredient = { connect: { id: sanitized.ingredientId } };
      delete sanitized.ingredientId;
    }
    if (sanitized.sourceId && entity === 'movements' && sanitized.source === 'ORDER') {
      sanitized.order = { connect: { id: sanitized.sourceId } };
      // Keep sourceId as scalar as well? Usually Prisma prefers connect only if relation exists.
      // But we must NOT pass it as scalar if it's used for @relation fields in some Prisma versions.
      // Let's remove it to be safe and use connect.
      delete sanitized.sourceId;
    }
    if (sanitized.supplierId && entity === 'ingredients') {
      // NOTE: Our schema doesn't have a Supplier relation in Ingredient yet, just a string field.
      // If we add it later, we'd do: sanitized.supplier = { connect: { id: sanitized.supplierId } };
    }

    // TRANSACTIONAL UPDATE FOR ENTITIES WITH ITEMS
    if (items && Array.isArray(items)) {
      // Goal A: Convert scalar IDs to connects for items
      const itemsWithConnect = items.map((item: any) => {
        const newItem = { ...item };
        // ... itemsWithConnect logic remains the same ...
        if (newItem.ingredientId) {
          newItem.ingredient = { connect: { id: newItem.ingredientId } };
          delete newItem.ingredientId;
        }
        if (newItem.recipeId) {
          newItem.recipe = { connect: { id: newItem.recipeId } };
          delete newItem.recipeId;
        }
        if (newItem.packId) {
          newItem.pack = { connect: { id: newItem.packId } };
          delete newItem.packId;
        }
        if (newItem.orderId && entity === 'movements') {
          newItem.order = { connect: { id: newItem.orderId } };
          delete newItem.orderId;
        }

        // Whitelist for items if entity is orders
        if (entity === 'orders') {
          // Explicitly remove orderId for nested create - Prisma handles this link
          delete newItem.orderId;

          return Object.keys(newItem)
            .filter(
              (key) =>
                PRISMA_ORDER_ITEM_FIELDS.includes(key) ||
                ['ingredient', 'recipe', 'pack'].includes(key)
            )
            .reduce((obj: any, key) => {
              obj[key] = newItem[key];
              return obj;
            }, {});
        }

        return newItem;
      });

      // Whitelist for Order fields specifically (safety guard)
      let finalScalarData = scalarData;
      if (entity === 'orders') {
        finalScalarData = Object.keys(scalarData)
          .filter((key) => PRISMA_ORDER_FIELDS.includes(key))
          .reduce((obj: any, key) => {
            obj[key] = scalarData[key];
            return obj;
          }, {});
      }

      return prisma.$transaction(
        async (tx: any) => {
          let createData = { ...finalScalarData };
          let updateData = { ...finalScalarData };

          createData.items = { create: itemsWithConnect };
          updateData.items = { deleteMany: {}, create: itemsWithConnect };

          return (tx as any)[getModelName(entity)].upsert({
            where: { id: data.id },
            create: createData,
            update: updateData,
            include: { items: true },
          });
        },
        { timeout: 20000 }
      ) as unknown as T;
    }

    // Whitelist for singular upserts (StockMovements, etc.)
    let finalSanitized = sanitized;
    if (entity === 'orders') {
      finalSanitized = Object.keys(sanitized)
        .filter((key) => PRISMA_ORDER_FIELDS.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = sanitized[key];
          return obj;
        }, {});
    }

    return (model as any).upsert({
      where: { id: data.id },
      create: finalSanitized,
      update: finalSanitized,
    }) as unknown as T;
  },

  async delete(entity: EntityType, id: string, orgId?: string): Promise<void> {
    const model = getModel(entity);
    await (model as any).delete({ where: { id } });
  },

  async append<T>(entity: EntityType, data: T): Promise<T> {
    // Usually just create
    return this.upsert(entity, data as any);
  },
};
