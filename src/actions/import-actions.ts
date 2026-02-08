'use server'

import { ImportService, ImportEntityType } from '@/services/import-service';

export async function validateImportCsv(formData: FormData) {
    const file = formData.get('file') as File;
    const type = formData.get('type') as ImportEntityType;

    if (!file) return { error: 'No file provided' };

    const text = await file.text();
    const rows = ImportService.parseCsv(text);
    const validation = ImportService.validateCsv(type, rows);

    // Filter out rows to avoid sending huge payload if not needed?
    // Be careful with payload size limit (Next.js server actions defaulted to 1MB? or 4MB?).
    // For now return all.
    return { success: true, validation };
}

export async function executeImport(type: ImportEntityType, rows: any[], mode: 'create' | 'upsert') {
    try {
        const orgId = 'org-1'; // Context
        await ImportService.executeImport(orgId, type, rows, mode);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
