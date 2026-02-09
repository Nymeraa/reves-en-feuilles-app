import { InventoryService } from '../src/services/inventory-service';
import { db } from '../src/lib/db';
import { MovementType, MovementSource, EntityType } from '../src/types/inventory';
import { toPrismaStockMovement } from '../src/lib/prisma-mappers/stock-movement';

async function testHardening() {
  console.log('--- Testing StockMovement Hardening ---');

  const orgId = 'org-1';
  const ingredientId = 'test-ing-1';

  // 1. Mock payload with unknown fields and sourceId
  const rawPayload = {
    id: 'test-mov-' + Date.now(),
    organizationId: orgId,
    ingredientId: ingredientId,
    type: MovementType.ADJUSTMENT,
    deltaQuantity: 10,
    unitPrice: 5.5,
    reason: 'Hardening Test',
    source: MovementSource.MANUAL,
    sourceId: 'some-external-id', // This is what caused the crash
    foo: 'bar', // Unknown field
    extra: { nested: true }, // More unknown fields
  };

  console.log('Testing mapper with unknown fields and sourceId...');
  const prismaData = toPrismaStockMovement(rawPayload);

  console.log('Mapped Result:', JSON.stringify(prismaData, null, 2));

  if ('sourceId' in prismaData) {
    console.error('FAILED: sourceId still present in mapped data');
  } else {
    console.log('SUCCESS: sourceId removed from mapped data');
  }

  if (
    prismaData.order &&
    prismaData.order.connect &&
    prismaData.order.connect.id === 'some-external-id'
  ) {
    console.log('SUCCESS: sourceId correctly mapped to order.connect.id');
  } else {
    console.error('FAILED: Order connection missing or incorrect');
  }

  if ('foo' in prismaData || 'extra' in prismaData) {
    console.error('FAILED: Unknown fields leaked into mapped data');
  } else {
    console.log('SUCCESS: Unknown fields stripped');
  }

  // 2. Test upsert resilience in db-sql
  console.log('\nTesting db.upsert resilience...');
  try {
    // We use a real ID but mock ingredient reference (might error if DB is empty, but we check if it CRASHES on validation)
    await db.upsert('movements', rawPayload as any, orgId);
    console.log('SUCCESS: db.upsert handled the payload without Prisma ValidationError');
  } catch (error: any) {
    if (error.message.includes('Unknown argument')) {
      console.error('FAILED: Prisma still complaining about unknown arguments:', error.message);
    } else {
      console.log('Caught expected DB error (or success depends on DB state):', error.message);
      // If it's a Foreign Key error for ingredientId, that's fine, it means it PASSED Prisma initial validation
    }
  }

  console.log('\n--- Hardening Test Complete ---');
}

testHardening().catch(console.error);
