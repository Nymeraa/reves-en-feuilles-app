import 'dotenv/config';
import { BackupService } from '../src/services/backup-service';
import { prisma } from '../src/lib/db-sql';

async function verify() {
  console.log('🚀 Starting Backup/Restore Verification...');
  const sourceOrg = 'org-1';
  const targetOrg = 'org-test-verify';

  try {
    // 1. Export source data
    console.log(`📦 Exporting data from ${sourceOrg}...`);
    const backupJson = await BackupService.createGlobalExportJson(sourceOrg);
    console.log(`✅ Exported ${Object.keys(backupJson.data).length} entities.`);

    // 2. Dry-Run Restore
    console.log(`🔍 Running Dry-Run Restore to ${targetOrg}...`);
    const dryRunReport = await BackupService.restore(
      targetOrg,
      backupJson,
      'dryRun',
      'json',
      'RESTORE',
      true
    );
    console.log('📊 Dry-Run Report:', JSON.stringify(dryRunReport, null, 2));

    if (!dryRunReport.success) {
      throw new Error('Dry-run failed');
    }

    // 3. Commit Restore
    console.log(`💾 Running Commit Restore to ${targetOrg}...`);
    const commitReport = await BackupService.restore(
      targetOrg,
      backupJson,
      'commit',
      'json',
      'RESTORE',
      true
    );
    console.log('📊 Commit Report:', JSON.stringify(commitReport, null, 2));

    if (!commitReport.success) {
      throw new Error(`Commit failed: ${commitReport.errors.join(', ')}`);
    }

    // 4. Verify Data in DB
    console.log('🧪 Verifying data presence in database...');
    const ingredients = await prisma.ingredient.findMany({ where: { organizationId: targetOrg } });
    console.log(`✅ Found ${ingredients.length} ingredients in ${targetOrg}.`);

    if (ingredients.length === 0 && backupJson.data.ingredients.length > 0) {
      throw new Error('Verification failed: No ingredients found in target org after restore.');
    }

    // Cleanup (optional)
    console.log(`🧹 Cleaning up ${targetOrg}...`);
    await prisma.ingredient.deleteMany({ where: { organizationId: targetOrg } });
    await prisma.supplier.deleteMany({ where: { organizationId: targetOrg } });
    // ... add more if needed

    console.log('🏁 Verification Completed Successfully!');
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
}

verify();
