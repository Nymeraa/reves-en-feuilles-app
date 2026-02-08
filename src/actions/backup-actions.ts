'use server'

import { BackupService } from '@/services/backup-service';

export async function restoreBackupAction(formData: FormData) {
    const file = formData.get('file') as File;

    if (!file) return { success: false, error: 'No file provided' };
    if (!file.name.endsWith('.zip')) return { success: false, error: 'Must be a ZIP file' };

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await BackupService.restoreBackup(buffer);
        return { success: true, message: result.message };
    } catch (e: any) {
        return { success: false, error: e.message || 'Restore failed' };
    }
}
