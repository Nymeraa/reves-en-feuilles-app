'use client';

import { useState, useEffect } from 'react';
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

  // Debug: verify movement count from API
  const [debugCount, setDebugCount] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/stock-movements')
      .then((res) => res.json())
      .then((data) => {
        console.log('[DEBUG] Stock Movements count:', data.count);
        setDebugCount(data.count);
      })
      .catch((err) => console.error('[DEBUG] Fetch failed:', err));
  }, []);

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
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground">{movements.length} mouvements enregistrés</p>
          {debugCount !== null && (
            <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
              Debug DB Count: {debugCount}
            </span>
          )}
        </div>
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
