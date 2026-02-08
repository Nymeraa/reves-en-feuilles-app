
import { readData, writeData } from '../src/lib/db-json';

const ORDER_ID = 'lwi49j';

function forceDelete() {
    console.log(`Force deleting order ${ORDER_ID}...`);

    const orders = readData<any[]>('orders.json', []);
    const initialLength = orders.length;

    const newOrders = orders.filter(o => o.id !== ORDER_ID);

    if (newOrders.length === initialLength) {
        console.error('❌ Order not found in DB!');
        return;
    }

    writeData('orders.json', newOrders);
    console.log(`✅ Order deleted! (Count: ${initialLength} -> ${newOrders.length})`);
    console.log('NOTE: Stock was NOT reverted (assuming already reverted based on history).');
}

forceDelete();
