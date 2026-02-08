import { PackService } from '@/services/pack-service'
import { RecipeService } from '@/services/recipe-service'
import { InventoryService } from '@/services/inventory-service'
import { notFound } from 'next/navigation'
import { PackDetail } from '@/components/packs/pack-detail'

interface PackPageProps {
    params: {
        id: string
    }
}

export default async function PackPage({ params }: PackPageProps) {
    const { id } = await params
    const pack = await PackService.getPackById(id)

    if (!pack) notFound()

    const recipes = await RecipeService.getRecipes(pack.organizationId)
    const ingredients = await InventoryService.getIngredients(pack.organizationId)

    return (
        <PackDetail
            initialPack={pack}
            recipes={recipes}
            ingredients={ingredients}
        />
    )
}
