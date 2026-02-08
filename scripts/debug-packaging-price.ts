import { InventoryService } from '../src/services/inventory-service';
import { MovementType } from '../src/types/inventory';

/**
 * Debug: Test adding stock movement for Packaging with a price
 * to see if the price is being stored correctly
 */

async function testPackagingPrice() {
  console.log('=== Testing Packaging Price Bug ===\n');

  const orgId = 'org-1';

  // 1. Create a test packaging item
  console.log('Creating test packaging item...');
  const packaging = await InventoryService.createIngredient(orgId, {
    name: 'Test Doypack 100g',
    category: 'Packaging',
    initialStock: 0,
    initialCost: 0,
    alertThreshold: 10,
  });

  console.log(`✓ Created: ${packaging.id}\n`);

  // 2. Add a purchase movement with price
  const testPrice = 2.5; // €/unit
  console.log(`Adding purchase movement with price: ${testPrice} €/U`);
  console.log(`Expected storage: ${testPrice} €/unit (NO conversion)\n`);

  try {
    const movement = await InventoryService.addMovement(
      orgId,
      packaging.id,
      MovementType.PURCHASE,
      10, // 10 units
      testPrice, // Should be stored as-is for Packaging
      'Test Purchase'
    );

    console.log('Movement created:');
    console.log(`  ID: ${movement.id}`);
    console.log(`  Delta: ${movement.deltaQuantity}`);
    console.log(`  Price stored: ${movement.unitPrice}`);
    console.log(`  Expected: ${testPrice}\n`);

    // 3. Check the ingredient's WAC
    const updated = await InventoryService.getIngredientById(packaging.id);
    console.log('Updated ingredient:');
    console.log(`  Stock: ${updated?.currentStock}`);
    console.log(`  WAC: ${updated?.weightedAverageCost}`);
    console.log(`  Expected WAC: ${testPrice}\n`);

    // Verify
    if (
      Math.abs((movement.unitPrice || 0) - testPrice) < 0.01 &&
      Math.abs((updated?.weightedAverageCost || 0) - testPrice) < 0.01
    ) {
      console.log('✅ TEST PASSED - Price stored correctly!');
    } else {
      console.error('❌ TEST FAILED - Price is WRONG!');
      console.error(`   Movement price: ${movement.unitPrice} (expected ${testPrice})`);
      console.error(`   WAC: ${updated?.weightedAverageCost} (expected ${testPrice})`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

testPackagingPrice().catch(console.error);
