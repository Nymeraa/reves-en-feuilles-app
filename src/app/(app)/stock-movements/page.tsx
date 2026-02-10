import { InventoryService } from '@/services/inventory-service';
import StockMovementsClientPage from './client-page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StockMovementsPage() {
  const orgId = 'org-1';
  const allIngredients = await InventoryService.getIngredients(orgId);
  const movements = await InventoryService.getMovements(orgId);

  return <StockMovementsClientPage movements={movements} ingredients={allIngredients} />;
}
