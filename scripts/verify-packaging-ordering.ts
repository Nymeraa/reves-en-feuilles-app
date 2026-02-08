
import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { PackagingService } from '../src/services/packaging-service';
import { OrderStatus } from '../src/types/order';
import { Ingredient, MovementType } from '../src/types/inventory';

// Mock Config
const ORG_ID = 'org-1';
const CARTON_NAME = 'Carton Test 50g';
const CARTON_ID = 'carton-test-id';

async function runVerification() {
    console.log('--- STARTING PACKAGING & ORDER VERIFICATION ---');

    try {
        // 1. Setup: Create/Reset Test Carton
        console.log('1. Setting up Test Carton...');
        let carton = await InventoryService.getIngredientById(CARTON_ID);
        if (!carton) {
            // Create manually or via service (mocking CreateIngredientInput)
            const created = await InventoryService.createIngredient(ORG_ID, {
                name: CARTON_NAME,
                category: 'Packaging',
                initialStock: 100,
                initialCost: 0.5, // 0.5€ per box
                subtype: 'Carton'
            });
            // Force ID for stability in test
            // Note: createIngredient generates random ID. 
            // We'll find it by name.
            const all = await InventoryService.getIngredients(ORG_ID);
            carton = all.find(i => i.name === CARTON_NAME);
        } else {
            // Reset Stock
            // We can't easily "Reset" via service without movements, but let's just note current stock.
        }

        if (!carton) throw new Error('Failed to create/find test carton');
        const startStock = carton.currentStock;
        console.log(`   Carton: ${carton.name} (ID: ${carton.id}) - Stock: ${startStock}`);

        // 2. Create Order
        console.log('2. Creating Order with Packaging...');
        const order = await OrderService.createDraftOrder(ORG_ID, {
            customerName: 'Test Customer',
            packagingType: carton.name, // Intentional: Use Name to test lookup
        });
        console.log(`   Order Created: ${order.id}`);

        // 3. Confirm Order (Should Deduct)
        console.log('3. Confirming Order...');
        await OrderService.confirmOrder(ORG_ID, order.id);

        // Refresh Order to check ID persistence
        const confirmedOrder = await OrderService.getOrderById(order.id);
        if (!confirmedOrder) throw new Error('Order lost');

        console.log(`   Order Status: ${confirmedOrder.status}`);
        console.log(`   Packaging ID Saved: ${confirmedOrder.packagingId}`);

        if (confirmedOrder.packagingId !== carton.id) {
            console.error('❌ FAILURE: Packaging ID was not saved on order confirmation.');
        } else {
            console.log('✅ SUCCESS: Packaging ID saved.');
        }

        // Check Stock Deduction
        const cartonAfter = await InventoryService.getIngredientById(carton.id);
        const expectedStock = startStock - 1;
        if (cartonAfter?.currentStock !== expectedStock) {
            console.error(`❌ FAILURE: Stock did not decrease correctly. Expected ${expectedStock}, Got ${cartonAfter?.currentStock}`);
        } else {
            console.log(`✅ SUCCESS: Stock deducted correctly (-1).`);
        }

        // 4. Cancel Order (Should Restock)
        console.log(`4. Cancelling Order... (Packaging ID on Order: ${confirmedOrder.packagingId})`);
        await OrderService.cancelOrder(ORG_ID, order.id);

        // Check Restock
        const cartonFinal = await InventoryService.getIngredientById(carton.id);
        if (cartonFinal?.currentStock !== startStock) {
            console.error(`❌ FAILURE: Stock was not restocked. Expected ${startStock}, Got ${cartonFinal?.currentStock}`);
        } else {
            console.log(`✅ SUCCESS: Stock restocked correctly (Back to ${startStock}).`);
        }

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    }
    console.log('--- END VERIFICATION ---');
}

// Execute
runVerification();
