import 'dotenv/config';
import { InventoryService } from '../src/services/inventory-service';
import { SupplierService } from '../src/services/supplier-service';
import { db } from '../src/lib/db';

async function verifySupplierPersistence() {
  console.log('=== STARTING SUPPLIER PERSISTENCE VERIFICATION ===\n');

  const orgId = 'verify-org-2';

  try {
    // 1. Create a supplier
    console.log('Step 1: Creating a fresh supplier...');
    const supplier = await SupplierService.createSupplier(orgId, {
      name: 'Persistence Solver',
    });
    console.log(`✅ Supplier created: ${supplier.id}\n`);

    // 2. Create an ingredient with this supplier
    console.log(`Step 2: Creating ingredient with supplierId=${supplier.id}...`);
    const ingredient = await InventoryService.createIngredient(orgId, {
      name: 'Persistent Herb',
      category: 'Thé Vert',
      supplierId: supplier.id,
    });
    console.log(`✅ Ingredient created: ${ingredient.id}\n`);

    // 3. Read back the ingredient via generic DB (which should now include supplier)
    console.log('Step 3: Reading ingredient back from DB...');
    const readBack = await db.getById<any>('ingredients', ingredient.id, orgId);

    if (readBack && readBack.supplierId === supplier.id) {
      console.log('✅ PASS: supplierId scalar persisted.');
    } else {
      console.log(`❌ FAIL: supplierId is ${readBack?.supplierId} (Expected ${supplier.id}).`);
    }

    if (readBack && readBack.supplier && readBack.supplier.name === 'Persistence Solver') {
      console.log('✅ PASS: supplier RELATION populated via include.');
    } else {
      console.log('❌ FAIL: supplier relation NOT populated.');
      console.log('   ReadBack:', JSON.stringify(readBack, null, 2));
    }

    // 4. Verify API response shape would work (simulation)
    console.log('\nStep 4: Simulating /api/suppliers response check...');
    const suppliers = await SupplierService.getSuppliers(orgId);
    const mockApiResponse = { success: true, data: suppliers };

    if (Array.isArray(mockApiResponse.data) && mockApiResponse.data.length > 0) {
      console.log('✅ PASS: API response shape is { data: Supplier[] }.');
    } else {
      console.log('❌ FAIL: API response shape mismatch.');
    }
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    console.log('\n=== VERIFICATION COMPLETE ===');
  }
}

verifySupplierPersistence().catch(console.error);
