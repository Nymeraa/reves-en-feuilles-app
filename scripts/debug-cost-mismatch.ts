
import { OrderService } from '../src/services/order-service';
import { RecipeService } from '../src/services/recipe-service';
import { InventoryService } from '../src/services/inventory-service';
import { CreateOrderInput, OrderStatus } from '../src/types/order';

async function debugCostMismatch() {
    const orgId = 'org-1';
    console.log('--- Debug: Cost Mismatch ---');

    const ingredients = await InventoryService.getIngredients(orgId);
    const ing = ingredients[0];
    const costHT = ing.weightedAverageCost || 0;
    console.log(`Ingredient Cost HT: ${costHT}`);

    // Create Recipe
    const recipe = await RecipeService.createRecipe(orgId, { name: 'Mismatch Test', description: 'Test' });
    await RecipeService.updateRecipeFull(orgId, recipe.id, {
        name: 'Mismatch Test',
        description: 'Test',
        status: 'ACTIVE' as any,
        prices: {},
        items: [{ ingredientId: ing.id, percentage: 100 }]
    });

    // Get Recipe Cost (HT?)
    const r = await RecipeService.getRecipeById(recipe.id);
    if (!r) throw new Error('Recipe not found');
    console.log(`Recipe totalIngredientCost (Per Kg): ${r.totalIngredientCost}`);

    // Create Order
    const order = await OrderService.createDraftOrder(orgId, {
        customerName: 'Mismatch Tester',
        status: OrderStatus.DRAFT,
        totalAmount: 0
    });

    // Add Item (1kg)
    await OrderService.addItemToOrder(orgId, order.id, {
        type: 'RECIPE',
        recipeId: r.id,
        format: 100 as any, // 100g is standard format
        quantity: 10 // 10 * 100g = 1kg
    });

    const o = await OrderService.getOrderById(order.id);
    if (!o) throw new Error('Order missing');
    const item = o.items[0];

    console.log(`Order Item Unit Cost Snapshot: ${item.unitCostSnapshot}`);
    console.log(`Order Total COGS (Materials): ${o.cogsMaterials}`);
}

debugCostMismatch().catch(console.error);
