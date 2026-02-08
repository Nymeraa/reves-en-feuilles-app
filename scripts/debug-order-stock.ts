/**
 * Simple debug test to trace order stock deduction
 */

import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { OrderStatus } from '../src/types/order';

const ORG_ID = 'org-1';

async function debugTest() {
    console.log('🔍 Starting Debug Test\n');

    try {
        // Get a recipe
        const recipes = await RecipeService.getRecipes(ORG_ID);
        if (recipes.length === 0) {
            console.error('❌ No recipes found');
            return;
        }

        const testRecipe = recipes[0];
        console.log(`✓ Using recipe: ${testRecipe.name} (${testRecipe.id})`);

        if (!testRecipe.items || testRecipe.items.length === 0) {
            console.error('❌ Recipe has no ingredients');
            return;
        }

        const testIngredient = testRecipe.items[0];
        const ingredientId = testIngredient.ingredientId;

        // Check initial stock
        const ingredient = await InventoryService.getIngredientById(ingredientId);
        if (!ingredient) {
            console.error(`❌ Ingredient ${ingredientId} not found`);
            return;
        }

        console.log(`✓ Ingredient: ${ingredient.name}`);
        console.log(`  Initial stock: ${ingredient.currentStock}g`);
        console.log(`  Percentage in recipe: ${testIngredient.percentage}%`);

        // Create a DRAFT order
        console.log('\n📝 Creating DRAFT order...');
        const order = await OrderService.createDraftOrder(ORG_ID, {
            orderNumber: 'DEBUG-001',
            customerName: 'Debug Test',
            status: OrderStatus.DRAFT
        });
        console.log(`✓ Order created: ${order.id}, status: ${order.status}`);

        // Add item
        console.log('\n adding item to order...');
        await OrderService.addItemToOrder(ORG_ID, order.id, {
            type: 'RECIPE',
            recipeId: testRecipe.id,
            format: 100, // 100g
            quantity: 1 // 1 item
        });
        console.log('✓ Item added');

        // Check item details
        const orderWithItems = await OrderService.getOrderById(order.id);
        console.log(`  Order has ${orderWithItems?.items.length} item(s)`);
        if (orderWithItems?.items[0]) {
            console.log(`  Item: ${orderWithItems.items[0].name}`);
            console.log(`  Format: ${orderWithItems.items[0].format}g`);
            console.log(`  Quantity: ${orderWithItems.items[0].quantity}`);
        }

        // Check stock BEFORE confirm (should be unchanged)
        const stockBeforeConfirm = await InventoryService.getIngredientById(ingredientId);
        console.log(`\n📊 Stock BEFORE confirm: ${stockBeforeConfirm?.currentStock}g`);

        // Confirm the order
        console.log('\n✅ Confirming order (should deduct stock)...');
        try {
            await OrderService.confirmOrder(ORG_ID, order.id);
            console.log('✓ Order confirmed');
        } catch (error: any) {
            console.error(`❌ Confirm failed: ${error.message}`);
            console.error(error.stack);
        }

        // Check order status
        const confirmedOrder = await OrderService.getOrderById(order.id);
        console.log(`  Order status after confirm: ${confirmedOrder?.status}`);

        // Check stock AFTER confirm (should be reduced)
        const stockAfterConfirm = await InventoryService.getIngredientById(ingredientId);
        console.log(`\n📊 Stock AFTER confirm: ${stockAfterConfirm?.currentStock}g`);

        // Calculate expected deduction
        const totalGrams = 100 * 1; // format * quantity
        const expectedDeduction = (totalGrams * testIngredient.percentage) / 100;
        const expectedStock = (stockBeforeConfirm?.currentStock || 0) - expectedDeduction;

        console.log(`\n Expected:`);
        console.log(`  Deduction: ${expectedDeduction}g`);
        console.log(`  Final stock: ${expectedStock}g`);
        console.log(`\n📊 Actual:`);
        console.log(`  Stock change: ${(stockAfterConfirm?.currentStock || 0) - (stockBeforeConfirm?.currentStock || 0)}g`);
        console.log(`  Final stock: ${stockAfterConfirm?.currentStock}g`);

        // Check movements
        console.log('\n📜 Checking movements...');
        const movements = await InventoryService.getMovements(ORG_ID);
        const orderMovements = movements.filter(m => m.sourceId === order.id);
        console.log(`  Found ${orderMovements.length} movement(s) for this order`);

        orderMovements.forEach((m, i) => {
            console.log(`  Movement ${i + 1}:`);
            console.log(`    Type: ${m.type}`);
            console.log(`    Delta: ${m.deltaQuantity}g`);
            console.log(`    Reason: ${m.reason}`);
            console.log(`    Ingredient: ${m.ingredientId}`);
        });

        // Result
        const success = Math.abs((stockAfterConfirm?.currentStock || 0) - expectedStock) < 0.01;
        if (success) {
            console.log('\n✅ TEST PASSED: Stock was correctly deducted');
        } else {
            console.log('\n❌ TEST FAILED: Stock was NOT correctly deducted');
        }

        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await OrderService.deleteOrder(ORG_ID, order.id);
        console.log('✓ Test order deleted');

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
}

debugTest();
