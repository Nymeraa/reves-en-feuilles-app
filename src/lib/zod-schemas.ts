import { z } from 'zod';
import { MovementType } from '@/types/inventory';

const optionalString = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v === '' ? null : v));

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z
    .string()
    .email()
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  contactPhone: optionalString,
  website: z
    .string()
    .url()
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  leadTime: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.number().min(0).optional()
    )
    .optional(),
  defaultConditioning: optionalString,
  notes: optionalString,
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const orderItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['RECIPE', 'PACK', 'ACCESSORY']),
  name: z.string().optional(),
  quantity: z.coerce.number().min(1),
  format: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  unitPriceSnapshot: z.coerce.number().optional(),
  unitCostSnapshot: z.coerce.number().optional(),
  unitMaterialCostSnapshot: z.coerce.number().optional(),
  unitPackagingCostSnapshot: z.coerce.number().optional(),
  totalPrice: z.coerce.number().optional(),
  versionNumber: z.coerce.number().optional(),
  recipeId: z.string().optional(),
  packId: z.string().optional(),
  ingredientId: z.string().optional(),
});

export const createOrderSchema = z.object({
  orderNumber: z.string().optional(),
  customerName: z.string().min(1, 'Customer Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  status: z
    .enum(['DRAFT', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAID'])
    .default('DRAFT'),
  items: z.array(orderItemSchema).optional(),
  totalAmount: z.coerce.number().min(0).default(0),
  source: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCarrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingCost: z.coerce.number().min(0).optional(),
  shippingPrice: z.coerce.number().min(0).optional(),
  priority: z.enum(['NORMAL', 'HIGH']).default('NORMAL'),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  notes: z.string().optional(),
  site: z.string().optional(),
  // Added fields
  date: z.string().optional(), // ISO date string
  packagingType: z.string().optional(),
  discountCode: z.string().optional(),
  discountPercent: z.coerce.number().min(0).optional(),
  feesOther: z.coerce.number().min(0).optional(),
});

export const updateOrderSchema = createOrderSchema.partial();

export const createStockMovementSchema = z
  .object({
    ingredientId: z.string().min(1, 'Ingredient ID is required'),
    type: z.nativeEnum(MovementType),
    quantity: z.coerce.number().gt(0, 'Quantity must be positive'), // We handle sign logic in API
    unitPrice: z.coerce.number().min(0).nullable().optional(),
    reason: z.string().min(1, 'Reason is required'),
    notes: z.string().optional(),
    source: z.string().optional(),
    sourceId: z.string().nullable().optional(),
  })
  .passthrough(); // We'll manually check for unknown keys in the handler for observability

export const createIngredientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional().nullable(),
  initialStock: z.coerce.number().min(0).default(0),
  initialCost: z.coerce.number().min(0).default(0),
  supplierId: z.string().optional().nullable(),
  supplierUrl: z.string().optional().nullable().or(z.literal('')),
  alertThreshold: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  subtype: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  capacity: z.coerce.number().optional().nullable(),
  currentStock: z.coerce.number().optional().nullable(),
  weightedAverageCost: z.coerce.number().optional().nullable(),
});

export const updateIngredientSchema = createIngredientSchema.partial();
