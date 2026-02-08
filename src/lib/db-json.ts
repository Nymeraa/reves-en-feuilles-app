import fs from 'fs';
import path from 'path';
import { Ingredient, StockMovement } from '../types/inventory';
import { Recipe, RecipeVersion } from '../types/recipe';
import { Pack, PackVersion } from '../types/pack';
import { Order } from '../types/order';
import { Supplier } from '../types/inventory';
import { EntityType, DbInterface } from './db/types';

export const DATA_DIR = path.join(process.cwd(), '.data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Low level file helpers
function getFilename(entity: EntityType): string {
  switch (entity) {
    case 'ingredients':
      return 'ingredients.json';
    case 'recipes':
      return 'recipes.json';
    case 'orders':
      return 'orders.json';
    case 'packs':
      return 'packs.json';
    case 'suppliers':
      return 'suppliers.json';
    case 'settings':
      return 'settings.json';
    case 'audit-logs':
      return 'audit-logs.json';
    case 'movements':
      return 'movements.json';
    case 'recipe-versions':
      return 'recipe-versions.json';
    case 'pack-versions':
      return 'pack-versions.json';
    case 'activity-logs':
      return 'activity.json'; // activity-service uses activity.json
    default:
      return `${entity}.json`;
  }
}

function readDataRaw<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (e) {
    console.error(`Failed to read ${filename}`, e);
    return defaultValue;
  }
}

function writeDataRaw<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Failed to write ${filename}`, e);
  }
}

// Export original primitives for backward compat if needed temporarily
export const readData = readDataRaw;
export const writeData = writeDataRaw;

export const jsonDb: DbInterface = {
  async readAll<T>(entity: EntityType, orgId?: string): Promise<T[]> {
    const filename = getFilename(entity);
    const data = readDataRaw<T[]>(filename, []);

    if (entity === 'settings') {
      // Special case: settings is object, not array
      const set = readDataRaw<T>(filename, {} as T);
      return [set];
    }

    if (orgId) {
      return (data as any[]).filter((item: any) => item.organizationId === orgId) as T[];
    }
    return data as T[];
  },

  async getById<T>(entity: EntityType, id: string, orgId?: string): Promise<T | null> {
    const items = await this.readAll<T>(entity, orgId);
    return items.find((item: any) => item.id === id) || null;
  },

  async upsert<T extends { id: string }>(entity: EntityType, data: T, orgId?: string): Promise<T> {
    const filename = getFilename(entity);

    if (entity === 'settings') {
      writeDataRaw(filename, data);
      return data;
    }

    const items = readDataRaw<any[]>(filename, []);
    const idx = items.findIndex((i) => i.id === data.id);

    if (idx >= 0) {
      items[idx] = data;
    } else {
      items.push(data);
    }

    writeDataRaw(filename, items);
    return data;
  },

  async delete(entity: EntityType, id: string, orgId?: string): Promise<void> {
    const filename = getFilename(entity);
    const items = readDataRaw<any[]>(filename, []);
    const newItems = items.filter((i) => i.id !== id);
    writeDataRaw(filename, newItems);
  },

  async append<T>(entity: EntityType, data: T): Promise<T> {
    return this.upsert(entity as any, data as any);
  },
};
