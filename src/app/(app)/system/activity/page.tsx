import { ActivityService } from '@/services/activity-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function ActivityPage() {
    const logs = await ActivityService.getLogs('org-1', 100);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Journal d'activité</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Dernières actions système</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {logs.length === 0 ? (
                            <p className="text-sm text-slate-500">Aucune activité enregistrée.</p>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{log.message}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {log.entity} {log.entityId} • {log.user}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 text-right">
                                        <Badge variant={log.type === 'CREATE' ? 'default' : log.type === 'DELETE' ? 'destructive' : 'secondary'}>
                                            {log.type}
                                        </Badge>
                                        <p className="text-xs text-muted-foreground w-32">
                                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
