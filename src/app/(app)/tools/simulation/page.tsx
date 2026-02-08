import { InventoryService } from '@/services/inventory-service'
import { SettingsService } from '@/services/settings-service'
import SimulationClientPage from './client-page'

export default async function SimulationPage() {
    const ingredients = await InventoryService.getIngredients('org-1')
    const settings = await SettingsService.getSettings()
    return <SimulationClientPage ingredients={ingredients} settings={settings} />
}
