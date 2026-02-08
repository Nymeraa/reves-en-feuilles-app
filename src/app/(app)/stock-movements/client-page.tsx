'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StockMovement, Ingredient } from '@/types/inventory';
import { MovementTable } from '@/components/inventory/movement-table';
import { MovementModal } from '@/components/inventory/movement-modal';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/api-client';

interface StockMovementsClientProps {
  movements: StockMovement[];
  ingredients: Ingredient[];
}

export default function StockMovementsClientPage({
  movements,
  ingredients,
}: StockMovementsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleAdd = () => {
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: FormData) => {
    const payload = {
      ingredientId: formData.get('ingredientId'),
      type: formData.get('type'),
      quantity: parseFloat(formData.get('quantity') as string),
      unitPrice: formData.get('unitPrice')
        ? parseFloat(formData.get('unitPrice') as string)
        : undefined,
      reason: formData.get('reason'),
      notes: formData.get('notes'),
    };

    try {
      await apiFetch('/stock-movements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast({ title: 'Mouvement enregistré' });
      router.refresh();
      setIsModalOpen(false);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  // Sort movements by date desc
  const sortedMovements = [...movements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mouvements de stock</h1>
        <p className="text-muted-foreground">{movements.length} mouvements enregistrés</p>
      </div>

      <MovementTable movements={sortedMovements} ingredients={ingredients} onAdd={handleAdd} />

      <MovementModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        ingredients={ingredients}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
