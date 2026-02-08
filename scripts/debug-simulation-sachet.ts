
import { InventoryService } from '../src/services/inventory-service';
import { Ingredient } from '../src/types/inventory';

async function debugSimulation() {
    console.log('Fetching ingredients...');
    const ingredients = await InventoryService.getIngredients('org-1');

    console.log(`Total ingredients: ${ingredients.length}`);

    const packagings = ingredients.filter(i => i.category === 'Packaging');
    console.log(`Total Packaging: ${packagings.length}`);

    // Print details of ALL packaging
    packagings.forEach(p => {
        console.log(`Packaging Item: ${p.name}`);
        console.log(` - ID: ${p.id}`);
        console.log(` - Subtype: '${p.subtype}'`);
        console.log(` - Capacity: ${p.capacity}`);
        console.log(` - Cost: ${p.weightedAverageCost}`);
        console.log('-------------------');
    });

    const doypacks = packagings.filter(i => i.subtype === 'Doypack');
    console.log(`Total Doypacks (subtype === 'Doypack'): ${doypacks.length}`);

    // Simulate mapping logic
    const getDoypackCapacity = (format: number): number => {
        if (format <= 25) return 25
        if (format <= 50) return 50
        if (format <= 100) return 100
        if (format <= 250) return 250
        if (format <= 500) return 500
        return format
    }

    const testFormats = [20, 25, 30, 50, 100];

    for (const format of testFormats) {
        const targetCapacity = getDoypackCapacity(format);
        // Loose check for capacity
        const available = ingredients.filter(i =>
            i.category === 'Packaging' &&
            i.subtype === 'Doypack' &&
            i.capacity === targetCapacity
        );
        console.log(`Format ${format}g -> Capacity ${targetCapacity}g: Found ${available.length} options.`);
        if (available.length > 0) {
            console.log(`   Auto-selected: ${available[0].name} (Cost: ${available[0].weightedAverageCost})`);
        } else {
            console.log(`   NO DOYPACK FOUND!`);
        }
    }
}

debugSimulation().catch(console.error);
