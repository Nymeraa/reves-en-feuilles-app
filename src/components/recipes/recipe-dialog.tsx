'use client';

import { useState, useEffect } from 'react';
import { Ingredient } from '@/types/inventory';
import { Recipe, RecipeItem, RECIPE_FORMATS, RecipeFormat, RecipeStatus } from '@/types/recipe';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save } from 'lucide-react';
// import { saveRecipeFullAction, createRecipeAction } from '@/actions/recipe' // Removed
import { findMatchingPackaging } from '@/lib/packaging-logic';
import { useRouter } from 'next/navigation';

interface RecipeDialogProps {
  recipe?: Recipe;
  ingredients: Ingredient[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  readonly?: boolean;
}

export function RecipeDialog({
  recipe,
  ingredients,
  trigger,
  open,
  onOpenChange,
  readonly = false,
}: RecipeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isEdit = !!recipe;

  // Controlled Open
  const effectiveOpen = open !== undefined ? open : isOpen;
  const setEffectiveOpen = onOpenChange || setIsOpen;

  // Local State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RecipeStatus>(RecipeStatus.DRAFT);
  const [items, setItems] = useState<Partial<RecipeItem>[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});

  // Initialize on Open
  useEffect(() => {
    if (effectiveOpen && recipe) {
      setName(recipe.name);
      setDescription(recipe.description || '');
      setStatus(recipe.status);
      setItems(recipe.items.map((i) => ({ category: '', ...i }))); // Keep existing items
      setPrices((recipe.prices as Record<string, number>) || {});
    } else if (effectiveOpen && !recipe) {
      // Reset for Create
      setName('');
      setDescription('');
      setStatus(RecipeStatus.ACTIVE);
      setItems([]);
      setPrices({});
    }
  }, [effectiveOpen, recipe]);

  // Actions
  // For Create: We create the header first via server action, then we (ideally) switch to Edit mode or just save everything if we refactor.
  // simpler: If !isEdit, we have a "Create Header" step. If isEdit, we show full builder.
  // For this prototype: One big form. If !isEdit, we create on save? No, better to have a dedicated Create Step or auto-create.
  // Let's stick to the visual requirement: "Nouvelle Recette" modal shows just Name first? Or full?
  // Screenshot 4 Shows "Nouvelle Recette" with name, status, desc, composition(empty). So it's a full form!
  // We will use `saveRecipeFullAction` but we need an ID.
  // Strategy: If New, we create a temporary ID or we just pass data to a "createFull" action.
  // Let's use `saveRecipeFullAction` for edit, and make a `createRecipeFullAction` (or reuse createRecipeAction then update).
  // Actually, `createRecipeAction` needs to support full data to avoid 2 steps.
  // Re-using logic: We will assume we only Edit here. If new, we first show a small "Create" modal -> then open this?
  // User requested: "Nouvelle Recette" modal.
  // Let's make this modal handle both. If new, we don't have ID. We'll handle that.

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const fullData = {
      name,
      description,
      status,
      items: items
        .filter((i) => i.ingredientId && i.percentage)
        .map((i) => ({
          ingredientId: i.ingredientId,
          percentage: i.percentage,
        })),
      prices,
    };

