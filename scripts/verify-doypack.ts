
import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { PackagingService } from '../src/services/packaging-service';
import { IngredientStatus, MovementType, EntityType } from '../src/types/inventory';
import { RecipeStatus } from '../src/types/recipe';
import { OrderStatus } from '../src/types/order';

async function main() {
    console.log('--- STARTING DOYPACK VERIFICATION ---');
    const orgId = 'verify-org-' + Math.random().toString(36).substring(7);

    // 1. Create Ingredients
    const sachet100Id = await InventoryService.createIngredient(orgId, {
        name: 'Doypack 100g Test',
        subtype: 'Sachet', // Important!
        capacity: 100,      // Important!
        initialStock: 100,
        initialCost: 0.20,
        category: 'Packaging'
    });

    const teaId = await InventoryService.createIngredient(orgId, {
        name: 'Tea Leaf Test',
        initialStock: 10000,
        initialCost: 0.05 // per gram, expensive tea! 50€/kg
    });

    console.log('Ingredients Created:', { sachet100Id: sachet100Id.id, teaId: teaId.id });

    // 2. Create Recipe
    const recipe = await RecipeService.createRecipe(orgId, { name: 'Test Recipe' });
    await RecipeService.updateRecipeFull(orgId, recipe.id, {
        name: 'Test Recipe',
        description: 'Test',
        status: RecipeStatus.ACTIVE,
        prices: { 100: 15 },
        items: [{ ingredientId: teaId.id, percentage: 100 }]
    });

    console.log('Recipe Created:', recipe.id);

    // 3. Create Order
    const order = await OrderService.createDraftOrder(orgId, {
        customerName: 'Test Customer',
        status: OrderStatus.DRAFT
    });

    // Add 3x 100g
    await OrderService.addItemToOrder(orgId, order.id, {
        type: 'RECIPE',
        recipeId: recipe.id,
        format: 100,
        quantity: 3
    });

    console.log('Order Created:', order.id);

    // DEBUG: Test Packaging Service Lookup directly
    const foundSachet = await PackagingService.findPackagingForFormat(orgId, 100, 'Sachet');
    console.log('DEBUG: Lookup Result:', foundSachet ? foundSachet.id : 'NOT FOUND');
    if (!foundSachet) {
        console.log('DEBUG: All Ingredients:', (await InventoryService.getIngredients(orgId)).map(i => ({ n: i.name, s: i.subtype, c: i.capacity })));
    }

    // 4. Confirm Order (Should Validation Doypack Logic)
    console.log('Confirming Order...');
    await OrderService.confirmOrder(orgId, order.id);

    // 5. Verify Stock
    const sachet = (await InventoryService.getIngredients(orgId)).find(i => i.id === sachet100Id.id);
    console.log(`Sachet Stock (Expected 97): ${sachet?.currentStock}`);
    if (sachet?.currentStock !== 97) throw new Error('Stock deduction failed!');

    const tea = (await InventoryService.getIngredients(orgId)).find(i => i.id === teaId.id);
    // Sold 3 * 100g = 300g. Initial 10000 -> 9700.
    console.log(`Tea Stock (Expected 9700): ${tea?.currentStock}`);
    if (tea?.currentStock !== 9700) throw new Error('Tea stock deduction failed!');

    const updatedOrder = await OrderService.getOrderById(order.id);
    console.log('Checking Order COGS...');
    // COGS Packaging: 3 * 0.20 = 0.60
    console.log(`COGS Packaging (Expected 0.60): ${updatedOrder?.cogsPackaging}`);
    if (Math.abs((updatedOrder?.cogsPackaging || 0) - 0.60) > 0.01) throw new Error('COGS Packaging wrong!');

    // 6. Cancel Order (Restock)
    console.log('Cancelling Order...');
    await OrderService.cancelOrder(orgId, order.id);

    const sachetRestocked = (await InventoryService.getIngredients(orgId)).find(i => i.id === sachet100Id.id);
    console.log(`Final Sachet Stock: ${sachetRestocked?.currentStock}`);
    if (sachetRestocked?.currentStock !== 100) throw new Error(`Stock restock failed! Got ${sachetRestocked?.currentStock} id=${sachetRestocked?.id}`);

    console.log('--- VERIFICATION SUCCESS ---');
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
