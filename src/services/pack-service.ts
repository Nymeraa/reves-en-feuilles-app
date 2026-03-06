import { Pack, PackStatus, CreatePackInput, PackVersion, PackRecipeLot, PackPackagingLot } from '@/types/pack';
import { Recipe } from '@/types/recipe';
import { db } from '@/lib/db';
import { AuditService } from './audit-service';
import { AuditAction, AuditEntity, AuditSeverity } from '@/types/audit';
import { CostEngine } from '@/lib/cost-engine';
import { Ingredient } from '@/types/inventory';

const _getContext = async (orgId?: string) => {
  const { SettingsService } = await import('./settings-service');
  const settings = await SettingsService.getSettings(orgId);
  const taxMultiplierIng = 1 + (settings.tvaIngredients || 0) / 100;
  const taxMultiplierPack = 1 + (settings.tvaPackaging || 0) / 100;

  const allRecipes = await db.readAll<Recipe>('recipes', orgId);
  const allIngredients = await db.readAll<Ingredient>('ingredients', orgId);

  const recipeMap: Record<string, Recipe> = {};
  allRecipes.forEach((r) => (recipeMap[r.id] = r));

  const ingMap: Record<string, number> = {};
  allIngredients.forEach((i) => {
    const isPackaging = i.category === 'Packaging' || i.category === 'Accessoire';
    const costHT = i.weightedAverageCost || 0;
    // Apply appropriate tax rate
    const multiplier = isPackaging ? taxMultiplierPack : taxMultiplierIng;
    ingMap[i.id] = costHT * multiplier;
  });

  return { recipeMap, ingMap };
};

// New helper function to map raw DB pack data to the Pack type
const _mapPackFromDb = (rawPack: Pack & { items: any[] }): Pack => {
  const itemsArr = rawPack.items || [];
  const recipes = itemsArr
    .filter((item: any) => item.type === 'RECIPE')
    .map((item: any) => ({
      id: item.id,
      recipeId: item.recipeId,
      quantity: item.quantity,
      format: item.format,
    }));
  const packaging = itemsArr
    .filter((item: any) => item.type === 'INGREDIENT')
    .map((item: any) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      quantity: item.quantity,
    }));

  // Map recipe lots
  const recipeLots: PackRecipeLot[] = itemsArr
    .filter((item: any) => item.type === 'RECIPE_LOT')
    .map((item: any) => ({
      id: item.id,
      label: item.label || '',
      format: item.format || 100,
      quantity: item.quantity || 1,
      options: item.options || [],
    }));

  // Map packaging lots
  const packagingLots: PackPackagingLot[] = itemsArr
    .filter((item: any) => item.type === 'PACKAGING_LOT')
    .map((item: any) => ({
      id: item.id,
      label: item.label || '',
      quantity: item.quantity || 1,
      options: item.options || [],
    }));

  // Remove the 'items' property and add 'recipes' and 'packaging'
  const { items, ...packWithoutItems } = rawPack;
  return {
    ...packWithoutItems,
    recipes,
    packaging,
    recipeLots: recipeLots.length > 0 ? recipeLots : undefined,
    packagingLots: packagingLots.length > 0 ? packagingLots : undefined,
  } as Pack;
};

