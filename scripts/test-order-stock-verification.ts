/**
 * Comprehensive Order Stock Verification Test
 * 
 * This script tests all critical order stock deduction scenarios:
 * 1. Create order with PAID status → stock deducted
 * 2. Create order as DRAFT → stock NOT deducted
 * 3. Confirm DRAFT order → stock deducted
 * 4. Cancel PAID order → stock restored
 * 5. Update order items while PAID → stock recalculated
 * 6. Status transitions (PAID → SHIPPED → DELIVERED) → no duplicate deductions
 */

import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { OrderStatus } from '../src/types/order';
import { readData, writeData } from '../src/lib/db-json';

const ORG_ID = 'org-1';

interface TestResult {
    scenario: string;
    passed: boolean;
    error?: string;
    details?: any;
}

const results: TestResult[] = [];

async function getIngredientStock(ingredientId: string): Promise<number> {
    const ingredient = await InventoryService.getIngredientById(ingredientId);
    return ingredient?.currentStock || 0;
}

async function logTest(scenario: string, passed: boolean, error?: string, details?: any) {
    results.push({ scenario, passed, error, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status}: ${scenario}`);
    if (error) console.error(`  Error: ${error}`);
    if (details) console.log(`  Details:`, details);
}

async function runTests() {
    console.log('🧪 Starting Order Stock Verification Tests\n');
    console.log('='.repeat(60));

    try {
        // Find a recipe and ingredient to test with
        const recipes = await RecipeService.getRecipes(ORG_ID);
        if (recipes.length === 0) {
            throw new Error('No recipes found. Please create at least one recipe before running tests.');
        }

        const testRecipe = recipes[0];
        if (!testRecipe.items || testRecipe.items.length === 0) {
            throw new Error('Test recipe has no ingredients. Please use a recipe with ingredients.');
        }

        const testIngredient = testRecipe.items[0];
        const testFormat = 100; // 100g
        const testQuantity = 2; // 2 items

        console.log(`\n📋 Test Setup:`);
        console.log(`  Recipe: ${testRecipe.name} (ID: ${testRecipe.id})`);
        console.log(`  Ingredient: ${testIngredient.ingredientId}`);
        console.log(`  Format: ${testFormat}g`);
        console.log(`  Quantity: ${testQuantity}`);

        // Calculate expected stock change for this order
        const totalGrams = testFormat * testQuantity;
        const expectedDeduction = (totalGrams * testIngredient.percentage) / 100;

        console.log(`  Expected stock deduction: ${expectedDeduction.toFixed(2)}g`);
        console.log('='.repeat(60));

        // ========================================
        // TEST 1: Create order with PAID status → stock should be deducted
        // ========================================
        {
            const initialStock = await getIngredientStock(testIngredient.ingredientId);

            const order = await OrderService.createDraftOrder(ORG_ID, {
                orderNumber: 'TEST-PAID-001',
                customerName: 'Test Customer PAID',
                status: OrderStatus.DRAFT
            });

            await OrderService.addItemToOrder(ORG_ID, order.id, {
                type: 'RECIPE',
                recipeId: testRecipe.id,
                format: testFormat,
                quantity: testQuantity
            });

            // Confirm to PAID (should deduct stock)
            await OrderService.confirmOrder(ORG_ID, order.id);

            const stockAfterPaid = await getIngredientStock(testIngredient.ingredientId);
            const actualChange = stockAfterPaid - initialStock;
            const expectedChange = -expectedDeduction;
            const tolerance = 0.01; // Allow 0.01g tolerance for rounding

            const passed = Math.abs(actualChange - expectedChange) < tolerance;

            await logTest(
                'Scenario 1: Create order with PAID status → stock deducted',
                passed,
                passed ? undefined : `Stock change mismatch. Expected: ${expectedChange.toFixed(2)}g, Actual: ${actualChange.toFixed(2)}g`,
                { initialStock, stockAfterPaid, actualChange, expectedChange }
            );

            // Cleanup: Delete the test order
            await OrderService.deleteOrder(ORG_ID, order.id);
        }

        // ========================================
        // TEST 2: Create order as DRAFT → stock should NOT be deducted
        // ========================================
        {
            const initialStock = await getIngredientStock(testIngredient.ingredientId);

            const order = await OrderService.createDraftOrder(ORG_ID, {
                orderNumber: 'TEST-DRAFT-001',
                customerName: 'Test Customer DRAFT',
                status: OrderStatus.DRAFT
            });

            await OrderService.addItemToOrder(ORG_ID, order.id, {
                type: 'RECIPE',
                recipeId: testRecipe.id,
                format: testFormat,
                quantity: testQuantity
            });

            const stockAfterDraft = await getIngredientStock(testIngredient.ingredientId);
            const actualChange = stockAfterDraft - initialStock;

            const passed = actualChange === 0;

            await logTest(
                'Scenario 2: Create order as DRAFT → stock NOT deducted',
                passed,
                passed ? undefined : `Stock should not change. Expected: 0g, Actual: ${actualChange.toFixed(2)}g`,
                { initialStock, stockAfterDraft, actualChange }
            );

            // Cleanup
            await OrderService.deleteOrder(ORG_ID, order.id);
        }

        // ========================================
        // TEST 3: Confirm DRAFT order → stock should be deducted
        // ========================================
        {
            const initialStock = await getIngredientStock(testIngredient.ingredientId);

            const order = await OrderService.createDraftOrder(ORG_ID, {
                orderNumber: 'TEST-CONFIRM-001',
                customerName: 'Test Customer CONFIRM',
                status: OrderStatus.DRAFT
            });

            await OrderService.addItemToOrder(ORG_ID, order.id, {
                type: 'RECIPE',
                recipeId: testRecipe.id,
                format: testFormat,
                quantity: testQuantity
            });

            const stockAfterDraft = await getIngredientStock(testIngredient.ingredientId);

            // Now confirm the order
            await OrderService.confirmOrder(ORG_ID, order.id);

            const stockAfterConfirm = await getIngredientStock(testIngredient.ingredientId);
            const changeFromConfirm = stockAfterConfirm - stockAfterDraft;
            const expectedChange = -expectedDeduction;
            const tolerance = 0.01;

            const passed = Math.abs(changeFromConfirm - expectedChange) < tolerance;

            await logTest(
                'Scenario 3: Confirm DRAFT order → stock deducted',
                passed,
                passed ? undefined : `Stock change mismatch. Expected: ${expectedChange.toFixed(2)}g, Actual: ${changeFromConfirm.toFixed(2)}g`,
                { initialStock, stockAfterDraft, stockAfterConfirm, changeFromConfirm, expectedChange }
            );

            // Cleanup
            await OrderService.deleteOrder(ORG_ID, order.id);
        }

        // ========================================
        // TEST 4: Cancel PAID order → stock should be restored
        // ========================================
        {
            const initialStock = await getIngredientStock(testIngredient.ingredientId);

            // Create and confirm order
            const order = await OrderService.createDraftOrder(ORG_ID, {
                orderNumber: 'TEST-CANCEL-001',
                customerName: 'Test Customer CANCEL',
                status: OrderStatus.DRAFT
            });

            await OrderService.addItemToOrder(ORG_ID, order.id, {
                type: 'RECIPE',
                recipeId: testRecipe.id,
                format: testFormat,
                quantity: testQuantity
            });

            await OrderService.confirmOrder(ORG_ID, order.id);

            const stockAfterPaid = await getIngredientStock(testIngredient.ingredientId);

            // Cancel the order
            await OrderService.cancelOrder(ORG_ID, order.id);

            const stockAfterCancel = await getIngredientStock(testIngredient.ingredientId);
            const tolerance = 0.01;

            const passed = Math.abs(stockAfterCancel - initialStock) < tolerance;

            await logTest(
                'Scenario 4: Cancel PAID order → stock restored',
                passed,
                passed ? undefined : `Stock not restored to initial level. Initial: ${initialStock.toFixed(2)}g, After Cancel: ${stockAfterCancel.toFixed(2)}g`,
                { initialStock, stockAfterPaid, stockAfterCancel }
            );

            // Cleanup
            await OrderService.deleteOrder(ORG_ID, order.id);
        }

        // ========================================
        // TEST 5: Update order items while PAID → stock should be recalculated
        // ========================================
        {
            const initialStock = await getIngredientStock(testIngredient.ingredientId);

            // Create and confirm order with 2 items
            const order = await OrderService.createDraftOrder(ORG_ID, {
                orderNumber: 'TEST-UPDATE-001',
                customerName: 'Test Customer UPDATE',
                status: OrderStatus.DRAFT
            });

            await OrderService.addItemToOrder(ORG_ID, order.id, {
                type: 'RECIPE',
                recipeId: testRecipe.id,
                format: testFormat,
                quantity: testQuantity // 2 items
            });

            await OrderService.confirmOrder(ORG_ID, order.id);

            const stockAfterPaid = await getIngredientStock(testIngredient.ingredientId);

            // Update order to have 3 items (increase quantity)
            const newQuantity = 3;
            await OrderService.updateOrder(ORG_ID, order.id, {
                orderNumber: 'TEST-UPDATE-001',
                customerName: 'Test Customer UPDATE',
                status: OrderStatus.PAID
            }, [
                {
                    type: 'RECIPE',
                    recipeId: testRecipe.id,
                    format: testFormat,
                    quantity: newQuantity // 3 items now
                }
            ]);

            const stockAfterUpdate = await getIngredientStock(testIngredient.ingredientId);

            // Calculate expected final stock
            const newTotalGrams = testFormat * newQuantity;
            const newExpectedDeduction = (newTotalGrams * testIngredient.percentage) / 100;
            const expectedFinalStock = initialStock - newExpectedDeduction;
            const tolerance = 0.01;

            const passed = Math.abs(stockAfterUpdate - expectedFinalStock) < tolerance;

            await logTest(
                'Scenario 5: Update order items while PAID → stock recalculated',
                passed,
                passed ? undefined : `Stock not recalculated correctly. Expected: ${expectedFinalStock.toFixed(2)}g, Actual: ${stockAfterUpdate.toFixed(2)}g`,
                { initialStock, stockAfterPaid, stockAfterUpdate, expectedFinalStock }
            );

            // Cleanup
            await OrderService.deleteOrder(ORG_ID, order.id);
        }

        // ========================================
        // TEST 6: Status transitions (PAID → SHIPPED → DELIVERED) → no duplicate deductions
        // ========================================
        {
            const initialStock = await getIngredientStock(testIngredient.ingredientId);

            // Create and confirm order
            const order = await OrderService.createDraftOrder(ORG_ID, {
                orderNumber: 'TEST-TRANSITION-001',
                customerName: 'Test Customer TRANSITION',
                status: OrderStatus.DRAFT
            });

            await OrderService.addItemToOrder(ORG_ID, order.id, {
                type: 'RECIPE',
                recipeId: testRecipe.id,
                format: testFormat,
                quantity: testQuantity
            });

            await OrderService.confirmOrder(ORG_ID, order.id);

            const stockAfterPaid = await getIngredientStock(testIngredient.ingredientId);

            // Transition to SHIPPED
            await OrderService.updateOrder(ORG_ID, order.id, {
                orderNumber: 'TEST-TRANSITION-001',
                customerName: 'Test Customer TRANSITION',
                status: OrderStatus.SHIPPED
            });

            const stockAfterShipped = await getIngredientStock(testIngredient.ingredientId);

            // Transition to DELIVERED
            await OrderService.updateOrder(ORG_ID, order.id, {
                orderNumber: 'TEST-TRANSITION-001',
                customerName: 'Test Customer TRANSITION',
                status: OrderStatus.DELIVERED
            });

            const stockAfterDelivered = await getIngredientStock(testIngredient.ingredientId);

            const tolerance = 0.01;
            const passed =
                Math.abs(stockAfterShipped - stockAfterPaid) < tolerance &&
                Math.abs(stockAfterDelivered - stockAfterPaid) < tolerance;

            await logTest(
                'Scenario 6: Status transitions (PAID → SHIPPED → DELIVERED) → no duplicate deductions',
                passed,
                passed ? undefined : `Stock changed during status transitions. Should remain constant after PAID.`,
                { initialStock, stockAfterPaid, stockAfterShipped, stockAfterDelivered }
            );

            // Cleanup
            await OrderService.deleteOrder(ORG_ID, order.id);
        }

    } catch (error: any) {
        console.error('\n❌ Test suite failed with error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n⚠️  FAILED TESTS:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.scenario}`);
            if (r.error) console.log(`    ${r.error}`);
        });
    }

    console.log('\n' + '='.repeat(60));

    if (failed === 0) {
        console.log('✅ All tests passed! Order stock logic is working correctly.');
        process.exit(0);
    } else {
        console.log('❌ Some tests failed. Please review the stock deduction logic.');
        process.exit(1);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
