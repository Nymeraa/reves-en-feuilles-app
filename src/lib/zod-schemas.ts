import { z } from 'zod';
import { MovementType } from '@/types/inventory';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  leadTime: z.coerce.number().min(0).optional(),
  defaultConditioning: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const createOrderSchema = z.object({
  orderNumber: z.string().optional(),
  customerName: z.string().min(1, 'Customer Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  status: z
    .enum(['DRAFT', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAID'])
    .default('DRAFT'),
  items: z.array(z.any()).optional(), // Detailed item validation can be complex, keeping loose for now
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
  otherFees: z.coerce.number().min(0).optional(),
});

export const updateOrderSchema = createOrderSchema.partial();

export const createStockMovementSchema = z.object({
  ingredientId: z.string().min(1, 'Ingredient ID is required'),
  type: z.nativeEnum(MovementType),
  quantity: z.coerce.number().gt(0, 'Quantity must be positive'), // We handle sign logic in API
  unitPrice: z.coerce.number().min(0).optional(),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});
