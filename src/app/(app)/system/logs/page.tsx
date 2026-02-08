
import { AuditService } from '@/services/audit-service';
import { AuditLogTable } from '@/components/system/audit-log-table';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
    // Fetch initial logs, client side can refetch/filter
    // Or we pass all logs if size is small. For prototype, pass all.
    // In prod, use server searchParams.
    // Let's implement client-side filtering for responsiveness on this "internal tool".
    const logs = await AuditService.getLogs({ limit: 1000 });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Journal d{"'"}Audit</h1>
                <p className="text-muted-foreground">
                    Historique des actions critiques système (stock, commandes, recettes).
                </p>
            </div>

            <AuditLogTable initialLogs={logs} />
        </div>
    );
}