    try {
      if (isEdit) {
        const res = await fetch(`/api/recipes/${recipe.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullData),
        });
        if (res.ok) {
          setEffectiveOpen(false);
          router.refresh();
        } else {
          console.error('Update failed');
        }
      } else {
        const res = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullData),
        });
        if (res.ok) {
          setEffectiveOpen(false);
          window.location.reload();
        } else {
          console.error('Create failed');
        }
      }
    } catch (error) {
      console.error('Network error', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper Cost Calc
  const totalPercentage = items.reduce((sum, item) => sum + (item.percentage || 0), 0);
  const isTotalValid = Math.abs(totalPercentage - 100) < 0.1;

  const calculateBatchCost = (format: number) => {
    // 1. Matierial Cost (Mix)
    const mixCost = items.reduce((total, item) => {
      const ingredient = ingredients.find((i) => i.id === item.ingredientId);
      if (!ingredient || !item.percentage) return total;
      const weight = (format * item.percentage) / 100;
      return total + weight * ingredient.weightedAverageCost; // Cost is likely per gram if stock is in grams. Verify unit consistency
    }, 0);

    // 2. Doypack Cost
    // Client-side lookup logic using SHARED LIB:
    const { ingredient: doypack, warning: doypackWarning } = findMatchingPackaging(
      ingredients,
      format,
      'Sachet'
    );
    const doypackCost = doypack ? doypack.weightedAverageCost || 0 : 0;

    // 3. Fixed Costs (Labor/Sticker) - Hardcoded for now or from Settings/Recipe
    const laborCost = recipe?.laborCost || 0.5; // Example Default
    const stickerCost = 0.1; // Example

    return {
      mix: mixCost,
      packaging: doypackCost,
      fixed: laborCost + stickerCost,
      total: mixCost + doypackCost + laborCost + stickerCost,
      doypackFound: !!doypack,
      doypackWarning,
    };
  };

  // Handlers
  const addItem = () => setItems([...items, { ingredientId: '', percentage: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, val: any) => {
    const ag = [...items];
    // @ts-ignore
    ag[idx][field] = val;
    setItems(ag);
  };

  return (
    <>
      {/* DEBUG: Render trigger OUTSIDE Dialog to verify visibility */}
      {/* <DialogTrigger asChild>{trigger}</DialogTrigger> 
                Workaround: DialogTrigger was failing to render. Using manual trigger.
            */}
      {trigger && (
        <div onClick={() => setEffectiveOpen(true)} className="inline-block cursor-pointer">
          {trigger}
        </div>
      )}
      {/*
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button>Fallback Recipe Trigger</Button>
                </DialogTrigger>
            )}
            */}
      <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-muted/30 dark:bg-background">
          <DialogHeader>
            <DialogTitle>
              {readonly
                ? 'Détail de la recette'
                : isEdit
                  ? 'Modifier la recette'
                  : 'Nouvelle recette'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
              <div className="grid gap-2">
                <Label>Nom *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  name="name"
                  required
                  disabled={readonly}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Statut</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as RecipeStatus)}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RecipeStatus.ACTIVE}>Actif</SelectItem>
                      <SelectItem value={RecipeStatus.DRAFT}>Brouillon</SelectItem>
                      <SelectItem value={RecipeStatus.ARCHIVED}>Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  {/* Lock checkbox placeholder */}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={readonly}
                />
              </div>
            </div>

            {/* Composition */}
            <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-semibold">Composition</Label>
                <div className="flex items-center gap-4">
                  <Badge variant={isTotalValid ? 'default' : 'destructive'}>
                    Total: {totalPercentage}%
                  </Badge>
                  {!readonly && (
                    <Button type="button" size="sm" variant="outline" onClick={addItem}>
                      <Plus className="w-4 h-4 mr-1" /> Ajouter
                    </Button>
                  )}
                </div>
              </div>

              {items.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Ajoutez des ingrédients...</p>
              )}

              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select
                    value={item.ingredientId}
                    onValueChange={(v) => updateItem(idx, 'ingredientId', v)}
                    disabled={readonly}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Ingrédient" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={item.percentage}
                    onChange={(e) => updateItem(idx, 'percentage', parseFloat(e.target.value))}
                    className="w-24"
                    min="0"
                    max="100"
                    disabled={readonly}
                  />
                  <span className="text-sm">%</span>
                  {!readonly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Cost Simulation */}
            <div className="bg-card p-4 rounded-lg border shadow-sm space-y-2">
              <Label className="font-semibold">Coût matière estimé</Label>
              <div className="grid grid-cols-5 gap-2 pt-2">
                {RECIPE_FORMATS.slice(0, 5).map((f) => {
                  const costs = calculateBatchCost(f);
                  return (
                    <div key={f} className="text-center p-2 bg-muted/50 rounded border">
                      <div className="text-xs text-muted-foreground">{f}g</div>
                      <div className="font-bold text-foreground">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(costs.total)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Mix: {costs.mix.toFixed(2)} | Pkg: {costs.packaging.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
              <Label className="font-semibold">Prix de vente TTC & Marge</Label>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {RECIPE_FORMATS.slice(0, 6).map((f) => {
                  const costs = calculateBatchCost(f);
                  const cost = costs.total;

                  const price = prices[f] || 0;
                  // Margin: (Price - Cost) / Price
                  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                  const profit = price - cost;

                  return (
                    <div key={f} className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-bold text-foreground">{f}g</span>
                        <span className="text-xs text-muted-foreground">
                          Coût: {cost.toFixed(2)}€
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase">
                            Prix Vente
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              value={prices[f] || ''}
                              onChange={(e) =>
                                setPrices({ ...prices, [f]: parseFloat(e.target.value) })
                              }
                              className="h-8 pl-5 text-sm"
                              disabled={readonly}
                            />
                            <span className="absolute left-1.5 top-2 text-xs text-muted-foreground">
                              €
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase">
                            Marge %
                          </Label>
                          <div
                            className={`flex items-center justify-center h-8 text-sm font-bold rounded border ${margin < 30 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'}`}
                          >
                            {margin.toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      <div className="text-center text-xs text-muted-foreground">
                        Profit: {profit > 0 ? '+' : ''}
                        {profit.toFixed(2)}€
                      </div>
                      {!costs.doypackFound && (
                        <div className="text-[10px] text-red-500 text-center">⚠ Pas de Sachet</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              {isEdit && (
                <Button type="button" variant="outline" asChild className="mr-auto">
                  <a href={`/recipes/${recipe.id}/print`} target="_blank">
                    Imprimer Fiche
                  </a>
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setEffectiveOpen(false)}>
                {readonly ? 'Fermer' : 'Annuler'}
              </Button>
              {!readonly && (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isLoading ? 'En cours...' : isEdit ? 'Enregistrer' : 'Créer'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
