
import { PackService } from '../src/services/pack-service';
import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { PackStatus } from '../src/types/pack';
import { ReadStream } from 'fs';

// Mock DB or just run against dev DB?
// Running against dev DB is risky if we mess up data. 
// But "scratch" folder implies dev/test env.

async function verify() {
    console.log('--- STARTING PACK VERIFICATION ---');

    // 1. Create a PACK
    console.log('1. Creating Pack...');
    const pack = await PackService.createPack('org-1', {
        name: 'AutoAudit Pack',
        description: 'Test Pack'
    });

    // Add ingredients to a recipe then add to pack?
    // Let's assume existing recipe 'rec-1' exists (Morning Blend)

    // Update Pack with Items
    // Need Recipe ID.
    const recipes = await RecipeService.getRecipes('org-1');
    const recipe = recipes[0];
    if (!recipe) throw new Error('No recipes found to test with');

    console.log(`Using Recipe: ${recipe.name} (Cost: ${recipe.totalIngredientCost})`);

    // Update Pack (Active, Price 50)
    console.log('2. Updating Pack (Active)...');
    const updatedPack = await PackService.updatePackFull('org-1', pack.id, {
        recipes: [{ id: 'item-1', recipeId: recipe.id, quantity: 2, format: 100 }], // 2x 100g
        packaging: [],
        price: 50,
        status: PackStatus.ACTIVE
    });

    console.log(`Pack Cost: ${updatedPack.totalCost}`);
    console.log(`Pack Version: ${updatedPack.version}`);

    if (updatedPack.totalCost === 0) console.warn('WARNING: Pack Cost is 0. Check logic.');

    // 3. Sell Pack
    console.log('3. Creating Order for Pack...');
    const order = await OrderService.createDraftOrder('org-1', { customerName: 'Audit Bot' });
    await OrderService.addItemToOrder('org-1', order.id, {
        type: 'PACK',
        packId: pack.id,
        quantity: 1,
        // format is ignored for pack usually, or describes pack size?
        format: 20,
    });

    // 4. Confirm Order
    console.log('4. Confirming Order...');
    await OrderService.confirmOrder('org-1', order.id);

    console.log('--- VERIFICATION COMPLETE (Check logs/files for stock) ---');
}

verify().catch(console.error);
