
import { SettingsService } from '../src/services/settings-service';
import { OrderService } from '../src/services/order-service';
import { RecipeService } from '../src/services/recipe-service';
import { RecipeStatus } from '../src/types/recipe';
import { InventoryService } from '../src/services/inventory-service';
import { OrderStatus } from '../src/types/order';

const ORG = 'org-audit-settings';

async function verify() {
    console.log('--- START SETTINGS AUDIT ---');

    // SETUP: Create a Recipe for Orders
    const recipe = await RecipeService.createRecipe(ORG, { name: 'Audit Tea', status: RecipeStatus.ACTIVE });

    // PHASE 1: UI & PERSISTENCE
    console.log('[1] Testing Persistence');
    const originalSettings = await SettingsService.getSettings();
    const testSettings = {
        urssafRate: 12, // 12%
        shopifyTransactionPercent: 2.9, // 2.9%
        shopifyFixedFee: 0.30, // 0.30€
        defaultOtherFees: 0.10, // 0.10€
        tvaIngredients: 5.5,
        tvaPackaging: 20
    };
    await SettingsService.updateSettings(testSettings);
    const loadedSettings = await SettingsService.getSettings();

    if (loadedSettings.urssafRate !== 12) console.error('FAIL: Persistence URSSAF mismatch');
    else console.log('OK: Persistence verified');


    // PHASE 2: CALCULATION LOGIC & ORDER INTEGRATION
    console.log('[2] Testing Fee Calculation & Integration');

    // Create Order C1
    // Total Paid = Product (10€) + Shipping (5€) = 15€
    // Expected Fees:
    // URSSAF = 15 * 0.12 = 1.80
    // Shopify = (15 * 0.029) + 0.30 = 0.435 + 0.30 = 0.735 -> Round to 0.74 (if 2 decimals)
    // Other = 0.10
    // Total Fees = 1.80 + 0.74 + 0.10 = 2.64

    // Shipping Real Cost = 4.00
    // COGS = 0 (Recipe empty/mocked for simplicity, unless we add movements, but let's assume 0 for fee focus)
    // Actually OrderService logic adds Movements so COGS might be 0 if recipe empty.

    // Expected Net Profit = 15.00 - 0 (COGS) - 2.64 (Fees) - 4.00 (RealShip) = 8.36

    const c1 = await OrderService.createDraftOrder(ORG, { shippingPrice: 5, shippingCost: 4, customerName: 'C1' });
    await OrderService.addItemToOrder(ORG, c1.id, { type: 'RECIPE', recipeId: recipe.id, quantity: 1, unitPrice: 10, format: 100 });
    await OrderService.confirmOrder(ORG, c1.id);

    const c1Confirmed = await OrderService.getOrderById(c1.id);
    if (!c1Confirmed) throw new Error('Order C1 not found');

    console.log('C1 Financials:', {
        totalAmount: c1Confirmed.totalAmount, // 10
        totalPaid: c1Confirmed.totalAmount + (c1Confirmed.shippingPrice || 0), // 15
        netProfit: c1Confirmed.netProfit,
        fees: {
            urssaf: (c1Confirmed as any).feesUrssaf,
            shopify: (c1Confirmed as any).feesShopify,
            other: (c1Confirmed as any).feesOther,
            total: (c1Confirmed as any).feesTotal
        }
    });

    // Validations
    const expectedUrssaf = 1.80;
    const expectedShopify = 0.74; // 0.735 rounded to 0.74
    const expectedOther = 0.10;
    const expectedTotalFees = 2.64;
    const expectedProfit = 8.36; // 15 - 0 - 4 - 2.64

    if ((c1Confirmed as any).feesUrssaf !== expectedUrssaf) console.error(`FAIL: URSSAF expected ${expectedUrssaf}, got ${(c1Confirmed as any).feesUrssaf}`);
    if ((c1Confirmed as any).feesShopify !== expectedShopify) console.error(`FAIL: Shopify expected ${expectedShopify}, got ${(c1Confirmed as any).feesShopify}`);
    if ((c1Confirmed as any).feesTotal !== expectedTotalFees) console.error(`FAIL: Total Fees expected ${expectedTotalFees}, got ${(c1Confirmed as any).feesTotal}`);

    if (c1Confirmed.netProfit !== expectedProfit) console.error(`FAIL: Net Profit expected ${expectedProfit}, got ${c1Confirmed.netProfit}`);


    // PHASE 4B: ANALYTICS INTEGRATION
    console.log('[4b] Testing Analytics Integration');
    const { AnalyticsService } = await import('../src/services/analytics-service');
    const profitability = await AnalyticsService.getOrderProfitability(ORG);
    const c1Stats = profitability.orders.find(o => o.id === c1.id);
    if (!c1Stats) console.error('FAIL: Analytics missing C1');
    else {
        if (c1Stats.realMargin !== expectedProfit) console.error(`FAIL: Analytics Margin expected ${expectedProfit}, got ${c1Stats.realMargin}`);
        if (c1Stats.totalFees !== expectedTotalFees) console.error(`FAIL: Analytics Fees expected ${expectedTotalFees}, got ${c1Stats.totalFees}`);
        console.log('OK: Analytics Integration verified');
    }

    // PHASE 5: IMMUTABILITY
    console.log('[5] Testing Immutability');
    // Change Settings
    const newSettings = {
        urssafRate: 20, // Huge hike
        shopifyTransactionPercent: 5,
        shopifyFixedFee: 1.00,
        defaultOtherFees: 1.00,
        tvaIngredients: 5.5,
        tvaPackaging: 20
    };
    await SettingsService.updateSettings(newSettings);

    // Re-fetch C1
    const c1After = await OrderService.getOrderById(c1.id);
    if ((c1After as any).feesUrssaf !== expectedUrssaf) {
        console.error(`FAIL: IMMUTABILITY BROKEN. URSSAF changed from ${expectedUrssaf} to ${(c1After as any).feesUrssaf}`);
    } else {
        console.log('OK: Immutability preserved');
    }

    // Create C2 with New Settings
    // Total Paid = 15€
    // URSSAF = 15 * 0.20 = 3.00
    // Shopify = (15 * 0.05) + 1.00 = 0.75 + 1.00 = 1.75
    // Other = 1.00
    // Total = 5.75

    const c2 = await OrderService.createDraftOrder(ORG, { shippingPrice: 5, shippingCost: 4, customerName: 'C2' });
    await OrderService.addItemToOrder(ORG, c2.id, { type: 'RECIPE', recipeId: recipe.id, quantity: 1, unitPrice: 10, format: 100 });
    await OrderService.confirmOrder(ORG, c2.id);
    const c2Confirmed = await OrderService.getOrderById(c2.id);

    if ((c2Confirmed as any).feesUrssaf !== 3.00) console.error(`FAIL: C2 URSSAF expected 3.00, got ${(c2Confirmed as any).feesUrssaf}`);
    else console.log('OK: New settings applied to new order');

    // Restore Defaults
    await SettingsService.updateSettings(originalSettings);
    console.log('--- AUDIT COMPLETE ---');
}

verify().catch(console.error);
