'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Recipe, RecipeStatus } from '@/types/recipe';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, BookOpen, Eye } from 'lucide-react';
import { RecipeActions } from '@/components/recipes/recipe-actions';
// import { RecipeDialog } from '@/components/recipes/recipe-dialog'
import { Ingredient } from '@/types/inventory';
// import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button'
// import { deleteRecipeAction } from '@/actions/recipe'

// We need ingredients to render the Edit Dialog inside the column action
// But columns definition usually doesn't have access to dynamic data like 'all ingredients' list
// Solution: We'll pass ingredients to the DataTable component, and use a custom Cell Renderer or just pass it here if we factory it.
// For simplicity in this stack, let's export a FUNCTION that takes ingredients and returns columns.

export const getColumns = (ingredients: Ingredient[]): ColumnDef<Recipe>[] => [
  {
    accessorKey: 'name',
    header: 'RECETTE',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md text-orange-600 dark:text-orange-400">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-foreground">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.items.length} ingrédients
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'cost_material',
    header: 'COÛT MATIÈRE',
    cell: ({ row }) => {
      const items = row.original.items;
      let costPer100g = 0;
      let missingData = false;

      for (const item of items) {
        const ingredient = ingredients.find((i) => i.id === item.ingredientId);
        if (ingredient && item.percentage) {
          // Cost for 100g of final product:
          // Amount of this ingredient needed = (Percentage / 100) * 100g = Percentage grams.
          // Cost = Amount * Ingredient Cost Per Gram
          costPer100g += item.percentage * ingredient.weightedAverageCost;
        } else {
          // If we can't find ingredient or percentage is missing, can't calculate accurately
          // But maybe we just skip? For now let's just calc what we have.
        }
      }

      if (items.length === 0) return <div className="text-sm text-muted-foreground">--</div>;

      return (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-foreground">
            {costPer100g.toFixed(2)} € / 100g
          </span>
          {/* Optional: Show breakdown per format if needed, but per 100g is standard comp */}
        </div>
      );
    },
  },
  {
    id: 'composition',
    header: 'COMPOSITION',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1 max-w-md">
        {row.original.items.slice(0, 3).map((item, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className="text-xs bg-muted font-normal text-muted-foreground"
          >
            {/* We assume we might know the name, or we need to lookup from ingredients list passed in */}
            {/* Since item.ingredient is optional, we might need to find it */}
            {ingredients.find((i) => i.id === item.ingredientId)?.name || 'Ingrédient'}{' '}
            {item.percentage}%
          </Badge>
        ))}
        {row.original.items.length > 3 && (
          <Badge variant="outline" className="text-xs">
            + {row.original.items.length - 3}
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'STATUT',
    cell: ({ row }) => (
      <Badge
        className={
          row.original.status === 'ACTIVE'
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground hover:bg-muted'
        }
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'version',
    header: 'VERSION',
    cell: ({ row }) => (
      <span className="text-xs font-mono text-muted-foreground">v{row.original.version}</span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => <RecipeActions recipe={row.original} ingredients={ingredients} />,
  },
];
