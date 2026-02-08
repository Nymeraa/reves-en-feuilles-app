'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Ingredient, IngredientStatus } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Edit2, Trash2, Leaf } from 'lucide-react';
import { IngredientDialog } from './ingredient-dialog';
import { StockAdjustmentDialog } from './stock-adjustment-dialog';
import { useState } from 'react';

// Helper to calculate TTC (approx 5.5% TVA for food products in France)
const TVA_RATE = 1.055;

import { IngredientActions } from './ingredient-actions';
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button';
import { deleteIngredientAction } from '@/actions/inventory';
import { Eye } from 'lucide-react';

export const columns: ColumnDef<Ingredient>[] = [
  {
    accessorKey: 'name',
    header: 'INGRÉDIENT',
    cell: ({ row }) => {
      const cat = row.original.category || 'Autre';
      return (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-md text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{cat}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'currentStock',
    header: 'STOCK',
    cell: ({ row }) => {
      const stock = row.original.currentStock;
      const threshold = row.original.alertThreshold || 100;
      const isLow = stock < threshold;

      return (
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono font-medium text-foreground">{stock} g</span>
          <Badge
            variant={isLow ? 'destructive' : 'outline'}
            className={
              !isLow
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                : ''
            }
          >
            {isLow ? 'BAS' : 'OK'}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'weightedAverageCost',
    header: 'CMP HT',
    cell: ({ row }) => {
      // Display per KG
      const valPerGram = row.original.weightedAverageCost;
      const valPerKg = valPerGram * 1000;
      return <div className="font-mono text-sm">{valPerKg.toFixed(2)} €/kg</div>;
    },
  },
  {
    id: 'cmp_ttc',
    header: 'CMP TTC',
    cell: ({ row }) => {
      const valPerGram = row.original.weightedAverageCost;
      const valPerKg = valPerGram * 1000 * TVA_RATE;
      return (
        <div className="font-mono text-sm text-muted-foreground">{valPerKg.toFixed(2)} €/kg</div>
      );
    },
  },
  {
    id: 'value',
    header: 'VALEUR STOCK HT',
    cell: ({ row }) => {
      const totalVal = row.original.currentStock * row.original.weightedAverageCost;
      return <div className="font-mono font-medium">{totalVal.toFixed(2)} €</div>;
    },
  },
  {
    accessorKey: 'supplier',
    header: 'FOURNISSEUR',
    cell: ({ row }) => {
      const url = row.original.supplierUrl;
      return (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <span>{row.original.supplier?.name || '-'}</span>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => <IngredientActions ingredient={row.original} />,
  },
];
