import { InventoryService } from './inventory-service';
import { EntityType, Ingredient } from '@/types/inventory';
import { findMatchingPackaging } from '@/lib/packaging-logic';
import { AuditService } from './audit-service';
import { AuditAction, AuditEntity, AuditSeverity } from '@/types/audit';

export const PackagingService = {
    /**
     * Finds the matching Packaging Ingredient for a specific format and type.
     * 
     * Strategy:
     * 1. Search ingredients with category 'Packaging' or subtype matching the requested type (e.g., 'Sachet', 'Carton').
     * 2. Filter by Capacity matching the format (e.g., 50 for 50g).
     * 3. Fallback: Filter by Name containing the format (e.g., "50g").
     */
    async findPackagingForFormat(orgId: string, format: number, type: 'Sachet' | 'Carton'): Promise<Ingredient | undefined> {
        const ingredients = await InventoryService.getIngredients(orgId);

        const { ingredient, warning } = findMatchingPackaging(ingredients, format, type);

        if (warning && ingredient) {
            // Log Warning via Audit Service
            await AuditService.log({
                action: AuditAction.UPDATE, // OR ALERT?
                entity: AuditEntity.INGREDIENT,
                entityId: ingredient.id,
                severity: AuditSeverity.WARNING,
                metadata: {
                    reason: warning,
                    context: 'Order Packaging Deduction',
                    format,
                    type
                }
            });
            console.warn(`[PackagingService] ${warning}`);
        }

        return ingredient;
    }
};
