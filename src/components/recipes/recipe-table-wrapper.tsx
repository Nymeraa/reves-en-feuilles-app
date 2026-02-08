'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns } from '@/components/recipes/columns'
import { Recipe } from '@/types/recipe'
import { Ingredient } from '@/types/inventory'

interface RecipesTableWrapperProps {
    data: Recipe[]
    ingredients: Ingredient[]
}

export function RecipesTableWrapper({ data, ingredients }: RecipesTableWrapperProps) {
    const columns = getColumns(ingredients)

    return (
        <DataTable columns={columns} data={data} />
    )
}
