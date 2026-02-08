
import { OrderService as Service } from '../src/services/order-service';
import { CreateOrderInput, OrderStatus } from '../src/types/order';
import { RecipeService } from '../src/services/recipe-service';

async function verifyFixedTotal() {
    const orgId = 'org-1';
    console.log('--- Verification: Fixed Total Amount ---');

    // 1. Create Draft
    const order = await Service.createDraftOrder(orgId, {
        customerName: 'Total Tester',
        status: OrderStatus.DRAFT,
        totalAmount: 0
    });
    console.log(`Order Created: ${order.id}. Total: ${order.totalAmount}`);

    // 2. Add an Item -> Total should update (auto)
    const recipes = await RecipeService.getRecipes(orgId);
    await Service.addItemToOrder(orgId, order.id, {
        type: 'RECIPE',
        recipeId: recipes[0].id,
        format: 100,
        quantity: 1
    });

    let updated = await Service.getOrderById(order.id);
    const calculatedTotal = updated?.totalAmount;
    console.log(`Auto-Calculated Total: ${calculatedTotal}`);

    // 3. Manually Override Total via Action (Simulate Input Blur)
    const manualTotal = 500.00;
    console.log(`Setting Manual Total to: ${manualTotal}`);

    // We call the update logic directly as if via action
    // But we can't import action easily if it uses 'use server' directives in real build...
    // Let's use Service.updateOrder directly as the action does.
    await Service.updateOrder(orgId, order.id, {
        customerName: 'Total Tester',
        totalAmount: manualTotal
    });

    updated = await Service.getOrderById(order.id);
    console.log(`Updated Total: ${updated?.totalAmount}. Manual Flag: ${updated?.manualTotal}`);

    if (updated?.totalAmount !== manualTotal) throw new Error('Failed to set manual total');
    if (updated?.manualTotal !== true) throw new Error('Manual flag not set');

    // 4. Add Another Item -> Total SHOULD NOT CHANGE
    console.log('Adding another item...');
    await Service.addItemToOrder(orgId, order.id, {
        type: 'RECIPE',
        recipeId: recipes[0].id,
        format: 100,
        quantity: 5 // Should add significant cost
    });

    updated = await Service.getOrderById(order.id);
    console.log(`Final Total: ${updated?.totalAmount}`);

    if (updated?.totalAmount === manualTotal) {
        console.log('PASS: Total Amount remained fixed despite adding items.');
    } else {
        console.error(`FAIL: Total Amount changed to ${updated?.totalAmount}`);
    }
}

verifyFixedTotal().catch(console.error);
