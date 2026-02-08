'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Play, ShieldCheck, Database, RefreshCw } from 'lucide-react'
import { runAuditAction } from '@/actions/system'

interface AuditResult {
    check: string;
    status: string; // or 'PASS' | 'FAIL'
    message: string;
}

export default function AuditPage() {
    const [results, setResults] = useState<AuditResult[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const runAudit = async () => {
        setIsLoading(true)
        setResults([])
        try {
            const data = await runAuditAction()
            setResults(data)
        } catch (e) {
            console.error(e)
            setResults([{ check: 'System Error', status: 'FAIL', message: 'Unknown Error' }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Audit & Tests</h2>
                    <p className="text-slate-500">Vérification de l'intégrité du système et des règles métier</p>
                </div>
                <Button onClick={runAudit} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                    {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Lancer l'audit
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                            Règles Métier
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <p className="text-sm text-slate-600">Vérifie l'isolation des données, le verrouillage des coûts historiques, et la cohérence des stocks.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-purple-600" />
                            Intégrité Données
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <p className="text-sm text-slate-600">Recherche d'orphelins (recettes sans ingrédients) et d'anomalies de format.</p>
                    </CardContent>
                </Card>
            </div>

            {results.length > 0 && (
                <Card className="border-t-4 border-t-emerald-500">
                    <CardHeader>
                        <CardTitle>Résultats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {results.map((res, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                                    <div className="font-medium">{res.check}</div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm text-slate-600">{res.message}</div>
                                        <Badge variant={res.status === 'PASS' ? 'default' : 'destructive'} className={res.status === 'PASS' ? 'bg-emerald-600' : ''}>
                                            {res.status === 'PASS' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                            {res.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
