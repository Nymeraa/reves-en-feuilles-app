
import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { AnalyticsService } from '../src/services/analytics-service';
import { RecipeService } from '../src/services/recipe-service';
import { RecipeStatus } from '../src/types/recipe';

const ORG = 'org-1';

async function verify() {
    console.log('--- START PROFITABILITY VERIFICATION ---');

    // SETUP: Ingredients
    const ingA = await InventoryService.createIngredient(ORG, { name: 'Tea Base', initialStock: 100, initialCost: 10 }); // 10€/kg -> 0.01€/g
    const ingB = await InventoryService.createIngredient(ORG, { name: 'Flavor', initialStock: 100, initialCost: 50 }); // 50€/kg -> 0.05€/g

    // SETUP: Recipe
    const recipe = await RecipeService.createRecipe(ORG, { name: 'Profit Tea', status: RecipeStatus.ACTIVE, description: 'Test' });
    await RecipeService.updateRecipeFull(ORG, recipe.id, {
        ...recipe,
        items: [
            { ingredientId: ingA.id, percentage: 80 }, // 0.008
            { ingredientId: ingB.id, percentage: 20 }  // 0.010 
        ],
        prices: {},
        status: RecipeStatus.ACTIVE,
        name: recipe.name,
        description: recipe.description || ''
    });
    // Mix Cost = 0.018 €/g => 18€/kg.

    // TEST 1: STANDARD ORDER
    // 100g Bag. Cost Material = 1.8€. Packaging?? Let's assume 0 for simplicity or implicit.
    // Price = 10€.
    // Shipping Charged = 5€.
    // Shipping Real Cost = 4€.
    console.log('[1] Creating Standard Order');
    const order1 = await OrderService.createDraftOrder(ORG, {
        customerName: 'Profit Client 1',
        shippingPrice: 5,
        shippingCost: 4,
        source: 'MANUAL'
    });
    // Add 2 bags. Qty=2, Format=100.
    // Unit Cost Snapshot should be ~1.8 (assuming pack cost 0).
    await OrderService.addItemToOrder(ORG, order1.id, {
        type: 'RECIPE',
        recipeId: recipe.id,
        format: 100,
        quantity: 2,
        unitPrice: 10 // Override price
    });
    await OrderService.confirmOrder(ORG, order1.id);
    // Product Rev: 20. Product Cost: 3.6. Product Margin: 16.4.
    // Order Total Paid: 25. Order Real Cost: 3.6 + 4 = 7.6.
    // Real Margin: 17.4.

    // TEST 2: CANCELLED ORDER (Should be ignored)
    console.log('[2] Creating & Cancelling Order');
    const order2 = await OrderService.createDraftOrder(ORG, { customerName: 'Cancelled Client', shippingPrice: 10, shippingCost: 10 });
    await OrderService.addItemToOrder(ORG, order2.id, { type: 'RECIPE', recipeId: recipe.id, format: 100, quantity: 1 });
    await OrderService.confirmOrder(ORG, order2.id);
    await OrderService.cancelOrder(ORG, order2.id);

    // TEST 3: DEFICIT SHIPPING
    // Shipping Charged 0 (Free). Real Cost 10.
    console.log('[3] Creating Free Shipping Order');
    const order3 = await OrderService.createDraftOrder(ORG, {
        customerName: 'Free Ship Client',
        shippingPrice: 0,
        shippingCost: 10
    });
    await OrderService.addItemToOrder(ORG, order3.id, {
        type: 'RECIPE',
        recipeId: recipe.id,
        format: 100,
        quantity: 1, // Rev 10. Cost 1.8.
        unitPrice: 10
    });
    await OrderService.confirmOrder(ORG, order3.id);
    // Prod Margin: 10 - 1.8 = 8.2.
    // Real Margin: (10+0) - (1.8+10) = -1.8. Negative!


    // VERIFY ANALYTICS
    console.log('--- CHECKING ANALYTICS ---');
    const products = await AnalyticsService.getProductProfitability(ORG);
    const orders = await AnalyticsService.getOrderProfitability(ORG);

    // 1. Check Product Stats
    // Should have 1 Product (Profit Tea). Qty Sold: 3 (Order1: 2, Order3: 1). Cancelled ignored.
    const teaStats = products.find(p => p.name === 'Profit Tea');
    if (!teaStats) throw new Error('Product not found in analytics');

    console.log('Product Stats:', teaStats);
    if (teaStats.quantitySold !== 3) console.error(`FAIL: Expected 3 sold, got ${teaStats.quantitySold}`);
    if (Math.abs(teaStats.revenue - 30) > 0.1) console.error(`FAIL: Expected Rev 30, got ${teaStats.revenue}`);
    // Cost ~1.8 * 3 = 5.4.
    if (Math.abs(teaStats.cogs - 5.4) > 0.1) console.error(`FAIL: Expected COGS 5.4, got ${teaStats.cogs}`);

    // 2. Check Order Stats
    // Should have 2 orders (Order1, Order3).
    const o1Stats = orders.orders.find(o => o.orderNumber === order1.id);
    if (!o1Stats) throw new Error('Order 1 not found');

    console.log('Order 1 Stats:', o1Stats);
    // Real Margin: 17.4
    if (Math.abs(o1Stats.realMargin - 17.4) > 0.1) console.error(`FAIL: O1 Real Margin expected 17.4, got ${o1Stats.realMargin}`);

    const o3Stats = orders.orders.find(o => o.orderNumber === order3.id);
    if (!o3Stats) throw new Error('Order 3 not found');

    console.log('Order 3 Stats:', o3Stats);
    // Real Margin: -1.8
    if (Math.abs(o3Stats.realMargin - -1.8) > 0.1) console.error(`FAIL: O3 Real Margin expected -1.8, got ${o3Stats.realMargin}`);

    // 3. Check Cancelled Ignored
    const o2Stats = orders.orders.find(o => o.orderNumber === order2.id);
    if (o2Stats) console.error('FAIL: Cancelled order should NOT be in profitability report');

    console.log('--- VERIFICATION COMPLETE ---');
}

verify().catch(e => {
    console.error(e);
    process.exit(1);
});
