import 'dotenv/config';
import { jsonDb } from '../src/lib/db-json';
import { sqlDb } from '../src/lib/db-sql';
import { EntityType } from '../src/lib/db/types';
import {
  Ingredient,
  Recipe,
  Order,
  Pack,
  Supplier,
  Settings,
  StockMovement,
  AuditLog,
  ActivityLog,
} from '@prisma/client';

// Force node env to allow local file reading if needed, though jsonDb handles it.

async function migrate() {
  console.log('--- STARTING MIGRATION JSON -> SQL ---');

  // 1. Settings
  console.log('[1] Migrating Settings...');
  const settings = await jsonDb.getById<Settings>('settings', 'global');
  if (settings) {
    await sqlDb.upsert('settings', settings);
    console.log('✅ Settings migrated.');
  } else {
    console.log('⚠️ No settings found.');
  }

  // 2. Suppliers
  console.log('[2] Migrating Suppliers...');
  const suppliers = await jsonDb.readAll<Supplier>('suppliers', 'org-1');
  for (const s of suppliers) {
    // Explicitly handle organizationId
    const supplierData = { ...s, organizationId: s.organizationId || 'org-1' };
    await sqlDb.upsert('suppliers', supplierData, 'org-1');
  }
  console.log(`✅ ${suppliers.length} Suppliers migrated.`);

  // 3. Ingredients (Dep: Suppliers)
  console.log('[3] Migrating Ingredients...');
  const ingredients = await jsonDb.readAll<Ingredient>('ingredients', 'org-1');
  for (const i of ingredients) {
    const ingredientData = {
      ...i,
      category: i.category || 'UNCATEGORIZED',
      organizationId: i.organizationId || 'org-1', // Safety
    };
    await sqlDb.upsert('ingredients', ingredientData, 'org-1');
  }
  console.log(`✅ ${ingredients.length} Ingredients migrated.`);

  // 4. Recipes (Dep: Ingredients)
  console.log('[4] Migrating Recipes...');
  const recipes = await jsonDb.readAll<Recipe>('recipes', 'org-1');

  // Cache existing ingredient IDs for validation
  const existingIngredients = new Set(
    (await sqlDb.readAll<Ingredient>('ingredients', 'org-1')).map((i) => i.id)
  );

  for (const r of recipes) {
    // Filter items to ensure Referential Integrity
    if ((r as any).items) {
      const validItems = (r as any).items.filter((item: any) => {
        if (existingIngredients.has(item.ingredientId)) return true;
        console.warn(
          `⚠️ Skipping invalid item in Recipe ${r.id}: Ingredient ${item.ingredientId} not found.`
        );
        return false;
      });
      (r as any).items = validItems;
    }

    await sqlDb.upsert('recipes', r, 'org-1');
  }
  console.log(`✅ ${recipes.length} Recipes migrated.`);

  // 5. Packs (Dep: Recipes, Ingredients)
  console.log('[5] Migrating Packs...');
  const packs = await jsonDb.readAll<any>('packs', 'org-1');
  const existingRecipes = new Set(
    (await sqlDb.readAll<Recipe>('recipes', 'org-1')).map((r) => r.id)
  );

  for (const p of packs) {
    const items: any[] = [];

    // Transform recipes -> PackItem
    if (Array.isArray(p.recipes)) {
      for (const r of p.recipes) {
        if (existingRecipes.has(r.recipeId)) {
          items.push({
            id: Math.random().toString(36).substring(2, 8),
            type: 'RECIPE',
            recipeId: r.recipeId,
            quantity: r.quantity,
            format: r.format,
          });
        } else {
          console.warn(`⚠️ Skipping invalid recipe ref in Pack ${p.id}: ${r.recipeId}`);
        }
      }
    }

    // Transform packaging -> PackItem
    if (Array.isArray(p.packaging)) {
      for (const packItem of p.packaging) {
        if (existingIngredients.has(packItem.ingredientId)) {
          items.push({
            id: Math.random().toString(36).substring(2, 8),
            type: 'INGREDIENT',
            ingredientId: packItem.ingredientId,
            quantity: packItem.quantity,
          });
        } else {
          console.warn(
            `⚠️ Skipping invalid packaging ref in Pack ${p.id}: ${packItem.ingredientId}`
          );
        }
      }
    }

    // Clean payload
    const { recipes: _r, packaging: _p, ...cleanPack } = p;
    const packData = { ...cleanPack, items };

    await sqlDb.upsert('packs', packData, 'org-1');
  }
  console.log(`✅ ${packs.length} Packs migrated.`);

  // 6. Orders (Dep: Packs, Recipes)
  console.log('[6] Migrating Orders...');
  const orders = await jsonDb.readAll<any>('orders', 'org-1'); // Use any to access extra props
  for (const o of orders) {
    const { otherFees, items, ...rest } = o;

    // Sanitize items: remove orderId as it's partial in nested create
    const cleanItems = Array.isArray(items)
      ? items.map((i: any) => {
          const { orderId, ...itemRest } = i;
          return itemRest;
        })
      : [];

    const orderData = {
      ...rest,
      feesOther: otherFees || 0,
      organizationId: o.organizationId || 'org-1',
      items: cleanItems, // db-sql.ts handles { create: items }
    };
    await sqlDb.upsert('orders', orderData, 'org-1');
  }
  console.log(`✅ ${orders.length} Orders migrated.`);

  // 7. Movements (Dep: Ingredients, Orders)
  console.log('[7] Migrating Stock Movements...');
  const movements = await jsonDb.readAll<StockMovement>('movements', 'org-1');

  const validOrderIds = new Set((await sqlDb.readAll<Order>('orders', 'org-1')).map((o) => o.id));
  const validIngredientIds = new Set(
    (await sqlDb.readAll<Ingredient>('ingredients', 'org-1')).map((i) => i.id)
  );

  let mIndex = 0;
  for (const m of movements) {
    mIndex++;
    if (mIndex % 50 === 0) console.log(`  Processing movement ${mIndex}/${movements.length}...`);
    const { unitPriceAtTime, ...rest } = m as any;
    let movementData: any = {
      ...rest,
      unitPrice: unitPriceAtTime, // Map legacy field
      organizationId: m.organizationId || 'org-1',
    };

    // Validate Ingredient Ref
    if (m.ingredientId && !validIngredientIds.has(m.ingredientId)) {
      // ... (existing logic)
      console.warn(`⚠️ Skipping invalid ingredient ref in Movement ${m.id}: ${m.ingredientId}`);
      continue; // Skip movement entirely if ingredient is missing? Or keep it with null?
      // Schema says ingredientId String? but usually required for movement.
      // Let's skip it to be safe, or set to null if allowed.
      // Most movements need an ingredient.
      // Actually let's start with skipping.
    }

    // Validate Order Ref
    if (m.source === 'ORDER' && m.sourceId && !validOrderIds.has(m.sourceId)) {
      console.warn(
        `⚠️ detached Order ref in Movement ${m.id}: ${m.sourceId}. Setting sourceId=null.`
      );
      movementData.sourceId = null;
      movementData.reason =
        (movementData.reason || '') + ` [Detached from missing order ${m.sourceId}]`;
    }

    await sqlDb.upsert('movements', movementData, 'org-1');
  }
  console.log(`✅ ${movements.length} Movements migrated.`);

  // 8. Audit Logs
  console.log('[8] Migrating Audit Logs...');
  const logs = await jsonDb.readAll<AuditLog>('audit-logs', 'org-1');
  for (const l of logs) {
    await sqlDb.upsert('audit-logs', l, 'org-1');
  }
  console.log(`✅ ${logs.length} Audit Logs migrated.`);

  // 9. Activity Logs
  console.log('[9] Migrating Activity Logs...');
  const activities = await jsonDb.readAll<ActivityLog>('activity-logs', 'org-1');
  for (const a of activities) {
    await sqlDb.upsert('activity-logs', a, 'org-1');
  }
  console.log(`✅ ${activities.length} Activity Logs migrated.`);

  console.log('--- MIGRATION COMPLETE ---');
}

migrate().catch((e) => {
  console.error('Migration Failed:', e);
  process.exit(1);
});
