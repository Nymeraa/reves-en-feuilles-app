'use client';

import { useState, useMemo } from 'react';
import { Pack, PackRecipeItem, PackPackagingItem } from '@/types/pack';
import { Recipe } from '@/types/recipe';
import { Ingredient } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  Plus,
  Save,
  ArrowLeft,
  Package as PackageIcon,
  ChefHat,
  Calculator,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface PackDetailProps {
  initialPack: Pack;
  recipes: Recipe[];
  ingredients: Ingredient[];
}

export function PackDetail({ initialPack, recipes, ingredients }: PackDetailProps) {
  const [pack, setPack] = useState<Pack>(initialPack);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const packagingIngredients = useMemo(() => {
    return ingredients.filter(
      (i) =>
        i.category?.toLowerCase().includes('packaging') ||
        i.category?.toLowerCase().includes('emballage')
    );
  }, [ingredients]);

  // Calculations
  const recipesCost = useMemo(() => {
    return pack.recipes.reduce((sum, item) => {
      const recipe = recipes.find((r) => r.id === item.recipeId);
      if (!recipe) return sum;
      // Find cost for specific format or estimate
      // Assuming format is in grams. We need the cost per gram of the recipe.
      // Simplified: Use recipe unitCost if available or calculate on fly.
      // For now, let's assume we fetch hydrated recipes or look them up.
      // Calculating recipe cost per gram based on its ingredients:
      const recipeTotalWeight = recipe.items.reduce((w, i) => w + i.percentage, 0); // usually 100 or total %
      // Wait, recipe items percentage is % of total.
      // Let's assume recipe cost is calculated elsewhere or we do it here.
      // We need ingredient costs.
      let costPer100g = 0;
      recipe.items.forEach((ri) => {
        const ing = ingredients.find((i) => i.id === ri.ingredientId);
        if (ing) {
          costPer100g += ri.percentage * (ing.weightedAverageCost / 1000); // pricePerUnit is usually per kg?
          // Ingredient: unit='kg', pricePerUnit -> Cost per kg.
          // percentage is grams in 100g usually? Or just %.
          // If percentage is %, then in 100g of recipe, we have X grams of ingredient.
          // Cost of X grams = (X / 1000) * pricePerKg.
        }
      });

      const itemWeight = typeof item.format === 'number' ? item.format : 0; // handle enum later
      const itemCost = (itemWeight / 100) * costPer100g;

      return sum + itemCost * item.quantity;
    }, 0);
  }, [pack.recipes, recipes, ingredients]);

  const packagingCost = useMemo(() => {
    return pack.packaging.reduce((sum, item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      if (!ing) return sum;
      // Packaging usually sold by unit.
      // If unit is 'pcs' or 'unit', price is per unit.
      // If unit is 'kg', price is per kg.
      // Let's assume packaging ingredients are set up as 'unit' or we handle conversion.
      // To be safe, if unit is 'kg' and we use 1 quantity (assuming 1 unit), we might be wrong.
      // But for prototypes, assume pricePerUnit is Price Per Item for packaging if category is Packaging.
      // OR checks unit.
      return sum + ing.weightedAverageCost * item.quantity;
    }, 0);
  }, [pack.packaging, ingredients]);

  const totalCost = recipesCost + packagingCost;
  const margin = pack.price > 0 ? ((pack.price - totalCost) / pack.price) * 100 : 0;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch(`/api/packs/${pack.id}`, {
        method: 'PUT',
        body: JSON.stringify(pack),
      });
      toast({ title: 'Pack sauvegardé' });
      router.refresh();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const addRecipe = () => {
    if (recipes.length === 0) return;
    setPack((p) => ({
      ...p,
      recipes: [
        ...p.recipes,
        {
          id: Math.random().toString(36).substr(7),
          recipeId: recipes[0].id,
          format: 100,
          quantity: 1,
        },
      ],
    }));
  };

  const addPackaging = () => {
    if (packagingIngredients.length === 0) return;
    setPack((p) => ({
      ...p,
      packaging: [
        ...p.packaging,
        {
          id: Math.random().toString(36).substr(7),
          ingredientId: packagingIngredients[0].id,
          quantity: 1,
        },
      ],
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/catalogue/packs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{pack.name}</h1>
            <Badge variant={pack.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {pack.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Recipes Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-600" />
                Composition (Recettes)
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addRecipe}>
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {pack.recipes.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 border rounded bg-slate-50"
                >
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Recette</label>
                      <Select
                        value={item.recipeId}
                        onValueChange={(v) => {
                          const newRecipes = [...pack.recipes];
                          newRecipes[idx].recipeId = v;
                          setPack({ ...pack, recipes: newRecipes });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {recipes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Format (g)</label>
                        <Input
                          type="number"
                          value={item.format as number}
                          onChange={(e) => {
                            const newRecipes = [...pack.recipes];
                            newRecipes[idx].format = parseFloat(e.target.value) || 0;
                            setPack({ ...pack, recipes: newRecipes });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Qté</label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newRecipes = [...pack.recipes];
                            newRecipes[idx].quantity = parseFloat(e.target.value) || 0;
                            setPack({ ...pack, recipes: newRecipes });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      const newRecipes = pack.recipes.filter((r) => r.id !== item.id);
                      setPack({ ...pack, recipes: newRecipes });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {pack.recipes.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Aucune recette dans ce pack.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Packaging Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-blue-600" />
                Emballage / Packaging
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addPackaging}>
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {pack.packaging.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 border rounded bg-slate-50"
                >
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Item</label>
                      <Select
                        value={item.ingredientId}
                        onValueChange={(v) => {
                          const newPack = [...pack.packaging];
                          newPack[idx].ingredientId = v;
                          setPack({ ...pack, packaging: newPack });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {packagingIngredients.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name} ({i.weightedAverageCost}€)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Qté</label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newPack = [...pack.packaging];
                          newPack[idx].quantity = parseFloat(e.target.value) || 0;
                          setPack({ ...pack, packaging: newPack });
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      const newPack = pack.packaging.filter((p) => p.id !== item.id);
                      setPack({ ...pack, packaging: newPack });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {pack.packaging.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  {packagingIngredients.length === 0
                    ? "Aucun ingrédient 'Packaging' trouvé dans l'inventaire."
                    : 'Aucun emballage ajouté.'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Financials */}
          <Card className="border-emerald-100 bg-emerald-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <Calculator className="w-5 h-5" />
                Rentabilité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Coût Matière (Recettes)</span>
                  <span>{recipesCost.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Coût Emballage</span>
                  <span>{packagingCost.toFixed(2)} €</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-medium">
                  <span>Coût Total</span>
                  <span>{totalCost.toFixed(2)} €</span>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prix de Vente (TTC)</label>
                  <Input
                    type="number"
                    value={pack.price}
                    onChange={(e) => setPack({ ...pack, price: parseFloat(e.target.value) || 0 })}
                    className="bg-white"
                  />
                </div>

                <div className="p-3 bg-white rounded border flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Marge Brute</span>
                  <Badge
                    variant={margin < 30 ? 'destructive' : 'default'}
                    className={margin >= 30 ? 'bg-emerald-600' : ''}
                  >
                    {margin.toFixed(1)} %
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase text-slate-500">Infos Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={pack.description || ''}
                  onChange={(e) => setPack({ ...pack, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
