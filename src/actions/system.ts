'use server'

import { InventoryService } from '@/services/inventory-service'
import { OrderService } from '@/services/order-service'
import { RecipeService } from '@/services/recipe-service'
import { OrderStatus } from '@/types/order'
import { PackService } from '@/services/pack-service'

// Mock Audit Logic
export async function runAuditAction() {
    const results = [];

    // 1. Check Multi-tenancy (Mock - but checking data integrity)
    // Verify all ingredients have organizationId
    const ingredients = await InventoryService.getIngredients('org-1');
    const invalidOrgItems = ingredients.filter(i => !i.organizationId);
    if (invalidOrgItems.length > 0) {
        results.push({ check: 'Isolation Données', status: 'FAIL', message: `${invalidOrgItems.length} items sans organizationId.` });
    } else {
        results.push({ check: 'Isolation Données', status: 'PASS', message: 'Toutes les données ont un ID organisation.' });
    }

    // 2. Check Stock Consistency
    // Ensure no negative stock (unless allowed, but for audit we flag it)
    const negativeStock = ingredients.filter(i => i.currentStock < 0);
    if (negativeStock.length > 0) {
        results.push({ check: 'Cohérence Stocks', status: 'FAIL', message: `${negativeStock.length} items avec stock négatif.` });
    } else {
        results.push({ check: 'Cohérence Stocks', status: 'PASS', message: 'Aucun stock négatif détecté.' });
    }

    // 3. Historical Locking Test
    const orders = await import('@/services/order-service').then(m => m.OrderService.readOrders());
    const confirmedOrders = orders.filter((o: any) => [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(o.status));

    let lockingPass = true;
    let missingSnapshots = 0;

    for (const order of confirmedOrders) {
        for (const item of order.items) {
            if (item.unitCostSnapshot === undefined || item.unitCostSnapshot === null) {
                lockingPass = false;
                missingSnapshots++;
            }
        }
    }

    if (confirmedOrders.length === 0) {
        results.push({ check: 'Verrouillage Historique', status: 'PASS', message: 'Aucune commande confirmée à vérifier.' });
    } else if (lockingPass) {
        results.push({ check: 'Verrouillage Historique', status: 'PASS', message: `${confirmedOrders.length} commandes confirmées vérifiées.` });
    } else {
        results.push({
            check: 'Verrouillage Historique',
            status: 'FAIL',
            message: `${missingSnapshots} lignes de commande sans snapshot de coût.`
        });
    }

    // 4. Recipe Composition Check (Orphans)
    const recipes = await RecipeService.getRecipes('org-1');
    const ingredientIds = new Set(ingredients.map(i => i.id));
    let orphanCount = 0;

    for (const recipe of recipes) {
        for (const item of recipe.items) {
            if (!ingredientIds.has(item.ingredientId)) {
                orphanCount++;
            }
        }
    }

    if (orphanCount > 0) {
        results.push({
            check: 'Validité Recettes',
            status: 'FAIL',
            message: `${orphanCount} ingrédients introuvables dans les recettes.`
        });
    } else {
        results.push({
            check: 'Validité Recettes',
            status: 'PASS',
            message: 'Tous les ingrédients des recettes existent.'
        });
    }

    return results;
}
