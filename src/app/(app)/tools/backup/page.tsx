'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Download, Upload, Archive, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import { restoreBackupAction } from '@/actions/backup-actions'

export default function BackupPage() {
    const [file, setFile] = useState<File | null>(null)
    const [isRestoring, setIsRestoring] = useState(false)
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleRestore = async () => {
        if (!file) return
        setIsRestoring(true)
        setMessage(null)

        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await restoreBackupAction(formData)

            if (res.success) {
                setMessage({ type: 'success', text: res.message || 'Restore successful' })
                setOpen(false)
                setFile(null)
            } else {
                setMessage({ type: 'error', text: res.error || 'Restore failed' })
                setOpen(false)
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Restore failed unexpectedly' })
        } finally {
            setIsRestoring(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sauvegardes et Restauration</h2>
                <p className="text-slate-500">Gérez vos données : exportez tout ou restaurez une sauvegarde précédente.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-md flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {/* BACKUP */}
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                <Download className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Créer une sauvegarde (Export)</CardTitle>
                                <CardDescription>Télécharge un fichier ZIP contenant toutes vos données actuelles (commandes, stock, etc.).</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Button asChild className="bg-slate-900 hover:bg-slate-800">
                            <a href="/api/backup/download" download>
                                <Archive className="w-4 h-4 mr-2" />
                                Télécharger la sauvegarde (.zip)
                            </a>
                        </Button>
                    </CardContent>
                </Card>

                {/* RESTORE */}
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                                <RefreshCw className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg text-red-700">Restaurer une sauvegarde</CardTitle>
                                <CardDescription>ATTENTION : Cette action remplacera TOUTES vos données actuelles par celles du backup.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                        <div className="bg-red-50 border border-red-100 p-4 rounded-md text-sm text-red-800 mb-4">
                            <div className="font-semibold flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                Mode "Remplacement Total"
                            </div>
                            <ul className="list-disc pl-5 space-y-1 opacity-90">
                                <li>Toutes les données existantes seront effacées.</li>
                                <li>Une sauvegarde de sécurité automatique sera créée avant l'écrasement.</li>
                                <li>Assurez-vous que le fichier provient d'une source fiable.</li>
                            </ul>
                        </div>

                        <div className="grid gap-2">
                            <Label>Fichier de sauvegarde (.zip)</Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="file"
                                    accept=".zip"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="max-w-md"
                                />

                                <Dialog open={open} onOpenChange={setOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" disabled={!file || isRestoring}>
                                            Restaurer...
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="text-red-600 flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5" />
                                                Confirmation Requise
                                            </DialogTitle>
                                            <DialogDescription>
                                                Êtes-vous sûr de vouloir restaurer ce fichier ?
                                                <br /><br />
                                                <strong>{file?.name}</strong>
                                                <br /><br />
                                                Cette action est irréversible (sauf via restauration manuelle du backup de sécurité).
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                                            <Button variant="destructive" onClick={handleRestore} disabled={isRestoring}>
                                                {isRestoring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Confirmer et Remplacer Tout
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
