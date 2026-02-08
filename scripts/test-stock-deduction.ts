import { readData } from '../src/lib/db-json';
import { Order, OrderStatus } from '../src/types/order';
import { StockMovement } from '../src/types/inventory';

/**
 * Simplified diagnostic: Check if recent PAID orders have corresponding stock movements
 */

console.log('🔍 Checking Stock Deduction for Recent Orders...\n');

const orders = readData<Order[]>('orders.json', []);
const movements = readData<StockMovement[]>('movements.json', []);

// Get last 5 orders sorted by creation date
const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

console.log(`📊 Found ${orders.length} total orders, analyzing last 5:\n`);

recentOrders.forEach((order, idx) => {
    const orderMovements = movements.filter(m => m.sourceId === order.id);

    console.log(`${idx + 1}. Order #${order.orderNumber || order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Items: ${order.items.length}`);
    console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);
    console.log(`   Stock Movements: ${orderMovements.length}`);

    if (order.status === OrderStatus.PAID && orderMovements.length === 0) {
        console.log(`   ❌ BUG: PAID order has NO stock movements!`);
    } else if (order.status === OrderStatus.PAID && orderMovements.length > 0) {
        console.log(`   ✅ Stock movements found:`);
        orderMovements.slice(0, 3).forEach(m => {
            console.log(`      - ${m.type}: ${m.deltaQuantity}g`);
        });
        if (orderMovements.length > 3) {
            console.log(`      ... and ${orderMovements.length - 3} more`);
        }
    } else if (order.status === OrderStatus.DRAFT) {
        console.log(`   ℹ️  DRAFT order (no movements expected)`);
    }
    console.log('');
});

// Summary
const paidOrders = recentOrders.filter(o => o.status === OrderStatus.PAID);
const paidWithMovements = paidOrders.filter(o => movements.some(m => m.sourceId === o.id));

console.log('\n📈 Summary:');
console.log(`   PAID orders in last 5: ${paidOrders.length}`);
console.log(`   PAID orders with movements: ${paidWithMovements.length}`);
console.log(`   PAID orders WITHOUT movements: ${paidOrders.length - paidWithMovements.length}`);

if (paidOrders.length > paidWithMovements.length) {
    console.log('\n❌ STOCK DEDUCTION BUG CONFIRMED');
    console.log('   Some PAID orders do not have stock movements');
} else {
    console.log('\n✅ All PAID orders have stock movements');
}
