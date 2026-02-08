import { AuditLog, AuditAction, AuditEntity, AuditSeverity, CreateAuditLogInput } from '@/types/audit';
import { db } from '@/lib/db';

export const AuditService = {
    async log(input: CreateAuditLogInput): Promise<AuditLog> {
        const newLog: AuditLog = {
            id: Math.random().toString(36).substring(2, 11),
            timestamp: new Date().toISOString(),
            actor: input.actor || { userId: 'system', displayName: 'System' },
            action: input.action,
            entity: input.entity,
            entityId: input.entityId,
            severity: input.severity || AuditSeverity.INFO,
            correlationId: input.correlationId,
            metadata: input.metadata
        };

        // Use 'append' semantics if supported, or upsert
        await db.upsert('audit-logs', newLog);
        return newLog;
    },

    async getLogs(filter?: {
        entity?: AuditEntity;
        action?: AuditAction;
        severity?: AuditSeverity;
        correlationId?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<AuditLog[]> {
        let logs = await db.readAll<AuditLog>('audit-logs');

        // Sort desc
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (filter) {
            logs = logs.filter(log => {
                if (filter.entity && log.entity !== filter.entity) return false;
                if (filter.action && log.action !== filter.action) return false;
                if (filter.severity && log.severity !== filter.severity) return false;
                if (filter.correlationId && log.correlationId !== filter.correlationId) return false;

                const date = new Date(log.timestamp);
                if (filter.startDate && date < filter.startDate) return false;
                if (filter.endDate && date > filter.endDate) return false;

                return true;
            });
        }

        if (filter?.limit) {
            logs = logs.slice(0, filter.limit);
        }

        return logs;
    }
};
