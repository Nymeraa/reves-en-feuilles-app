'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { columns } from '@/components/orders/columns';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Order } from '@/types/order';
import { Recipe } from '@/types/recipe';
import { Pack } from '@/types/pack';
import { Ingredient } from '@/types/inventory';
import { OrderDialog } from '@/components/orders/order-dialog';

import { AppSettings } from '@/types/settings';

interface OrdersClientProps {
  data: Order[];
  recipes: Recipe[];
  packs: Pack[];
  ingredients: Ingredient[];
  settings: AppSettings;
}

export default function OrdersClientPage({
  data,
  recipes,
  packs,
  ingredients,
  settings,
}: OrdersClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Commandes</h2>
          <p className="text-muted-foreground">{(data || []).length} commandes enregistrées</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-emerald-800 hover:bg-emerald-900"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nouvelle commande
        </Button>
      </div>

      <DataTable columns={columns} data={data || []} />

      <OrderDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        recipes={recipes}
        packs={packs}
        ingredients={ingredients}
        settings={settings}
        onSuccess={() => {
          setIsDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
