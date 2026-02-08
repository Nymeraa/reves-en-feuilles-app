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
    const { items, ...scalarData } = data as any;

    if (items && Array.isArray(items)) {
      // Transactional update for entities with items
      return prisma.$transaction(
        async (tx: any) => {
          let createData = { ...scalarData };
          let updateData = { ...scalarData };

          createData.items = { create: items };
          updateData.items = { deleteMany: {}, create: items };

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

    return (model as any).upsert({
      where: { id: data.id },
      create: data,
      update: data,
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
