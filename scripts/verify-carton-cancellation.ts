import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { IngredientStatus, EntityType, Ingredient } from '../src/types/inventory';
import { OrderStatus } from '../src/types/order';

async function main() {
    const orgId = 'verify-cancel-carton-' + Math.random().toString(36).substring(7);
    console.log(`--- STARTING CARTON CANCEL VERIFICATION (${orgId}) ---`);

    // 1. Create Carton Ingredient
    const carton: Ingredient = {
        id: 'carton-stable-id-123',
        organizationId: orgId,
        name: 'Carton Stable',
        slug: 'carton-stable',
        category: 'Packaging',
        // type removed as it doesn't exist on Ingredient
        status: IngredientStatus.ACTIVE,
        currentStock: 100,
        weightedAverageCost: 2.00,
        updatedAt: new Date()
    };

    // Inject Carton
    const { readData, writeData } = await import('../src/lib/db-json');
    const INGREDIENTS_FILE = 'ingredients.json';
    const ingredients = readData<Ingredient[]>(INGREDIENTS_FILE, []);
    ingredients.push(carton);
    writeData(INGREDIENTS_FILE, ingredients);

    console.log('Carton Created:', carton.id);

    // 2. Create Order
    const order = await OrderService.createDraftOrder(orgId, {
        customerName: 'Cancel Test Client',
        packagingType: 'Carton Stable', // Name match initially
        status: OrderStatus.DRAFT
    });
    console.log('Order Created:', order.id);

    // 3. Confirm Order (Should persist ID)
    await OrderService.confirmOrder(orgId, order.id);

    // Check Persistence
    const ORDERS_FILE = 'orders.json';
    const ordersConfirmed = readData<any[]>(ORDERS_FILE, []);
    const confirmedOrder = ordersConfirmed.find(o => o.id === order.id);

    if (confirmedOrder.packagingId !== carton.id) {
        throw new Error(`Persistence Failed! Expected ${carton.id}, got ${confirmedOrder.packagingId}`);
    }
    console.log('Packaging ID Persisted Correctly:', confirmedOrder.packagingId);

    // Check Deduction
    const afterIngredients = readData<Ingredient[]>(INGREDIENTS_FILE, []);
    const cartonAfter = afterIngredients.find(i => i.id === carton.id);
    if (cartonAfter?.currentStock !== 99) throw new Error('Stock deduction failed');
    console.log('Stock Deducted Correctly (99)');

    // 4. Cancel Order (Should Restock using ID)
    // Rename carton to prove name is NOT used? No, ID is used.
    // Let's rely on ID.
    await OrderService.cancelOrder(orgId, order.id);

    const finalIngredients = readData<Ingredient[]>(INGREDIENTS_FILE, []);
    const cartonFinal = finalIngredients.find(i => i.id === carton.id);

    if (cartonFinal?.currentStock !== 100) {
        throw new Error(`Restock Failed! Expected 100, got ${cartonFinal?.currentStock}`);
    }
    console.log('Stock Restocked Correctly (100)');

    // 5. Idempotence Check (Cancel Again)
    await OrderService.cancelOrder(orgId, order.id);
    const cartonIdempotent = readData<Ingredient[]>(INGREDIENTS_FILE, []).find(i => i.id === carton.id);
    if (cartonIdempotent?.currentStock !== 100) {
        throw new Error(`Idempotence Failed! Stock changed to ${cartonIdempotent?.currentStock}`);
    }
    console.log('Idempotence Confirmed');

    // Cleanup
    writeData(INGREDIENTS_FILE, finalIngredients.filter(i => i.id !== carton.id));

    console.log('--- CARTON CANCEL SUCCESS ---');
}

main().catch(console.error);
