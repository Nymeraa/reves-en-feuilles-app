import { z } from 'zod';
import { InventoryService } from './inventory-service';
import { SupplierService } from './supplier-service';
import { RecipeService } from './recipe-service';
import { PackService } from './pack-service';
import { OrderService } from './order-service';
import { parse } from 'csv-parse/sync';
import { AuditService } from './audit-service';
import { AuditAction, AuditEntity, AuditSeverity } from '@/types/audit';
import { RecipeStatus } from '@/types/recipe';
import { PackStatus } from '@/types/pack';
import { OrderStatus } from '@/types/order';

export type ImportEntityType =
  | 'Ingrédients'
  | 'Packaging'
  | 'Accessoires'
  | 'Fournisseurs'
  | 'Recettes'
  | 'Packs'
  | 'Commandes';

// Schemas
const IngredientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  initialStock: z.coerce.number().min(0).optional(),
  initialCost: z.coerce.number().min(0).optional(),
  supplierId: z.string().optional(),
  alertThreshold: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  // Packaging props (optional)
  subtype: z.string().optional(),
  dimensions: z.string().optional(),
  capacity: z.coerce.number().optional(),
  // Removed 'material' as it's not in the schema
});

const AccessorySchema = IngredientSchema;

const SupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  leadTime: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const RecipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.nativeEnum(RecipeStatus).optional().default(RecipeStatus.DRAFT),
  laborCost: z.coerce.number().min(0).optional(),
  packagingCost: z.coerce.number().min(0).optional(),
});

const PackSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  status: z.nativeEnum(PackStatus).optional().default(PackStatus.DRAFT),
});

const OrderSchema = z.object({
  orderNumber: z.string().min(1, 'Order Number is required'),
  customerName: z.string().min(1, 'Customer Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  status: z.nativeEnum(OrderStatus).optional().default(OrderStatus.DRAFT),
  totalAmount: z.coerce.number().optional(),
  date: z.coerce.date().optional(),
  source: z.string().optional(),
  shippingCarrier: z.string().optional(),
  trackingNumber: z.string().optional(),
});

export interface ImportValidationResult {
  totalRows: number;
  validRows: any[];
  invalidRows: { row: any; errors: string[] }[];
  isValid: boolean;
}

export const ImportService = {
  parseCsv(content: string): any[] {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  },

  validateCsv(type: ImportEntityType, rows: any[]): ImportValidationResult {
    const validRows: any[] = [];
    const invalidRows: { row: any; errors: string[] }[] = [];

    let schema: z.ZodType<any>;

    switch (type) {
      case 'Ingrédients':
      case 'Packaging':
        schema = IngredientSchema;
        break;
      case 'Accessoires':
        schema = AccessorySchema;
        break;
      case 'Fournisseurs':
        schema = SupplierSchema;
        break;
      case 'Recettes':
        schema = RecipeSchema;
        break;
      case 'Packs':
        schema = PackSchema;
        break;
      case 'Commandes':
        schema = OrderSchema;
        break;
      default:
        throw new Error('Unsupported entity type');
    }

    rows.forEach((row) => {
      const result = schema.safeParse(row);
      if (result.success) {
        validRows.push(result.data);
      } else {
        const issues = result.error.issues || [];
        invalidRows.push({
          row,
          errors: issues.map((e: any) => `${e.path?.join('.') || '?'}: ${e.message}`),
        });
      }
    });

    return {
      totalRows: rows.length,
      validRows,
      invalidRows,
      isValid: invalidRows.length === 0,
    };
  },

  async executeImport(
    orgId: string,
    type: ImportEntityType,
    rows: any[],
    mode: 'create' | 'upsert' = 'create'
  ) {
    const correlationId = `import-${Date.now()}`;

    AuditService.log({
      action: AuditAction.IMPORT,
      entity: AuditEntity.IMPORT_JOB,
      entityId: correlationId,
      correlationId,
      metadata: { type, rowCount: rows.length, mode, status: 'STARTED' },
    });

    let result: any;
    try {
      switch (type) {
        case 'Ingrédients':
        case 'Packaging':
          result = await InventoryService.bulkCreateIngredients(orgId, rows, mode);
          break;
        case 'Accessoires':
          const accessoryRows = rows.map((r) => ({ ...r, category: r.category || 'Accessoire' }));
          result = await InventoryService.bulkCreateIngredients(orgId, accessoryRows, mode);
          break;
        case 'Fournisseurs':
          result = await SupplierService.bulkCreateSuppliers(orgId, rows);
          break;
        case 'Recettes':
          const recipes = [];
          for (const row of rows) {
            recipes.push(await RecipeService.createRecipe(orgId, row));
          }
          result = recipes;
          break;
        case 'Packs':
          const packs = [];
          for (const row of rows) {
            packs.push(await PackService.createPack(orgId, row));
          }
          result = packs;
          break;
        case 'Commandes':
          const orders = [];
          for (const row of rows) {
            orders.push(await OrderService.createDraftOrder(orgId, row));
          }
          result = orders;
          break;
        default:
          throw new Error('Unsupported entity type');
      }

      AuditService.log({
        action: AuditAction.IMPORT,
        entity: AuditEntity.IMPORT_JOB,
        entityId: correlationId,
        correlationId,
        metadata: { type, mode, status: 'COMPLETED', createdCount: result?.length || 0 },
      });

      return result;
    } catch (error: any) {
      AuditService.log({
        action: AuditAction.IMPORT,
        entity: AuditEntity.IMPORT_JOB,
        entityId: correlationId,
        severity: AuditSeverity.ERROR,
        correlationId,
        metadata: { type, mode, status: 'FAILED', error: error.message },
      });
      throw error;
    }
  },
};
