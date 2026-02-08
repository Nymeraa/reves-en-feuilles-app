'use client';

import { useState } from 'react';
import { AppSettings } from '@/types/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Percent, DollarSign, Save } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

export default function SettingsClientPage({ settings }: { settings: AppSettings }) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      await apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      toast({ title: 'Paramètres mis à jour' });
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Échec de la mise à jour',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Paramètres</h2>
          <p className="text-muted-foreground">Configuration de l'application</p>
        </div>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      <Tabs defaultValue="fees">
        <TabsList className="mb-4">
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <Percent className="w-4 h-4" /> Frais & Commissions
          </TabsTrigger>
          <TabsTrigger value="tva" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> TVAx
          </TabsTrigger>
        </TabsList>

        {/* --- FRAIS & COMMISSIONS --- */}
        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Percent className="w-4 h-4 text-orange-600" />
                Frais & Commissions
              </CardTitle>
              <CardDescription>
                Ces frais sont déduits automatiquement du profit de chaque commande
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>URSSAF (%)</Label>
                  <Input
                    name="urssafRate"
                    defaultValue={settings.urssafRate}
                    type="number"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shopify (% transaction)</Label>
                  <Input
                    name="shopifyTransactionPercent"
                    defaultValue={settings.shopifyTransactionPercent}
                    type="number"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shopify (€ fixe)</Label>
                  <Input
                    name="shopifyFixedFee"
                    defaultValue={settings.shopifyFixedFee}
                    type="number"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Autres frais par défaut (€)</Label>
                  <Input
                    name="defaultOtherFees"
                    defaultValue={settings.defaultOtherFees}
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Example Box */}
              <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm">
                <h4 className="font-bold text-foreground mb-2">Exemple de calcul</h4>
                <div className="text-muted-foreground space-y-1">
                  <p className="font-medium">Pour une commande de 30€ sur Shopify :</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-xs opacity-90">
                    <li>
                      URSSAF : 30€ × {settings.urssafRate}% ={' '}
                      {((30 * settings.urssafRate) / 100).toFixed(2)}€
                    </li>
                    <li>
                      Shopify : 30€ × {settings.shopifyTransactionPercent}% +{' '}
                      {settings.shopifyFixedFee}€ ={' '}
                      {(
                        (30 * settings.shopifyTransactionPercent) / 100 +
                        settings.shopifyFixedFee
                      ).toFixed(2)}
                      €
                    </li>
                    <li>Autres frais : {settings.defaultOtherFees}€</li>
                    <li className="font-bold pt-1">
                      Total frais :{' '}
                      {(
                        (30 * settings.urssafRate) / 100 +
                        (30 * settings.shopifyTransactionPercent) / 100 +
                        settings.shopifyFixedFee +
                        settings.defaultOtherFees
                      ).toFixed(2)}
                      €
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TVA --- */}
        <TabsContent value="tva" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Taux de TVA
              </CardTitle>
              <CardDescription>
                Les prix sont saisis HT, la TVA est appliquée automatiquement pour l'affichage TTC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>TVA Ingrédients (%)</Label>
                  <Input
                    name="tvaIngredients"
                    defaultValue={settings.tvaIngredients}
                    type="number"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TVA Packaging & Accessoires (%)</Label>
                  <Input
                    name="tvaPackaging"
                    defaultValue={settings.tvaPackaging}
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm">
                <h4 className="font-bold text-foreground mb-2">Information</h4>
                <div className="text-muted-foreground space-y-1">
                  <ul className="list-disc pl-5 space-y-0.5 text-xs opacity-90">
                    <li>
                      Ingrédients (thés, infusions) : TVA réduite à {settings.tvaIngredients}%
                    </li>
                    <li>Packaging & Accessoires : TVA normale à {settings.tvaPackaging}%</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Section (Always Visible) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Save className="w-4 h-4" />
            Résumé de la configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <SummaryItem label="URSSAF" value={`${settings.urssafRate}%`} />
            <SummaryItem
              label="Shopify"
              value={`${settings.shopifyTransactionPercent}% + ${settings.shopifyFixedFee}€`}
            />
            <SummaryItem label="Autres frais" value={`${settings.defaultOtherFees}€`} />
            <SummaryItem label="TVA Ingrédients" value={`${settings.tvaIngredients}%`} />
            <SummaryItem label="TVA Packaging" value={`${settings.tvaPackaging}%`} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border rounded-md p-3 dark:border-border">
      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}
