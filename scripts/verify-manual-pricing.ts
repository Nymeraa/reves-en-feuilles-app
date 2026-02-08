
import { OrderService } from '../src/services/order-service';
import { RecipeService } from '../src/services/recipe-service';
import { CreateOrderInput, OrderStatus } from '../src/types/order';

async function verifyManualPricing() {
    const orgId = 'org-1';
    console.log('--- Verification: Manual Pricing Override ---');

    // 1. Create Draft
    const orderInput: CreateOrderInput = {
        orderNumber: 'TEST-PRICE-001',
        customerName: 'Pricing Tester',
        status: OrderStatus.DRAFT,
        totalAmount: 0
    };
    const order = await OrderService.createDraftOrder(orgId, orderInput);

    // 2. Add Item with Manual Price (e.g. 50.00)
    // First get a recipe
    const recipes = await RecipeService.getRecipes(orgId);
    const r = recipes[0];

    // Default Price would be Cost * 2.5. 
    // Let's pick a very specific manual price: 12.34
    const manualPrice = 12.34;
    const qty = 2;

    console.log(`Adding Item with Manual Price: ${manualPrice} x ${qty}`);

    await OrderService.addItemToOrder(orgId, order.id, {
        type: 'RECIPE',
        recipeId: r.id,
        format: 100,
        quantity: qty,
        unitPrice: manualPrice // Manual Override
    });

    // 3. Verify
    const updated = await OrderService.getOrderById(order.id);
    if (!updated) throw new Error('Order missing');

    const item = updated.items[0];
    console.log(`Item Unit Price Snapshot: ${item.unitPriceSnapshot}`);
    console.log(`Order Total Amount: ${updated.totalAmount}`);

    if (Math.abs(item.unitPriceSnapshot - manualPrice) < 0.01) {
        console.log('PASS: Unit Price matches manual input.');
    } else {
        console.error(`FAIL: Unit Price ${item.unitPriceSnapshot} != ${manualPrice}`);
    }

    const expectedTotal = manualPrice * qty;
    // Rounding might apply
    if (Math.abs(updated.totalAmount - expectedTotal) < 0.05) {
        console.log('PASS: Total Amount reflects manual price.');
    } else {
        console.error(`FAIL: Total Amount ${updated.totalAmount} != ${expectedTotal}`);
    }
}

verifyManualPricing().catch(console.error);
