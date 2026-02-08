
import { readData } from '../src/lib/db-json';
import { Ingredient } from '../src/types/inventory';

const ingredients = readData<Ingredient[]>('ingredients.json', []);

const idCounts: Record<string, number> = {};
const duplicates: string[] = [];

ingredients.forEach(i => {
    idCounts[i.id] = (idCounts[i.id] || 0) + 1;
});

for (const id in idCounts) {
    if (idCounts[id] > 1) {
        duplicates.push(id);
    }
}

if (duplicates.length > 0) {
    console.log('❌ Duplicates found:', duplicates);
    duplicates.forEach(id => {
        const count = idCounts[id];
        const items = ingredients.filter(i => i.id === id);
        console.log(`- ID ${id} appears ${count} times. Names: ${items.map(i => i.name).join(', ')}`);
    });
} else {
    console.log('✅ No duplicates found.');
}
