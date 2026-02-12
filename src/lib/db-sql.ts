import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { EntityType, DbInterface } from './db/types';
import { toPrismaOrderItem } from './prisma-mappers/order-item';
import { toPrismaStockMovement } from './prisma-mappers/stock-movement';
import { toPrismaIngredient } from './prisma-mappers/ingredient';

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
  'paidAt',
  'cancelledAt',
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
  'parcelWeightGrams',
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

const PRISMA_MOVEMENT_FIELDS = [
  'id',
  'organizationId',
  'type',
  'entityType',
  'source',
  'deltaQuantity',
  'unitPrice',
  'totalPrice',
  'targetStock',
  'reason',
  'createdAt',
];

export const sqlDb: DbInterface = {
  async readAll<T>(entity: EntityType, orgId?: string): Promise<T[]> {
    const model = getModel(entity);
    const where = orgId ? { organizationId: orgId } : {};

    // Include all relations by default for compatibility with JSON full-load
    // This is expensive but ensures "readData" behavior
    let include: any = undefined;
    if (entity === 'ingredients') include = { supplier: true };
    if (entity === 'recipes') include = { items: true };
    if (entity === 'packs') include = { items: true };
    if (entity === 'orders') include = { items: true };
    if (entity === 'movements') include = {}; // No includes needed usually?

    // For settings, different logic?
    if (entity === 'settings') {
      const s = await prisma.settings.findUnique({ where: { id: 'global' } });
      return s ? [s as unknown as T] : [];
    }

    try {
      return (await (model as any).findMany({ where, include })) as unknown as T[];
    } catch (error: any) {
      if (error.code === 'P2022') {
        const column = error.meta?.column || error.meta?.field || '(unknown)';
        console.error(`[Prisma P2022] Table "${entity}" is missing column: ${column}`);
        console.error(`[Prisma Context] Full Error:`, JSON.stringify(error, null, 2));
      }
      throw error;
    }
  },

  async getById<T>(entity: EntityType, id: string, orgId?: string): Promise<T | null> {
    const model = getModel(entity);

    if (entity === 'settings') {
      return prisma.settings.findUnique({ where: { id: 'global' } }) as unknown as T;
    }

    let include: any = undefined;
    if (entity === 'ingredients') include = { supplier: true };
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

    const sanitized = sanitizeData(data);

    // Use specific mappers for entities with relations to ensure schema compliance
    if (entity === 'movements') {
      const mapped = toPrismaStockMovement(sanitized);
      const modelName = getModelName(entity);
      // For movements, the mapper handles everything including relations as connect objects.
      // We still need to split items if they existed (though StockMovements don't usually have items).
      const { items, ...scalarData } = mapped;

      return prisma.$transaction(async (tx: any) => {
        let createData = { ...scalarData };
        let updateData = { ...scalarData };

        if (items && Array.isArray(items) && items.length > 0) {
          createData.items = { create: items };
          updateData.items = { deleteMany: {}, create: items };
        }

        return tx[modelName].upsert({
          where: { id: scalarData.id },
          create: createData,
          update: updateData,
        });
      }) as unknown as T;
    }

    if (entity === 'ingredients') {
      const mapped = toPrismaIngredient(sanitized);
      return (model as any).upsert({
        where: { id: mapped.id },
        create: mapped,
        update: mapped,
      }) as unknown as T;
    }

    // Goal A: Convert scalar IDs to connects for top-level object
    // (Movements handled by mapper above)

    // Now extract items and scalar data AFTER all top-level sanitization
    const { items, ...allScalarData } = sanitized;

    // Filter scalar data based on whitelist per entity
    let scalarData = allScalarData;
    if (entity === 'orders') {
      scalarData = Object.keys(allScalarData)
        .filter((key) => PRISMA_ORDER_FIELDS.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = allScalarData[key];
          return obj;
        }, {});
    }

    // TRANSACTIONAL UPDATE FOR ENTITIES WITH RELATIONAL ITEMS (Recipes, Packs, Orders)
    const entitiesWithRelationalItems = ['recipes', 'packs', 'orders'];
    if (items && Array.isArray(items) && entitiesWithRelationalItems.includes(entity)) {
      // Goal A: Convert scalar IDs to connects for items
      const itemsWithMappedData = items.map((item: any) => {
        const newItem = { ...item };

        // Whitelist for items if entity is orders
        if (entity === 'orders') {
          const mapped = toPrismaOrderItem(newItem);
          // Development Guard: Ensure no relation objects leaked through
          if (process.env.NODE_ENV === 'development') {
            const hasConnect = Object.values(mapped).some(
              (val) => val && typeof val === 'object' && ('connect' in val || 'create' in val)
            );
            if (hasConnect) {
              throw new Error(
                `[Prisma Guard] OrderItem contains nested relation objects: ${JSON.stringify(mapped)}`
              );
            }
          }
          return mapped;
        }

        // Default relation connect logic (Recipes, Packs)
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

        return newItem;
      });

      // Items mapping is already done above or for specific entities below
      const finalItems = itemsWithMappedData;

      return prisma.$transaction(
        async (tx: any) => {
          let createData = { ...scalarData };
          let updateData = { ...scalarData };

          createData.items = { create: itemsWithMappedData };
          updateData.items = { deleteMany: {}, create: itemsWithMappedData };

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
