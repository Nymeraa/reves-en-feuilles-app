import { DataTable } from '@/components/ui/data-table'
import { columns } from '@/components/inventory/columns'
import { InventoryService } from '@/services/inventory-service'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { IngredientDialog } from '@/components/inventory/ingredient-dialog'
import { SupplierService } from '@/services/supplier-service'

export default async function InventoryPage() {
    const allData = await InventoryService.getIngredients('org-1')
    const suppliers = await SupplierService.getSuppliers()

    // Exclude Packaging and Accessoires - they have their own pages
    const data = allData.filter(i =>
        i.category !== 'Packaging' && i.category !== 'Accessoire'
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Ingrédients</h2>
                    <p className="text-muted-foreground">{data.length} ingrédients en catalogue</p>
                </div>

                <IngredientDialog
                    suppliers={suppliers}
                    trigger={
                        <Button className="bg-emerald-800 hover:bg-emerald-900 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800">
                            <Plus className="mr-2 h-4 w-4" /> Ajouter
                        </Button>
                    }
                />
            </div>

            <div className="bg-card rounded-lg border border-border shadow-sm">
                <DataTable columns={columns} data={data} />
            </div>
        </div>
    )
}
