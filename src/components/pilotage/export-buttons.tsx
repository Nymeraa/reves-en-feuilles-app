'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function ExportButtons() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                <div>
                    <div className="font-semibold text-foreground">Commandes (Ventes)</div>
                    <div className="text-sm text-muted-foreground">Export détaillé des commandes et marges.</div>
                </div>
                <Button asChild variant="outline" className="gap-2 border-border hover:bg-muted">
                    <a href="/api/reports/export?type=sales" download="sales_report.csv">
                        <Download className="w-4 h-4" /> Télécharger CSV
                    </a>
                </Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                <div>
                    <div className="font-semibold text-foreground">Mouvements de Stock</div>
                    <div className="text-sm text-muted-foreground">Historique complet des mouvements de stock.</div>
                </div>
                <Button asChild variant="outline" className="gap-2 border-border hover:bg-muted">
                    <a href="/api/reports/export?type=inventory" download="stock_movements.csv">
                        <Download className="w-4 h-4" /> Télécharger CSV
                    </a>
                </Button>
            </div>
        </div>
    )
}
