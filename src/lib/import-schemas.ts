import { z } from 'zod';

/**
 * Mappings for French CSV headers to internal property names.
 */
export const HEADER_MAPPINGS: Record<string, Record<string, string>> = {
  ingredients: {
    nom: 'name',
    catégorie: 'category',
    'stock initial': 'initialStock',
    'stock actuel': 'initialStock',
    'prix unitaire': 'initialCost',
    'coût unitaire': 'initialCost',
    fournisseur: 'supplierName',
    'seuil alerte': 'alertThreshold',
    notes: 'notes',
    unité: 'unit',
  },
  packaging: {
    nom: 'name',
    type: 'subtype',
    dimensions: 'dimensions',
    capacité: 'capacity',
    'stock initial': 'initialStock',
    'prix unitaire': 'initialCost',
    fournisseur: 'supplierName',
  },
  suppliers: {
    nom: 'name',
    email: 'contactEmail',
    téléphone: 'contactPhone',
    'site web': 'website',
    délai: 'leadTime',
    notes: 'notes',
  },
  recipes: {
    nom: 'name',
    description: 'description',
    "coût main d'oeuvre": 'laborCost',
    'coût packaging': 'packagingCost',
  },
  packs: {
    nom: 'name',
    description: 'description',
    prix: 'price',
  },
  orders: {
    'numéro commande': 'orderNumber',
    'nom client': 'customerName',
    client: 'customerName',
    email: 'email',
    statut: 'status',
    total: 'totalAmount',
    date: 'date',
    source: 'source',
    transporteur: 'shippingCarrier',
    tracking: 'trackingNumber',
  },
};

// Base Schemas
export const IngredientImportSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().default('Ingrédient'),
  initialStock: z.number().optional().default(0),
  initialCost: z.number().optional().default(0),
  supplierName: z.string().optional(),
  alertThreshold: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
});

export const PackagingImportSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().default('Packaging'),
  subtype: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  capacity: z.number().optional().nullable(),
  initialStock: z.number().optional().default(0),
  initialCost: z.number().optional().default(0),
  supplierName: z.string().optional(),
});

export const AccessoryImportSchema = PackagingImportSchema.extend({
  category: z.string().optional().default('Accessoire'),
});

export const SupplierImportSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email().optional().or(z.literal('')).nullable(),
  contactPhone: z.string().optional().nullable(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  leadTime: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const RecipeImportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  laborCost: z.number().optional().default(0),
  packagingCost: z.number().optional().default(0),
});

export const PackImportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.number().optional().default(0),
});

export const OrderImportSchema = z.object({
  orderNumber: z.string().optional().nullable(),
  customerName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  status: z.string().optional().default('DRAFT'),
  totalAmount: z.number().optional().default(0),
  date: z.coerce.date().optional(),
  source: z.string().optional().nullable(),
  shippingCarrier: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
});

/**
 * Gets the schema for a specific entity type.
 */
export function getImportSchema(entity: string): z.ZodObject<any> {
  switch (entity) {
    case 'ingredients':
      return IngredientImportSchema;
    case 'packaging':
      return PackagingImportSchema;
    case 'accessories':
      return AccessoryImportSchema;
    case 'suppliers':
      return SupplierImportSchema;
    case 'recipes':
      return RecipeImportSchema;
    case 'packs':
      return PackImportSchema;
    case 'orders':
      return OrderImportSchema;
    default:
      throw new Error(`Untyped entity: ${entity}`);
  }
}
