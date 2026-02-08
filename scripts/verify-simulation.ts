
import { CostEngine } from '../src/lib/cost-engine';

async function verify() {
    console.log('--- SIMULATION & COST ENGINE AUDIT ---');

    // 1. Test Recipe Cost Logic
    console.log('[1] Recipe Mix Cost');
    // Mock Data
    const items = [{ ingredientId: 'tea', percentage: 90 }, { ingredientId: 'flower', percentage: 10 }];
    const costs = { 'tea': 10, 'flower': 50 }; // Cost per unit (e.g. per gram -> 10€/g is expensive but logic holds)

    // Mix Cost should be: 0.9 * 10 + 0.1 * 50 = 9 + 5 = 14.
    const mixCost = CostEngine.calculateMixCostPerUnit(items, costs);
    if (Math.abs(mixCost - 14) > 0.001) console.error(`FAIL: Mix Cost. Exp 14, Got ${mixCost}`);
    else console.log('PASS: Mix Cost calculation correct.');

    // 2. Test Pack Cost Logic
    console.log('[2] Pack Cost');
    // Mock Pack: 2 units of Recipe A (100g each), 1 Box (Packet).
    const recipeMocks: any = {
        'rec-a': { totalIngredientCost: 0.05, laborCost: 0.5, packagingCost: 0.2 } // 0.05 per gram -> 5€/100g
    };
    const packRecipes = [{ id: 'mock-p-r-id', recipeId: 'rec-a', quantity: 2, format: 100 }];
    const packPackaging = [{ id: 'mock-p-p-id', ingredientId: 'box', quantity: 1 }];
    const ingCosts = { 'box': 1.5 }; // Box costs 1.5€

    /*
     Calc:
     Recipe A Unit Cost: (0.05 * 100) + 0.5 + 0.2 = 5 + 0.7 = 5.7 €/unit.
     Pack has 2 units: 5.7 * 2 = 11.4 €.
     Packaging: 1 * 1.5 = 1.5 €.
     Total: 12.9 €.
    */
    const packCost = CostEngine.calculatePackCost(packRecipes, packPackaging, recipeMocks, ingCosts);
    if (Math.abs(packCost - 12.9) > 0.001) console.error(`FAIL: Pack Cost. Exp 12.9, Got ${packCost}`);
    else console.log('PASS: Pack Cost calculation correct.');

    // 3. Test Reverse Simulation (Margin -> Price)
    console.log('[3] Reverse Simulation');
    // Cost 10. Target Margin 50%.
    // Price = 10 / (1 - 0.5) = 20.
    const price = CostEngine.calculatePriceFromMargin(10, 50);
    if (price !== 20) console.error(`FAIL: Reverse Calc. Exp 20, Got ${price}`);
    else console.log('PASS: Reverse Calc correct.');

    // 4. Test Margin Calculation
    console.log('[4] Margin Calculation');
    // Price 20. Cost 10.
    // Margin = 10. % = 50.
    const margin = CostEngine.calculateMargin(20, 10);
    if (margin.amount !== 10 || margin.percent !== 50) console.error(`FAIL: Margin Calc. Exp 10/50%, Got ${JSON.stringify(margin)}`);
    else console.log('PASS: Margin Calc correct.');

    // 5. Test Edge Cases
    console.log('[5] Edge Cases');
    const zeroPrice = CostEngine.calculateMargin(0, 10);
    if (zeroPrice.percent !== 0) console.error('FAIL: Zero Price handled poorly'); // Should be 0 or -INF? Current logic says 0.

    try {
        CostEngine.calculatePriceFromMargin(10, 100);
        console.error('FAIL: 100% Margin should throw');
    } catch (e) {
        console.log('PASS: 100% Margin throws error caught.');
    }

    console.log('--- VERIFICATION COMPLETE ---');
}

verify().catch(console.error);
