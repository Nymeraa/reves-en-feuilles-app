import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { DATA_DIR } from '@/lib/db-json';
import { AuditService } from './audit-service'; // Added
import { AuditAction, AuditEntity, AuditSeverity } from '@/types/audit'; // Added

export interface BackupManifest {
    version: number; // Schema version
    timestamp: string;
    appVersion: string;
    files: string[];
}

export const BackupService = {
    async createBackup(): Promise<Buffer> {
        const zip = new AdmZip();

        // 1. Get List of JSON files
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

        // 2. Add files to Zip
        files.forEach(file => {
            const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
            zip.addFile(file, Buffer.from(content, 'utf-8'));
        });

        // 3. Create Manifest
        const manifest: BackupManifest = {
            version: 1,
            timestamp: new Date().toISOString(),
            appVersion: '0.1.0', // Could read from package.json if needed
            files: files
        };
        zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'));

        return zip.toBuffer();
    },

    // Wrapped method to include logging
    async createBackupWithLog(): Promise<Buffer> {
        const buffer = await this.createBackup();
        AuditService.log({
            action: AuditAction.EXPORT,
            entity: AuditEntity.BACKUP,
            entityId: `backup-${Date.now()}`,
            metadata: { size: buffer.length }
        });
        return buffer;
    },

    async restoreBackup(zipBuffer: Buffer): Promise<{ success: boolean; message: string }> {
        const zip = new AdmZip(zipBuffer);
        const zipEntries = zip.getEntries();

        // 1. Validate Manifest
        const manifestEntry = zipEntries.find(e => e.entryName === 'manifest.json');
        if (!manifestEntry) {
            throw new Error('Invalid Backup: Missing manifest.json');
        }

        const manifestContent = manifestEntry.getData().toString('utf-8');
        let manifest: BackupManifest;
        try {
            manifest = JSON.parse(manifestContent);
        } catch (e) {
            throw new Error('Invalid Backup: Corrupt manifest.json');
        }

        if (manifest.version !== 1) {
            // In future, handle migration here.
            // For now, only v1 supported.
            // throw new Error(`Unsupported backup version: ${manifest.version}`);
            // Allow it for now if simple JSON.
        }

        // 2. Safety Backup
        await this.createSafetyBackup();

        // 3. Restore (Replace All)
        // Clear existing JSON files? Or just overwrite?
        // User said "Replace All".
        // If backup is missing a file that exists currently (e.g. new feature added), should we delete the current one?
        // "Replace All" usually implies State becomes exactly Backup State.
        // So we should DELETE existing JSONs not in backup (or all JSONs) and then write backup ones.

        // Delete all current JSONs
        const currentFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
        currentFiles.forEach(f => fs.unlinkSync(path.join(DATA_DIR, f)));

        // Write entries
        zipEntries.forEach(entry => {
            if (entry.entryName === 'manifest.json' || entry.isDirectory) return;
            if (!entry.entryName.endsWith('.json')) return; // Security: only json

            // Path Traversal Check? AdmZip usually handles it, but good to be safe.
            const targetPath = path.join(DATA_DIR, path.basename(entry.entryName));
            fs.writeFileSync(targetPath, entry.getData());
        });

        const message = `Restored ${manifest.files.length} files from ${manifest.timestamp}`;

        AuditService.log({
            action: AuditAction.RESTORE,
            entity: AuditEntity.BACKUP,
            entityId: `restore-${Date.now()}`,
            metadata: { manifestTimestamp: manifest.timestamp, fileCount: manifest.files.length }
        });

        return { success: true, message };
    },

    async createSafetyBackup() {
        try {
            const buffer = await this.createBackup();
            const filename = `safety-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
            const backupsDir = path.join(DATA_DIR, '..', 'backups'); // Store outside .data to avoid recursive backup inclusion if we scan recursively (we don't, we scan flat .json)
            // Actually, best to store in specific backup folder.

            if (!fs.existsSync(backupsDir)) {
                fs.mkdirSync(backupsDir, { recursive: true });
            }

            fs.writeFileSync(path.join(backupsDir, filename), buffer);
            console.log(`Safety backup created: ${filename}`);
        } catch (e) {
            console.error('Failed to create safety backup', e);
            // Non-blocking? If safety backup fails, do we abort restore?
            // Safer to abort.
            throw new Error('Failed to create safety backup before restore.');
        }
    }
};
