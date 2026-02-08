import { InventoryService } from '@/services/inventory-service'
import { OrderService } from '@/services/order-service'
import { RecipeService } from '@/services/recipe-service'
import { PackService } from '@/services/pack-service'
import { SettingsService } from '@/services/settings-service'
import OrdersClientPage from './client-page'

export default async function OrdersPage() {
    const data = await OrderService.getOrders('org-1')
    const recipes = await RecipeService.getRecipes('org-1')
    const packs = await PackService.getPacks('org-1')
    const ingredients = await InventoryService.getIngredients('org-1')
    const settings = await SettingsService.getSettings()

    return (
        <OrdersClientPage
            data={data}
            recipes={recipes}
            packs={packs}
            ingredients={ingredients}
            settings={settings}
        />
    )
}
