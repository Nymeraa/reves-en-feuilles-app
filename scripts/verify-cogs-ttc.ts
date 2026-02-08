
import { OrderService as Service } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { CreateOrderInput, OrderStatus } from '../src/types/order';
import { RecipeStatus } from '../src/types/recipe';

async function verifyCogsTTC() {
    console.log('--- Verification: COGS TTC ---');
    const orgId = 'org-1';

    // 1. Get an Ingredient and its cost
    const ingredients = await InventoryService.getIngredients(orgId);
    const ing = ingredients[0];
    if (!ing) throw new Error('No ingredients');

    const costHT = ing.weightedAverageCost || 0;
    console.log(`Ingredient: ${ing.name} (HT: ${costHT}€)`);

    // 2. Create Recipe using this ingredient
    const recipe = await RecipeService.createRecipe(orgId, { name: 'TTC Test Recipe', description: 'Test' });
    await RecipeService.updateRecipeFull(orgId, recipe.id, {
        name: 'TTC Test Recipe',
        description: 'Test',
        status: RecipeStatus.ACTIVE,
        prices: {},
        items: [{ ingredientId: ing.id, percentage: 100 }]
    });

    // 3. Create Order with this recipe
    const order = await Service.createDraftOrder(orgId, {
        customerName: 'TTC Tester',
        status: OrderStatus.DRAFT,
        totalAmount: 0
    });

    await Service.addItemToOrder(orgId, order.id, {
        type: 'RECIPE',
        recipeId: recipe.id,
        format: 500, // 500g format
        quantity: 1
    });

    const updated = await Service.getOrderById(order.id);
    if (!updated) throw new Error('Order missing');

    const cogs = updated.cogsMaterials;
    console.log(`Order COGS (Materials): ${cogs}€`);

    // Expected: HT * 1.055 (5.5% VAT)
    // Note: Packaging might add a tiny bit?
    // RecipeService defaults 0 packaging cost usually, but addItem checks for Doypack.
    // If we used 1000g, doypack check might fail or add generic.
    // Let's check logic: calculateFinancials adds doypack cost to totalPackagingCost, not Material.
    // So cogsMaterials should be STRICTLY Ingredient Cost * 1.055.

    const expectedTTC = costHT * 1.055;
    console.log(`Expected TTC (Approx): ${expectedTTC.toFixed(4)}€`);

    if (Math.abs(cogs - expectedTTC) < 0.05) {
        console.log('PASS: COGS matches TTC (HT + 5.5%).');
    } else if (Math.abs(cogs - costHT) < 0.05) {
        console.error('FAIL: COGS is still HT!');
    } else {
        console.warn('WARN: COGS is neither HT nor simple TTC. Check calculation.');
    }
}

verifyCogsTTC().catch(console.error);
