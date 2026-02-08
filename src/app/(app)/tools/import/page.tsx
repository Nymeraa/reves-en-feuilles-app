'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Info, Upload, CheckCircle, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react'
import { validateImportCsv, executeImport } from '@/actions/import-actions'
import { ImportEntityType } from '@/services/import-service'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export default function ImportPage() {
    const [dataType, setDataType] = useState<ImportEntityType>('Ingrédients')
    const [file, setFile] = useState<File | null>(null)
    const [isAnalysing, setIsAnalysing] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [validation, setValidation] = useState<any>(null)
    const [importMode, setImportMode] = useState<'create' | 'upsert'>('create')
    const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleAnalyze = async () => {
        if (!file) return
        setIsAnalysing(true)
        setValidation(null)
        setResultMessage(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', dataType)

        try {
            const res = await validateImportCsv(formData)
            if (res.error) {
                setResultMessage({ type: 'error', text: res.error })
            } else {
                setValidation(res.validation)
            }
        } catch (e) {
            setResultMessage({ type: 'error', text: 'An error occurred during analysis' })
        } finally {
            setIsAnalysing(false)
        }
    }

    const handleConfirmImport = async () => {
        if (!validation || validation.validRows.length === 0) return
        setIsImporting(true)
        try {
            const res = await executeImport(dataType, validation.validRows, importMode)
            if (res.success) {
                setResultMessage({ type: 'success', text: `Successfully imported ${validation.validRows.length} ${dataType}` })
                setValidation(null)
                setFile(null)
            } else {
                setResultMessage({ type: 'error', text: res.error || 'Import failed' })
            }
        } catch (e) {
            setResultMessage({ type: 'error', text: 'Import execution failed' })
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Import CSV</h2>
                <p className="text-slate-500">Importez vos ingrédients, packaging ou fournisseurs</p>
            </div>

            {resultMessage && (
                <div className={`p-4 rounded-md flex items-center gap-3 ${resultMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {resultMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {resultMessage.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="py-4 border-b bg-slate-50/50">
                        <CardTitle className="text-base font-semibold">1. Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="py-6 space-y-6">
                        <div className="space-y-2">
                            <Label>Type de données</Label>
                            <Select value={dataType} onValueChange={(v) => setDataType(v as ImportEntityType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ingrédients">Ingrédients</SelectItem>
                                    <SelectItem value="Packaging">Packaging</SelectItem>
                                    <SelectItem value="Accessoires">Accessoires</SelectItem>
                                    <SelectItem value="Fournisseurs">Fournisseurs</SelectItem>
                                    <SelectItem value="Recettes">Recettes</SelectItem>
                                    <SelectItem value="Packs">Packs</SelectItem>
                                    <SelectItem value="Commandes">Commandes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Fichier CSV</Label>
                            {!file ? (
                                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => document.getElementById('csv-file')?.click()}>
                                    <input
                                        id="csv-file"
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={e => {
                                            if (e.target.files?.[0]) {
                                                setFile(e.target.files[0])
                                                setValidation(null)
                                                setResultMessage(null)
                                            }
                                        }}
                                    />
                                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <div className="text-sm font-medium text-slate-900">Sélectionner un fichier</div>
                                    <div className="text-xs text-slate-500">.csv uniquement</div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-slate-50 border rounded-md p-3">
                                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                                        <FileIcon className="w-4 h-4 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{file.name}</div>
                                        <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setFile(null)}>✖</Button>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleAnalyze}
                            disabled={!file || isAnalysing}
                            className="w-full bg-slate-900"
                        >
                            {isAnalysing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isAnalysing ? 'Analyse...' : '2. Analyser le fichier'}
                        </Button>
                    </CardContent>
                </Card>

                {validation && (
                    <Card className="h-fit">
                        <CardHeader className="py-4 border-b bg-slate-50/50">
                            <CardTitle className="text-base font-semibold flex items-center justify-between">
                                3. Résultat Analyse
                                {validation.isValid ?
                                    <Badge className="bg-emerald-600">Valide</Badge> :
                                    <Badge variant="destructive">Erreurs détectées</Badge>
                                }
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                    <div className="text-sm text-emerald-700 font-medium">Lignes Valides</div>
                                    <div className="text-2xl font-bold text-emerald-800">{validation.validRows.length}</div>
                                </div>
                                <div className={`p-4 rounded-lg border ${validation.invalidRows.length > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className={`text-sm font-medium ${validation.invalidRows.length > 0 ? 'text-red-700' : 'text-slate-600'}`}>Erreurs</div>
                                    <div className={`text-2xl font-bold ${validation.invalidRows.length > 0 ? 'text-red-800' : 'text-slate-700'}`}>{validation.invalidRows.length}</div>
                                </div>
                            </div>

                            {validation.invalidRows.length > 0 && (
                                <div className="border rounded-md max-h-[300px] overflow-y-auto bg-white">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-left font-medium text-slate-600">Ligne</th>
                                                <th className="p-2 text-left font-medium text-slate-600">Erreur(s)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {validation.invalidRows.map((err: any, idx: number) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="p-2 align-top text-slate-500 font-mono text-xs truncate max-w-[150px]">
                                                        {JSON.stringify(err.row)}
                                                    </td>
                                                    <td className="p-2 text-red-600 text-xs">
                                                        {err.errors.join(', ')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {validation.validRows.length > 0 && (
                                <div className="space-y-4 pt-4 border-t">
                                    <RadioGroup value={importMode} onValueChange={(v: string) => setImportMode(v as 'create' | 'upsert')} disabled={validation.invalidRows.length > 0}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="create" id="r1" />
                                            <Label htmlFor="r1">Créer uniquement (Ignore doublons)</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="upsert" id="r2" />
                                            <Label htmlFor="r2">Mettre à jour existants (Upsert)</Label>
                                        </div>
                                    </RadioGroup>

                                    <Button
                                        className={`w-full ${validation.invalidRows.length > 0 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                        onClick={handleConfirmImport}
                                        disabled={isImporting || (validation.invalidRows.length > 0 && validation.validRows.length === 0)}
                                    >
                                        {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {validation.invalidRows.length > 0 ? 'Importer les lignes valides seulement' : 'Importer tout'}
                                    </Button>
                                    {validation.invalidRows.length > 0 && (
                                        <p className="text-xs text-center text-amber-600">Attention : {validation.invalidRows.length} lignes seront ignorées.</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

function FileIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
    )
}
