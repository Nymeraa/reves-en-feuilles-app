'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MovementType, Ingredient } from '@/types/inventory';
import { useToast } from '@/components/ui/use-toast';

interface StockAdjustmentDialogProps {
  ingredient: Ingredient;
}

export function StockAdjustmentDialog({ ingredient }: StockAdjustmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MovementType>(MovementType.PURCHASE);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Determine unit and price label based on ingredient category
  const isPerUnit = ingredient.category === 'Packaging' || ingredient.category === 'Accessoire';
  const quantityUnit = isPerUnit ? 'unités' : 'g';
  const priceLabel = isPerUnit ? 'Prix unitaire (€/U)' : 'Prix (€/kg)';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      ingredientId: ingredient.id,
      type: formData.get('type'),
      quantity: Number(formData.get('quantity')),
      unitPrice: formData.get('price') ? Number(formData.get('price')) : undefined,
      reason: formData.get('reason'),
      notes: '', // Notes field not in form, using reason as reason
    };

    try {
      await apiFetch('/stock-movements', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast({ title: 'Stock adjusted' });
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to adjust stock',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Adjust Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock: {ingredient.name}</DialogTitle>
          <DialogDescription>Record a purchase, usage, loss, or correction.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <input type="hidden" name="ingredientId" value={ingredient.id} />

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select name="type" value={type} onValueChange={(v) => setType(v as MovementType)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select movement type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MovementType.PURCHASE}>Purchase (Add)</SelectItem>
                <SelectItem value={MovementType.PRODUCTION}>Production</SelectItem>
                <SelectItem value={MovementType.LOSS}>Loss (Remove)</SelectItem>
                <SelectItem value={MovementType.ADJUSTMENT}>Correction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Qty ({quantityUnit})
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              className="col-span-3"
              step="1"
              required
            />
          </div>

          {type === MovementType.PURCHASE && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                {priceLabel}
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                className="col-span-3"
                step={isPerUnit ? '0.01' : '0.0001'}
                min="0.01"
                placeholder="Required for Purchase"
                required={type === MovementType.PURCHASE}
              />
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Reason
            </Label>
            <Input id="reason" name="reason" className="col-span-3" placeholder="Optional note" />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Confirm Log'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
