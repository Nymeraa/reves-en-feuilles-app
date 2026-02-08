import { Recipe, RecipeFormat } from './recipe';
import { Ingredient } from './inventory'; // Using Ingredient as Packaging for now? Or should we make Packaging explicit? 
// For now, let's assume Packaging is a Category of Ingredient or a separate type. 
// In Inventory TS, we haven't strictly separated them yet, but we have 'category'.

export enum PackStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED'
}

export interface PackRecipeItem {
    id: string;
    recipeId: string;
    recipe?: Recipe; // Hydrated
    format: number | RecipeFormat; // e.g. 50g
    quantity: number; // e.g. 3 sachets
}

export interface PackPackagingItem {
    id: string;
    ingredientId: string;
    ingredient?: Ingredient; // Hydrated
    quantity: number;
}

export interface Pack {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description?: string;
    status: PackStatus;

    // Components
    recipes: PackRecipeItem[];
    packaging: PackPackagingItem[];

    // Financials
    price: number; // Selling Price TTC

    // Computed (Virtual)
    totalCost?: number; // Sum of recipes material + packaging cost
    margin?: number;

    updatedAt: Date;
    version: number;
    currentVersionId?: string;
}

export interface PackVersion extends Omit<Pack, 'id' | 'status' | 'version'> {
    id: string;
    packId: string;
    versionNumber: number;
    snapshotDate: Date;
    status: 'VERSION';

    // Locked Components (Deep Copy)
    recipes: PackRecipeItem[];
    packaging: PackPackagingItem[];

    // Locked Financials
    price: number;
    totalCost: number; // Stored
    margin: number; // Stored
}

export interface CreatePackInput {
    name: string;
    description?: string;
    baseFormat?: number; // Helper for UI initial population
}
