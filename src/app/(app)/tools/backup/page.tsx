'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Download,
  Upload,
  FileJson,
  FileArchive,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BackupPage() {
  const router = useRouter();
  const [selectedEntity, setSelectedEntity] = useState<string>('ingredients');
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [mode, setMode] = useState<'dryRun' | 'commit'>('dryRun');
  const [replace, setReplace] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDestructiveConfirmed, setIsDestructiveConfirmed] = useState(false);
  const [secondConfirm, setSecondConfirm] = useState('');

  const orgId = 'org-1'; // Shared across the app for now

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      window.location.href = `/api/export/csv?entity=${selectedEntity}&organizationId=${orgId}`;
    } finally {
      setIsExporting(false);
    }
  };

  const handleGlobalExport = async (format: 'zip' | 'json') => {
    setIsExporting(true);
    try {
      window.location.href = `/api/export/global?format=${format}&organizationId=${orgId}`;
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setReport(null);
      setError(null);
    }
  };

  const handleRestore = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier.');
      return;
    }

    if (mode === 'commit' && confirm !== 'RESTORE') {
      setError('Veuillez saisir "RESTORE" pour confirmer la restauration.');
      return;
    }

    if (mode === 'commit' && replace) {
      if (!isDestructiveConfirmed) {
        setError('Veuillez cocher la case de confirmation de suppression des données.');
        return;
      }
      if (secondConfirm !== 'DELETE MY DATA') {
        setError('Veuillez saisir "DELETE MY DATA" pour confirmer le remplacement total.');
        return;
      }
    }

    setIsRestoring(true);
    setReport(null);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        const format = file.name.endsWith('.zip') ? 'zip' : 'json';

        // If JSON, we can parse it and send as object, but keeping it base64 for consistency in API
        let payload = base64;
        if (format === 'json' && base64) {
          try {
            const decoded = atob(base64);
            payload = JSON.parse(decoded);
          } catch (e) {
            // Fallback to base64 if parse fails
          }
        }

        const response = await fetch('/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: orgId,
            mode,
            format,
            payload,
            confirm,
            replace,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Erreur lors de la restauration');
        }

        setReport(result);
        if (mode === 'commit' && result.success) {
          router.refresh();
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Sauvegarde & Restauration
        </h2>
        <p className="text-slate-500 text-lg">
          Gérez l'export et l'import de vos données critiques.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EXPORT SECTION */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              Exportation
            </CardTitle>
            <CardDescription>Téléchargez vos données au format CSV, ZIP ou JSON.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Export par entité (CSV)</Label>
              <div className="flex gap-2">
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner une entité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingredients">Ingrédients</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                    <SelectItem value="accessories">Accessoires</SelectItem>
                    <SelectItem value="recipes">Recettes</SelectItem>
                    <SelectItem value="recipe_items">Détails Recettes</SelectItem>
                    <SelectItem value="packs">Packs</SelectItem>
                    <SelectItem value="pack_items">Détails Packs</SelectItem>
                    <SelectItem value="suppliers">Fournisseurs</SelectItem>
                    <SelectItem value="orders">Commandes</SelectItem>
                    <SelectItem value="order_items">Détails Commandes</SelectItem>
                    <SelectItem value="stock_movements">Mouvements Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExportCsv} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <Label>Export global</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleGlobalExport('zip')}
                  className="bg-slate-800 hover:bg-slate-900"
                  disabled={isExporting}
                >
                  <FileArchive className="w-4 h-4 mr-2" />
                  ZIP (Tout)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGlobalExport('json')}
                  disabled={isExporting}
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RESTORE SECTION */}
        <Card className="shadow-lg border-amber-200 bg-amber-50/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Upload className="w-5 h-5 text-amber-600" />
              Restauration
            </CardTitle>
            <CardDescription>Importez des données (Destructif en mode Commit).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Fichier (ZIP ou JSON)</Label>
              <Input
                id="file"
                type="file"
                accept=".zip,.json"
                onChange={handleFileChange}
                className="bg-white"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Mode Dry-Run</Label>
                <p className="text-xs text-slate-500">Calculer les changements sans écrire.</p>
              </div>
              <Switch
                checked={mode === 'dryRun'}
                onCheckedChange={(checked) => setMode(checked ? 'dryRun' : 'commit')}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Remplacer tout</Label>
                <p className="text-xs text-slate-500 italic font-medium text-amber-700">
                  DESTRUCTIF : Vide les tables avant l'import.
                </p>
              </div>
              <Switch checked={replace} onCheckedChange={setReplace} />
            </div>

            {replace && (
              <div className="p-3 bg-amber-100/50 rounded-lg border border-amber-300 space-y-3 animate-in zoom-in-95">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="destructive-confirm"
                    className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    checked={isDestructiveConfirmed}
                    onChange={(e) => setIsDestructiveConfirmed(e.target.checked)}
                  />
                  <Label
                    htmlFor="destructive-confirm"
                    className="text-xs text-amber-900 leading-tight"
                  >
                    Je comprends que cette opération est irrémédiable et supprimera toutes les
                    données existantes.
                  </Label>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-amber-800">
                    Confirmation finale
                  </Label>
                  <Input
                    placeholder='Tapez "DELETE MY DATA"'
                    value={secondConfirm}
                    onChange={(e) => setSecondConfirm(e.target.value)}
                    className="h-8 text-xs border-amber-300 bg-white"
                  />
                </div>
              </div>
            )}

            {mode === 'commit' && (
              <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1">
                <Label className="text-amber-800 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Confirmation requise
                </Label>
                <Input
                  placeholder='Tapez "RESTORE" pour confirmer'
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="border-amber-300 focus-visible:ring-amber-500"
                />
              </div>
            )}

            <Button
              className={`w-full ${mode === 'commit' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-700 hover:bg-slate-800'}`}
              disabled={
                isRestoring ||
                !file ||
                (mode === 'commit' &&
                  (confirm !== 'RESTORE' ||
                    (replace && (!isDestructiveConfirmed || secondConfirm !== 'DELETE MY DATA'))))
              }
              onClick={handleRestore}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restauration...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {mode === 'dryRun' ? 'Simuler la restauration' : 'Exécuter la restauration'}
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {report && (
              <Alert
                className={
                  report.success
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }
              >
                {report.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <AlertTitle className={report.success ? 'text-emerald-800' : 'text-amber-800'}>
                  {report.dryRun ? 'Rapport Dry-Run' : 'Restauration Terminée'}
                </AlertTitle>
                <AlertDescription className="mt-2 text-sm">
                  <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-emerald-100 mb-2">
                    <div>
                      <div className="font-bold">{report.created}</div>
                      <div className="text-[10px] uppercase">Créés</div>
                    </div>
                    <div>
                      <div className="font-bold">{report.updated}</div>
                      <div className="text-[10px] uppercase">MàJ</div>
                    </div>
                    <div>
                      <div className="font-bold">{report.deleted ? 'OUI' : 'NON'}</div>
                      <div className="text-[10px] uppercase">Wipe</div>
                    </div>
                  </div>
                  {report.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-semibold text-xs text-amber-900 mb-1">
                        Erreurs ({report.errors.length}) :
                      </div>
                      <ul className="text-[10px] list-disc pl-4 max-h-24 overflow-y-auto space-y-1">
                        {report.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>
            1. **Exports** : Les fichiers CSV sont formatés pour être compatibles avec Excel (format
            US, dates ISO).
          </p>
          <p>
            2. **Restauration** : Utilisez de préférence le format **JSON** pour une restauration
            complète et fidèle. Le format ZIP/CSV est principalement destiné à l'archivage ou
            l'import partiel.
          </p>
          <p>
            3. **Dry-Run** : Toujours tester vos fichiers en mode simulation avant d'appliquer les
            changements.
          </p>
          <p className="font-semibold text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Attention : La restauration avec l'option "Remplacer tout" effacera TOUTES vos données
            actuelles (ingrédients, recettes, commandes...) avant d'importer le fichier.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
