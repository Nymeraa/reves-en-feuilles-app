'use client';

import { useState, useEffect } from 'react';
import { useActionState } from 'react'; // React 19
// import { createIngredientAction, updateIngredientAction } from '@/actions/inventory';
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
  suppliers: initialSuppliers,
}: IngredientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>(initialSuppliers || []);
  const isEdit = !!ingredient;

  // Internal open state handling if not controlled
  const effectiveOpen = open !== undefined ? open : isOpen;
  const setEffectiveOpen = onOpenChange || setIsOpen;

  // Fetch suppliers if not provided
  useEffect(() => {
    if (effectiveOpen && (!initialSuppliers || initialSuppliers.length === 0)) {
      const fetchSuppliers = async () => {
        try {
          const res = await fetch('/api/suppliers');
          if (res.ok) {
            const result = await res.json();
            const supplierData = result.data || result;
            setLocalSuppliers(Array.isArray(supplierData) ? supplierData : []);
          }
        } catch (err) {
          console.error('Failed to fetch suppliers', err);
        }
      };
      fetchSuppliers();
    } else if (initialSuppliers) {
      setLocalSuppliers(initialSuppliers);
    }
  }, [effectiveOpen, initialSuppliers]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());

    // Normalize supplierId
    if (data.supplierId === 'NO_SUPPLIER' || data.supplierId === '') {
      data.supplierId = null;
    }

    try {
      if (isEdit) {
        // UPDATE via API
        const response = await fetch(`/api/inventory/${ingredient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setEffectiveOpen(false);
            window.location.reload();
          } else {
            console.error('Update failed logic');
          }
        } else {
          console.error('Update failed network');
        }
      } else {
        // CREATE via API
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setEffectiveOpen(false);
            window.location.reload();
          }
        } else {
          console.error('Create failed', await response.text());
        }
      }
    } catch (err) {
      console.error('Submit error', err);
    } finally {
      setIsLoading(false);
    }
  };

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

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={ingredient?.name ?? ''}
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
                  {localSuppliers &&
                    localSuppliers
                      .filter((s: Supplier) => s.status === 'ACTIVE')
                      .map((s: Supplier) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Slug</Label>
            <Input
              name="slug"
              defaultValue={ingredient?.slug ?? ''}
              placeholder="nom-de-l-ingredient"
              disabled={readonly}
            />
          </div>

          <div className="grid gap-2">
            <Label>URL d'achat fournisseur</Label>
            <Input
              name="supplierUrl"
              defaultValue={ingredient?.supplierUrl ?? ''}
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
              defaultValue={ingredient?.notes ?? ''}
              placeholder="Notes internes..."
              disabled={readonly}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEffectiveOpen(false)}>
              {readonly ? 'Fermer' : 'Annuler'}
            </Button>
            {!readonly && (
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading ? 'En cours...' : isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
