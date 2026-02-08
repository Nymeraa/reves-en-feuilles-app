import { Ingredient } from '@/types/inventory';

export interface PackagingMatchResult {
    ingredient?: Ingredient;
    method: 'EXACT_CAPACITY' | 'NAME_FALLBACK' | 'NONE';
    warning?: string;
}

/**
 * Pure function to find the matching Packaging Ingredient.
 * Shared between Backend (PackagingService) and Frontend (RecipeDialog).
 */
export function findMatchingPackaging(
    ingredients: Ingredient[],
    format: number,
    type: 'Sachet' | 'Carton'
): PackagingMatchResult {

    // Filter candidates
    const candidates = ingredients.filter(i => {
        // Broad Category check (optional but robust)
        // const isPackagingCat = i.category === 'Packaging' || i.category === 'Accessory'; // Not strict enough?

        // Check subtype if it exists (Phase N field - BEST)
        if (i.subtype?.toLowerCase() === type.toLowerCase()) return true;

        // Fallback: Check Name (if subtype missing)
        if (i.name.toLowerCase().includes(type.toLowerCase())) return true;

        return false;
    });

    // 1. Exact Capacity Match (Best - Strict Mode)
    const exactCapacity = candidates.find(i => i.capacity === format);
    if (exactCapacity) {
        return { ingredient: exactCapacity, method: 'EXACT_CAPACITY' };
    }

    // 2. Name Match (Fallback - Deprecated/Warning)
    // Regex or simple inclusion
    const nameMatch = candidates.find(i => {
        const normName = i.name.toLowerCase();
        return normName.includes(`${format}g`) || normName.includes(`${format} g`);
    });

    if (nameMatch) {
        return {
            ingredient: nameMatch,
            method: 'NAME_FALLBACK',
            warning: `Packaging matched by Name (${nameMatch.name}) instead of strict Capacity field. Please update Ingredient capacity.`
        };
    }

    return { method: 'NONE' };
}
