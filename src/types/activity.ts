export enum ActivityType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SYSTEM = 'SYSTEM',
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  type: ActivityType;
  entity: string; // 'Order', 'Ingredient', 'Pack'
  entityId: string;
  message: string;
  user?: string; // Mock user
  timestamp: Date;
}
