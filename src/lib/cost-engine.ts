
import { Recipe, RecipeItem } from '@/types/recipe';
import { PackRecipeItem, PackPackagingItem } from '@/types/pack';

/**
 * Pure Calculation Engine
 * No database access. No side effects.
 */

export const CostEngine = {
    /**
     * Calculates the cost of the raw Mix (Tea/Ingredients) per Kg (or Unit if ingredients are unit-based).
     * Usually returns Cost per Gram if ingredients.weightedAverageCost is per Gram?
     * Standard: Inventory WAC is per Gram for Bulk.
     * Return: Cost per Kg (Standard for Recipe Display) or Per Gram? 
     * Let's standardize on: Input WAC is unit-based (usually per gram/ml/unit).
     * Output is Cost per 1.0 quantity of the Mix.
     * If mix is 100g total (based on percentages totaling 100%), and we want cost per Kg?
     * Actually RecipeItem uses Percentage.
     * CostPerunit of Mix = Sum (Percentage/100 * IngredientCostPerUnit).
     */
    calculateMixCostPerUnit(items: { ingredientId: string; percentage: number }[], ingredientCostMap: Record<string, number>): number {
        let cost = 0;
        for (const item of items) {
            const unitCost = ingredientCostMap[item.ingredientId] || 0;
            cost += (item.percentage / 100) * unitCost;
        }
        return cost;
    },

    /**
     * Calculates total cost of a specific Recipe Format (e.g. 100g Bag).
     * Includes Mix Cost + Packaging + Labor + Overheads.
     */
    calculateRecipeUnitCost(
        mixCostPerUnit: number,
        format: number, // Quantity of mix (e.g. 100g)
        packagingCost: number = 0,
        laborCost: number = 0,
        overheadCost: number = 0
    ): number {
        const materialCost = mixCostPerUnit * format;
        return materialCost + packagingCost + laborCost + overheadCost;
    },

    /**
     * Calculates total cost of a Pack.
     * Pack Cost = Sum(Recipe Unit Costs) + Pack Packaging Costs
     */
    calculatePackCost(
        recipes: PackRecipeItem[], // { recipeId, quantity (count), format (g) }
        packaging: PackPackagingItem[],
        recipeMap: Record<string, Recipe>, // Should contain full recipe for fallback costs
        ingredientCostMap: Record<string, number> // For packaging ingredients
    ): number {
        let total = 0;

        // 1. Recipes
        for (const item of recipes) {
            const recipe = recipeMap[item.recipeId];
            if (!recipe) continue;

            // Recalculate Recipe Cost based on current params? 
            // Or use Recipe's stored `totalIngredientCost`?
            // "Source of Truth" -> We should probably use the stored Mix Cost from Recipe 
            // but re-apply format logic.
            // Recipe.totalIngredientCost is MixCostPerUnit (per gram).

            const mixCostPerGram = recipe.totalIngredientCost || 0;
            const materialCost = mixCostPerGram * item.format;
            const unitFixedCost = (recipe.laborCost || 0) + (recipe.packagingCost || 0);

            total += (materialCost + unitFixedCost) * item.quantity;
        }

        // 2. Packaging (Box, etc.)
        for (const item of packaging) {
            const cost = ingredientCostMap[item.ingredientId] || 0;
            total += cost * item.quantity;
        }

        return total;
    },

    /**
     * Calculates Margin.
     * Margin % = (Price - Cost) / Price
     */
    calculateMargin(price: number, cost: number): { amount: number; percent: number } {
        if (price <= 0) return { amount: 0 - cost, percent: 0 };
        const amount = price - cost;
        const percent = (amount / price) * 100;
        return { amount, percent };
    },

    /**
     * Calculates Recommended Price from Target Margin %.
     * Price = Cost / (1 - Margin%)
     */
    calculatePriceFromMargin(cost: number, marginPercent: number): number {
        if (marginPercent >= 100) throw new Error('Marge impossible (>= 100%)');
        return cost / (1 - (marginPercent / 100));
    }
};
