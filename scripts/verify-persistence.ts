import * as dotenv from 'dotenv';
dotenv.config();
process.env.DB_DRIVER = 'sql'; // Force SQL

import { OrderService } from '../src/services/order-service';

async function main() {
  console.log('Verifying parcelWeightGrams persistence in Supabase (Forced SQL)...');
  const testId = 'test-sync-' + Date.now();
  try {
    const order = await OrderService.createDraftOrder('org-1', {
      customerName: 'Test Sync SQL',
      parcelWeightGrams: 888,
    });
    console.log('Order created with weight:', order.parcelWeightGrams);

    const readBack = await OrderService.getOrderById(order.id);
    console.log('Read back weight:', readBack?.parcelWeightGrams);

    if (readBack?.parcelWeightGrams === 888) {
      console.log('SUCCESS: Field persists in Supabase!');
    } else {
      console.error('FAILURE: Field did NOT persist. Result:', readBack?.parcelWeightGrams);
    }

    await OrderService.deleteOrder('org-1', order.id);
  } catch (e) {
    console.error('ERROR during verification:', e);
  }
}

main();
