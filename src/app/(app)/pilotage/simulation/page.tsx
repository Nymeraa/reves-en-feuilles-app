import { RecipeService } from '@/services/recipe-service'
import { InventoryService } from '@/services/inventory-service'
import { PackService } from '@/services/pack-service'
import { SimulationPlayground } from '@/components/simulation/simulation-playground'

export default async function SimulationPage() {
    const recipes = await RecipeService.getRecipes('org-1');
    const ingredients = await InventoryService.getIngredients('org-1');
    const packs = await PackService.getPacks('org-1');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Simulateur de Prix</h2>
                <p className="text-slate-500">Optimisez vos marges sans affecter votre catalogue.</p>
            </div>

            <SimulationPlayground recipes={recipes} ingredients={ingredients} packs={packs} />
        </div>
    )
}
