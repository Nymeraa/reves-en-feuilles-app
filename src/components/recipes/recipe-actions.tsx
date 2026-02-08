'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Edit2, Eye, BookOpen } from 'lucide-react';
import { RecipeDialog } from './recipe-dialog';
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button';
import { Recipe } from '@/types/recipe';
import { Ingredient } from '@/types/inventory';

interface RecipeActionsProps {
  recipe: Recipe;
  ingredients: Ingredient[];
}

export function RecipeActions({ recipe, ingredients }: RecipeActionsProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/recipes/${id}`, {
        method: 'DELETE',
      });
      router.refresh();
      return { success: true };
    } catch (e: any) {
      return { error: e.message || 'Failed to delete' };
    }
  };

  return (
    <div className="flex items-center gap-1">
      <RecipeDialog
        recipe={recipe}
        ingredients={ingredients}
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
      <RecipeDialog
        recipe={recipe}
        ingredients={ingredients}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-orange-600"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        }
      />
      <DeleteConfirmButton
        id={recipe.id}
        action={handleDelete}
        title={`Supprimer ${recipe.name} ?`}
      />
    </div>
  );
}
