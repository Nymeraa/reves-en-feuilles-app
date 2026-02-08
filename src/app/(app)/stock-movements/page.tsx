import { InventoryService } from '@/services/inventory-service'
import { readData } from '@/lib/db-json'
import StockMovementsClientPage from './client-page'
import { StockMovement } from '@/types/inventory'

const MOVEMENTS_FILE = 'movements.json';

export default async function StockMovementsPage() {
    const allIngredients = await InventoryService.getIngredients('org-1');
    const movements = readData<StockMovement[]>(MOVEMENTS_FILE, []);

    return <StockMovementsClientPage movements={movements} ingredients={allIngredients} />
}
