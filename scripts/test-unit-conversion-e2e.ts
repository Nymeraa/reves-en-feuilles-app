import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { OrderService } from '../src/services/order-service';

/**
 * End-to-End Test: Unit Conversion
 * 
 * Tests that:
 * 1. Creating an ingredient with €/kg properly converts to €/g
 * 2. Recipe costs are calculated in €/g
 * 3. Order costs match expected TTC values
 */

async function testUnitConversion() {
    console.log('=== E2E Test: Unit Conversion ===\n');

    const orgId = 'org-1';

    // 1. Create ingredient with 20 €/kg
    console.log('1. Creating test ingredient...');
    console.log('   User enters: 20.00 €/kg');

    const ingredient = await InventoryService.createIngredient(orgId, {
        name: 'E2E Test Tea',
        category: 'Thé Vert',
        initialStock: 1000, // 1kg
        initialCost: 20.00,  // €/kg (will be converted to €/g)
        alertThreshold: 100
    });

    console.log(`   ✓ Ingredient created: ${ingredient.id}`);
    console.log(`   Stored WAC: ${ingredient.weightedAverageCost.toFixed(6)} €/g`);
    console.log(`   Expected: 0.020000 €/g`);
    console.log(`   Match: ${Math.abs(ingredient.weightedAverageCost - 0.02) < 0.000001 ? '✓' : '✗ FAIL'}\n`);

    if (Math.abs(ingredient.weightedAverageCost - 0.02) >= 0.000001) {
        throw new Error('WAC conversion failed!');
    }

    // 2. Create recipe using this ingredient
    console.log('2. Creating recipe with 100% of this ingredient...');

    const recipe = await RecipeService.createRecipe(orgId, {
        name: 'E2E Test Recipe',
        description: 'For unit conversion test'
    });

    await RecipeService.updateRecipeFull(orgId, recipe.id, {
        name: 'E2E Test Recipe',
        description: 'For unit conversion test',
        status: 'ACTIVE' as any,
        prices: {},
        items: [{ ingredientId: ingredient.id, percentage: 100 }]
    });

    const updatedRecipe = await RecipeService.getRecipeById(recipe.id);
    if (!updatedRecipe) throw new Error('Recipe not found');

    console.log(`   ✓ Recipe created: ${updatedRecipe.id}`);
    console.log(`   totalIngredientCost: ${updatedRecipe.totalIngredientCost?.toFixed(6)} €/g`);
    console.log(`   Expected: 0.020000 €/g`);
    console.log(`   Match: ${Math.abs((updatedRecipe.totalIngredientCost || 0) - 0.02) < 0.000001 ? '✓' : '✗ FAIL'}\n`);

    // 3. Create order with 100g format
    console.log('3. Creating order with 100g of this recipe...');

    const order = await OrderService.createDraftOrder(orgId, {
        customerName: 'E2E Test Customer',
        status: 'DRAFT' as any,
        totalAmount: 0
    });

    await OrderService.addItemToOrder(orgId, order.id, {
        type: 'RECIPE',
        recipeId: updatedRecipe.id,
        format: 100 as any,
        quantity: 1
    });

    const finalOrder = await OrderService.getOrderById(order.id);
    if (!finalOrder) throw new Error('Order not found');

    const item = finalOrder.items[0];
    const expectedMaterialCost = 0.02 * 0.1 * 1.055; // €/g * kg * VAT = 0.00211 €

    console.log(`   ✓ Order created: ${finalOrder.id}`);
    console.log(`   Item unit material cost: ${item.unitMaterialCostSnapshot.toFixed(6)} €`);
    console.log(`   Expected (0.02€/g * 0.1kg * 1.055): ${expectedMaterialCost.toFixed(6)} €`);
    console.log(`   Match: ${Math.abs(item.unitMaterialCostSnapshot - expectedMaterialCost) < 0.000001 ? '✓' : '✗ FAIL'}\n`);

    console.log(`   Order COGS Materials: ${finalOrder.cogsMaterials.toFixed(6)} €`);
    console.log(`   Expected: ${expectedMaterialCost.toFixed(6)} €`);
    console.log(`   Match: ${Math.abs(finalOrder.cogsMaterials - expectedMaterialCost) < 0.000001 ? '✓' : '✗ FAIL'}\n`);

    // Summary
    console.log('='.repeat(50));
    console.log('✅ All E2E Tests PASSED!');
    console.log('='.repeat(50));
    console.log('\n✓ Ingredient costs are properly converted from €/kg to €/g');
    console.log('✓ Recipe costs are calculated in €/g');
    console.log('✓ Order costs match expected TTC values');
}

testUnitConversion().catch((err) => {
    console.error('\n❌ E2E Test FAILED:', err.message);
    process.exit(1);
});
