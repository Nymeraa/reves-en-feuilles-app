import { readData } from '../src/lib/db-json';
import { Order } from '../src/types/order';
import { StockMovement } from '../src/types/inventory';

/**
 * Check if recent PAID orders have proper stock movements
 */

console.log('🔍 Checking Recent Orders and Their Stock Movements\n');

const orders = readData<Order[]>('orders.json', []);
const movements = readData<StockMovement[]>('movements.json', []);

// Get last 10 orders
const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

console.log(`Found ${orders.length} total orders\n`);
console.log('Last 10 Orders:\n');

recentOrders.forEach((order, idx) => {
    const orderMovements = movements.filter(m => m.sourceId === order.id);

    console.log(`${idx + 1}. Order ${order.orderNumber || order.id}`);
    console.log(`   Customer: ${order.customerName}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Items: ${order.items?.length || 0}`);
    console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);
    console.log(`   Stock Movements: ${orderMovements.length}`);

    if (order.status === 'PAID' && orderMovements.length === 0) {
        console.log(`   ⚠️  WARNING: PAID order with NO stock movements!`);
    } else if (order.status === 'PAID' && orderMovements.length > 0) {
        console.log(`   ✅ PAID order has movements`);
    } else if (order.status === 'DRAFT') {
        console.log(`   ✅ DRAFT order (no movements expected)`);
    }

    console.log('');
});

// Summary
const paidOrders = recentOrders.filter(o => o.status === 'PAID');
const paidWithMovements = paidOrders.filter(o => movements.some(m => m.sourceId === o.id));

console.log('Summary of Last 10 Orders:');
console.log(`   PAID orders: ${paidOrders.length}`);
console.log(`   PAID with movements: ${paidWithMovements.length}`);
console.log(`   PAID WITHOUT movements: ${paidOrders.length - paidWithMovements.length}`);

if (paidOrders.length > paidWithMovements.length) {
    console.log('\n❌ ISSUE DETECTED: Some PAID orders missing stock movements');
    console.log('   This could indicate a bug in the order creation flow\n');
} else {
    console.log('\n✅ All recent PAID orders have stock movements\n');
}
