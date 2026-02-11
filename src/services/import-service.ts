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

      // 3. Execute Mutations in Chunks
      const CHUNK_SIZE = 25;
      for (let i = 0; i < validatedRows.length; i += CHUNK_SIZE) {
        const chunk = validatedRows.slice(i, i + CHUNK_SIZE);

        try {
          await prisma
            .$transaction(async (tx) => {
              let chunkCreated = 0;
              let chunkUpdated = 0;

              for (const { line, data } of chunk) {
                try {
                  const dataToSave = { ...data, organizationId: orgId };

                  // --- 1. Fix Stock & Cost Mapping ---
                  if (entity === 'ingredients') {
                    const isPerUnit =
                      dataToSave.category === 'Packaging' || dataToSave.category === 'Accessoire';

                    // Map initialStock to currentStock if not set
                    if (
                      dataToSave.initialStock !== undefined &&
                      dataToSave.currentStock === undefined
                    ) {
                      dataToSave.currentStock = dataToSave.initialStock;
                    }

                    // Normalize Cost (€/kg -> €/g) if not per unit
                    if (dataToSave.initialCost !== undefined && !isPerUnit) {
                      dataToSave.initialCost = dataToSave.initialCost / 1000;
                    }

                    // Map initialCost to weightedAverageCost if not set
                    if (
                      dataToSave.initialCost !== undefined &&
                      dataToSave.weightedAverageCost === undefined
                    ) {
                      dataToSave.weightedAverageCost = dataToSave.initialCost;
                    }
                  }

                  // Handle specific entity logic (slugs, etc.)
                  if (dataToSave.name && !dataToSave.slug) {
                    dataToSave.slug = dataToSave.name.toLowerCase().replace(/\s+/g, '-');
                  }
                  if (!dataToSave.id) {
                    dataToSave.id = Math.random().toString(36).substring(7);
                  }

                  // --- 2. Fix Supplier Relation ---
                  // We extract temp fields. _resolvedSupplierId comes from applyLookups.
                  const { supplierName, _resolvedSupplierId, ...baseData } = dataToSave;
                  // Delete invalid strict-mode fields if any left
                  delete (baseData as any).supplierId;
                  delete (baseData as any).fournisseur;

                  const finalData: any = { ...baseData };

                  // Logic to attach supplier
                  if (
                    entity === 'ingredients' ||
                    entity === 'packaging' ||
                    entity === 'accessories'
                  ) {
                    let targetSupplierId = _resolvedSupplierId;

                    if (!targetSupplierId && supplierName) {
                      // Lookup or Create manually because 'organizationId_name' is NOT unique in schema
                      const existingSupplier = await tx.supplier.findFirst({
                        where: {
                          organizationId: orgId,
                          name: { equals: supplierName, mode: 'insensitive' },
                        },
                      });

                      if (existingSupplier) {
                        targetSupplierId = existingSupplier.id;
                      } else {
                        // Create new supplier
                        const newSupplier = await tx.supplier.create({
                          data: {
                            id: Math.random().toString(36).substring(7),
                            organizationId: orgId,
                            name: supplierName,
                            status: 'ACTIVE',
                          },
                        });
                        targetSupplierId = newSupplier.id;
                      }
                    }

                    if (targetSupplierId) {
                      finalData.supplier = { connect: { id: targetSupplierId } };
                    }
                  }

                  const model = this.getPrismaModel(tx, entity);

                  if (upsert) {
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
                      chunkUpdated++;
                    } else {
                      await (model as any).create({ data: finalData });
                      chunkCreated++;
                    }
                  } else {
                    await (model as any).create({ data: finalData });
                    chunkCreated++;
                  }
                } catch (rowError: any) {
                  // Fail the chunk explicitly if a row fails
                  throw new Error(`Line ${line}: ${rowError.message}`);
                }
              }

              return { chunkCreated, chunkUpdated };
            })
            .then(({ chunkCreated, chunkUpdated }) => {
              // Only update global counters if the chunk committed successfully
              result.created += chunkCreated;
              result.updated += chunkUpdated;
            });
        } catch (chunkError: any) {
          // Record generic error for the whole chunk range
          const start = chunk[0].line;
          const end = chunk[chunk.length - 1].line;
          result.errors.push({
            line: start,
            message: `Erreur import lot ${start}-${end}: ${chunkError.message}`,
          });
        }
      }

      result.success = true;

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
      // FIX A: Correctly extract supplier names from various possible headers
      const supplierNames = [
        ...new Set(
          rows
            .map((r) => r.suppliername || r.supplierName || r.fournisseur || r.supplier)
            .filter(Boolean)
        ),
      ];

      if (supplierNames.length > 0) {
        const suppliers = await prisma.supplier.findMany({
          where: {
            organizationId: orgId,
            name: { in: supplierNames as string[] }, // Prisma 'in' is case-sensitive usually, handled below by lookups mapping
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

    // FIX B: Do NOT write supplierId (Prisma unknown arg). Write _resolvedSupplierId instead.
    if (lookups.suppliers) {
      const sName = data.supplierName || data.suppliername || data.fournisseur || data.supplier;
      if (sName) {
        final._resolvedSupplierId = lookups.suppliers[sName.toLowerCase()] || null;
        // Ensure we keep the name for fallback creation
        final.supplierName = sName;
      }
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
