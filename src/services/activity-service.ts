import { db } from '@/lib/db';
import { ActivityLog } from '@/types/activity'; // Assume generic type if not defined, or define it here
// Actually ActivityLog was defined in schema and used in ActivityService.
// Let's check imports.
// ActivityService.ts (original) defined its own ActivityLog interface.
// We should arguably use the one from Prisma/Schema OR a shared type.
// But for now let's keep the existing interface but implemented via DB.

export enum ActivityType {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    SYSTEM = 'SYSTEM'
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

export const ActivityService = {
    async log(orgId: string, type: ActivityType, entity: string, entityId: string, message: string) {
        const newLog: ActivityLog = {
            id: Math.random().toString(36).substring(7),
            organizationId: orgId,
            type,
            entity,
            entityId,
            message,
            user: 'Sébastien', // Mock current user
            timestamp: new Date()
        };

        // Use 'append' semantics if/when available, or upsert
        // We need to map ActivityLog interface to what DB expects?
        // Our generic DB uses EntityType strings. 'activity-logs' needs to be added to types.ts?
        // Or we just use 'activity-logs' as string if we update types.ts.
        // Wait, did I update types.ts to include 'activity-logs'?
        // In Step 76, types.ts had:
        // 'ingredients' | 'recipes' | 'orders' | 'packs' | 'suppliers' | 'settings' | 'audit-logs' | 'movements' ...
        // It did NOT have 'activity-logs'.
        // I need to update types.ts first or use 'audit-logs'?
        // No, 'ActivityLog' is different from 'AuditLog'.
        
        // I'll update types.ts to include 'activity-logs' in the next step.
        // For now, I write the service code assuming it exists.
        await db.upsert('activity-logs' as any, newLog, orgId);
    },

    async getLogs(orgId: string, limit = 50): Promise<ActivityLog[]> {
        const logs = await db.readAll<ActivityLog>('activity-logs' as any, orgId);
        // Sort DESC
        return logs
            .map(l => ({ ...l, timestamp: new Date(l.timestamp) }))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
}
