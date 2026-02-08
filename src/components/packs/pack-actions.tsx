'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Edit2, Eye, Box } from 'lucide-react';
import { PackDialog } from './pack-dialog';
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button';
import { Pack } from '@/types/pack';
import { Recipe } from '@/types/recipe';
import { Ingredient } from '@/types/inventory';

interface PackActionsProps {
  pack: Pack;
  recipes: Recipe[];
  ingredients: Ingredient[];
}

export function PackActions({ pack, recipes, ingredients }: PackActionsProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/packs/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.refresh();
        return { success: true };
      } else {
        return { error: 'Failed to delete' };
      }
    } catch (e) {
      return { error: 'Network error' };
    }
  };

  return (
    <div className="flex items-center gap-1">
      <PackDialog
        pack={pack}
        recipes={recipes}
        ingredients={ingredients}
        readonly
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
      <PackDialog
        pack={pack}
        recipes={recipes}
        ingredients={ingredients}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-purple-600"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        }
      />
      <DeleteConfirmButton id={pack.id} action={handleDelete} title={`Supprimer ${pack.name} ?`} />
    </div>
  );
}
