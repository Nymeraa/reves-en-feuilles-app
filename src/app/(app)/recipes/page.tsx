import { RecipesTableWrapper } from '@/components/recipes/recipe-table-wrapper'
import { RecipeService } from '@/services/recipe-service'
import { InventoryService } from '@/services/inventory-service'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RecipeDialog } from '@/components/recipes/recipe-dialog'

export default async function RecipesPage() {
    const data = await RecipeService.getRecipes('org-1')
    const ingredients = await InventoryService.getIngredients('org-1')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Recettes</h2>
                    <p className="text-muted-foreground">{data.length} recettes en catalogue</p>
                </div>
                <RecipeDialog
                    ingredients={ingredients}
                    trigger={
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Nouvelle recette
                        </Button>
                    }
                />
            </div>

            <div className="bg-card rounded-lg border border-border shadow-sm">
                <RecipesTableWrapper data={data} ingredients={ingredients} />
            </div>
        </div>
    )
}
