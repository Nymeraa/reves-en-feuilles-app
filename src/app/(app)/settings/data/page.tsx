'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Upload, AlertTriangle, FileJson } from 'lucide-react'

// Mock Data Exchange Actions
import { exportAllDataAction, importIngredientsAction } from '@/actions/data-exchange'

export default function DataSettingsPage() {
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)
        // Trigger server action to get JSON
        const blob = await exportAllDataAction();
        // In real app, we'd trigger a download. 
        // For now, we simulate success.
        setTimeout(() => setIsExporting(false), 1000)
        alert('Export downloaded (Simulated)')
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestion des Données</h2>
                <p className="text-muted-foreground">Exportez vos données ou importez des catalogues.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileJson className="w-5 h-5 text-blue-600" />
                        Sauvegarde Complète (JSON)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Téléchargez une archive JSON contenant toutes vos données (Recettes, Ingrédients, Commandes, Packs).
                        Utile pour la migration ou la sauvegarde locale.
                    </p>
                    <Button onClick={handleExport} disabled={isExporting} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        {isExporting ? 'Préparation...' : 'Exporter tout les données'}
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                        <Upload className="w-5 h-5" />
                        Import CSV (Ingrédients)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-3 bg-background rounded border border-orange-100 text-sm text-muted-foreground dark:border-orange-900/50">
                        <div className="font-semibold mb-1 text-foreground">Format requis:</div>
                        <code>Nom, Catégorie, Prix, Stock, Fournisseur</code>
                    </div>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <input type="file" className="text-sm" accept=".csv" />
                    </div>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                        <Upload className="w-4 h-4" /> Importer
                    </Button>
                </CardContent>
            </Card>

            <div className="p-4 rounded-md bg-red-50 border border-red-100 flex items-start gap-3 dark:bg-red-950/20 dark:border-red-900/50">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 dark:text-red-400" />
                <div>
                    <h4 className="text-sm font-semibold text-red-900 dark:text-red-300">Zone de Danger</h4>
                    <p className="text-sm text-red-700 dark:text-red-400">La suppression des données est irréversible. Contactez l'administrateur pour réinitialiser le compte.</p>
                </div>
            </div>
        </div>
    )
}
