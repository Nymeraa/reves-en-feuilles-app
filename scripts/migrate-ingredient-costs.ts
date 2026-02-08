import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';

/**
 * Migration Script: Convert all ingredient costs from €/kg to €/g
 * 
 * WHY: The system was storing costs entered as €/kg directly without dividing by 1000.
 * This caused all costs to be 1000x too high in the database.
 * 
 * This script:
 * 1. Backs up existing data
 * 2. Divides all weightedAverageCost by 1000 in ingredients.json
 * 3. Divides all totalIngredientCost and totalCost by 1000 in recipes.json
 * 4. Divides all unitPriceAtTime by 1000 in movements.json
 * 5. Divides all order item costs by 1000 in orders.json
 */

async function migrateIngredientCosts() {
    console.log('=== Ingredient Cost Migration ===\n');

    const dataDir = join(process.cwd(), '.data');
    const backupDir = join(process.cwd(), '.data-backup-' + Date.now());

    // 1. Backup
    console.log('1. Creating backup...');
    try {
        const fs = await import('fs');
        fs.mkdirSync(backupDir, { recursive: true });

        const files = ['ingredients.json', 'recipes.json', 'movements.json', 'orders.json'];
        for (const file of files) {
            const src = join(dataDir, file);
            const dest = join(backupDir, file);
            copyFileSync(src, dest);
            console.log(`   ✓ Backed up ${file}`);
        }
        console.log(`   Backup created at: ${backupDir}\n`);
    } catch (err) {
        console.error('Failed to create backup:', err);
        return;
    }

    // 2. Migrate Ingredients
    console.log('2. Migrating ingredients...');
    const ingredientsPath = join(dataDir, 'ingredients.json');
    const ingredients = JSON.parse(readFileSync(ingredientsPath, 'utf-8'));

    let ingredientCount = 0;
    ingredients.forEach((ing: any) => {
        if (ing.weightedAverageCost !== undefined && ing.weightedAverageCost > 0) {
            const oldCost = ing.weightedAverageCost;
            ing.weightedAverageCost = oldCost / 1000;
            console.log(`   ${ing.name}: ${oldCost.toFixed(4)} → ${ing.weightedAverageCost.toFixed(6)} €/g`);
            ingredientCount++;
        }
    });
    writeFileSync(ingredientsPath, JSON.stringify(ingredients, null, 2));
    console.log(`   ✓ Migrated ${ingredientCount} ingredients\n`);

    // 3. Migrate Recipes
    console.log('3. Migrating recipes...');
    const recipesPath = join(dataDir, 'recipes.json');
    const recipes = JSON.parse(readFileSync(recipesPath, 'utf-8'));

    let recipeCount = 0;
    recipes.forEach((rec: any) => {
        let updated = false;
        if (rec.totalIngredientCost !== undefined && rec.totalIngredientCost > 0) {
            rec.totalIngredientCost /= 1000;
            updated = true;
        }
        if (rec.totalCost !== undefined && rec.totalCost > 0) {
            rec.totalCost /= 1000;
            updated = true;
        }
        if (updated) {
            console.log(`   ${rec.name}: cost updated`);
            recipeCount++;
        }
    });
    writeFileSync(recipesPath, JSON.stringify(recipes, null, 2));
    console.log(`   ✓ Migrated ${recipeCount} recipes\n`);

    // 4. Migrate Movements
    console.log('4. Migrating movements...');
    const movementsPath = join(dataDir, 'movements.json');
    const movements = JSON.parse(readFileSync(movementsPath, 'utf-8'));

    let movementCount = 0;
    movements.forEach((mov: any) => {
        if (mov.unitPriceAtTime !== undefined && mov.unitPriceAtTime > 0) {
            mov.unitPriceAtTime /= 1000;
            movementCount++;
        }
    });
    writeFileSync(movementsPath, JSON.stringify(movements, null, 2));
    console.log(`   ✓ Migrated ${movementCount} movements\n`);

    // 5. Migrate Orders
    console.log('5. Migrating orders...');
    const ordersPath = join(dataDir, 'orders.json');
    const orders = JSON.parse(readFileSync(ordersPath, 'utf-8'));

    let orderCount = 0;
    let itemCount = 0;
    orders.forEach((order: any) => {
        let orderUpdated = false;

        // Migrate order-level costs
        if (order.cogsMaterials !== undefined) {
            order.cogsMaterials /= 1000;
            orderUpdated = true;
        }
        if (order.cogsPackaging !== undefined) {
            order.cogsPackaging /= 1000;
            orderUpdated = true;
        }
        if (order.totalCost !== undefined) {
            order.totalCost /= 1000;
            orderUpdated = true;
        }

        // Migrate item costs (snapshots)
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
                if (item.unitCostSnapshot !== undefined) item.unitCostSnapshot /= 1000;
                if (item.unitMaterialCostSnapshot !== undefined) item.unitMaterialCostSnapshot /= 1000;
                if (item.unitPackagingCostSnapshot !== undefined) item.unitPackagingCostSnapshot /= 1000;
                itemCount++;
            });
        }

        if (orderUpdated) orderCount++;
    });
    writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
    console.log(`   ✓ Migrated ${orderCount} orders (${itemCount} items)\n`);

    // Summary
    console.log('='.repeat(50));
    console.log('✅ Migration Complete!');
    console.log(`   - ${ingredientCount} ingredients`);
    console.log(`   - ${recipeCount} recipes`);
    console.log(`   - ${movementCount} movements`);
    console.log(`   - ${orderCount} orders with ${itemCount} items`);
    console.log(`   - Backup saved to: ${backupDir}`);
    console.log('='.repeat(50));
}

migrateIngredientCosts().catch(console.error);
