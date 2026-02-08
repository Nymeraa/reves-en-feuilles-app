
import { readData } from '../src/lib/db-json';
import fs from 'fs';

const orders = readData<any[]>('orders.json', []);
const movements = readData<any[]>('movements.json', []);

const order = orders.find((o: any) => o.orderNumber === '#0008' || o.orderNumber === '0008');

if (order) {
    console.log(`Found order ID: ${order.id}`);
    const orderMovs = movements.filter((m: any) => m.sourceId === order.id || (m.reason && m.reason.includes(order.id)));

    const dump = {
        order,
        movements: orderMovs
    };

    fs.writeFileSync('temp-order.json', JSON.stringify(dump, null, 2));
    console.log('Dumped to temp-order.json');
} else {
    console.log('Order #0008 not found');
}
