export enum IngredientStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DELETED = 'DELETED',
}

export enum MovementType {
  PURCHASE = 'PURCHASE', // Entrée achat
  SALE = 'SALE', // Sortie vente
  ADJUSTMENT = 'ADJUSTMENT', // Correction manuelle ou annulation
  PRODUCTION = 'PRODUCTION', // Transfert ingrédients -> produit fini
  LOSS = 'LOSS', // Perte / Gâchis
}

export interface Supplier {
  id: string;
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  leadTime?: number | null; // Délai livraison (jours)
  defaultConditioning?: string | null; // Conditionnement par défaut
  notes?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  ingredientCount?: number; // Computed field for UI
}

export interface Ingredient {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  category?: string | null; // "Fruit", "Fleur", "Épice", "Plante"
  status: IngredientStatus;
  currentStock: number; // in grams
  weightedAverageCost: number; // CMP

  // New fields for UI Design
  supplierId?: string | null;
  supplier?: Supplier;
  supplierUrl?: string | null;
  alertThreshold?: number | null; // Default 100g
  notes?: string | null;

  // Phase N: Packaging/Accessories specific
  dimensions?: string | null; // e.g. "40 x 30 x 20 cm"
  material?: string | null; // e.g. "Carton double cannelure"
  capacity?: number | null; // e.g. 50 (g)
  subtype?: string | null; // e.g. "Carton", "Sachet", "Boîte"

  updatedAt: Date;
}

export interface CreateIngredientInput {
  name?: string;
  category?: string;
  initialStock?: number;
  initialCost?: number;
  supplierId?: string;
  supplierUrl?: string;
  alertThreshold?: number;
  notes?: string;

  // Phase N
  subtype?: string;
  dimensions?: string;
  capacity?: number;
  material?: string;
}

export enum EntityType {
  INGREDIENT = 'INGREDIENT',
  PACKAGING = 'PACKAGING',
  ACCESSORY = 'ACCESSORY',
}

export enum MovementSource {
  ORDER = 'ORDER',
  MANUAL = 'MANUAL',
  INITIAL = 'INITIAL',
  IMPORT = 'IMPORT',
}

export interface StockMovement {
  id: string;
  organizationId: string;
  ingredientId: string; // Acts as entityId based on type usually, but strictly speaking it is entityId.

  // Audit Fields (New)
  entityType: EntityType;
  source: MovementSource;
  sourceId?: string | null; // e.g. Order ID

  type: MovementType;
  deltaQuantity: number; // Negative for usage/loss
  unitPrice?: number | null;
  totalPrice?: number | null;
  reason?: string | null;
  createdAt: Date;
  targetStock?: number | null; // Snapshot of stock after movement
}