export const PackService = {
  async getPacks(orgId: string): Promise<Pack[]> {
    const rawPacks = await db.readAll<Pack & { items: any[] }>('packs', orgId);
    return rawPacks.map((p) => _mapPackFromDb(p));
  },

  async getPackById(id: string, orgId?: string): Promise<Pack | undefined> {
    const result = await db.getById<Pack & { items: any[] }>('packs', id, orgId);
    return result ? _mapPackFromDb(result) : undefined;
  },

  async getPackVersion(packId: string, versionNumber: number): Promise<PackVersion | undefined> {
    const versions = await db.readAll<PackVersion>('pack-versions');
    return versions.find((v) => v.packId === packId && v.versionNumber === versionNumber);
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
      recipeLots: [],
      packagingLots: [],
      price: 0,
      updatedAt: new Date(),
      version: 1,
      totalCost: 0,
      margin: 0,
    };

    // Exclude recipes/packaging/lots from DB payload (Prisma doesn't know them)
    const { recipes, packaging, recipeLots, packagingLots, ...dbPayload } = newPack;

    await db.upsert('packs', dbPayload, orgId);

    const { ActivityService } = await import('./activity-service');
    await ActivityService.log(
      orgId,
      'CREATE' as any,
      'Pack',
      newPack.id,
      `Pack "${newPack.name}" created.`
    );

    await AuditService.log({
      action: AuditAction.CREATE,
      entity: AuditEntity.PACK,
      entityId: newPack.id,
      metadata: { name: newPack.name },
    });

    return newPack;
  },

  async updatePackFull(orgId: string, packId: string, data: Partial<Pack>) {
    const pack = await this.getPackById(packId, orgId); // Use local getById to get hydrated pack
    if (!pack) throw new Error('Pack not found');

    // 1. Calculate Cost
    const nextRecipes = data.recipes || pack.recipes;
    const nextPackaging = data.packaging || pack.packaging;
    const nextRecipeLots = data.recipeLots || pack.recipeLots || [];
    const nextPackagingLots = data.packagingLots || pack.packagingLots || [];
    const { recipeMap, ingMap } = await _getContext(orgId);
    const totalCost = CostEngine.calculatePackCost(nextRecipes, nextPackaging, nextRecipeLots, nextPackagingLots, recipeMap, ingMap);

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
        recipeLots: pack.recipeLots,
        packagingLots: pack.packagingLots,
        price: pack.price,
        totalCost: pack.totalCost || 0,
        margin: pack.margin || 0,
        updatedAt: new Date(),
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
          packId: pack.id,
        },
      });
    }

    const nextPrice = data.price !== undefined ? data.price : pack.price;

    // 3. Prepare Items for DB if they changed
    let itemsForDb: any[] | undefined = undefined;
    if (data.recipes || data.packaging || data.recipeLots || data.packagingLots) {
      itemsForDb = [];
      nextRecipes.forEach((r) =>
        itemsForDb!.push({
          id: r.id || Math.random().toString(36).substring(7),
          type: 'RECIPE',
          recipeId: r.recipeId,
          quantity: r.quantity,
          format: r.format,
        })
      );
      nextPackaging.forEach((p) =>
        itemsForDb!.push({
          id: p.id || Math.random().toString(36).substring(7),
          type: 'INGREDIENT',
          ingredientId: p.ingredientId,
          quantity: p.quantity,
        })
      );
      nextRecipeLots.forEach((lot) =>
        itemsForDb!.push({
          id: lot.id || Math.random().toString(36).substring(7),
          type: 'RECIPE_LOT',
          label: lot.label,
          format: lot.format,
          quantity: lot.quantity,
          options: lot.options,
        })
      );
      nextPackagingLots.forEach((lot) =>
        itemsForDb!.push({
          id: lot.id || Math.random().toString(36).substring(7),
          type: 'PACKAGING_LOT',
          label: lot.label,
          quantity: lot.quantity,
          options: lot.options,
        })
      );
    }

    const updatedPackBase = {
      ...pack,
      ...data,
      totalCost,
      margin: nextPrice - totalCost,
      updatedAt: new Date(),
    };

    // Exclude relations to prevent upsert issues, inject items if needed
    const { recipes, packaging, recipeLots, packagingLots, items, ...packToUpdate } = updatedPackBase as any;

    if (itemsForDb) {
      (packToUpdate as any).items = itemsForDb;
      console.log('[PackService] Upserting Pack with items:', JSON.stringify(itemsForDb, null, 2));
    }

    await db.upsert('packs', packToUpdate as Pack, orgId);

    const { ActivityService } = await import('./activity-service');
    await ActivityService.log(
      orgId,
      'UPDATE' as any,
      'Pack',
      packId,
      `Pack "${pack.name}" updated v${pack.version}.`
    );

    await AuditService.log({
      action: AuditAction.UPDATE,
      entity: AuditEntity.PACK,
      entityId: packId,
      correlationId: packId,
      metadata: {
        version: pack.version,
        totalCost: totalCost,
        margin: updatedPackBase.margin,
      },
    });

    // Return re-mapped object
    return {
      ...updatedPackBase,
      recipes: nextRecipes,
      packaging: nextPackaging,
      recipeLots: nextRecipeLots,
      packagingLots: nextPackagingLots,
    } as Pack;
  },

  async duplicatePack(orgId: string, packId: string): Promise<Pack> {
    const original = await this.getPackById(packId, orgId);
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
    const cost = CostEngine.calculatePackCost(
      newPack.recipes,
      newPack.packaging,
      newPack.recipeLots || [],
      newPack.packagingLots || [],
      recipeMap,
      ingMap
    );
    newPack.totalCost = cost;
    newPack.margin = newPack.price - cost;

    // Prepare items
    const itemsForDb: any[] = [];
    newPack.recipes.forEach((r) =>
      itemsForDb.push({
        id: Math.random().toString(36).substring(7),
        type: 'RECIPE',
        recipeId: r.recipeId,
        quantity: r.quantity,
        format: r.format,
      })
    );
    newPack.packaging.forEach((p) =>
      itemsForDb.push({
        id: Math.random().toString(36).substring(7),
        type: 'INGREDIENT',
        ingredientId: p.ingredientId,
        quantity: p.quantity,
      })
    );
    (newPack.recipeLots || []).forEach((lot) =>
      itemsForDb.push({
        id: Math.random().toString(36).substring(7),
        type: 'RECIPE_LOT',
        label: lot.label,
        format: lot.format,
        quantity: lot.quantity,
        options: lot.options,
      })
    );
    (newPack.packagingLots || []).forEach((lot) =>
      itemsForDb.push({
        id: Math.random().toString(36).substring(7),
        type: 'PACKAGING_LOT',
        label: lot.label,
        quantity: lot.quantity,
        options: lot.options,
      })
    );

    const { recipes, packaging, recipeLots, packagingLots, ...dbPayload } = newPack;
    (dbPayload as any).items = itemsForDb;

    await db.upsert('packs', dbPayload, orgId);
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
      severity: AuditSeverity.WARNING,
    });

    return true;
  },
  async updatePackCostsForIngredient(orgId: string, ingredientId: string) {
    const rawPacks = await db.readAll<Pack & { items: any[] }>('packs', orgId);
    const packs = rawPacks.map((p) => _mapPackFromDb(p));
    const { recipeMap, ingMap } = await _getContext(orgId);

    for (const pack of packs) {
      // Check if pack uses this ingredient directly (packaging or accessory)
      const usesIngredient = pack.packaging.some((p) => p.ingredientId === ingredientId);
      // We could also check recipes -> ingredients deep check, but we rely on RecipeService to update recipes first,
      // then trigger updatePackCostsForRecipe.
      // So here we only care about direct usage (Packaging/Accessories/Direct Ingredients if any)

      if (usesIngredient) {
        const totalCost = CostEngine.calculatePackCost(
          pack.recipes,
          pack.packaging,
          pack.recipeLots || [],
          pack.packagingLots || [],
          recipeMap,
          ingMap
        );
        const updatedPackBase = {
          ...pack,
          totalCost,
          margin: pack.price - totalCost,
          updatedAt: new Date(),
        };

        // Exclude relations to prevent upsert issues
        // We cast to any to peel off properties that might exist on runtime object but not type, or vice versa
        const { recipes, packaging, items, ...packToUpdate } = updatedPackBase as any;

        await db.upsert('packs', packToUpdate as Pack, orgId);
      }
    }
  },

  async updatePackCostsForRecipe(orgId: string, recipeId: string) {
    const rawPacks = await db.readAll<Pack & { items: any[] }>('packs', orgId);
    const packs = rawPacks.map((p) => _mapPackFromDb(p));
    const { recipeMap, ingMap } = await _getContext(orgId);

    for (const pack of packs) {
      const usesRecipe = pack.recipes.some((r) => r.recipeId === recipeId);
      if (usesRecipe) {
        const totalCost = CostEngine.calculatePackCost(
          pack.recipes,
          pack.packaging,
          pack.recipeLots || [],
          pack.packagingLots || [],
          recipeMap,
          ingMap
        );
        const updatedPackBase = {
          ...pack,
          totalCost,
          margin: pack.price - totalCost,
          updatedAt: new Date(),
        };

        // Exclude relations to prevent upsert issues
        const { recipes, packaging, items, ...packToUpdate } = updatedPackBase as any;

        await db.upsert('packs', packToUpdate as Pack, orgId);
      }
    }
  },
};
