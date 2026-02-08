import { InventoryService } from '../src/services/inventory-service';
import { SupplierService } from '../src/services/supplier-service';
import { OrderService } from '../src/services/order-service';
import { RecipeService } from '../src/services/recipe-service';
import { EntityType, MovementType, MovementSource } from '../src/types/inventory';

async function verify() {
  console.log('--- STOCK & SUPPLIER AUDIT ---');
  const ORG = 'org-1';

  // 1. SETUP SUPPLIER & INGREDIENT
  console.log('[1] Setup Supplier Protection');
  const supplier = await SupplierService.createSupplier(ORG, { name: 'Audit Supplier' });
  const ingredient = await InventoryService.createIngredient(ORG, {
    name: 'Stock Audit Recipe',

    initialStock: 0,
    initialCost: 10,
    supplierId: supplier.id,
  });

  // 2. TEST SUPPLIER DELETE PROTECTION
  try {
    await SupplierService.deleteSupplier(supplier.id);
    console.error('FAIL: Supplier deleted despite usage!');
  } catch (e: any) {
    if (e.message.includes('Cannot delete')) console.log('PASS: Supplier deletion checked.');
    else console.error('FAIL: Wrong error', e.message);
  }

  // 3. TEST WAC & MOVEMENTS
  console.log('[2] Test WAC & Stock Rebuild');
  // Buy 100g @ 10€ (Initial was 0) -> WAC 10.
  await InventoryService.addMovement(
    ORG,
    ingredient.id,
    MovementType.PURCHASE,
    100,
    10,
    'Buy 1',
    EntityType.INGREDIENT,
    MovementSource.MANUAL
  );

  // Buy 100g @ 20€ -> Total Stock 200g. Value 100*10 + 100*20 = 3000. WAC = 15.
  await InventoryService.addMovement(
    ORG,
    ingredient.id,
    MovementType.PURCHASE,
    100,
    20,
    'Buy 2',
    EntityType.INGREDIENT,
    MovementSource.MANUAL
  );

  const ingAfterBuy = await InventoryService.getIngredientById(ingredient.id);
  console.log(
    `Stock: ${ingAfterBuy?.currentStock} (Exp 200), WAC: ${ingAfterBuy?.weightedAverageCost} (Exp 15)`
  );

  if (ingAfterBuy?.currentStock !== 200 || ingAfterBuy?.weightedAverageCost !== 15)
    console.error('FAIL: WAC calculation incorrect.');
  else console.log('PASS: WAC correct.');

  // 4. TEST ORDER AUDIT
  console.log('[3] Test Order Audit & Rebuild');
  // Create Recipe using Audit Herb
  const recipe = await RecipeService.createRecipe(ORG, { name: 'Audit Recipe' });
  await RecipeService.updateRecipeFull(ORG, recipe.id, {
    ...recipe,
    status: 'ACTIVE' as any,
    description: 'Audit Recipe',
    items: [{ ingredientId: ingredient.id, percentage: 100 }],
    prices: { 100: 50 },
  });

  // Create & Confirm Order
  const order = await OrderService.createDraftOrder(ORG, { customerName: 'Audit Client' });
  await OrderService.addItemToOrder(ORG, order.id, {
    type: 'RECIPE',
    recipeId: recipe.id,
    format: 100,
    quantity: 1,
  });

  await OrderService.confirmOrder(ORG, order.id);

  // Verify Movements
  const movements = await InventoryService.getMovements(ORG);
  const orderMov = movements.find((m) => m.sourceId === order.id);

  if (!orderMov) console.error('FAIL: No order movement found with sourceId');
  else if (orderMov.source !== MovementSource.ORDER) console.error('FAIL: Source is not ORDER');
  else if (orderMov.entityType !== EntityType.INGREDIENT)
    console.error('FAIL: EntityType not INGREDIENT');
  else console.log('PASS: Order Audit Fields verified.');

  // 5. TEST REBUILD
  console.log('[4] Rebuild Consistency');
  const rebuiltStock = await InventoryService.recomputeStock(ORG, ingredient.id);
  console.log(
    `Current Stock: ${(await InventoryService.getIngredientById(ingredient.id))?.currentStock}, Rebuilt: ${rebuiltStock}`
  );

  if (rebuiltStock !== (await InventoryService.getIngredientById(ingredient.id))?.currentStock)
    console.error('FAIL: Rebuild mismatch!');
  else console.log('PASS: Rebuild consistent.');

  const rebuiltWAC = await InventoryService.recomputeWAC(ORG, ingredient.id);
  console.log(`Current WAC: 15, Rebuilt WAC: ${rebuiltWAC}`);
  // Note: Rebuilt WAC logic in service is "Approximate" (Total Cost / Total Qty) or "Simulated sequence"?
  // The implementation was TotalCost / TotalQty of PURCHASES.
  // 100*10 + 100*20 = 3000 / 200 = 15. Correct.
  if (rebuiltWAC !== 15) console.error('FAIL: Rebuilt WAC mismatch');
  else console.log('PASS: Rebuilt WAC consistent.');

  console.log('--- VERIFICATION COMPLETE ---');
}

verify().catch(console.error);
