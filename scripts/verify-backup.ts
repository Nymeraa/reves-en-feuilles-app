import 'dotenv/config';
import { BackupService } from '../src/services/backup-service';
import AdmZip from 'adm-zip';

const ORG = 'org-1';

async function runBackupVerification() {
  console.log('--- Starting Backup Verification (SQL/CSV) ---');

  // 1. Create Backup
  console.log('\n--- creating backup... ---');
  let backupBuffer: Buffer;
  try {
    backupBuffer = await BackupService.createGlobalExportZip(ORG);
    console.log(`✅ Backup created. Size: ${backupBuffer.length} bytes`);
  } catch (e: any) {
    console.error('❌ Failed to create backup:', e.message);
    return;
  }

  // 2. Verify Zip Content
  console.log('\n--- Verifying Zip Content ---');
  const zip = new AdmZip(backupBuffer);
  const zipEntries = zip.getEntries();
  const zipFileNames = zipEntries.map((e) => e.entryName);

  console.log(`Zip contains ${zipEntries.length} entries.`);

  const expectedEntities = [
    'suppliers.csv',
    'ingredients.csv',
    'packaging.csv',
    'accessories.csv',
    'recipes.csv',
    'recipe_items.csv',
    'packs.csv',
    'pack_items.csv',
    'orders.csv',
    'order_items.csv',
    'stock_movements.csv',
  ];

  let missingFiles: string[] = [];
  expectedEntities.forEach((f) => {
    if (!zipFileNames.includes(f)) {
      missingFiles.push(f);
    }
  });

  if (missingFiles.length > 0) {
    console.warn(
      '⚠️ Missing or empty entities in backup (might be expected if no data exists):',
      missingFiles.join(', ')
    );
  } else {
    console.log('✅ All expected entity CSVs present in backup.');
  }

  // Verify at least some content exists
  if (zipEntries.length === 0) {
    console.error('❌ Zip is empty!');
    process.exit(1);
  }

  console.log('\n--- Verification Complete ---');
}

runBackupVerification().catch(console.error);
