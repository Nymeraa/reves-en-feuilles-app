
export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE', // Soft delete usually
    CONFIRM = 'CONFIRM',
    CANCEL = 'CANCEL',
    SHIP = 'SHIP',
    IMPORT = 'IMPORT',
    EXPORT = 'EXPORT', // Backup
    RESTORE = 'RESTORE',
    RECOMPUTE = 'RECOMPUTE',
    SETTINGS_CHANGE = 'SETTINGS_CHANGE'
}

export enum AuditEntity {
    INGREDIENT = 'INGREDIENT',
    PACKAGING = 'PACKAGING',
    RECIPE = 'RECIPE',
    RECIPE_VERSION = 'RECIPE_VERSION',
    PACK = 'PACK',
    PACK_VERSION = 'PACK_VERSION',
    ORDER = 'ORDER',
    STOCK_MOVEMENT = 'STOCK_MOVEMENT',
    SUPPLIER = 'SUPPLIER',
    IMPORT_JOB = 'IMPORT_JOB',
    BACKUP = 'BACKUP',
    SETTINGS = 'SETTINGS',
    SYSTEM = 'SYSTEM'
}

export enum AuditSeverity {
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

export interface AuditLog {
    id: string;
    timestamp: string; // ISO
    actor: {
        userId: string; // 'system' or 'user-id'
        displayName?: string;
    };
    action: AuditAction;
    entity: AuditEntity;
    entityId?: string;
    severity: AuditSeverity;
    correlationId?: string; // To group related events (e.g. orderId for confirm + stock moves)
    metadata?: Record<string, any>; // Flexible payload
}

export interface CreateAuditLogInput {
    action: AuditAction;
    entity: AuditEntity;
    entityId?: string;
    severity?: AuditSeverity; // Default INFO
    correlationId?: string;
    metadata?: Record<string, any>;
    actor?: {
        userId: string;
        displayName?: string;
    };
}
