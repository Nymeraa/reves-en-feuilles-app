
import { OrderService } from '../src/services/order-service';
import { InventoryService } from '../src/services/inventory-service';
import { DashboardService } from '../src/services/dashboard-service';
import { RecipeService } from '../src/services/recipe-service';
import { RecipeStatus } from '../src/types/recipe';
import { AuditService } from '../src/services/audit-service';
import { AuditAction, AuditEntity, AuditSeverity } from '../src/types/audit';

const ORG = 'org-1';

async function verify() {
    console.log('--- START DASHBOARD VERIFICATION ---');

    // SETUP: Recipe
    const recipe = await RecipeService.createRecipe(ORG, { name: 'Dash Tea', status: RecipeStatus.ACTIVE });

    // 1. KPI VERIFICATION (7d period)
    console.log('[1] Testing KPIs (7d)');
    // - Order 1: High Margin (+10)
    const o1 = await OrderService.createDraftOrder(ORG, { shippingPrice: 5, shippingCost: 2, customerName: 'O1' });
    await OrderService.addItemToOrder(ORG, o1.id, { type: 'RECIPE', recipeId: recipe.id, quantity: 1, unitPrice: 20, format: 100 });
    await OrderService.confirmOrder(ORG, o1.id);
    // O1: ProdRev 20. Net Ship = 3. Real Marg = 23.

    // - Order 2: Negative Margin (-5)
    // shippingPrice 0, shippingCost 10.
    const o2 = await OrderService.createDraftOrder(ORG, { shippingPrice: 0, shippingCost: 10, customerName: 'O2' });
    await OrderService.addItemToOrder(ORG, o2.id, { type: 'RECIPE', recipeId: recipe.id, quantity: 1, unitPrice: 5, format: 100 });
    await OrderService.confirmOrder(ORG, o2.id);
    // O2: ProdRev 5. Net Ship = -10. Real Marg = -5.

    const summary = await DashboardService.getSummary(ORG, '7d');

    // Check Sums
    const expectedRev = (20 + 5) + (5 + 0); // 30
    if (summary.revenue !== expectedRev) console.error(`FAIL: Rev expected ${expectedRev} got ${summary.revenue}`);

    // 23 - 5 = 18 margin
    const expectedMargin = 23 + (-5);
    if (summary.realMargin !== expectedMargin) console.error(`FAIL: Margin expected ${expectedMargin} got ${summary.realMargin}`);


    // 2. ALERT VERIFICATION
    console.log('[2] Testing Alerts');

    // - Stock Alert
    const ing = await InventoryService.createIngredient(ORG, { name: 'Low Stock Ing', initialStock: 10, alertThreshold: 100 });

    // - Missing Shipping Alert (O3 - Cost 0) -> Should NOT alert
    const o3 = await OrderService.createDraftOrder(ORG, { shippingPrice: 5, shippingCost: 0, customerName: 'O3' });
    await OrderService.addItemToOrder(ORG, o3.id, { type: 'RECIPE', recipeId: recipe.id, quantity: 1, format: 100 });
    await OrderService.confirmOrder(ORG, o3.id);

    // - Missing Shipping Alert (O4 - Cost undefined) -> SHOULD alert
    const o4 = await OrderService.createDraftOrder(ORG, { shippingPrice: 5, customerName: 'O4' });
    await OrderService.addItemToOrder(ORG, o4.id, { type: 'RECIPE', recipeId: recipe.id, quantity: 1, format: 100 });
    // confirmOrder might fail if we had strict validations but let's see. logic is in Analytics anyway.
    await OrderService.confirmOrder(ORG, o4.id);

    const alerts = await DashboardService.getAlerts(ORG);

    const hasStockAlert = alerts.find(a => a.type === 'STOCK_CRITICAL' && a.id.includes(ing.id));
    if (!hasStockAlert) console.error('FAIL: Missing STOCK_CRITICAL alert');
    else console.log('OK: Stock Alert found');

    const hasMarginAlert = alerts.find(a => a.type === 'NEGATIVE_MARGIN' && a.message.includes(o2.orderNumber || o2.id));
    if (!hasMarginAlert) console.error('FAIL: Missing NEGATIVE_MARGIN alert');
    else console.log('OK: Negative Margin Alert found');

    const hasO3Alert = alerts.find(a => a.id.includes(o3.id) && a.type === 'MISSING_SHIPPING');
    if (hasO3Alert) console.error('FAIL: Order with Cost 0 flagged as Missing Shipping');
    else console.log('OK: Cost 0 ignored correctly');

    const hasO4Alert = alerts.find(a => a.id.includes(o4.id) && a.type === 'MISSING_SHIPPING');
    if (!hasO4Alert) console.error('FAIL: Order with undefined Cost NOT flagged');
    else console.log('OK: Undefined Cost flagged correctly');


    // 3. ACTIVITY VERIFICATION
    console.log('[3] Testing Activity');
    // Log a severe error
    await AuditService.log({
        action: AuditAction.DELETE,
        entity: AuditEntity.SYSTEM,
        severity: AuditSeverity.ERROR,
        metadata: { msg: 'Test Error' }
    });

    const activity = await DashboardService.getRecentActivity(ORG, 5);
    const hasErrorLog = activity.find(l => l.severity === AuditSeverity.ERROR && l.metadata?.msg === 'Test Error');
    if (!hasErrorLog) console.error('FAIL: Recent activity missing ERROR log');
    else console.log('OK: Error log found in activity');


    // 4. COMPLETENESS CHECK
    const finalSummary = await DashboardService.getSummary(ORG, '7d');
    // Orders: O1(OK), O2(OK), O3(OK), O4(Missing). Total 4. Complete 3.
    console.log(`Order Count: ${finalSummary.orderCount}, Complete: ${finalSummary.completeOrderCount}`);

    if (finalSummary.orderCount !== 4) console.error(`FAIL: Order Count expected 4, got ${finalSummary.orderCount}`);
    if (finalSummary.completeOrderCount !== 3) console.error(`FAIL: Complete Count expected 3, got ${finalSummary.completeOrderCount}`);

    console.log('--- VERIFICATION COMPLETE ---');
}

verify().catch(console.error);
