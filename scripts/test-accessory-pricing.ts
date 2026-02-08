import { InventoryService } from '../src/services/inventory-service';

/**
 * Test: Accessory and Packaging Price Conversion
 * 
 * Verifies that:
 * 1. Bulk ingredients (thé): 20€/kg → 0.02€/g
 * 2. Packaging: 0.50€/unit → 0.50€/unit (no conversion)
 * 3. Accessoires: 15.00€/unit → 15.00€/unit (no conversion)
 */

async function testAccessoryPricing() {
    console.log('=== Test: Accessory & Packaging Pricing ===\n');

    const orgId = 'org-1';

    // Test 1: Bulk Ingredient (should convert)
    console.log('1. BULK INGREDIENT (Thé): 20.00 €/kg\n');

    const tea = await InventoryService.createIngredient(orgId, {
        name: 'Test Tea Bulk',
        category: 'Thé Vert',
        initialStock: 1000,
        initialCost: 20.00,  // €/kg
        alertThreshold: 100
    });

    console.log(`   Input: 20.00 €/kg`);
    console.log(`   Storage: ${tea.weightedAverageCost.toFixed(6)} €/g`);
    console.log(`   Expected: 0.020000 €/g`);
    console.log(`   Match: ${Math.abs(tea.weightedAverageCost - 0.02) < 0.000001 ? '✅' : '❌ FAIL'}\n`);

    // Test 2: Packaging (should NOT convert)
    console.log('2. PACKAGING (Doypack): 0.50 €/unit\n');

    const packaging = await InventoryService.createIngredient(orgId, {
        name: 'Test Doypack 100g',
        category: 'Packaging',
        initialStock: 500,
        initialCost: 0.50,  // €/unit
        alertThreshold: 50
    });

    console.log(`   Input: 0.50 €/unit`);
    console.log(`   Storage: ${packaging.weightedAverageCost.toFixed(6)} €/unit`);
    console.log(`   Expected: 0.500000 €/unit (NO conversion)`);
    console.log(`   Match: ${Math.abs(packaging.weightedAverageCost - 0.50) < 0.000001 ? '✅' : '❌ FAIL'}\n`);

    // Test 3: Accessoire (should NOT convert)
    console.log('3. ACCESSOIRE (Théière): 15.00 €/unit\n');

    const accessory = await InventoryService.createIngredient(orgId, {
        name: 'Test Théière',
        category: 'Accessoire',
        initialStock: 20,
        initialCost: 15.00,  // €/unit
        alertThreshold: 5
    });

    console.log(`   Input: 15.00 €/unit`);
    console.log(`   Storage: ${accessory.weightedAverageCost.toFixed(6)} €/unit`);
    console.log(`   Expected: 15.000000 €/unit (NO conversion)`);
    console.log(`   Match: ${Math.abs(accessory.weightedAverageCost - 15.00) < 0.000001 ? '✅' : '❌ FAIL'}\n`);

    // Summary
    const allPass =
        Math.abs(tea.weightedAverageCost - 0.02) < 0.000001 &&
        Math.abs(packaging.weightedAverageCost - 0.50) < 0.000001 &&
        Math.abs(accessory.weightedAverageCost - 15.00) < 0.000001;

    console.log('='.repeat(60));
    if (allPass) {
        console.log('✅ ALL TESTS PASSED!');
        console.log('='.repeat(60));
        console.log('\n✓ Bulk ingredients: €/kg → €/g conversion');
        console.log('✓ Packaging: No conversion (€/unit)');
        console.log('✓ Accessoires: No conversion (€/unit)');
    } else {
        throw new Error('Some price conversions failed!');
    }
}

testAccessoryPricing().catch((err) => {
    console.error('\n❌ Test FAILED:', err.message);
    process.exit(1);
});
