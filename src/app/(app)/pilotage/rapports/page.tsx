import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import { AnalyticsService } from '@/services/analytics-service'
import { ExportButtons } from '@/components/pilotage/export-buttons'

export default async function ReportsPage() {
    const summary = await AnalyticsService.getSummary('org-1');
    const date = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Rapports & Exports</h2>
                    <p className="text-muted-foreground">Analysez vos données et exportez-les</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Résumé de la période ({date})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground font-semibold uppercase">Chiffre d'affaires</div>
                            <div className="text-xl font-bold text-foreground">{summary.revenue.toFixed(2)} €</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground font-semibold uppercase">Profit Net</div>
                            <div className="text-xl font-bold text-foreground">{summary.profit.toFixed(2)} €</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground font-semibold uppercase">Marge Moyenne</div>
                            <div className="text-xl font-bold text-foreground">{summary.marginPercentage.toFixed(1)}%</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground font-semibold uppercase">Commandes</div>
                            <div className="text-xl font-bold text-foreground">{summary.orderCount}</div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground font-semibold uppercase">COGS Matières</div>
                            <div className="text-lg font-bold text-foreground">{summary.cogsMaterials.toFixed(2)} €</div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground font-semibold uppercase">COGS Packaging</div>
                            <div className="text-lg font-bold text-foreground">{summary.cogsPackaging.toFixed(2)} €</div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground font-semibold uppercase">COGS Expédition</div>
                            <div className="text-lg font-bold text-foreground">{summary.cogsShipping.toFixed(2)} €</div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground font-semibold uppercase">Frais</div>
                            <div className="text-lg font-bold text-foreground">{summary.cogsOther.toFixed(2)} €</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Export CSV
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ExportButtons />
                </CardContent>
            </Card>
        </div>
    )
}
