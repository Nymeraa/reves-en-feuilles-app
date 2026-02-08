import { Recipe, RecipeStatus, CreateRecipeInput, RecipeItem, RecipeVersion } from '@/types/recipe';
import { db } from '@/lib/db';
import { AuditService } from './audit-service';
import { AuditAction, AuditEntity, AuditSeverity } from '@/types/audit';
import { CostEngine } from '@/lib/cost-engine';
import { Ingredient } from '@/types/inventory';

const _validateComposition = (items: RecipeItem[]) => {
    const total = items.reduce((sum, i) => sum + i.percentage, 0);
    // Allow tiny float margin
    if (Math.abs(total - 100) > 0.1) {
        throw new Error(`Composition invalide : Total ${total.toFixed(2)}% (Doit être 100%)`);
    }
};

export const RecipeService = {
    async getIngredientCostMap(orgId?: string) {
        const ingredients = await db.readAll<Ingredient>('ingredients', orgId);
        const map: Record<string, number> = {};
        ingredients.forEach(i => map[i.id] = i.weightedAverageCost || 0);
        return map;
    },

    async getRecipes(orgId: string): Promise<Recipe[]> {
        return db.readAll('recipes', orgId);
    },

    async getRecipeById(id: string, orgId?: string): Promise<Recipe | undefined> {
        const result = await db.getById<Recipe>('recipes', id, orgId);
        return result || undefined;
    },

    async getRecipeVersion(recipeId: string, versionNumber: number): Promise<RecipeVersion | undefined> {
        // 1. Check History
        const versions = await db.readAll<RecipeVersion>('recipe-versions');
        // Note: readAll fetches everything if not optimized. 
        // In SQL we might want a specialized method, but for now:
        const found = versions.find(v => v.recipeId === recipeId && v.versionNumber === versionNumber);
        if (found) return found;

        // 2. Check Head (Current)
        const current = await db.getById<Recipe>('recipes', recipeId);

        if (current && current.version === versionNumber) {
            return {
                id: `head-${current.id}-${current.version}`,
                recipeId: current.id,
                organizationId: current.organizationId,
                name: current.name,
                slug: current.slug,
                description: current.description,
                versionNumber: current.version,
                snapshotDate: current.updatedAt,
                status: 'VERSION',
                items: current.items,
                laborCost: current.laborCost,
                packagingCost: current.packagingCost,
                totalIngredientCost: current.totalIngredientCost || 0,
                totalCost: current.totalCost || 0,
                prices: current.prices as Record<number, number>,
                updatedAt: current.updatedAt
            };
        }

        return undefined;
    },

    async createRecipe(orgId: string, input: CreateRecipeInput): Promise<Recipe> {
        const newRecipe: Recipe = {
            id: Math.random().toString(36).substring(7),
            organizationId: orgId,
            name: input.name,
            slug: input.name.toLowerCase().replace(/\s+/g, '-'),
            status: input.status || RecipeStatus.DRAFT,
            description: input.description,
            items: [],
            laborCost: 0,
            packagingCost: 0,
            prices: {},
            version: 1,
            updatedAt: new Date(),
        };

        await db.upsert('recipes', newRecipe, orgId);

        await AuditService.log({
            action: AuditAction.CREATE,
            entity: AuditEntity.RECIPE,
            entityId: newRecipe.id,
            metadata: { name: newRecipe.name }
        });

        return newRecipe;
    },

    async updateRecipe(orgId: string, id: string, updates: Partial<Recipe>): Promise<Recipe> {
        const recipe = await db.getById<Recipe>('recipes', id, orgId);
        if (!recipe) throw new Error('Recipe not found');

        // Access Control
        if (recipe.status === RecipeStatus.ACTIVE && updates.status !== RecipeStatus.ARCHIVED) {
            // See original logic
        }

        const updated: Recipe = { ...recipe, ...updates, updatedAt: new Date() };
        await db.upsert('recipes', updated, orgId);
        return updated;
    },

    async updateRecipeFull(orgId: string, recipeId: string, data: { items: { ingredientId: string, percentage: number }[], prices: Record<number, number>, status: RecipeStatus, name: string, description: string }) {
        const recipe = await db.getById<Recipe>('recipes', recipeId, orgId);
        if (!recipe) throw new Error('Recipe not found');

        // 1. Validate Composition (Strict 100%)
        const newItems: RecipeItem[] = data.items.map(i => ({
            id: Math.random().toString(36).substring(7),
            ingredientId: i.ingredientId,
            percentage: i.percentage
        }));

        _validateComposition(newItems);

        // 2. Calculate Costs
        const costMap = await this.getIngredientCostMap(orgId);
        const costPerGram = CostEngine.calculateMixCostPerUnit(newItems, costMap);

        // 3. Logic: DRAFT vs ACTIVE
        if (recipe.status === RecipeStatus.ACTIVE) {
            // Snapshot current state
            const snapshot: RecipeVersion = {
                id: Math.random().toString(36).substring(7),
                recipeId: recipe.id,
                organizationId: recipe.organizationId,
                name: recipe.name,
                slug: recipe.slug,
                description: recipe.description,
                versionNumber: recipe.version,
                snapshotDate: new Date(),
                status: 'VERSION',
                items: recipe.items,
                laborCost: recipe.laborCost,
                packagingCost: recipe.packagingCost,
                totalIngredientCost: recipe.totalIngredientCost || 0,
                totalCost: recipe.totalCost || 0,
                prices: recipe.prices as Record<number, number>,
                updatedAt: new Date()
            };

            await db.upsert('recipe-versions', snapshot, orgId);

            // Increment Version on Head
            recipe.version += 1;

            await AuditService.log({
                action: AuditAction.CREATE,
                entity: AuditEntity.RECIPE_VERSION,
                entityId: snapshot.id,
                correlationId: recipe.id,
                metadata: {
                    versionNumber: snapshot.versionNumber,
                    recipeId: recipe.id,
                    reason: 'Update on Active Recipe'
                }
            });
        }

        // 4. Update Head
        recipe.name = data.name;
        recipe.description = data.description;
        recipe.status = data.status;
        recipe.prices = data.prices;
        recipe.items = newItems;
        recipe.totalIngredientCost = costPerGram;
        recipe.totalCost = costPerGram;
        recipe.updatedAt = new Date();

        await db.upsert('recipes', recipe, orgId);

        return recipe;
    },

    async updateRecipeCostsForIngredient(orgId: string, ingredientId: string, newCostPerKg: number) {
        const recipes = await db.readAll<Recipe>('recipes', orgId);
        const costMap = await this.getIngredientCostMap(orgId);
        // Note: costMap might not have the *updated* cost of the ingredient yet if called before saving ingredient?
        // Usually called AFTER saving ingredient. So costMap checks DB.

        for (const recipe of recipes) {
            if (recipe.status !== RecipeStatus.DRAFT) continue;
            if (!recipe.items.some(item => item.ingredientId === ingredientId)) continue;

            const newCost = CostEngine.calculateMixCostPerUnit(recipe.items, costMap);
            recipe.totalIngredientCost = newCost;
            recipe.updatedAt = new Date();

            await db.upsert('recipes', recipe, orgId);
        }
    },

    async duplicateRecipe(orgId: string, recipeId: string): Promise<Recipe> {
        const original = await db.getById<Recipe>('recipes', recipeId, orgId);
        if (!original) throw new Error('Recipe not found');

        const newRecipe: Recipe = {
            ...original,
            id: Math.random().toString(36).substring(7),
            name: `${original.name} (Copy)`,
            slug: `${original.slug}-copy`,
            status: RecipeStatus.DRAFT,
            version: 1,

            updatedAt: new Date(),
            items: original.items.map(i => ({ ...i, id: Math.random().toString(36).substring(7) }))
        };

        const costMap = await this.getIngredientCostMap(orgId);
        newRecipe.totalIngredientCost = CostEngine.calculateMixCostPerUnit(newRecipe.items, costMap);

        await db.upsert('recipes', newRecipe, orgId);
        return newRecipe;
    },

    async deleteRecipe(orgId: string, id: string): Promise<boolean> {
        const existing = await db.getById('recipes', id, orgId);
        if (!existing) return false;

        await db.delete('recipes', id, orgId);

        await AuditService.log({
            action: AuditAction.DELETE,
            entity: AuditEntity.RECIPE,
            entityId: id,
            severity: AuditSeverity.WARNING
        });

        return true;
    }
};
