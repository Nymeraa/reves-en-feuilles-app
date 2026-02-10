import { parse } from 'csv-parse/sync';
import { prisma } from '@/lib/db-sql';
import { AuditService } from './audit-service';
import { AuditAction, AuditEntity, AuditSeverity } from '@/types/audit';
import { detectSeparator, normalizeHeader, normalizeValue } from '@/lib/import-utils';
import { HEADER_MAPPINGS, getImportSchema } from '@/lib/import-schemas';

export type ImportEntity =
  | 'ingredients'
  | 'recipes'
  | 'packs'
  | 'packaging'
  | 'accessories'
  | 'orders'
  | 'suppliers';

export interface ImportResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { line: number; field?: string; message: string }[];
}

export const ImportService = {
  /**
   * Compatibility method for scripts.
   */
  parseCsv(csvText: string): any[] {
    const separator = detectSeparator(csvText);
    return parse(csvText, {
      delimiter: separator,
      columns: (headers: string[]) => headers.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  },

  /**
   * Compatibility method for scripts.
   */
  validateCsv(
    type: string,
    rows: any[]
  ): { isValid: boolean; validRows: any[]; invalidRows: any[] } {
    // Map old entity names to new ones
    const entityMap: Record<string, ImportEntity> = {
      Ingrédients: 'ingredients',
      Packaging: 'packaging',
      Accessoires: 'accessories',
      Fournisseurs: 'suppliers',
      Recettes: 'recipes',
      Packs: 'packs',
      Commandes: 'orders',
    };

    const entity = entityMap[type] || (type.toLowerCase() as ImportEntity);
    const schema = getImportSchema(entity);
    const mapping = HEADER_MAPPINGS[entity] || {};

    const validRows: any[] = [];
    const invalidRows: any[] = [];

    rows.forEach((row, index) => {
      const mappedRow: any = {};
      Object.keys(row).forEach((header) => {
        const internalKey = mapping[header] || header;
        mappedRow[internalKey] = normalizeValue(row[header]);
      });

      const result = schema.safeParse(mappedRow);
      if (result.success) {
        validRows.push(result.data);
      } else {
        invalidRows.push({
          row,
          errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
      }
    });

    return {
      isValid: invalidRows.length === 0,
      validRows,
      invalidRows,
    };
  },

  /**
   * Main entry point for CSV imports.
   */
  async executeImport(
    orgId: string,
    entity: ImportEntity,
    csvText: string,
    options: { dryRun?: boolean; upsert?: boolean } = {}
  ): Promise<ImportResult> {
    const { dryRun = false, upsert = true } = options;
    const result: ImportResult = {
      success: false,
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // 1. Parse CSV
      const separator = detectSeparator(csvText);
      const rows = parse(csvText, {
        delimiter: separator,
        columns: (headers: string[]) => headers.map(normalizeHeader),
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });

      result.total = rows.length;
      if (result.total === 0) {
        result.errors.push({ line: 0, message: 'Le fichier CSV est vide.' });
        return result;
      }

      // 2. Map & Validate Rows
      const schema = getImportSchema(entity);
      const mapping = HEADER_MAPPINGS[entity] || {};
      const validatedRows: any[] = [];

      // Pre-fetch lookups if needed
      const lookups = await this.prepareLookups(orgId, entity, rows);

      rows.forEach((row: any, index: number) => {
        const line = index + 2; // +1 for header, +1 for 1-based index
        const mappedRow: any = {};

        // Apply header mapping
        Object.keys(row).forEach((header) => {
          const internalKey = mapping[header] || header;
          mappedRow[internalKey] = normalizeValue(row[header]);
        });

        // Validate
        const validation = schema.safeParse(mappedRow);
        if (!validation.success) {
          validation.error.issues.forEach((issue) => {
            result.errors.push({
              line,
              field: issue.path.join('.'),
              message: issue.message,
            });
          });
        } else {
          // Add lookups (e.g. resolve supplierName to supplierId)
          const finalRow = this.applyLookups(entity, validation.data, lookups);
          validatedRows.push({ line, data: finalRow });
        }
      });

      // If we have errors during validation, we might want to return early if too many
      // but the requirement says "erreurs non bloquantes par ligne".
      // However, if parsing failed completely or validation is critical, handles it.

      if (dryRun) {
        result.success = result.errors.length === 0;
        result.created = validatedRows.length; // In dry-run, we count potential creations
        return result;
      }

      // 3. Execute Mutations in Transaction
      await prisma.$transaction(async (tx) => {
        for (const { line, data } of validatedRows) {
          try {
            const dataToSave = { ...data, organizationId: orgId };

            // Handle unit cost normalization for ingredients (€/kg -> €/g)
            if (entity === 'ingredients' && dataToSave.initialCost) {
              const isPerUnit =
                dataToSave.category === 'Packaging' || dataToSave.category === 'Accessoire';
              if (!isPerUnit) {
                dataToSave.initialCost = dataToSave.initialCost / 1000;
                if (dataToSave.weightedAverageCost === undefined) {
                  dataToSave.weightedAverageCost = dataToSave.initialCost;
                }
              }
            }

            // Handle specific entity logic (slugs, etc.)
            if (dataToSave.name && !dataToSave.slug) {
              dataToSave.slug = dataToSave.name.toLowerCase().replace(/\s+/g, '-');
            }
            if (!dataToSave.id) {
              dataToSave.id = Math.random().toString(36).substring(7);
            }

            // Remove temporary fields used for lookup but not in schema
            const { supplierName, ...finalData } = dataToSave;

            const model = this.getPrismaModel(tx, entity);
            if (upsert) {
              // For upsert, we need a unique identifier.
              // Usually name or id. If ID is random, it's not very useful for matching.
              // We'll try to match by name+orgId if possible.
              // Note: Prisma upsert requires a unique filter.
              // We'll use findFirst + update or create for flex matching.
              const existing = await (model as any).findFirst({
                where: {
                  name: finalData.name,
                  organizationId: orgId,
                },
              });

              if (existing) {
                await (model as any).update({
                  where: { id: existing.id },
                  data: finalData,
                });
                result.updated++;
              } else {
                await (model as any).create({ data: finalData });
                result.created++;
              }
            } else {
              await (model as any).create({ data: finalData });
              result.created++;
            }
          } catch (err: any) {
            result.errors.push({ line, message: err.message });
          }
        }
      });

      result.success = true; // Overall success if we finished the transaction (even with some row errors handled inside if any)

      // 4. Audit Log
      void AuditService.log({
        action: AuditAction.IMPORT,
        entity: AuditEntity.IMPORT_JOB,
        metadata: {
          entity,
          total: result.total,
          created: result.created,
          updated: result.updated,
          errors: result.errors.length,
          dryRun,
        },
      });
    } catch (error: any) {
      result.errors.push({ line: 0, message: `Erreur fatale: ${error.message}` });
    }

    return result;
  },

  /**
   * Pre-fetches related data to avoid N+1 queries during row processing.
   */
  async prepareLookups(orgId: string, entity: string, rows: any[]): Promise<any> {
    const lookups: any = {};

    if (entity === 'ingredients' || entity === 'packaging' || entity === 'accessories') {
      const supplierNames = [
        ...new Set(rows.map((r) => r.fournisseur || r.supplier).filter(Boolean)),
      ];
      if (supplierNames.length > 0) {
        const suppliers = await prisma.supplier.findMany({
          where: {
            organizationId: orgId,
            name: { in: supplierNames as string[] },
          },
        });
        lookups.suppliers = suppliers.reduce((acc: any, s) => {
          acc[s.name.toLowerCase()] = s.id;
          return acc;
        }, {});
      }
    }

    return lookups;
  },

  /**
   * Applies resolved lookups to a validated row.
   */
  applyLookups(entity: string, data: any, lookups: any): any {
    const final = { ...data };

    if (lookups.suppliers && data.supplierName) {
      final.supplierId = lookups.suppliers[data.supplierName.toLowerCase()] || null;
    }

    return final;
  },

  /**
   * Helper to get the correct prisma model from transaction.
   */
  getPrismaModel(tx: any, entity: string) {
    switch (entity) {
      case 'ingredients':
      case 'packaging':
      case 'accessories':
        return tx.ingredient;
      case 'recipes':
        return tx.recipe;
      case 'packs':
        return tx.pack;
      case 'suppliers':
        return tx.supplier;
      case 'orders':
        return tx.order;
      default:
        throw new Error(`Unsupported entity for mutation: ${entity}`);
    }
  },
};
