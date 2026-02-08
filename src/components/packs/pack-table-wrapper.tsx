'use client'

import { DataTable } from '@/components/ui/data-table'
import { getPackColumns } from '@/components/packs/columns'
import { Pack } from '@/types/pack'
import { Recipe } from '@/types/recipe'
import { Ingredient } from '@/types/inventory'

interface PacksTableWrapperProps {
    data: Pack[]
    recipes: Recipe[]
    ingredients: Ingredient[]
}

export function PacksTableWrapper({ data, recipes, ingredients }: PacksTableWrapperProps) {
    const columns = getPackColumns(recipes, ingredients)

    return (
        <DataTable columns={columns} data={data} />
    )
}
