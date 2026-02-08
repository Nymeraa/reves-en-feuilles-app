
import { AnalyticsService } from '../src/services/analytics-service';
import { ImportService } from '../src/services/import-service';
import { BackupService } from '../src/services/backup-service';
import { DATA_DIR } from '../src/lib/db-json';
import fs from 'fs';
import path from 'path';

async function runVerification() {
    console.log('=== STARTING VERIFICATION ===');

    // 1. Verify Reports (CSV Export)
    console.log('\n--- Testing Reports ---');
    try {
        const salesCsv = await AnalyticsService.getSalesCsv('org-1');
        console.log('Sales CSV generated (first 50 chars):', salesCsv.substring(0, 50).replace(/\n/g, '\\n'));
        if (salesCsv.includes('Date,OrderNumber')) console.log('✅ Sales CSV Header OK');
        else console.error('❌ Sales CSV Header Missing');

        const movementsCsv = await AnalyticsService.getInventoryMovementsCsv('org-1');
        console.log('Movements CSV generated (first 50 chars):', movementsCsv.substring(0, 50).replace(/\n/g, '\\n'));
        if (movementsCsv.includes('Date,Type,ItemName')) console.log('✅ Movements CSV Header OK');
        else console.error('❌ Movements CSV Header Missing');
    } catch (e) {
        console.error('❌ Reports Test Failed:', e);
    }

    // 2. Verify Import
    console.log('\n--- Testing Import ---');
    const mockCsv = `name,category,initialStock,initialCost
Test Ingredient Import,Test,100,5.50
Invalid Ingredient,,,-1`;

    try {
        const rows = ImportService.parseCsv(mockCsv);
        console.log(`Parsed ${rows.length} rows.`);

        const validation = ImportService.validateCsv('Ingrédients', rows);
        console.log(`Validation: ${validation.validRows.length} valid, ${validation.invalidRows.length} invalid.`);

        if (validation.validRows.length === 1 && validation.invalidRows.length === 1) {
            console.log('✅ Validation High-Level Check OK');
            console.log('Invalid Row Errors:', JSON.stringify(validation.invalidRows[0].errors));
        } else {
            console.error('❌ Validation Counts Wrong');
        }

        // Execute Import (Test Mode - creates real data in .data!)
        // Clean up later? Or just let it be (it's "Scratch" env).
        if (validation.validRows.length > 0) {
            const imported = await ImportService.executeImport('org-1', 'Ingrédients', validation.validRows, 'create');
            console.log(`Imported ${imported.length} ingredients.`);
            if (imported.length === 1 && imported[0].name === 'Test Ingredient Import') {
                console.log('✅ Import Execution OK');
            } else {
                console.error('❌ Import Execution Failed');
            }
        }
    } catch (e) {
        console.error('❌ Import Test Failed:', e);
    }

    // 3. Verify Backup
    console.log('\n--- Testing Backup ---');
    let backupBuffer: Buffer | null = null;
    try {
        backupBuffer = await BackupService.createBackup();
        console.log(`Backup created. Size: ${backupBuffer.length} bytes.`);

        if (backupBuffer.length > 0) {
            console.log('✅ Backup Creation OK');
        } else {
            console.error('❌ Empty Backup Buffer');
        }
    } catch (e) {
        console.error('❌ Backup Creation Failed:', e);
    }

    // Restore Test (DANGEROUS - Mock or Safety Check)
    // We will verify Manifest only to verify integrity, skipping full destructive restore to avoid wiping dev data purely for test script run (unless user wants it).
    // But BackupService.restoreBackup creates safety backup.
    // Let's TRY it if backupBuffer exists.
    if (backupBuffer) {
        console.log('Simulating Restore (Checking Manifest only via restore logic part 1)...');
        try {
            // We can't easily partial run restoreBackup.
            // Let's just trust CreateBackup works if buffer > 0 and contains manifest.
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(backupBuffer);
            const manifest = zip.getEntry('manifest.json');
            if (manifest) {
                console.log('✅ Manifest found in Zip');
            } else {
                console.error('❌ Manifest Mising in Zip');
            }
        } catch (e) {
            console.error('❌ Zip Check Failed:', e);
        }
    }

    console.log('=== VERIFICATION COMPLETE ===');
}

runVerification();
