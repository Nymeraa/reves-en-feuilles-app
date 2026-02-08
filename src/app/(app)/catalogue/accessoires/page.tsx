import { InventoryService } from '@/services/inventory-service'
import AccessoriesPageWrapper from './client-page'

export default async function AccessoriesPage() {
    const allIngredients = await InventoryService.getIngredients('org-1');
    const items = allIngredients.filter(i => i.category === 'Accessoire');

    return <AccessoriesPageWrapper initialItems={items} />
}
