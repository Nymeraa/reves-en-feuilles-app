import { OrderService } from '../src/services/order-service';

async function deleteOrder0008() {
    console.log('Searching for order #0008...');
    const orgId = 'org-1';
    const orders = await OrderService.getOrders(orgId);

    // Try to find by orderNumber
    const order = orders.find(o => o.orderNumber === '#0008' || o.orderNumber === '0008' || o.orderNumber === '#8');

    if (!order) {
        console.error('❌ Order #0008 not found!');
        console.log('Available orders:', orders.map(o => o.orderNumber).join(', '));
        return;
    }

    console.log(`Found order: ${order.orderNumber} (ID: ${order.id})`);
    console.log(`Status: ${order.status}`);
    console.log('Deleting...');

    try {
        await OrderService.deleteOrder(orgId, order.id);
        console.log('✅ Order deleted successfully!');
    } catch (error: any) {
        console.error('❌ Failed to delete order:', error);
        console.error(error.stack);
    }
}

deleteOrder0008().catch(e => console.error('Toplevel error:', e));
