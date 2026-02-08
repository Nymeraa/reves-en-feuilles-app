import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const recipesPath = join(process.cwd(), '.data', 'recipes.json');
const ordersPath = join(process.cwd(), '.data', 'orders.json');

const recipes = JSON.parse(readFileSync(recipesPath, 'utf-8'));
const orders = JSON.parse(readFileSync(ordersPath, 'utf-8'));

// Find order #0009
const order0009 = orders.find((o: any) => o.orderNumber === '#0009');

// Save to file for easier viewing
const output = {
    allRecipes: recipes.map((r: any) => ({
        name: r.name,
        id: r.id,
        totalIngredientCost: r.totalIngredientCost,
        totalCost: r.totalCost,
        items: r.items
    })),
    order0009: order0009
};

const outputPath = join(process.cwd(), 'debug_data_analysis.json');
writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`Data saved to: ${outputPath}`);
console.log('\n=== Quick Summary ===');
console.log(`\nTotal recipes: ${recipes.length}`);
console.log(`\nOrder #0009 found: ${!!order0009}`);
if (order0009) {
    console.log(`Customer: ${order0009.customerName}`);
    console.log(`COGS Materials: ${order0009.cogsMaterials}€`);
    console.log(`COGS Packaging: ${order0009.cogsPackaging}€`);
    console.log(`Items count: ${order0009.items?.length}`);

    order0009.items?.forEach((item: any, idx: number) => {
        console.log(`\nItem ${idx + 1}: ${item.name}`);
        console.log(`  Type: ${item.type}`);
        console.log(`  Format: ${item.format}g`);
        console.log(`  Quantity: ${item.quantity}`);
        console.log(`  Unit Material Cost Snapshot: ${item.unitMaterialCostSnapshot}€`);
        console.log(`  Unit Packaging Cost Snapshot: ${item.unitPackagingCostSnapshot}€`);
        console.log(`  Unit Cost Snapshot: ${item.unitCostSnapshot}€`);

        // Find corresponding recipe
        const recipe = recipes.find((r: any) => r.id === item.recipeId);
        if (recipe) {
            console.log(`  >>> Recipe "${recipe.name}":`);
            console.log(`      totalIngredientCost: ${recipe.totalIngredientCost}€/kg`);
            console.log(`      Expected cost for ${item.format}g: ${(recipe.totalIngredientCost * item.format / 1000).toFixed(4)}€ HT`);
            console.log(`      Expected cost TTC (5.5%): ${(recipe.totalIngredientCost * item.format / 1000 * 1.055).toFixed(4)}€`);
        }
    });
}
