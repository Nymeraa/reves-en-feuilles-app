
import { OrderService } from './src/services/order-service';
import { readData } from './src/lib/db-json';
import { Order } from './src/types/order';

async function main() {
    console.log('Starting order cleanup...');
    const orders = readData<Order[]>('orders.json', []);

    // Find all orders to delete (Keep #0001, assuming orderNumber '0001')
    const toDelete = orders.filter(o => o.orderNumber !== '0001' && o.orderNumber !== '#0001');

    console.log(`Found ${toDelete.length} orders to delete. Keeping #0001.`);

    for (const order of toDelete) {
        try {
            console.log(`Deleting Order ${order.orderNumber} (ID: ${order.id})...`);
            await OrderService.deleteOrder(order.organizationId, order.id);
            console.log(`Deleted ${order.orderNumber}.`);
        } catch (error) {
            console.error(`Failed to delete ${order.orderNumber}:`, error);
        }
    }

    console.log('Cleanup complete.');
}

main().catch(console.error);
