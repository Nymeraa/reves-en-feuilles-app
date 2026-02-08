export type EntityType = 
  | 'ingredients'
  | 'recipes'
  | 'orders'
  | 'packs'
  | 'suppliers'
  | 'settings'
  | 'audit-logs'
  | 'movements'
  | 'recipe-versions'
  | 'pack-versions'
  | 'activity-logs';

export interface DbInterface {
  readAll<T>(entity: EntityType, orgId?: string): Promise<T[]>;
  getById<T>(entity: EntityType, id: string, orgId?: string): Promise<T | null>;
  upsert<T extends { id: string }>(entity: EntityType, data: T, orgId?: string): Promise<T>;
  delete(entity: EntityType, id: string, orgId?: string): Promise<void>;
  
  // Custom for logs/movements which are append-only usually
  append<T>(entity: EntityType, data: T): Promise<T>;
}
