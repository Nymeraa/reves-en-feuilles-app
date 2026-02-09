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
import { Supplier } from '@/types/inventory';

interface SupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Supplier | null;
  onSubmit: (data: FormData) => Promise<void>;
}

export function SupplierModal({ open, onOpenChange, initialData, onSubmit }: SupplierModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Using key to reset form on open/change? Or just uncontrolled inputs + defaults.
  // Let's use uncontrolled for FormData simplicity in submit handler wrapper

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    await onSubmit(formData);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Modifier fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input
              name="name"
              defaultValue={initialData?.name ?? ''}
              required
              placeholder="Ex: Thé Direct"
            />
          </div>

          <div className="space-y-2">
            <Label>Contact</Label>
            <Input
              name="contactEmail"
              defaultValue={initialData?.contactEmail ?? ''}
              placeholder="Email ou téléphone"
            />
            {/* Hidden phone input if needed or combined? Design shows just one field labeled "Contact"? 
                            Actually screenshot shows "Contact" placeholder "Email ou téléphone". 
                            We mapped it to email in type. Let's assume user puts email there.
                        */}
          </div>

          <div className="space-y-2">
            <Label>Site web</Label>
            <Input
              name="website"
              defaultValue={initialData?.website ?? ''}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Délai livraison (jours)</Label>
              <Input
                name="leadTime"
                type="number"
                defaultValue={initialData?.leadTime ?? undefined}
                placeholder="Ex: 5"
              />
            </div>
            <div className="space-y-2">
              <Label>Conditionnement par défaut</Label>
              <Input
                name="defaultConditioning"
                defaultValue={initialData?.defaultConditioning ?? ''}
                placeholder="Ex: sac 1kg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              name="notes"
              defaultValue={initialData?.notes ?? ''}
              placeholder="Notes internes..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {initialData ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
