import { readFileSync } from 'fs';
import { join } from 'path';

const recipesPath = join(process.cwd(), '.data', 'recipes.json');
const ordersPath = join(process.cwd(), '.data', 'orders.json');
const ingredientsPath = join(process.cwd(), '.data', 'ingredients.json');

const recipes = JSON.parse(readFileSync(recipesPath, 'utf-8'));
const orders = JSON.parse(readFileSync(ordersPath, 'utf-8'));
const ingredients = JSON.parse(readFileSync(ingredientsPath, 'utf-8'));

console.log('=== Verification After Migration ===\n');

// Find tropbon recipe
const tropbon = recipes.find((r: any) => r.name.toLowerCase().includes('tropbon'));
if (tropbon) {
    console.log('1. Recipe "tropbon":');
    console.log(`   totalIngredientCost: ${tropbon.totalIngredientCost} €/g`);
    console.log(`   For 100g: ${(tropbon.totalIngredientCost * 100).toFixed(4)} €`);
    console.log(`   For 100g TTC (5.5%): ${(tropbon.totalIngredientCost * 100 * 1.055).toFixed(4)} €\n`);
}

// Find order #0009
const order0009 = orders.find((o: any) => o.orderNumber === '#0009');
if (order0009) {
    console.log('2. Order #0009:');
    console.log(`   Customer: ${order0009.customerName}`);
    console.log(`   COGS Materials: ${order0009.cogsMaterials.toFixed(4)} €`);
    console.log(`   COGS Packaging: ${order0009.cogsPackaging.toFixed(4)} €`);

    const item = order0009.items?.[0];
    if (item) {
        console.log(`\n   Item: ${item.name}`);
        console.log(`   Format: ${item.format}g`);
        console.log(`   Unit Material Cost Snapshot: ${item.unitMaterialCostSnapshot.toFixed(6)} €`);
        console.log(`   Unit Packaging Cost Snapshot: ${item.unitPackagingCostSnapshot.toFixed(6)} €`);
        console.log(`   Unit Cost Total: ${item.unitCostSnapshot.toFixed(6)} €`);

        // Verify calculation
        if (tropbon) {
            const expectedCost = tropbon.totalIngredientCost * (item.format / 1000) * 1.055;
            console.log(`\n   Expected cost for ${item.format}g TTC: ${expectedCost.toFixed(6)} €`);
            console.log(`   Match: ${Math.abs(item.unitMaterialCostSnapshot - expectedCost) < 0.001 ? '✓' : '✗'}`);
        }
    }
}

// Show some ingredient costs
console.log('\n3. Sample Ingredient Costs (first 5):');
ingredients.slice(0, 5).forEach((ing: any) => {
    console.log(`   ${ing.name}: ${ing.weightedAverageCost?.toFixed(6) || 0} €/g (${(ing.weightedAverageCost * 1000)?.toFixed(2) || 0} €/kg)`);
});

console.log('\n✅ Verification complete!');
