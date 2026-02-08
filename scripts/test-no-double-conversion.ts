import { InventoryService } from '../src/services/inventory-service';

/**
 * Test: Verify No Double Conversion
 * 
 * Verifies that creating an ingredient with 20€/kg results in:
 * - Storage: 0.02€/g (20/1000)
 * - Display: 20€/kg (0.02*1000)  
 */

async function testNoDoubleConversion() {
    console.log('=== Test: No Double Conversion ===\n');

    const orgId = 'org-1';

    console.log('Creating ingredient with initialCost = 20.00 €/kg...\n');

    const ingredient = await InventoryService.createIngredient(orgId, {
        name: 'Test Double Conversion Fix',
        category: 'Thé Vert',
        initialStock: 1000,
        initialCost: 20.00,  // €/kg
        alertThreshold: 100
    });

    console.log(`✓ Ingredient created: ${ingredient.id}`);
    console.log(`\nStorage (weightedAverageCost):`);
    console.log(`  Actual: ${ingredient.weightedAverageCost.toFixed(6)} €/g`);
    console.log(`  Expected: 0.020000 €/g`);
    console.log(`  Match: ${Math.abs(ingredient.weightedAverageCost - 0.02) < 0.000001 ? '✅' : '❌ FAIL'}`);

    console.log(`\nDisplay (for UI in €/kg):`);
    const displayValue = ingredient.weightedAverageCost * 1000;
    console.log(`  Actual: ${displayValue.toFixed(2)} €/kg`);
    console.log(`  Expected: 20.00 €/kg`);
    console.log(`  Match: ${Math.abs(displayValue - 20.00) < 0.01 ? '✅' : '❌ FAIL'}`);

    if (Math.abs(ingredient.weightedAverageCost - 0.02) < 0.000001 &&
        Math.abs(displayValue - 20.00) < 0.01) {
        console.log('\n' + '='.repeat(50));
        console.log('✅ NO DOUBLE CONVERSION - TEST PASSED!');
        console.log('='.repeat(50));
    } else {
        console.error('\n❌ DOUBLE CONVERSION STILL EXISTS!');
        console.error(`Expected storage: 0.02€/g, Got: ${ingredient.weightedAverageCost}€/g`);
        console.error(`Expected display: 20€/kg, Got: ${displayValue}€/kg`);
        process.exit(1);
    }
}

testNoDoubleConversion().catch((err) => {
    console.error('\n❌ Test FAILED:', err);
    process.exit(1);
});
