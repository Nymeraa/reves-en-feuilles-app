
import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { PackService } from '../src/services/pack-service';
import { CreateOrderInput, OrderStatus } from '../src/types/order';

async function verifyOrderCosts() {
    const orgId = 'org-1';

    console.log('--- Starting Verification: Order Costs & Lifecycle ---');

    // 1. Create a Draft Order
    console.log('\n1. Creating Draft Order...');
    const orderInput: CreateOrderInput = {
        orderNumber: 'TEST-COST-001',
        customerName: 'Test Customer',
        status: OrderStatus.DRAFT, // Enforce DRAFT via Enum
        totalAmount: 0
    };
    const order = await OrderService.createDraftOrder(orgId, orderInput);
    console.log('Order Created:', order.id, 'Status:', order.status);

    if (order.status !== OrderStatus.DRAFT) throw new Error('Order should start as DRAFT');

    // 2. Add Recipe Item
    console.log('\n2. Adding Recipe Item...');
    const recipes = await RecipeService.getRecipes(orgId);
    const recipe = recipes[0];
    if (!recipe) throw new Error('No recipes found');

    await OrderService.addItemToOrder(orgId, order.id, {
        type: 'RECIPE',
        recipeId: recipe.id,
        format: 100, // 100g
        quantity: 2
    });

    let updated = await OrderService.getOrderById(order.id);
    if (!updated) throw new Error('Order not found');
    console.log('Item Added. COGS Materials:', updated.cogsMaterials);
    console.log('Order Total Amount:', updated.totalAmount);
    // Check first item price
    if (updated.items.length > 0) {
        console.log('Item Unit Price Snapshot:', updated.items[0].unitPriceSnapshot);
    }

    // Check for 1000x bug
    // If recipe cost is 50/kg. 100g = 5 euro cost. Price ~12.5. Total (2) ~25.
    // If 1000x bug: Price ~12500. Total ~25000.
    if (updated.totalAmount > 1000) {
        console.error('FAIL: Total Amount is huge! 1000x Error persisting.');
    } else {
        console.log('PASS: Total Amount is reasonable.');
    }

    if ((updated.cogsMaterials || 0) <= 0) console.warn('WARN: COGS Material is 0 (might be free ingredient?)');
    else console.log('PASS: COGS Material calculated');

    // 3. Update Order (Add Pack)
    console.log('\n3. Updating Order (Adding Pack)...');
    const packs = await PackService.getPacks(orgId);
    if (packs.length > 0) {
        await OrderService.updateOrder(orgId, order.id, { ...orderInput }, [{
            type: 'PACK',
            packId: packs[0].id,
            quantity: 1,
            unitPrice: 50
        }]);
        updated = await OrderService.getOrderById(order.id);
        console.log('Pack Added. COGS Materials:', updated?.cogsMaterials);
    } else {
        console.log('Skipping Pack test (no packs)');
    }

    // 4. Confirm Order
    console.log('\n4. Confirming Order...');
    await OrderService.confirmOrder(orgId, order.id);
    updated = await OrderService.getOrderById(order.id);
    console.log('Order Confirmed. Status:', updated?.status);

    if (updated?.status !== OrderStatus.PAID) throw new Error('Order fail to confirm');

    // 5. Verify Stock
    const movements = await InventoryService.getMovements(orgId);
    const orderMoves = movements.filter(m => m.reason?.includes(order.id));
    console.log('Stock Movements found:', orderMoves.length);
    if (orderMoves.length === 0) console.error('FAIL: No stock movements');
    else console.log('PASS: Stock movements recorded');

    console.log('\n--- Verification Complete ---');
}

verifyOrderCosts().catch(console.error);
