import { BackupService } from '../src/services/backup-service';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { DATA_DIR } from '../src/lib/db-json';

async function runBackupVerification() {
    console.log('--- Starting Backup Verification ---');

    // 1. Check Data Directory
    console.log(`Data Directory: ${DATA_DIR}`);
    if (!fs.existsSync(DATA_DIR)) {
        console.error('❌ Data directory does not exist!');
        return;
    }

    const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${jsonFiles.length} JSON files to backup:`, jsonFiles.join(', '));

    // 2. Create Backup
    console.log('\n--- creating backup... ---');
    let backupBuffer: Buffer;
    try {
        backupBuffer = await BackupService.createBackup();
        console.log(`✅ Backup created. Size: ${backupBuffer.length} bytes`);
    } catch (e: any) {
        console.error('❌ Failed to create backup:', e.message);
        return;
    }

    // 3. Verify Zip Content
    console.log('\n--- Verifying Zip Content ---');
    const zip = new AdmZip(backupBuffer);
    const zipEntries = zip.getEntries();
    const zipFileNames = zipEntries.map(e => e.entryName);

    console.log(`Zip contains ${zipEntries.length} entries.`);

    let missingFiles = [];
    jsonFiles.forEach(f => {
        if (!zipFileNames.includes(f)) {
            missingFiles.push(f);
        }
    });

    if (missingFiles.length > 0) {
        console.error('❌ Missing files in backup:', missingFiles.join(', '));
    } else {
        console.log('✅ All JSON files present in backup.');
    }

    if (!zipFileNames.includes('manifest.json')) {
        console.error('❌ Missing manifest.json');
    } else {
        console.log('✅ manifest.json present.');
    }

    // 4. Test Restore (Simulation)
    // We won't actually restore to overwrite data, but we'll call a safe restore test if possible,
    // or just verify the logic by "restoring" to a temp dir?
    // The service hardcodes DATA_DIR.
    // So we will verify the Manifest content instead.

    const manifestEntry = zip.getEntry('manifest.json');
    if (manifestEntry) {
        const manifest = JSON.parse(manifestEntry.getData().toString('utf-8'));
        console.log('Manifest:', JSON.stringify(manifest, null, 2));
        if (manifest.files.length !== jsonFiles.length) {
            console.warn('⚠️ Manifest file count mismatch with actual source files (might be race condition or filter issue).');
        } else {
            console.log('✅ Manifest file count matches.');
        }
    }

    console.log('\n--- Verification Complete ---');
}

runBackupVerification().catch(console.error);
