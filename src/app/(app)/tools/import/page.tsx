'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ImportResult } from '@/services/import-service';

export default function ImportPage() {
  const [entity, setEntity] = useState('ingredients');
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [upsert, setUpsert] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const csvText = await file.text();
      const response = await fetch(`/api/import/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: 'org-1',
          csvText,
          dryRun,
          upsert,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l’import');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Import CSV Professionnel
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Importez massivement vos données avec validation stricte et support du format français.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Configuration Card */}
        <Card className="md:col-span-1 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
            <CardDescription>Paramétrez votre import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="entity">Type d'entité</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger id="entity">
                  <SelectValue placeholder="Choisir l'entité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingredients">Ingrédients</SelectItem>
                  <SelectItem value="packaging">Packaging</SelectItem>
                  <SelectItem value="accessories">Accessoires</SelectItem>
                  <SelectItem value="suppliers">Fournisseurs</SelectItem>
                  <SelectItem value="recipes">Recettes</SelectItem>
                  <SelectItem value="packs">Packs</SelectItem>
                  <SelectItem value="orders">Commandes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mode Simulation (Dry Run)</Label>
                  <p className="text-xs text-slate-500">Valider sans modifier la base</p>
                </div>
                <Switch checked={dryRun} onCheckedChange={setDryRun} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mise à jour (Upsert)</Label>
                  <p className="text-xs text-slate-500">Mettre à jour si le nom existe</p>
                </div>
                <Switch checked={upsert} onCheckedChange={setUpsert} />
              </div>
            </div>

            <div className="pt-4">
              <Label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    {file ? file.name : 'Cliquez pour uploader'}
                  </p>
                  <p className="text-xs text-slate-400">Format CSV (.csv)</p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </Label>
            </div>

            <Button className="w-full" disabled={!file || loading} onClick={handleImport}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement en cours...
                </>
              ) : dryRun ? (
                'Lancer la simulation'
              ) : (
                "Lancer l'import réel"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="md:col-span-2 shadow-sm border-slate-200 min-h-[400px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Résultats</CardTitle>
                <CardDescription>Rapport détaillé de l'opération</CardDescription>
              </div>
              {result && (
                <Badge variant={result.success ? 'default' : 'destructive'} className="px-3 py-1">
                  {result.success ? 'Terminé' : 'Erreur'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!result && !error && !loading && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p>En attente du lancement de l'import...</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-slate-500 animate-pulse">Validation des données...</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur d'import</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-6">
                {/* Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
                    <p className="text-2xl font-bold">{result.total}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 uppercase font-bold">Créés</p>
                    <p className="text-2xl font-bold text-green-700">{result.created}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 uppercase font-bold">MAJ</p>
                    <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <p className="text-xs text-amber-600 uppercase font-bold">Erreurs</p>
                    <p className="text-2xl font-bold text-amber-700">{result.errors.length}</p>
                  </div>
                </div>

                {/* Dry Run Alert */}
                {dryRun && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Mode Simulation</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Aucune donnée n'a été modifiée. Vérifiez les erreurs ci-dessous avant de
                      lancer l'import réel.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Errors Table */}
                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      Détail des erreurs
                    </h3>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-20">Ligne</TableHead>
                            <TableHead className="w-32">Champ</TableHead>
                            <TableHead>Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.errors.map((err, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{err.line}</TableCell>
                              <TableCell className="text-xs">{err.field || '-'}</TableCell>
                              <TableCell className="text-xs text-destructive">
                                {err.message}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {result.errors.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 text-green-600 bg-green-50 rounded-lg border border-green-100">
                    <CheckCircle2 className="w-12 h-12 mb-2" />
                    <p className="font-bold">Excellent ! Aucune erreur détectée.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
