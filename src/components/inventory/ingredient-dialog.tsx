'use client';

import { useState, useEffect } from 'react';
import { useActionState } from 'react'; // React 19
import { createIngredientAction, updateIngredientAction } from '@/actions/inventory'; // We need to export updateIngredientAction
import { Ingredient, Supplier } from '@/types/inventory';
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
import { Plus } from 'lucide-react';

interface IngredientDialogProps {
  ingredient?: Ingredient;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  readonly?: boolean;
  suppliers?: Supplier[]; // List of available suppliers
}

const CATEGORIES = [
  'Thé Vert',
  'Thé Noir',
  'Thé Blanc',
  'Rooibos',
  'Infusion',
  'Fleur',
  'Fruit',
  'Épice',
  'Plante',
  'Autre',
];

export function IngredientDialog({
  ingredient,
  trigger,
  open,
  onOpenChange,
  readonly = false,
  suppliers = [],
}: IngredientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isEdit = !!ingredient;
  const action = isEdit ? updateIngredientAction.bind(null, ingredient.id) : createIngredientAction;
  const [state, formAction] = useActionState(action, null);

  // Internal open state handling if not controlled
  const effectiveOpen = open !== undefined ? open : isOpen;
  const setEffectiveOpen = onOpenChange || setIsOpen;

  // Close on success
  useEffect(() => {
    if (state?.success && effectiveOpen) {
      setEffectiveOpen(false);
    }
  }, [state, effectiveOpen, setEffectiveOpen]);

  return (
    <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readonly
              ? "Détail de l'ingrédient"
              : isEdit
                ? "Modifier l'ingrédient"
                : 'Nouvel ingrédient'}
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={ingredient?.name}
              placeholder="Ex: Thé vert Sencha"
              required
              disabled={readonly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Catégorie</Label>
              <Select
                name="category"
                defaultValue={ingredient?.category || 'Autre'}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Fournisseur</Label>
              <Select
                name="supplierId"
                defaultValue={ingredient?.supplierId || 'NO_SUPPLIER'}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO_SUPPLIER">Aucun</SelectItem>
                  {suppliers
                    .filter((s) => s.status === 'ACTIVE')
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>URL d'achat fournisseur</Label>
            <Input
              name="supplierUrl"
              defaultValue={ingredient?.supplierUrl}
              placeholder="https://..."
              disabled={readonly}
            />
          </div>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Stock actuel (g)</Label>
                <Input name="initialStock" type="number" defaultValue={0} />
              </div>
              <div className="grid gap-2">
                <Label>CMP HT (€/kg)</Label>
                <Input name="initialCost" type="number" step="0.01" defaultValue={0} />
                <p className="text-xs text-muted-foreground">Sera converti en €/g</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              {/* Show stock read-only in Edit */}
              {isEdit && (
                <div>
                  <Label>Stock actuel (g)</Label>
                  <Input disabled value={ingredient.currentStock} className="bg-muted" />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Seuil d'alerte (g)</Label>
              <Input
                name="alertThreshold"
                type="number"
                defaultValue={ingredient?.alertThreshold || 100}
                disabled={readonly}
              />
            </div>
          </div>

          {isEdit && (
            <div className="grid gap-2">
              <Label>CMP HT (€/kg)</Label>
              <div className="flex items-center gap-2">
                <Input
                  disabled
                  value={(ingredient.weightedAverageCost * 1000).toFixed(2)}
                  className="bg-muted"
                />
                <span className="text-sm text-muted-foreground">(Calculé auto)</span>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              name="notes"
              defaultValue={ingredient?.notes}
              placeholder="Notes internes..."
              disabled={readonly}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEffectiveOpen(false)}>
              {readonly ? 'Fermer' : 'Annuler'}
            </Button>
            {!readonly && (
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
