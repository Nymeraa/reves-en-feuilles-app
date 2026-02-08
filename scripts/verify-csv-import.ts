import { ImportService } from '../src/services/import-service';
import { InventoryService } from '../src/services/inventory-service';
import { RecipeService } from '../src/services/recipe-service';
import { PackService } from '../src/services/pack-service';
import { OrderService } from '../src/services/order-service';
import { SupplierService } from '../src/services/supplier-service';

const ORG_ID = 'org-verification-import';

async function runVerification() {
    console.log('--- Starting CSV Import Verification ---');

    // 1. Ingredients
    console.log('\n--- Testing Ingredients Import ---');
    const ingredientCsv = `name,category,initialStock,initialCost,supplierId
Test Ingredient 1,Thé Noir,1000,0.05,sup-1
Test Ingredient 2,Arôme,500,0.10,sup-2`;
    await testImport('Ingrédients', ingredientCsv, async () => {
        const items = await InventoryService.getIngredients(ORG_ID);
        const match = items.filter(i => i.name.startsWith('Test Ingredient'));
        console.log(`Created ${match.length} ingredients.`);
        return match.length === 2;
    });

    // 2. Packaging
    console.log('\n--- Testing Packaging Import ---');
    const packagingCsv = `name,category,initialStock,initialCost,subtype
Test Packaging 1,Packaging,200,0.50,Boîte
Test Packaging 2,Packaging,150,0.20,Sachet`;
    await testImport('Packaging', packagingCsv, async () => {
        const items = await InventoryService.getIngredients(ORG_ID);
        const match = items.filter(i => i.name.startsWith('Test Packaging') && i.category === 'Packaging');
        console.log(`Created ${match.length} packaging items.`);
        return match.length === 2;
    });

    // 3. Accessories
    console.log('\n--- Testing Accessories Import ---');
    // Note: We test if category defaults to 'Accessoire' if missing or explicit
    const accessoryCsv = `name,initialStock,initialCost
Test Accessory 1,50,5.00
Test Accessory 2,20,12.50`;
    await testImport('Accessoires', accessoryCsv, async () => {
        const items = await InventoryService.getIngredients(ORG_ID);
        const match = items.filter(i => i.name.startsWith('Test Accessory') && i.category === 'Accessoire');
        console.log(`Created ${match.length} accessories.`);
        return match.length === 2;
    });

    // 4. Recipes
    console.log('\n--- Testing Recipes Import ---');
    const recipeCsv = `name,description,status,laborCost
Test Recipe 1,Description 1,DRAFT,1.5
Test Recipe 2,Description 2,ACTIVE,2.0`;
    await testImport('Recettes', recipeCsv, async () => {
        const items = await RecipeService.getRecipes(ORG_ID);
        const match = items.filter(r => r.name.startsWith('Test Recipe'));
        console.log(`Created ${match.length} recipes.`);
        return match.length === 2;
    });

    // 5. Packs
    console.log('\n--- Testing Packs Import ---');
    const packCsv = `name,description,price,status
Test Pack 1,Pack Desc 1,29.90,DRAFT
Test Pack 2,Pack Desc 2,49.90,ACTIVE`;
    await testImport('Packs', packCsv, async () => {
        const items = await PackService.getPacks(ORG_ID);
        const match = items.filter(p => p.name.startsWith('Test Pack'));
        console.log(`Created ${match.length} packs.`);
        return match.length === 2;
    });

    // 6. Orders
    console.log('\n--- Testing Orders Import ---');
    const orderCsv = `orderNumber,customerName,totalAmount,status,date
ORD-TEST-001,John Doe,50.00,DRAFT,2023-10-01
ORD-TEST-002,Jane Smith,75.50,PAID,2023-10-02`;
    await testImport('Commandes', orderCsv, async () => {
        const items = await OrderService.getOrders(ORG_ID);
        const match = items.filter(o => o.orderNumber && o.orderNumber.startsWith('ORD-TEST'));
        console.log(`Created ${match.length} orders.`);
        return match.length === 2;
    });

    // 7. Suppliers
    console.log('\n--- Testing Suppliers Import ---');
    const supplierCsv = `name,contactEmail,leadTime
Test Supplier 1,test1@example.com,5
Test Supplier 2,test2@example.com,10`;
    await testImport('Fournisseurs', supplierCsv, async () => {
        const items = await SupplierService.getSuppliers();
        const match = items.filter(s => s.name.startsWith('Test Supplier'));
        console.log(`Created ${match.length} suppliers.`);
        return match.length === 2;
    });

    console.log('\n--- Verification Complete ---');
}

async function testImport(type: any, csvContent: string, verifyFn: () => Promise<boolean>) {
    try {
        const rows = ImportService.parseCsv(csvContent);
        const validation = ImportService.validateCsv(type, rows);

        if (!validation.isValid) {
            console.error(`Validation failed for ${type}:`, JSON.stringify(validation.invalidRows, null, 2));
            return;
        }

        console.log(`Validation successful. Importing ${validation.validRows.length} rows...`);
        await ImportService.executeImport(ORG_ID, type, validation.validRows);

        const success = await verifyFn();
        if (success) {
            console.log(`✅ ${type} Verification PASSED`);
        } else {
            console.error(`❌ ${type} Verification FAILED`);
        }
    } catch (e: any) {
        console.error(`❌ ${type} Exception:`, e.message);
    }
}

runVerification().catch(console.error);
