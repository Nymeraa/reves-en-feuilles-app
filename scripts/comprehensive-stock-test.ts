import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { OrderStatus } from '../src/types/order';

/**
 * Comprehensive test to verify stock deduction in various scenarios
 */

async function comprehensiveTest() {
    console.log('=== COMPREHENSIVE STOCK DEDUCTION TEST ===\n');
    const orgId = 'org-1';

    try {
        // Get an ingredient for testing
        const ingredients = await InventoryService.getIngredients(orgId);
        const testIngredient = ingredients.find(i => i.currentStock > 1000);

        if (!testIngredient) {
            console.error('❌ No suitable ingredient found for testing');
            return;
        }

        console.log(`📦 Using ingredient: ${testIngredient.name}`);
        console.log(`   Initial stock: ${testIngredient.currentStock}g\n`);

        // Get or create a recipe
        const recipes = await RecipeService.getRecipes(orgId);
        let testRecipe = recipes.find(r => r.items?.some(item => item.ingredientId === testIngredient.id));

        if (!testRecipe) {
            console.log('Creating test recipe...');
            testRecipe = await RecipeService.createRecipe(orgId, {
                name: 'Test Recipe for Stock',
                description: 'Automated test recipe'
            });

            await RecipeService.updateRecipeFull(orgId, testRecipe.id, {
                ...testRecipe,
                status: 'ACTIVE' as any,
                description: testRecipe.description || 'Automated test recipe',
                items: [{ ingredientId: testIngredient.id, percentage: 100 }],
                prices: { 100: 15.00 }
            });
            console.log(`✅ Created recipe: ${testRecipe.name}\n`);
        } else {
            console.log(`✅ Using existing recipe: ${testRecipe.name}\n`);
        }

        // === TEST 1: Create order as DRAFT then Confirm ===
        console.log('--- TEST 1: DRAFT → PAID Flow ---');
        const initialStock1 = (await InventoryService.getIngredientById(testIngredient.id))?.currentStock || 0;

        const order1 = await OrderService.createDraftOrder(orgId, {
            customerName: 'Test Customer 1',
            status: OrderStatus.DRAFT
        });

        await OrderService.addItemToOrder(orgId, order1.id, {
            type: 'RECIPE',
            recipeId: testRecipe.id,
            format: 100,
            quantity: 1 // 100g
        });

        const stockAfterDraft = (await InventoryService.getIngredientById(testIngredient.id))?.currentStock || 0;
        console.log(`Stock after DRAFT creation: ${stockAfterDraft}g (Expected: ${initialStock1}g - no deduction)`);

        if (stockAfterDraft !== initialStock1) {
            console.error('❌ FAIL: Stock deducted on DRAFT creation!');
        } else {
            console.log('✅ PASS: No deduction on DRAFT');
        }

        // Confirm the order
        await OrderService.confirmOrder(orgId, order1.id);
        const stockAfterConfirm = (await InventoryService.getIngredientById(testIngredient.id))?.currentStock || 0;
        console.log(`Stock after PAID confirmation: ${stockAfterConfirm}g (Expected: ${initialStock1 - 100}g)`);

        if (stockAfterConfirm !== initialStock1 - 100) {
            console.error(`❌ FAIL: Stock not correctly deducted! Difference: ${initialStock1 - stockAfterConfirm}g`);
        } else {
            console.log('✅ PASS: Stock deducted correctly\n');
        }

        // Clean up
        await OrderService.deleteOrder(orgId, order1.id);

        // === TEST 2: Create order directly as PAID ===
        console.log('--- TEST 2: Direct PAID Creation ---');
        const initialStock2 = (await InventoryService.getIngredientById(testIngredient.id))?.currentStock || 0;

        const order2 = await OrderService.createDraftOrder(orgId, {
            customerName: 'Test Customer 2',
            status: OrderStatus.PAID // ⚠️ This is the suspected issue
        });

        await OrderService.addItemToOrder(orgId, order2.id, {
            type: 'RECIPE',
            recipeId: testRecipe.id,
            format: 100,
            quantity: 1 // 100g
        });

        const stockAfterPaidCreation = (await InventoryService.getIngredientById(testIngredient.id))?.currentStock || 0;
        console.log(`Stock after PAID creation: ${stockAfterPaidCreation}g (Expected: ${initialStock2 - 100}g)`);

        if (stockAfterPaidCreation !== initialStock2 - 100) {
            console.error(`❌ FAIL: Stock NOT deducted on direct PAID creation! Difference: ${initialStock2 - stockAfterPaidCreation}g`);
            console.error('   This confirms the bug!');
        } else {
            console.log('✅ PASS: Stock deducted on PAID creation');
        }

        // Check if there are movements for this order
        const movements = await InventoryService.getMovements(orgId);
        const order2Movements = movements.filter(m => m.sourceId === order2.id);
        console.log(`Movements found for order: ${order2Movements.length}`);

        if (order2Movements.length === 0) {
            console.error('❌ No movements created for this order!');
        }

        // Clean up
        await OrderService.deleteOrder(orgId, order2.id);
        console.log('\n');

        // === TEST 3: Update status from DRAFT to PAID ===
        console.log('--- TEST 3: Status Update DRAFT → PAID ---');
        const initialStock3 = (await InventoryService.getIngredientById(testIngredient.id))?.currentStock || 0;

        const order3 = await OrderService.createDraftOrder(orgId, {
            customerName: 'Test Customer 3',
            status: OrderStatus.DRAFT
        });

        await OrderService.addItemToOrder(orgId, order3.id, {
            type: 'RECIPE',
            recipeId: testRecipe.id,
            format: 100,
            quantity: 1
        });

        // Update status to PAID using updateOrder
        await OrderService.updateOrder(orgId, order3.id, {
            customerName: 'Test Customer 3',
            status: OrderStatus.PAID
        });

        const stockAfterUpdate = (await InventoryService.getIngredientById(testIngredient.id))?.currentStock || 0;
        console.log(`Stock after status update to PAID: ${stockAfterUpdate}g (Expected: ${initialStock3 - 100}g)`);

        if (stockAfterUpdate !== initialStock3 - 100) {
            console.error(`❌ FAIL: Stock not deducted on status update! Difference: ${initialStock3 - stockAfterUpdate}g`);
        } else {
            console.log('✅ PASS: Stock deducted on status update');
        }

        // Clean up
        await OrderService.deleteOrder(orgId, order3.id);

        console.log('\n=== TEST COMPLETE ===');

    } catch (error: any) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error(error.stack);
    }
}

comprehensiveTest().catch(console.error);
