import { Pack, PackStatus, CreatePackInput, PackVersion } from '@/types/pack';
import { Recipe } from '@/types/recipe';
import { db } from '@/lib/db';
import { AuditService } from './audit-service';
import { AuditAction, AuditEntity, AuditSeverity } from '@/types/audit';
import { CostEngine } from '@/lib/cost-engine';
import { Ingredient } from '@/types/inventory';

const _getContext = async (orgId?: string) => {
    const allRecipes = await db.readAll<Recipe>('recipes', orgId);
    const allIngredients = await db.readAll<Ingredient>('ingredients', orgId);

    const recipeMap: Record<string, Recipe> = {};
    allRecipes.forEach(r => recipeMap[r.id] = r);

    const ingMap: Record<string, number> = {};
    allIngredients.forEach(i => ingMap[i.id] = i.weightedAverageCost || 0);

    return { recipeMap, ingMap };
};

export const PackService = {
    async getPacks(orgId: string): Promise<Pack[]> {
        return db.readAll('packs', orgId);
    },

    async getPackById(id: string, orgId?: string): Promise<Pack | undefined> {
        const result = await db.getById<Pack>('packs', id, orgId);
        return result || undefined;
    },

    async getPackVersion(packId: string, versionNumber: number): Promise<PackVersion | undefined> {
        const versions = await db.readAll<PackVersion>('pack-versions');
        return versions.find(v => v.packId === packId && v.versionNumber === versionNumber);
    },

    async createPack(orgId: string, input: CreatePackInput): Promise<Pack> {
        const newPack: Pack = {
            id: Math.random().toString(36).substring(7),
            organizationId: orgId,
            name: input.name,
            slug: input.name.toLowerCase().replace(/\s+/g, '-'),
            status: PackStatus.DRAFT,
            description: input.description,
            recipes: [],
            packaging: [],
            price: 0,
            updatedAt: new Date(),
            version: 1,
            totalCost: 0,
            margin: 0
        };

        await db.upsert('packs', newPack, orgId);

        const { ActivityService } = await import('./activity-service');
        await ActivityService.log(orgId, 'CREATE' as any, 'Pack', newPack.id, `Pack "${newPack.name}" created.`);

        await AuditService.log({
            action: AuditAction.CREATE,
            entity: AuditEntity.PACK,
            entityId: newPack.id,
            metadata: { name: newPack.name }
        });

        return newPack;
    },

    async updatePackFull(orgId: string, packId: string, data: Partial<Pack>) {
        const pack = await db.getById<Pack>('packs', packId, orgId);
        if (!pack) throw new Error('Pack not found');

        // 1. Calculate Cost
        const nextRecipes = data.recipes || pack.recipes;
        const nextPackaging = data.packaging || pack.packaging;
        const { recipeMap, ingMap } = await _getContext(orgId);
        const totalCost = CostEngine.calculatePackCost(nextRecipes, nextPackaging, recipeMap, ingMap);

        // 2. Versioning Logic
        if (pack.status === PackStatus.ACTIVE) {
            const snapshot: PackVersion = {
                id: Math.random().toString(36).substring(7),
                packId: pack.id,
                organizationId: pack.organizationId,
                name: pack.name,
                slug: pack.slug,
                description: pack.description,
                versionNumber: pack.version,
                snapshotDate: new Date(),
                status: 'VERSION',
                recipes: pack.recipes,
                packaging: pack.packaging,
                price: pack.price,
                totalCost: pack.totalCost || 0,
                margin: pack.margin || 0,
                updatedAt: new Date()
            };

            await db.upsert('pack-versions', snapshot, orgId);

            pack.version += 1;

            await AuditService.log({
                action: AuditAction.CREATE,
                entity: AuditEntity.PACK_VERSION,
                entityId: snapshot.id,
                correlationId: pack.id,
                metadata: {
                    versionNumber: snapshot.versionNumber,
                    packId: pack.id
                }
            });
        }

        const nextPrice = data.price !== undefined ? data.price : pack.price;

        const updatedPack: Pack = {
            ...pack,
            ...data,
            totalCost,
            margin: nextPrice - totalCost,
            updatedAt: new Date()
        };

        await db.upsert('packs', updatedPack, orgId);

        const { ActivityService } = await import('./activity-service');
        await ActivityService.log(orgId, 'UPDATE' as any, 'Pack', packId, `Pack "${pack.name}" updated v${pack.version}.`);

        await AuditService.log({
            action: AuditAction.UPDATE,
            entity: AuditEntity.PACK,
            entityId: packId,
            correlationId: packId,
            metadata: {
                version: pack.version,
                totalCost: updatedPack.totalCost,
                margin: updatedPack.margin
            }
        });

        return updatedPack;
    },

    async duplicatePack(orgId: string, packId: string): Promise<Pack> {
        const original = await db.getById<Pack>('packs', packId, orgId);
        if (!original) throw new Error('Pack not found');

        const newPack: Pack = {
            ...original,
            id: Math.random().toString(36).substring(7),
            name: `${original.name} (Copy)`,
            slug: `${original.slug}-copy`,
            status: PackStatus.DRAFT,
            version: 1,
            updatedAt: new Date(),
        };

        const { recipeMap, ingMap } = await _getContext(orgId);
        const cost = CostEngine.calculatePackCost(newPack.recipes, newPack.packaging, recipeMap, ingMap);
        newPack.totalCost = cost;
        newPack.margin = newPack.price - cost;

        await db.upsert('packs', newPack, orgId);
        return newPack;
    },

    async deletePack(orgId: string, id: string): Promise<boolean> {
        const existing = await db.getById('packs', id, orgId);
        if (!existing) return false;

        await db.delete('packs', id, orgId);

        await AuditService.log({
            action: AuditAction.DELETE,
            entity: AuditEntity.PACK,
            entityId: id,
            severity: AuditSeverity.WARNING
        });

        return true;
    }
};
