import { InventoryService } from '@/services/inventory-service'
import PackagingPageWrapper from './client-page'

export default async function PackagingPage() {
    const allIngredients = await InventoryService.getIngredients('org-1');
    const packagingItems = allIngredients.filter(i => i.category === 'Packaging');

    return <PackagingPageWrapper initialItems={packagingItems} />
}
