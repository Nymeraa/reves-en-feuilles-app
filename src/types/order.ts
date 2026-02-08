import { RecipeFormat } from './recipe';

export enum OrderStatus {
  DRAFT = 'DRAFT', // Brouillon
  PAID = 'PAID', // Payée
  SHIPPED = 'SHIPPED', // Expédiée
  DELIVERED = 'DELIVERED', // Livrée
  REFUNDED = 'REFUNDED', // Remboursée
  CANCELLED = 'CANCELLED', // Annulée
}

export interface OrderItem {
  id: string;
  orderId: string;
  type: 'RECIPE' | 'PACK' | 'ACCESSORY'; // Discriminator

  // Recipe Specific
  recipeId?: string;
  format?: RecipeFormat;

  // Pack Specific
  packId?: string;

  // Accessory Specific
  ingredientId?: string;

  // Common
  versionNumber: number; // Snapshot version
  name: string; // Snapshot for display
  quantity: number; // Number of units

  // Financial Snapshots (Per Unit, TTC)
  unitCostSnapshot: number; // Total cost (matières + packaging)
  unitMaterialCostSnapshot: number; // Material cost TTC only
  unitPackagingCostSnapshot: number; // Packaging cost TTC only
  unitPriceSnapshot: number; // Price sold at

  // Computed
  totalPrice: number;
}

export interface Order {
  id: string;
  organizationId: string;
  orderNumber?: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];

  todayTotal?: boolean; // deprecated?
  manualTotal: boolean; // If true, totalAmount is fixed
  totalAmount: number;
  totalCost: number;

  createdAt: Date;
  updatedAt: Date;
  // Shipping & Details
  source?: string; // 'Manuel', 'Shopify'
  email?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  shippingPrice?: number; // Prix facturé au client
  shippingCost?: number; // Coût réel pour nous
  packagingType?: string;
  packagingId?: string; // Stable reference to the Packaging Ingredient used

  discountCode?: string;
  discountPercent?: number;

  otherFees?: number; // Legacy/Override input
  notes?: string;

  // Financial Snapshot (Fees)
  feesUrssaf?: number;
  feesShopify?: number;
  feesOther?: number;
  feesTotal?: number; // Sum of above

  // Financial Breakdown
  cogsMaterials: number;
  cogsPackaging: number;
  netProfit: number;
  margin: number;
}

export interface CreateOrderInput {
  orderNumber?: string;
  customerName: string;
  date?: Date; // Allow setting date
  source?: string;
  email?: string;
  totalAmount?: number; // Can be overridden
  status?: OrderStatus;

  shippingCarrier?: string;
  trackingNumber?: string;
  shippingPrice?: number;
  shippingCost?: number;
  packagingType?: string;
  discountCode?: string;
  discountPercent?: number;
  otherFees?: number;
  notes?: string;
  site?: string;
}

export interface AddOrderItemInput {
  type: 'RECIPE' | 'PACK' | 'ACCESSORY';
  recipeId?: string;
  packId?: string;
  ingredientId?: string;
  format?: RecipeFormat; // e.g., 100
  quantity: number;
  unitPrice?: number; // Optional override
}
