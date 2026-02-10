import 'dotenv/config';
import { InventoryService } from '../src/services/inventory-service';
import { SupplierService } from '../src/services/supplier-service';
import { MovementType, EntityType, MovementSource } from '../src/types/inventory';

async function verifyIngredientFixes() {
  console.log('=== STARTING INGREDIENT & SUPPLIER FIX VERIFICATION ===\n');

  const orgId = 'verify-org';
  const supplierName = 'Verifier Supplier';

  try {
    // 1. Create a supplier
    console.log('Step 1: Creating supplier...');
    const supplier = await SupplierService.createSupplier(orgId, {
      name: supplierName,
      contactEmail: '', // Test empty string logic
    });
    console.log(`✅ Supplier created: ${supplier.id}\n`);

    // 2. Create an ingredient with initial stock and the created supplier
    const initialStock = 1500;
    const initialCost = 10; // 10€/kg -> 0.01€/g
    console.log(
      `Step 2: Creating ingredient with stock=${initialStock}g and supplierId=${supplier.id}...`
    );

    const ingredient = await InventoryService.createIngredient(orgId, {
      name: 'Verify Ingredient',
      category: 'Thé Vert',
      initialStock,
      initialCost,
      supplierId: supplier.id,
    });

    console.log('Resulting Ingredient:');
    console.log(`- ID: ${ingredient.id}`);
    console.log(`- Stock: ${ingredient.currentStock}g (Expected: ${initialStock}g)`);
    console.log(`- SupplierId: ${ingredient.supplierId} (Expected: ${supplier.id})`);
    console.log(`- WAC: ${ingredient.weightedAverageCost}€/g (Expected: 0.01€/g)\n`);

    if (ingredient.currentStock === initialStock) {
      console.log('✅ PASS: Stock not doubled.');
    } else {
      console.log(`❌ FAIL: Stock is ${ingredient.currentStock}g (Expected ${initialStock}g).`);
    }

    if (ingredient.supplierId === supplier.id) {
      console.log('✅ PASS: Supplier assigned correctly.');
    } else {
      console.log('❌ FAIL: Supplier not assigned.');
    }

    // 3. Verify stock movements
    console.log('\nStep 3: Checking movements...');
    const movements = await InventoryService.getMovements(orgId, ingredient.id);
    console.log(`Found ${movements.length} movements.`);

    const initialMovement = movements.find((m) => m.source === MovementSource.INITIAL);
    if (initialMovement) {
      console.log(`✅ PASS: Initial movement found with qty=${initialMovement.deltaQuantity}g.`);
    } else {
      console.log('❌ FAIL: No initial movement found.');
    }

    // 4. Test Update with NO_SUPPLIER
    console.log('\nStep 4: Testing update with NO_SUPPLIER...');
    const updated = await InventoryService.updateIngredient(orgId, ingredient.id, {
      name: 'Verify Ingredient Updated',
      supplierId: 'NO_SUPPLIER',
    });

    if (updated.supplierId === null) {
      console.log('✅ PASS: NO_SUPPLIER correctly converted to null.');
    } else {
      console.log(`❌ FAIL: supplierId is ${updated.supplierId} (Expected null).`);
    }
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    console.log('\n=== VERIFICATION COMPLETE ===');
  }
}

verifyIngredientFixes().catch(console.error);
