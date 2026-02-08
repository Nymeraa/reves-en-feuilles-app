import { Ingredient } from './inventory';

export enum RecipeStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
    DEPRECATED = 'DEPRECATED'
}

export const RECIPE_FORMATS = [20, 25, 30, 50, 100, 250, 500] as const;
export type RecipeFormat = typeof RECIPE_FORMATS[number];

export interface RecipeItem {
    id: string;
    ingredientId: string;
    percentage: number; // 0-100%
    ingredient?: Ingredient; // Expanded for UI
}

export interface Recipe {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description?: string;
    status: RecipeStatus;
    items: RecipeItem[];

    // Costing
    laborCost: number; // Fixed cost per batch/unit
    packagingCost: number; // Cost of bag/box

    // Pricing (NEW)
    // Map of Format (g) -> Price (EUR)
    prices: Partial<Record<RecipeFormat, number>>;

    // Computed
    totalIngredientCost?: number;
    totalCost?: number;

    version: number;
    updatedAt: Date;

    // Link to the latest version if Active
    currentVersionId?: string;
}

export interface RecipeVersion extends Omit<Recipe, 'id' | 'status' | 'prices' | 'version'> {
    id: string; // Distinct ID for the version
    recipeId: string; // Pointer to the Head Recipe
    versionNumber: number;
    snapshotDate: Date;
    status: 'VERSION'; // Fixed status

    // Locked Usage Data
    items: RecipeItem[]; // Snapshotted items with their specific calculated costs at that time?
    // actually items have percentage. We need to lock the cost PER item?
    // For now, we lock the composition. The generic cost is locked in totalIngredientCost.

    // Locked Financials
    laborCost: number;
    packagingCost: number;
    totalIngredientCost: number; // Stored value
    totalCost: number; // Stored value

    prices: Record<RecipeFormat, number>; // Stored prices
}

// For Orders: A flattened snapshot
export interface RecipeSnapshot {
    recipeId: string;
    versionId: string;
    name: string;
    items: RecipeItem[];
    // ... costs?
}

export interface CreateRecipeInput {
    name: string;
    description?: string;
    status?: RecipeStatus;
}
