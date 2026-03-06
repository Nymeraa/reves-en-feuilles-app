'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Pack, PackStatus } from '@/types/pack';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Package, Eye } from 'lucide-react';
import { PackActions } from '@/components/packs/pack-actions';
// import { PackDialog } from '@/components/packs/pack-dialog'
import { Recipe } from '@/types/recipe';
import { Ingredient } from '@/types/inventory';
// import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button'
// import { deletePackAction } from '@/actions/pack'

export const getPackColumns = (recipes: Recipe[], ingredients: Ingredient[]): ColumnDef<Pack>[] => [
  {
    accessorKey: 'name',
    header: 'PACK',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md text-purple-600 dark:text-purple-400">
          <Package className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">
            {(row.original.recipes || []).length} produits + {(row.original.packaging || []).length}{' '}
            accessoires
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'price',
    header: 'PRIX VENTE',
    cell: ({ row }) => <span className="font-bold">{row.original.price.toFixed(2)} €</span>,
  },
  {
    id: 'content',
    header: 'CONTENU',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1 max-w-md">
        {(row.original.recipes || []).slice(0, 2).map((item, idx) => {
          const r = recipes.find((rec) => rec.id === item.recipeId);
          return (
            <Badge
              key={idx}
              variant="outline"
              className="text-xs bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-normal"
            >
              {r?.name} {item.format}g
            </Badge>
          );
        })}
        {(row.original.recipes || []).length > 2 && (
          <span className="text-xs text-muted-foreground">...</span>
        )}
        {(row.original.recipeLots && row.original.recipeLots.length > 0) && (
          <Badge variant="outline" className="text-xs bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-normal">
            + {row.original.recipeLots.length} lot(s) recette
          </Badge>
        )}
        {(row.original.packagingLots && row.original.packagingLots.length > 0) && (
          <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-normal">
            + {row.original.packagingLots.length} lot(s) accès.
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
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
        }
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <PackActions pack={row.original} recipes={recipes} ingredients={ingredients} />
    ),
  },
];
