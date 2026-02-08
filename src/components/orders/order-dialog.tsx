'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Order, CreateOrderInput, OrderStatus } from '@/types/order';
import { Recipe, RECIPE_FORMATS } from '@/types/recipe';
import { Ingredient } from '@/types/inventory';
import { Pack } from '@/types/pack';
import { Plus, Trash, Calculator } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-client';
import { AppSettings } from '@/types/settings';
import { useRouter } from 'next/navigation';

interface OrderDialogProps {
  recipes: Recipe[];
  packs: Pack[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: Ingredient[];
  settings: AppSettings;
  initialData?: Order | null;
  onSuccess: () => void;
}

interface OrderItemRow {
  tempId: string;
  type: 'RECIPE' | 'PACK' | 'ACCESSORY';
  itemId: string; // can be recipeId, packId, or ingredientId
  format: number; // only for recipe
  quantity: number;
  unitPrice?: number;
}

export function OrderDialog({
  open,
  onOpenChange,
  recipes,
  packs,
  ingredients,
  settings,
  initialData,
  onSuccess,
}: OrderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [items, setItems] = useState<OrderItemRow[]>([]);

  // Financials
  const [totals, setTotals] = useState({
    totalAmount: 0,
    cogsMaterial: 0,
    cogsPackaging: 0,
    fees: 0.1, // Default from screenshot
    netProfit: 0,
    margin: 0,
  });

  // Input States for Calculation
  const [totalAmount, setTotalAmount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [otherFees, setOtherFees] = useState(0.1);
  const [source, setSource] = useState('Manuel');
  const [site, setSite] = useState('');

  const [packagingType, setPackagingType] = useState('Aucun');

  // Auto-select doypack based on first recipe format
  useEffect(() => {
    // Only auto-select if we have recipes and no manual selection
    const recipeItems = items.filter((i) => i.type === 'RECIPE');
    if (recipeItems.length > 0 && (packagingType === 'Aucun' || packagingType === '')) {
      const firstRecipe = recipeItems[0];
      const format = firstRecipe.format; // e.g., 25, 50, 100

      // Find matching doypack by capacity
      const doypacks = ingredients.filter(
        (i) => i.category === 'Packaging' && i.subtype === 'Doypack' && i.capacity === format
      );

      if (doypacks.length > 0) {
        console.log(`[PACKAGING] Auto-selecting doypack for ${format}g:`, doypacks[0].name);
        setPackagingType(doypacks[0].name);
      }
    }
  }, [items, ingredients, packagingType]);

  // Calculate Packaging Cost
  useEffect(() => {
    console.log('[PACKAGING] Calculating cost for type:', packagingType);
    let pkgCost = 0;
    if (packagingType && packagingType !== 'Aucun') {
      // Find matching ingredient by name
      const match = ingredients.find((i) => i.name === packagingType && i.category === 'Packaging');
      console.log('[PACKAGING] Match found:', match);
      if (match) {
        pkgCost = (match.weightedAverageCost || 0) * (1 + settings.tvaPackaging / 100);
        console.log(
          '[PACKAGING] Calculated cost TTC:',
          pkgCost,
          '(HT:',
          match.weightedAverageCost,
          'TVA:',
          settings.tvaPackaging,
          '%)'
        );
      } else {
        console.warn('[PACKAGING] No match found for:', packagingType);
      }
    }

    setTotals((prev) => ({ ...prev, cogsPackaging: pkgCost }));
  }, [packagingType, ingredients, settings.tvaPackaging]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        // Populate if edit mode
        setItems(
          initialData.items.map((i) => ({
            tempId: Math.random().toString(),
            type: i.type,
            itemId:
              i.type === 'RECIPE'
                ? i.recipeId!
                : i.type === 'PACK'
                  ? i.packId!
                  : i.type === 'ACCESSORY'
                    ? i.ingredientId!
                    : '',
            format: i.format || 100,
            quantity: i.quantity,
            unitPrice: i.unitPriceSnapshot,
          }))
        );

        setTotalAmount(initialData.totalAmount || 0);
        setShippingCost(initialData.shippingCost || 0);
        setOtherFees(initialData.otherFees || 0.1);
        setPackagingType(initialData.packagingType || 'Aucun');
        setSource(initialData.source || 'Manuel');
        setSite((initialData as any).site || '');
        setTotals((prev) => ({ ...prev, fees: initialData.otherFees || 0.1 })); // ensure consistent
      } else {
        setItems([]);
        setTotalAmount(0);
        setShippingCost(0);
        setOtherFees(0.1);
        setPackagingType('Aucun');
        setSource('Manuel');
        setSite('');
        setTotals((prev) => ({ ...prev, fees: 0.1 }));
      }
    }
  }, [open, initialData]);

  // Calculation Effect
  useEffect(() => {
    // Calculate COGS Material
    let materialCost = 0;

    items.forEach((item) => {
      let unitCostTTC = 0;
      const tvaRecipe = 1 + settings.tvaIngredients / 100;
      const tvaAccessory = 1 + settings.tvaPackaging / 100; // 20% for Accessories/Packaging

      if (item.type === 'RECIPE') {
        const recipe = recipes.find((r) => r.id === item.itemId);
        if (recipe) {
          let costPerGram = recipe.totalIngredientCost || 0;

          // Fallback: Calculate live if missing
          if (costPerGram === 0 && recipe.items && recipe.items.length > 0) {
            const calculatedCost = recipe.items.reduce((sum, rItem) => {
              const ing = ingredients.find((i) => i.id === rItem.ingredientId);
              return sum + (rItem.percentage / 100) * (ing?.weightedAverageCost || 0);
            }, 0);
            costPerGram = calculatedCost;
          }

          // NOTE: costPerGram is in €/g, format is in g, so multiply directly (no ÷1000)
          // Material Cost HT, then apply TVA
          unitCostTTC = costPerGram * item.format * tvaRecipe;
        }
      } else if (item.type === 'PACK') {
        const pack = packs.find((p) => p.id === item.itemId);
        if (pack) {
          // Complex Pack Calculation: must split Recipe vs Packaging parts for precise VAT
          // 1. Recipes in Pack (5.5%)
          const rCostHT = pack.recipes.reduce((sum, pr) => {
            const r = recipes.find((rec) => rec.id === pr.recipeId);
            if (!r) return sum;
            let rCostPerGram = r.totalIngredientCost || 0;
            if (rCostPerGram === 0 && r.items) {
              rCostPerGram = r.items.reduce((s, ri) => {
                const ing = ingredients.find((i) => i.id === ri.ingredientId);
                return s + (ri.percentage / 100) * (ing?.weightedAverageCost || 0);
              }, 0);
            }
            return sum + rCostPerGram * (pr.format as number) * pr.quantity;
          }, 0);

          // 2. Packaging in Pack (20%)
          const pCostHT = pack.packaging.reduce((sum, pp) => {
            const ing = ingredients.find((i) => i.id === pp.ingredientId);
            return sum + (ing?.weightedAverageCost || 0) * pp.quantity;
          }, 0);

          unitCostTTC = rCostHT * tvaRecipe + pCostHT * tvaAccessory;
        }
      } else if (item.type === 'ACCESSORY') {
        const ing = ingredients.find((i) => i.id === item.itemId);
        if (ing) {
          unitCostTTC = (ing.weightedAverageCost || 0) * tvaAccessory;
        }
      }
      materialCost += unitCostTTC * item.quantity;
    });

    // Fees Calculation
    let urssaf = 0;
    let platformFees = 0;

    // URSSAF
    urssaf = totalAmount * (settings.urssafRate / 100);

    // Platform Fees
    if (source === 'Shopify') {
      platformFees =
        totalAmount * (settings.shopifyTransactionPercent / 100) + settings.shopifyFixedFee;
    }

    // Profit = Revenue - Costs
    const calculatedFees = urssaf + platformFees;
    const totalFees = calculatedFees + otherFees;
    const totalCosts = materialCost + totals.cogsPackaging + shippingCost + totalFees;

    const netProfit = totalAmount - totalCosts;
    const margin = totalAmount > 0 ? (netProfit / totalAmount) * 100 : 0;

    setTotals((prev) => ({
      ...prev,
      cogsMaterial: materialCost,
      netProfit,
      margin,
      fees: totalFees,
    }));
  }, [
    items,
    totals.cogsPackaging,
    totalAmount,
    shippingCost,
    otherFees,
    recipes,
    packs,
    ingredients,
    settings,
    source,
  ]);

  const handleAddItem = () => {
    const newItem: OrderItemRow = {
      tempId: `temp-${Date.now()}-${Math.random()}`,
      type: 'RECIPE',
      itemId: '',
      format: 100,
      quantity: 1,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (id: string, field: keyof OrderItemRow, value: any) => {
    setItems(items.map((i) => (i.tempId === id ? { ...i, [field]: value } : i)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.tempId !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    // Map OrderItemRow to backend expectation
    const itemsPayload = items.map((i) => ({
      type: i.type,
      recipeId: i.type === 'RECIPE' ? i.itemId : undefined,
      packId: i.type === 'PACK' ? i.itemId : undefined,
      ingredientId: i.type === 'ACCESSORY' ? i.itemId : undefined,
      format: i.format,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));

    const payload = {
      orderNumber: formData.get('orderNumber'),
      date: formData.get('date'),
      source: formData.get('source'),
      status: formData.get('status'),
      customerName: formData.get('customerName'),
      email: formData.get('email'),
      totalAmount: parseFloat(formData.get('totalAmount') as string) || 0,
      discountCode: formData.get('discountCode'),
      discountPercent: parseFloat(formData.get('discountPercent') as string) || 0,
      shippingCarrier: formData.get('shippingCarrier'),
      trackingNumber: formData.get('trackingNumber'),
      shippingCost: parseFloat(formData.get('shippingCost') as string) || 0,
      packagingType: packagingType === 'Aucun' ? undefined : packagingType,
      otherFees: parseFloat(formData.get('otherFees') as string) || 0,
      notes: formData.get('notes'),
      items: itemsPayload,
      site: site === 'NONE' ? '' : site, // Add site if managed
    };

    try {
      if (initialData && initialData.id) {
        await apiFetch(`/orders/${initialData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast({ title: 'Commande modifiée' });
      } else {
        await apiFetch('/orders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast({ title: 'Commande créée' });
      }
      onSuccess();
      onOpenChange(false);
      router.refresh();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle commande</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Header Details */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>N° commande</Label>
              <Input
                name="orderNumber"
                placeholder="N° Commande (ex: #1234)"
                defaultValue={initialData?.orderNumber}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                name="date"
                type="date"
                defaultValue={
                  initialData?.createdAt
                    ? new Date(initialData.createdAt).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select name="source" value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manuel">Manuel</SelectItem>
                  <SelectItem value="Shopify">Shopify</SelectItem>
                  <SelectItem value="Bazar">Bazar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select name="status" defaultValue={initialData?.status || OrderStatus.DRAFT}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OrderStatus.DRAFT}>Brouillon</SelectItem>
                  <SelectItem value={OrderStatus.PAID}>Payée</SelectItem>
                  <SelectItem value={OrderStatus.SHIPPED}>Expédiée</SelectItem>
                  <SelectItem value={OrderStatus.DELIVERED}>Livrée</SelectItem>
                  <SelectItem value={OrderStatus.REFUNDED}>Remboursée</SelectItem>
                  <SelectItem value={OrderStatus.CANCELLED}>Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2 col-span-1">
              <Label>Client</Label>
              <Input
                name="customerName"
                placeholder="Nom du client"
                defaultValue={initialData?.customerName}
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                placeholder="Email"
                defaultValue={initialData?.email}
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Total payé par client *</Label>
              <div className="relative">
                <Input
                  name="totalAmount"
                  type="number"
                  step="0.01"
                  defaultValue={initialData?.totalAmount}
                  onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground">€</span>
              </div>
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Code promo</Label>
              <div className="flex gap-2">
                <Input name="discountCode" placeholder="Code" />
                <div className="relative w-20">
                  <Input name="discountPercent" type="number" placeholder="%" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-2 col-span-1">
              <Label>Transporteur</Label>
              <Select
                name="shippingCarrier"
                defaultValue={initialData?.shippingCarrier || 'NO_CARRIER'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner transporteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO_CARRIER">Aucun</SelectItem>
                  <SelectItem value="Mondial Relay">Mondial Relay</SelectItem>
                  <SelectItem value="La Poste">La Poste</SelectItem>
                  <SelectItem value="Shop2Shop">Shop2Shop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Site</Label>
              <Select
                name="site"
                value={site || 'NONE'}
                onValueChange={(v) => setSite(v === 'NONE' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Aucun</SelectItem>
                  <SelectItem value="Boxtal">Boxtal</SelectItem>
                  <SelectItem value="La Poste">La Poste</SelectItem>
                  <SelectItem value="Mondial Relay">Mondial Relay</SelectItem>
                  <SelectItem value="Chronopost">Chronopost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-1">
              <Label>N° Suivi</Label>
              <Input name="trackingNumber" defaultValue={initialData?.trackingNumber} />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Coût livraison</Label>
              <Input
                name="shippingCost"
                type="number"
                step="0.01"
                defaultValue={initialData?.shippingCost}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Carton</Label>
              <Select name="packagingType" value={packagingType} onValueChange={setPackagingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aucun">Aucun</SelectItem>
                  {ingredients
                    .filter(
                      (i) =>
                        i.category === 'Packaging' &&
                        (i.subtype === 'Carton' || i.name.toLowerCase().includes('carton'))
                    )
                    .map((i) => (
                      <SelectItem key={i.id} value={i.name}>
                        {i.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Lignes de vente</Label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter
              </Button>
            </div>
            <div className="border rounded-md p-4 space-y-2 bg-muted/30 dark:bg-muted/10 min-h-[100px]">
              {items.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Ajoutez des produits à la commande
                </p>
              )}
              {items.map((item, idx) => (
                <div key={item.tempId} className="flex gap-2 items-center text-sm">
                  <Select
                    value={item.type}
                    onValueChange={(v) => updateItem(item.tempId, 'type', v)}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECIPE">Recette</SelectItem>
                      <SelectItem value="PACK">Pack</SelectItem>
                      <SelectItem value="ACCESSORY">Accessoire</SelectItem>
                    </SelectContent>
                  </Select>

                  {item.type === 'RECIPE' && (
                    <>
                      <Select
                        value={item.itemId}
                        onValueChange={(v) => updateItem(item.tempId, 'itemId', v)}
                      >
                        <SelectTrigger className="flex-1 min-w-[150px]">
                          <SelectValue placeholder="Recette..." />
                        </SelectTrigger>
                        <SelectContent>
                          {recipes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={item.format.toString()}
                        onValueChange={(v) => updateItem(item.tempId, 'format', parseInt(v))}
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECIPE_FORMATS.map((f) => (
                            <SelectItem key={f} value={f.toString()}>
                              {f}g
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {item.type === 'PACK' && (
                    <Select
                      value={item.itemId}
                      onValueChange={(v) => updateItem(item.tempId, 'itemId', v)}
                    >
                      <SelectTrigger className="flex-1 min-w-[200px]">
                        <SelectValue placeholder="Choisir un pack..." />
                      </SelectTrigger>
                      <SelectContent>
                        {packs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {item.type === 'ACCESSORY' && (
                    <Select
                      value={item.itemId}
                      onValueChange={(v) => updateItem(item.tempId, 'itemId', v)}
                    >
                      <SelectTrigger className="flex-1 min-w-[200px]">
                        <SelectValue placeholder="Choisir un accessoire..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients
                          .filter((i) => i.category === 'Accessoire')
                          .map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Input
                    type="number"
                    className="w-16"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.tempId, 'quantity', parseInt(e.target.value))}
                    min={1}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.tempId)}
                  >
                    <Trash className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Autres frais (€)</Label>
              <Input
                name="otherFees"
                type="number"
                step="0.01"
                defaultValue={initialData?.otherFees ?? 0.1}
                onChange={(e) => setOtherFees(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                name="notes"
                placeholder="Notes internes..."
                defaultValue={initialData?.notes}
              />
            </div>
          </div>

          {/* Footer Summary */}
          <div className="bg-muted/50 p-4 rounded-md border mt-4">
            <h4 className="text-sm font-semibold mb-4 text-foreground">Récapitulatif calculé</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total payé</div>
                <div className="font-medium text-foreground">{totalAmount.toFixed(2)} €</div>
              </div>
              <div>
                <div className="text-muted-foreground">COGS matière</div>
                <div className="font-medium text-foreground">
                  {totals.cogsMaterial.toFixed(2)} €
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">COGS packaging</div>
                <div className="font-medium text-foreground">
                  {totals.cogsPackaging.toFixed(2)} €
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Frais (Total)</div>
                <div className="font-medium text-foreground">{totals.fees.toFixed(2)} €</div>
                <div className="text-[10px] text-muted-foreground">
                  {((totalAmount * settings.urssafRate) / 100).toFixed(2)}€ URSSAF
                  {source === 'Shopify' &&
                    ` + ${((totalAmount * settings.shopifyTransactionPercent) / 100 + settings.shopifyFixedFee).toFixed(2)}€ Shopify`}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-end mt-4 pt-4 border-t border-border">
              <div>
                <div className="text-muted-foreground text-xs">Profit net</div>
                <div
                  className={`text-xl font-bold ${totals.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                >
                  {totals.netProfit.toFixed(2)} €
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-xs">Marge</div>
                <div
                  className={`text-xl font-bold ${totals.margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                >
                  {totals.margin.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
