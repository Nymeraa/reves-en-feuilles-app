/**
 * Test script to verify stock deduction fix
 * 
 * This script tests that modifying items in a PAID order:
 * 1. Reverts old stock movements
 * 2. Deducts new stock movements
 * 3. Results in correct net stock change (not just restock)
 */

import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { OrderStatus } from '../src/types/order';

const ORG_ID = 'org-0';

async function testStockDeductionFix() {
    console.log('🧪 Testing Stock Deduction After Item Modification\n');

    // 1. Find a recipe to use
    const recipes = await RecipeService.getRecipes(ORG_ID);
    if (recipes.length === 0) {
        console.error('❌ No recipes found. Please create a recipe first.');
        return;
    }
    const recipe = recipes[0];
    console.log(`📦 Using recipe: ${recipe.name}`);

    // 2. Get initial stock for the first ingredient
    if (recipe.items.length === 0) {
        console.error('❌ Recipe has no ingredients');
        return;
    }
    const testIngredientId = recipe.items[0].ingredientId;
    const ingredient = await InventoryService.getIngredientById(testIngredientId);
    if (!ingredient) {
        console.error('❌ Ingredient not found');
        return;
    }

    const initialStock = ingredient.currentStock;
    console.log(`📊 Initial stock for "${ingredient.name}": ${initialStock}g\n`);

    // 3. Create and confirm an order with 1 recipe
    const order = await OrderService.createDraftOrder(ORG_ID, {
        orderNumber: `TEST-${Date.now()}`,
        customerName: 'Stock Test Customer',
        date: new Date()
    });

    await OrderService.addItemToOrder(ORG_ID, order.id, {
        type: 'RECIPE',
        recipeId: recipe.id,
        format: 100, // 100g
        quantity: 1,
        unitPrice: 10
    });

    console.log(`✅ Created order ${order.orderNumber} with 1x ${recipe.name} (100g)`);

    // Confirm it (DRAFT → PAID)
    await OrderService.confirmOrder(ORG_ID, order.id);
    console.log(`✅ Confirmed order (DRAFT → PAID)`);

    // Check stock after confirmation
    const afterConfirm = await InventoryService.getIngredientById(testIngredientId);
    const stockAfterConfirm = afterConfirm!.currentStock;
    const expectedDeduction = (100 * recipe.items[0].percentage) / 100;
    console.log(`📊 Stock after confirm: ${stockAfterConfirm}g (expected: ${initialStock - expectedDeduction}g)`);

    // 4. Now modify the order to increase quantity to 2
    console.log(`\n🔄 Modifying order: increasing quantity 1 → 2`);

    await OrderService.updateOrder(
        ORG_ID,
        order.id,
        {
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            status: OrderStatus.PAID, // Keep PAID
        },
        [
            {
                type: 'RECIPE',
                recipeId: recipe.id,
                format: 100,
                quantity: 2, // ← Increased from 1 to 2
                unitPrice: 10
            }
        ]
    );

    // 5. Check final stock
    const afterModify = await InventoryService.getIngredientById(testIngredientId);
    const finalStock = afterModify!.currentStock;
    const expectedFinalStock = initialStock - (2 * expectedDeduction);

    console.log(`\n📊 Final Results:`);
    console.log(`  Initial stock:    ${initialStock}g`);
    console.log(`  After confirm:    ${stockAfterConfirm}g`);
    console.log(`  After modify:     ${finalStock}g`);
    console.log(`  Expected final:   ${expectedFinalStock}g`);

    // 6. Verify correctness
    const tolerance = 0.01; // Allow small rounding errors
    if (Math.abs(finalStock - expectedFinalStock) < tolerance) {
        console.log(`\n✅ SUCCESS: Stock deduction is correct!`);
        console.log(`   Stock properly adjusted for quantity increase.`);
    } else {
        console.log(`\n❌ FAILURE: Stock deduction is incorrect!`);
        console.log(`   Expected: ${expectedFinalStock}g`);
        console.log(`   Got:      ${finalStock}g`);
        console.log(`   Difference: ${finalStock - expectedFinalStock}g`);

        if (finalStock > expectedFinalStock) {
            console.log(`   ⚠️  Stock is HIGHER than expected (restock bug still present)`);
        } else {
            console.log(`   ⚠️  Stock is LOWER than expected (over-deduction)`);
        }
    }

    // 7. Show movements for debugging
    console.log(`\n📋 Stock Movements for this order:`);
    const movements = await InventoryService.getMovements(ORG_ID);
    const orderMovements = movements
        .filter(m => m.sourceId === order.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const movement of orderMovements) {
        const ing = await InventoryService.getIngredientById(movement.ingredientId);
        console.log(`  ${movement.type.padEnd(12)} ${movement.deltaQuantity > 0 ? '+' : ''}${movement.deltaQuantity.toFixed(2)}g ${ing?.name || movement.ingredientId} - ${movement.reason}`);
    }
}

testStockDeductionFix().catch(console.error);
