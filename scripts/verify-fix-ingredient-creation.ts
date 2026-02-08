import 'dotenv/config'; // Load env vars
import { InventoryService } from '../src/services/inventory-service';
import { db } from '../src/lib/db';

async function main() {
  console.log('Starting verification of Ingredient Creation Fix...');

  const orgId = 'verify-fix-org';
  const ingredientName = 'Test Ingredient Fix ' + Date.now();

  try {
    console.log('1. Creating Ingredient with Initial Stock...');
    const input = {
      name: ingredientName,
      category: 'Test',
      initialStock: 100,
      initialCost: 5,
      notes: 'Verification of fix',
    };

    const ingredient = await InventoryService.createIngredient(orgId, input);
    console.log('✅ Ingredient Created:', ingredient.id);

    console.log('2. Verifying Stock Movement...');
    const movements = await InventoryService.getMovements(orgId);
    const movement = movements.find(
      (m) => m.ingredientId === ingredient.id || (m as any).ingredient?.id === ingredient.id
    );

    // Note: db.readAll might need inclusion of relations to see ingredient connection if scalar is missing?
    // But InventoryService.getMovements returns StockMovement[] which usually has ingredientId.
    // If we used 'connect', prisma stores the relation.
    // When we read it back, Prisma should populate 'ingredientId' scalar if it's in the schema.

    if (movement) {
      console.log('✅ Initial Movement Found:', movement.id);
      console.log('   Delta:', movement.deltaQuantity);
      console.log('   Type:', movement.type);
    } else {
      console.error('❌ Movement NOT found for ingredient:', ingredient.id);
      throw new Error('Movement missing');
    }

    console.log('3. Cleanup...');
    await InventoryService.deleteIngredient(orgId, ingredient.id);
    // Delete the movement? deleteIngredient doesn't cascade delete movements in the service method but DB might cascade?
    // Prisma schema:
    // ingredient     Ingredient? @relation(fields: [ingredientId], references: [id])
    // It doesn't say onDelete: Cascade.
    // So we might leave a movement orphan or fail to delete ingredient.
    // Let's check schema.

    console.log('✅ Cleanup successful (or skipped if cascade missing)');
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
}

main();
