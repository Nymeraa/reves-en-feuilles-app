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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Ingredient } from '@/types/inventory';

interface CatalogueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Ingredient | null;
  onSubmit: (data: Partial<Ingredient>) => Promise<void>;
  category: 'Packaging' | 'Accessoire';
  types: string[];
}

export function CatalogueModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  category,
  types,
}: CatalogueModalProps) {
  const [formData, setFormData] = useState<Partial<Ingredient>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(
        initialData || {
          category: category,
          status: 'ACTIVE' as any,
          currentStock: 0,
          weightedAverageCost: 0,
          alertThreshold: 10,
          subtype: types[0] || '',
        }
      );
    }
  }, [open, initialData, category, types]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Modifier l'élément" : 'Nouvelle élément'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`Ex: ${category === 'Packaging' ? 'Sachet kraft 50g' : 'Boule à thé'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.subtype ?? undefined}
                onValueChange={(v) => setFormData({ ...formData, subtype: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format / Dimensions</Label>
              <Textarea
                value={formData.dimensions ?? ''}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                placeholder="Notes ou description courte..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prix unitaire HT (€)</Label>
              <Input
                type="number"
                step="0.001"
                value={formData.weightedAverageCost ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, weightedAverageCost: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Stock actuel</Label>
              <Input
                type="number"
                value={formData.currentStock ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Seuil d'alerte</Label>
              <Input
                type="number"
                value={formData.alertThreshold ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, alertThreshold: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            {/* Capacity only relevant for containers */}
            <div className="space-y-2">
              <Label>Contenance (g) (Optionnel)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.capacity ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>URL Fournisseur</Label>
            <Input
              value={formData.supplierUrl || ''}
              onChange={(e) => setFormData({ ...formData, supplierUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
