'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Edit2, Eye } from 'lucide-react';
import { IngredientDialog } from './ingredient-dialog';
import { StockAdjustmentDialog } from './stock-adjustment-dialog';
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button';
import { Ingredient } from '@/types/inventory';

interface IngredientActionsProps {
  ingredient: Ingredient;
}

export function IngredientActions({ ingredient }: IngredientActionsProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/inventory/${id}`, {
        method: 'DELETE',
      });
      router.refresh();
      return { success: true };
    } catch (e: any) {
      return { error: e.message || 'Failed to delete' };
    }
  };

  return (
    <div className="flex items-center gap-2">
      <IngredientDialog
        ingredient={ingredient}
        readonly={true}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-blue-600"
          >
            <Eye className="h-4 w-4" />
          </Button>
        }
      />
      <IngredientDialog
        ingredient={ingredient}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-emerald-600"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        }
      />
      <DeleteConfirmButton
        id={ingredient.id}
        action={handleDelete}
        title={`Supprimer ${ingredient.name} ?`}
        description="Attention, cela peut impacter les recettes qui utilisent cet ingrédient."
      />
      <StockAdjustmentDialog ingredient={ingredient} />
    </div>
  );
}
