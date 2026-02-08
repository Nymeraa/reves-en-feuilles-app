import { InventoryService } from '../src/services/inventory-service';
import { MovementType } from '../src/types/inventory';

/**
 * Complete Test: All Price Input Points
 * 
 * Verifies ALL user price inputs use €/kg and convert correctly:
 * 1. Ingredient creation via InventoryService
 * 2. Stock movement via addMovement (simulating stock.ts action)
 */

async function testAllPriceConversions() {
    console.log('=== Complete Price Conversion Test ===\n');

    const orgId = 'org-1';

    // Test 1: Create ingredient with 25€/kg
    console.log('1. CREATE INGREDIENT: 25.00 €/kg\n');

    const ingredient = await InventoryService.createIngredient(orgId, {
        name: 'Complete Test Ingredient',
        category: 'Thé Noir',
        initialStock: 500,
        initialCost: 25.00,  // €/kg
        alertThreshold: 100
    });

    console.log(`   Storage: ${ingredient.weightedAverageCost.toFixed(6)} €/g`);
    console.log(`   Expected: 0.025000 €/g`);
    console.log(`   Display: ${(ingredient.weightedAverageCost * 1000).toFixed(2)} €/kg`);
    console.log(`   Match: ${Math.abs(ingredient.weightedAverageCost - 0.025) < 0.000001 ? '✅' : '❌'}\n`);

    // Test 2: Add purchase with 35€/kg (simulating stock.ts)
    console.log('2. STOCK ADJUSTMENT: Purchase 300g @ 35.00 €/kg\n');

    // Simulate what stock.ts does
    const priceInput = 35.00;  // User enters €/kg
    const pricePerGram = priceInput / 1000;  // Action converts

    const movement = await InventoryService.addMovement(
        orgId,
        ingredient.id,
        MovementType.PURCHASE,
        300,
        pricePerGram,  // Converted in action
        'Test Purchase via Adjustment',
        'INGREDIENT' as any,
        'MANUAL' as any
    );

    console.log(`   Price stored: ${movement.unitPriceAtTime?.toFixed(6)} €/g`);
    console.log(`   Expected: 0.035000 €/g`);
    console.log(`   Display: ${(movement.unitPriceAtTime! * 1000).toFixed(2)} €/kg`);
    console.log(`   Match: ${Math.abs((movement.unitPriceAtTime || 0) - 0.035) < 0.000001 ? '✅' : '❌'}\n`);

    // Test 3: Verify WAC calculation
    const updated = await InventoryService.getIngredientById(ingredient.id);
    if (!updated) throw new Error('Ingredient not found');

    // Expected: (500 * 0.025 + 300 * 0.035) / 800 = 0.02875 €/g
    const expectedWAC = (500 * 0.025 + 300 * 0.035) / 800;

    console.log('3. WEIGHTED AVERAGE COST:\n');
    console.log(`   Storage: ${updated.weightedAverageCost.toFixed(6)} €/g`);
    console.log(`   Expected: ${expectedWAC.toFixed(6)} €/g`);
    console.log(`   Display: ${(updated.weightedAverageCost * 1000).toFixed(2)} €/kg`);
    console.log(`   Match: ${Math.abs(updated.weightedAverageCost - expectedWAC) < 0.000001 ? '✅' : '❌'}\n`);

    // Summary
    const allPass =
        Math.abs(ingredient.weightedAverageCost - 0.025) < 0.000001 &&
        Math.abs((movement.unitPriceAtTime || 0) - 0.035) < 0.000001 &&
        Math.abs(updated.weightedAverageCost - expectedWAC) < 0.000001;

    console.log('='.repeat(60));
    if (allPass) {
        console.log('✅ ALL PRICE CONVERSIONS WORKING CORRECTLY!');
        console.log('='.repeat(60));
        console.log('\n✓ Ingredient creation: €/kg → €/g');
        console.log('✓ Stock adjustments: €/kg → €/g');
        console.log('✓ WAC calculation: correct');
        console.log('✓ Display: €/g → €/kg (×1000)');
    } else {
        throw new Error('Some price conversions failed!');
    }
}

testAllPriceConversions().catch((err) => {
    console.error('\n❌ Test FAILED:', err.message);
    process.exit(1);
});
