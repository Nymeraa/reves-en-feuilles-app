
import { OrderService } from '../src/services/order-service';
import { RecipeService } from '../src/services/recipe-service';
import { PackService } from '../src/services/pack-service';
import { InventoryService } from '../src/services/inventory-service';
import { OrderStatus, AddOrderItemInput } from '../src/types/order';

async function comprehensiveVerification() {
    const orgId = 'org-1';
    console.log('=== Comprehensive Cost Verification ===\n');

    // 1. Create test recipe
    console.log('1. Creating test recipe...');
    const ingredients = await InventoryService.getIngredients(orgId);
    const testIng = ingredients[0];
    if (!testIng) throw new Error('No ingredients available');

    const ingCostHT = testIng.weightedAverageCost || 0;
    const ingCostTTC = ingCostHT * 1.055; // 5.5% VAT
    console.log(`   Ingredient: ${testIng.name}`);
    console.log(`   Cost HT: ${ingCostHT.toFixed(4)}€`);
    console.log(`   Cost TTC: ${ingCostTTC.toFixed(4)}€`);

    const recipe = await RecipeService.createRecipe(orgId, {
        name: 'Test Verification Recipe',
        description: 'For comprehensive verification'
    });

    await RecipeService.updateRecipeFull(orgId, recipe.id, {
        name: 'Test Verification Recipe',
        description: 'For comprehensive verification',
        status: 'ACTIVE' as any,
        prices: {},
        items: [{ ingredientId: testIng.id, percentage: 100 }]
    });

    const r = await RecipeService.getRecipeById(recipe.id);
    if (!r) throw new Error('Recipe not found');
    console.log(`   Recipe cost per kg (HT): ${r.totalIngredientCost}€\n`);

    // 2. Create order with recipe item
    console.log('2. Creating order with recipe item (100g format)...');
    const order = await OrderService.createDraftOrder(orgId, {
        customerName: 'Comprehensive Tester',
        status: OrderStatus.DRAFT,
        totalAmount: 0
    });

    await OrderService.addItemToOrder(orgId, order.id, {
        type: 'RECIPE',
        recipeId: r.id,
        format: 100 as any,
        quantity: 1
    });

    let o = await OrderService.getOrderById(order.id);
    if (!o) throw new Error('Order not found');

    const item = o.items[0];
    console.log(`   Item: ${item.name}`);
    console.log(`   Unit Material Cost Snapshot: ${item.unitMaterialCostSnapshot.toFixed(4)}€`);
    console.log(`   Unit Packaging Cost Snapshot: ${item.unitPackagingCostSnapshot.toFixed(4)}€`);
    console.log(`   Unit Cost Snapshot (Total): ${item.unitCostSnapshot.toFixed(4)}€`);

    // Expected material cost: 100g = 0.1kg * costPerKg(HT) * 1.055 (VAT)
    const expectedMatCost = 0.1 * (r.totalIngredientCost || 0) * 1.055;
    console.log(`   Expected Material Cost TTC: ${expectedMatCost.toFixed(4)}€`);

    // 3. Verify order totals
    console.log(`\n3. Verifying order financials...`);
    console.log(`   Order COGS Materials: ${o.cogsMaterials.toFixed(4)}€`);
    console.log(`   Order COGS Packaging: ${o.cogsPackaging.toFixed(4)}€`);
    console.log(`   Order Total Cost: ${o.totalCost.toFixed(4)}€`);

    // Expected: cogsMaterials = unitMaterialCostSnapshot * quantity
    const expectedCogsMat = item.unitMaterialCostSnapshot * item.quantity;
    const expectedCogsPack = item.unitPackagingCostSnapshot * item.quantity;
    console.log(`   Expected COGS Materials: ${expectedCogsMat.toFixed(4)}€`);
    console.log(`   Expected COGS Packaging: ${expectedCogsPack.toFixed(4)}€`);

    // 4. Validation checks
    console.log(`\n4. Running validation checks...`);
    let passed = true;

    // Check 1: Material cost snapshot matches calculation
    if (Math.abs(item.unitMaterialCostSnapshot - expectedMatCost) < 0.001) {
        console.log('   ✓ Material cost snapshot is correct');
    } else {
        console.error(`   ✗ Material cost snapshot mismatch!`);
        passed = false;
    }

    // Check 2: Unit cost = material + packaging
    if (Math.abs(item.unitCostSnapshot - (item.unitMaterialCostSnapshot + item.unitPackagingCostSnapshot)) < 0.001) {
        console.log('   ✓ Unit cost equals material + packaging');
    } else {
        console.error(`   ✗ Unit cost doesn't match sum of material and packaging!`);
        passed = false;
    }

    // Check 3: COGS materials matches snapshot * quantity
    if (Math.abs(o.cogsMaterials - expectedCogsMat) < 0.01) {
        console.log('   ✓ COGS materials matches material snapshot * quantity');
    } else {
        console.error(`   ✗ COGS materials mismatch!`);
        passed = false;
    }

    // Check 4: COGS packaging matches snapshot * quantity
    if (Math.abs(o.cogsPackaging - expectedCogsPack) < 0.01) {
        console.log('   ✓ COGS packaging matches packaging snapshot * quantity');
    } else {
        console.error(`   ✗ COGS packaging mismatch!`);
        passed = false;
    }

    // Check 5: Total cost = materials + packaging
    if (Math.abs(o.totalCost - (o.cogsMaterials + o.cogsPackaging)) < 0.01) {
        console.log('   ✓ Total cost equals materials + packaging');
    } else {
        console.error(`   ✗ Total cost calculation error!`);
        passed = false;
    }

    console.log(`\n${'='.repeat(50)}`);
    if (passed) {
        console.log('✓✓✓ ALL CHECKS PASSED ✓✓✓');
    } else {
        console.error('✗✗✗ SOME CHECKS FAILED ✗✗✗');
    }
    console.log('='.repeat(50));
}

comprehensiveVerification().catch(console.error);
