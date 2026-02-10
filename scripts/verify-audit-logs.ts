import 'dotenv/config';
import { AuditService } from '../src/services/audit-service';
import { InventoryService } from '../src/services/inventory-service';
import { OrderService } from '../src/services/order-service';
import { RecipeService } from '../src/services/recipe-service';
import { PackService } from '../src/services/pack-service';
import { ImportService } from '../src/services/import-service';
import { BackupService } from '../src/services/backup-service';
import { AuditAction, AuditEntity } from '../src/types/audit';
import { MovementType, EntityType, MovementSource } from '../src/types/inventory';
import { OrderStatus } from '../src/types/order';
import { RecipeStatus } from '../src/types/recipe';

const ORG = 'org-1';

async function verify() {
  console.log('--- START AUDIT LOG VERIFICATION ---');

  const logsStart = await AuditService.getLogs();
  const countStart = logsStart.length;

  // 1. INVENTORY MOVEMENT
  console.log('[1] Inventory Movement');
  const ing = await InventoryService.createIngredient(ORG, {
    name: 'Audit Ing',
    initialStock: 100,
    initialCost: 5,
    category: 'Ingrédient',
  });
  await InventoryService.addMovement(
    ORG,
    ing.id,
    MovementType.LOSS,
    -10,
    undefined,
    'Test Loss',
    EntityType.INGREDIENT,
    MovementSource.MANUAL
  );

  // 2. RECIPE VERSIONING
  console.log('[2] Recipe Version');
  const recipe = await RecipeService.createRecipe(ORG, {
    name: 'Audit Recipe',
    status: RecipeStatus.ACTIVE,
    description: 'Test',
  });
  await RecipeService.updateRecipeFull(ORG, recipe.id, {
    ...recipe,
    description: 'Updated Description',
    items: [{ ingredientId: ing.id, percentage: 100 }],
    prices: { 100: 20 },
    status: RecipeStatus.ACTIVE, // Keep active -> trigger version
    name: recipe.name,
  });

  // 3. ORDER FLOW
  console.log('[3] Order Confirm/Cancel');
  const order = await OrderService.createDraftOrder(ORG, { customerName: 'Audit Client' });
  await OrderService.addItemToOrder(ORG, order.id, {
    type: 'RECIPE',
    recipeId: recipe.id,
    format: 100,
    quantity: 5,
  });

  // Confirm
  await OrderService.confirmOrder(ORG, order.id);

  // Cancel
  await OrderService.cancelOrder(ORG, order.id);

  // 4. IMPORT
  console.log('[4] Import');
  const csvContent = 'name,category,initialStock,initialCost\nImp1,Cat1,100,5\nImp2,Cat1,200,10';
  const parsed = ImportService.parseCsv(csvContent);
  const validRows = ImportService.validateCsv('Ingrédients', parsed).validRows;
  await ImportService.executeImport(ORG, 'Ingrédients', validRows, 'create');

  // 5. BACKUP
  console.log('[5] Backup');
  await BackupService.createGlobalExportJson(ORG);

  // --- VERIFICATION ---
  console.log('--- CHECKING LOGS ---');
  const logsEnd = await AuditService.getLogs();

  const findLog = (action: AuditAction, entity: AuditEntity, id?: string) => {
    return logsEnd.find(
      (l) => l.action === action && l.entity === entity && (!id || l.entityId === id)
    );
  };

  const checks = [
    {
      name: 'Stock Movement Create',
      passed: !!findLog(AuditAction.CREATE, AuditEntity.STOCK_MOVEMENT),
    },
    { name: 'Recipe Create', passed: !!findLog(AuditAction.CREATE, AuditEntity.RECIPE, recipe.id) },
    {
      name: 'Recipe Version Create',
      passed: !!findLog(AuditAction.CREATE, AuditEntity.RECIPE_VERSION),
    },
    { name: 'Order Confirm', passed: !!findLog(AuditAction.CONFIRM, AuditEntity.ORDER, order.id) },
    { name: 'Order Cancel', passed: !!findLog(AuditAction.CANCEL, AuditEntity.ORDER, order.id) },
    {
      name: 'Import Start',
      passed: !!logsEnd.find(
        (l) => l.action === AuditAction.IMPORT && l.metadata?.status === 'STARTED'
      ),
    },
    {
      name: 'Import Complete',
      passed: !!logsEnd.find(
        (l) => l.action === AuditAction.IMPORT && l.metadata?.status === 'COMPLETED'
      ),
    },
    { name: 'Backup Export', passed: !!findLog(AuditAction.EXPORT, AuditEntity.BACKUP) },
  ];

  console.table(checks);

  const failed = checks.filter((c) => !c.passed);
  if (failed.length > 0) {
    console.error('FAILED CHECKS:', failed);
    process.exit(1);
  } else {
    console.log('ALL CHECKS PASSED ✅');
  }
}

verify().catch(console.error);
