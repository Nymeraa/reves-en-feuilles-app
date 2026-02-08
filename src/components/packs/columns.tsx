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
        <div className="p-2 bg-purple-50 rounded-md text-purple-600">
          <Package className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-slate-900">{row.original.name}</div>
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
              className="text-xs bg-purple-50 border-purple-100 text-purple-700 font-normal"
            >
              {r?.name} {item.format}g
            </Badge>
          );
        })}
        {(row.original.recipes || []).length > 2 && (
          <span className="text-xs text-muted-foreground">...</span>
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
            ? 'bg-purple-100 text-purple-700 hover:bg-purple-100'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
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
