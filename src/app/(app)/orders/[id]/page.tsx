import { OrderDetailView } from '@/components/orders/order-detail-view'
import { OrderService } from '@/services/order-service'
import { RecipeService } from '@/services/recipe-service'
import { InventoryService } from '@/services/inventory-service'
import { PackService } from '@/services/pack-service'
import { SettingsService } from '@/services/settings-service'
import { notFound } from 'next/navigation'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const order = await OrderService.getOrderById(id)
    const recipes = await RecipeService.getRecipes('org-1')
    const ingredients = await InventoryService.getIngredients('org-1')
    const packs = await PackService.getPacks('org-1')
    const settings = await SettingsService.getSettings()

    if (!order) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Détail de la commande</h2>
            <OrderDetailView
                order={order}
                recipes={recipes}
                ingredients={ingredients}
                packs={packs}
                settings={settings}
            />
        </div>
    )
}
