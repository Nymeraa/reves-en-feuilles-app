
import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { PackService } from '../src/services/pack-service';
import { OrderStatus } from '../src/types/order';
import { MovementType } from '../src/types/inventory';
import { PackStatus } from '../src/types/pack';

async function verify() {
    console.log('--- ORDER AUDIT VERIFICATION ---');
    const ORG = 'org-1';

    // SETUP: Recipe & Pack
    console.log('[SETUP] Creating entities...');
    const ingredients = await InventoryService.getIngredients(ORG);
    const tea = ingredients.find(i => i.slug === 'sencha-superior');
    // Ensure tea stock
    if (!tea) throw new Error('No tea found');
    const startStock = tea.currentStock;
    console.log(`Initial Tea Stock: ${startStock}`);

    // Create Recipe
    const recipe = await RecipeService.createRecipe(ORG, { name: 'Audit Tea', description: 'Test' });
    await RecipeService.updateRecipeFull(ORG, recipe.id, {
        ...recipe,
        description: 'Mock Description',
        status: 'ACTIVE' as any,
        items: [{ ingredientId: tea.id, percentage: 100 }],
        prices: { 100: 10 }
    });

    // Create Order DRAFT
    console.log('[TEST 1] Creating Draft Order...');
    const order = await OrderService.createDraftOrder(ORG, { customerName: 'Audit Client' });
    await OrderService.addItemToOrder(ORG, order.id, {
        type: 'RECIPE',

        format: 100, // 100g
        quantity: 2 // 200g
    });

    // TEST 1: CONFIRM ORDER
    console.log('[TEST 1] Confirming Order...');
    await OrderService.confirmOrder(ORG, order.id);
    const teaAfterSale = (await InventoryService.getIngredientById(tea.id))?.currentStock;
    console.log(`Stock after Sale: ${teaAfterSale} (Expected: ${startStock - 200})`);

    if (teaAfterSale !== startStock - 200) console.error('FAIL: Stock deduction incorrect');
    else console.log('PASS: Stock deducted.');

    const confirmedOrder = await OrderService.getOrderById(order.id);
    if (confirmedOrder?.status !== OrderStatus.PAID) console.error('FAIL: Status not PAID');

    // TEST 2: IDEMPOTENCY
    console.log('[TEST 2] Testing Idempotency (Double Confirm)...');
    await OrderService.confirmOrder(ORG, order.id); // Should warn/return safely
    const teaAfterRetry = (await InventoryService.getIngredientById(tea.id))?.currentStock;
    if (teaAfterRetry !== teaAfterSale) console.error('FAIL: Stock changed on retry! Double deduction!');
    else console.log('PASS: Idempotency verified (Stock unchanged).');

    // TEST 3: COGS HEADER
    console.log('[TEST 3] Checking COGS Header...');
    // Cost of Tea = 0.12 (from default) per unit? No it's weighted average.
    // Tea cost 0.12. 
    // 200g used. 0.2kg * 0.12 cost? No wait.
    // Default ingredient cost 0.12. Is it per gram? 
    // "weightedAverageCost: 0.12" in defaults.
    // "Movement" logic: `(ingredientUsage / 1000) * costPerKg` (if cost is per Kg).
    // If 0.12 is cost per Unit (Kg?), then 0.2kg * 0.12 = 0.024.
    // Let's check `order.cogsMaterials`.
    console.log(`COGS Materials: ${confirmedOrder?.cogsMaterials}`);
    console.log(`COGS Total: ${confirmedOrder?.totalCost}`);

    // TEST 4: CANCELLATION
    console.log('[TEST 4] Cancelling Order...');
    await OrderService.cancelOrder(ORG, order.id);
    const orderCancelled = await OrderService.getOrderById(order.id);
    if (orderCancelled?.status !== OrderStatus.CANCELLED) console.error('FAIL: Status not CANCELLED');

    const teaAfterCancel = (await InventoryService.getIngredientById(tea.id))?.currentStock;
    console.log(`Stock after Cancel: ${teaAfterCancel} (Expected: ${startStock})`);

    if (Math.abs((teaAfterCancel || 0) - startStock) > 0.001) console.error('FAIL: Stock not fully restored');
    else console.log('PASS: Stock restored.');

    // Check Movements
    const movements = await InventoryService.getMovements(ORG);
    const cancelMovs = movements.filter(m => m.reason?.includes('Cancel') && m.deltaQuantity > 0);
    console.log(`Correction Movements found: ${cancelMovs.length}`);
    if (cancelMovs.length === 0) console.error('FAIL: No correction movements found.');

    console.log('--- VERIFICATION COMPLETE ---');
}

verify().catch(console.error);
