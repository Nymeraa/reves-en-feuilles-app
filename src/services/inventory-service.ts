import {
  Ingredient,
  IngredientStatus,
  CreateIngredientInput,
  StockMovement,
  MovementType,
  EntityType,
  MovementSource,
} from '@/types/inventory';
import { db } from '@/lib/db';
import { AuditService } from './audit-service';
import { AuditAction, AuditEntity, AuditSeverity } from '@/types/audit';

export const InventoryService = {
  async getIngredients(orgId: string): Promise<Ingredient[]> {
    return db.readAll('ingredients', orgId);
  },

  async getIngredientById(id: string, orgId?: string): Promise<Ingredient | undefined> {
    // We allow fetching by ID without orgId search if orgId is optional,
    // but db interface usually wants entity.
    // Assuming strict filtering if orgId is passed to getById in my interface
    const result = await db.getById<Ingredient>('ingredients', id, orgId);
    return result || undefined;
  },

  async getLowStockIngredients(orgId: string): Promise<Ingredient[]> {
    const ingredients = await db.readAll<Ingredient>('ingredients', orgId);
    return ingredients.filter(
      (i) => i.status === IngredientStatus.ACTIVE && i.currentStock < (i.alertThreshold || 100)
    );
  },

  async createIngredient(orgId: string, input: CreateIngredientInput): Promise<Ingredient> {
    // Convert from €/kg to €/g ONLY for bulk ingredients (not Packaging or Accessoires)
    const isPerUnit = input.category === 'Packaging' || input.category === 'Accessoire';
    const cost = input.initialCost || 0;
    const costPerGram = isPerUnit ? cost : cost / 1000;

    const newIngredient: Ingredient = {
      id: Math.random().toString(36).substring(7),
      organizationId: orgId,
      name: input.name,
      slug: input.name.toLowerCase().replace(/\s+/g, '-'),
      category: input.category,
      status: IngredientStatus.ACTIVE,
      currentStock: input.initialStock || 0,
      weightedAverageCost: costPerGram,
      supplierId: input.supplierId || null,
      supplierUrl: input.supplierUrl || null,
      alertThreshold: input.alertThreshold ?? null,
      notes: input.notes || null,

      subtype: input.subtype || null,
      dimensions: input.dimensions || null,
      capacity: input.capacity ?? null,
      material: input.material || null,

      updatedAt: new Date(),
    };

    await db.upsert('ingredients', newIngredient, orgId);

    // Initial movement
    if (input.initialStock && input.initialStock > 0) {
      const movement = {
        id: Math.random().toString(36).substring(7),
        organizationId: orgId,
        ingredient: { connect: { id: newIngredient.id } },
        type: MovementType.PURCHASE,
        entityType: EntityType.INGREDIENT,
        source: MovementSource.INITIAL,

        deltaQuantity: input.initialStock,
        unitPrice: costPerGram,
        reason: 'Initial Stock',
        createdAt: new Date(),
        targetStock: input.initialStock,
      };
      await db.upsert('movements', movement as any, orgId);
    }

    return newIngredient;
  },

  async bulkCreateIngredients(
    orgId: string,
    inputs: CreateIngredientInput[],
    mode: 'create' | 'upsert'
  ): Promise<Ingredient[]> {
    if (inputs.length === 0) return [];

    // Need all ingredients to check for duplicates/updates
    const ingredients = await db.readAll<Ingredient>('ingredients', orgId);
    const newIngredients: Ingredient[] = [];

    for (const input of inputs) {
      const slug = input.name.toLowerCase().replace(/\s+/g, '-');
      const existingIndex = ingredients.findIndex((i) => i.slug === slug || i.name === input.name);
      const existing = existingIndex >= 0 ? ingredients[existingIndex] : null;

      if (existing) {
        if (mode === 'create') {
          // Skip duplicates in create mode
          continue;
        } else if (mode === 'upsert') {
          // Update existing ingredient
          const updated: Ingredient = {
            ...existing,
            ...input,
            updatedAt: new Date(),
          };
          // Preserve ID and sensitive fields if not fully replaced?
          // Input is CreateIngredientInput, doesn't have ID.
          // We merge logic.

          await db.upsert('ingredients', updated, orgId);
          newIngredients.push(updated);

          // Log Update
          await AuditService.log({
            action: AuditAction.UPDATE,
            entity: AuditEntity.INGREDIENT,
            entityId: updated.id,
            metadata: { diff: input, mode: 'upsert' },
            correlationId: `bulk-upsert-${new Date().getTime()}`,
          });
        }
      } else {
        // Create new ingredient
        const isPerUnit = input.category === 'Packaging' || input.category === 'Accessoire';
        const cost = input.initialCost || 0;
        const costPerGram = isPerUnit ? cost : cost / 1000;

        const newIngredient: Ingredient = {
          id: Math.random().toString(36).substring(7),
          organizationId: orgId,
          name: input.name,
          slug: slug,
          category: input.category,
          status: IngredientStatus.ACTIVE,
          currentStock: 0, // Set via movement below
          weightedAverageCost: costPerGram,
          supplierId: input.supplierId || null,
          supplierUrl: input.supplierUrl || null,
          alertThreshold: input.alertThreshold ?? null,
          notes: input.notes || null,
          subtype: input.subtype || null,
          dimensions: input.dimensions || null,
          capacity: input.capacity ?? null,
          material: input.material || null,
          updatedAt: new Date(),
        };

        await db.upsert('ingredients', newIngredient, orgId);
        newIngredients.push(newIngredient);

        // Handle Initial Stock
        if (input.initialStock && input.initialStock > 0) {
          newIngredient.currentStock = input.initialStock;
          const movement = {
            id: Math.random().toString(36).substring(7),
            organizationId: orgId,
            ingredient: { connect: { id: newIngredient.id } },
            type: MovementType.PURCHASE,
            entityType: EntityType.INGREDIENT,
            source: MovementSource.IMPORT,
            deltaQuantity: input.initialStock,
            unitPrice: costPerGram ?? null,
            reason: 'Import Initial Stock',
            createdAt: new Date(),
            targetStock: input.initialStock,
          };
          await db.upsert('movements', movement as any, orgId);
        }

        // Log Create
        await AuditService.log({
          action: AuditAction.CREATE,
          entity: AuditEntity.INGREDIENT,
          entityId: newIngredient.id,
          metadata: { initialStock: input.initialStock, import: true },
          correlationId: `bulk-create-${new Date().getTime()}`,
        });
      }
    }

    return newIngredients;
  },

  async updateIngredient(
    orgId: string,
    id: string,
    updates: Partial<CreateIngredientInput> & { status?: IngredientStatus }
  ): Promise<Ingredient> {
    const existing = await db.getById<Ingredient>('ingredients', id, orgId);
    if (!existing) throw new Error('Ingredient not found');

    const updated: Ingredient = {
      ...existing,
      ...updates,
      // SECURITY: Prevent direct stock/cost manipulation
      currentStock: existing.currentStock,
      weightedAverageCost: existing.weightedAverageCost,
      updatedAt: new Date(),
    };

    await db.upsert('ingredients', updated, orgId);
    return updated;
  },

  async getMovements(orgId: string): Promise<StockMovement[]> {
    return db.readAll('movements', orgId);
  },

  async addMovement(
    orgId: string,
    ingredientId: string,
    type: MovementType,
    delta: number,
    price?: number,
    reason?: string,
    // New Mandatory Fields
    entityType: EntityType = EntityType.INGREDIENT,
    source: MovementSource = MovementSource.MANUAL,
    sourceId?: string
  ) {
    const ingredient = await db.getById<Ingredient>('ingredients', ingredientId, orgId);
    if (!ingredient) throw new Error('Ingredient not found');

    // 1. Calculate New Cost (Moving Average) ONLY for Purchases
    if (type === MovementType.PURCHASE && delta > 0 && price !== undefined) {
      const oldTotalValue = ingredient.currentStock * ingredient.weightedAverageCost;
      const newTotalValue = oldTotalValue + delta * price;
      const newTotalStock = ingredient.currentStock + delta;

      if (newTotalStock > 0) {
        ingredient.weightedAverageCost = newTotalValue / newTotalStock;
      }
    }

    // 2. Update Stock
    ingredient.currentStock += delta;
    ingredient.updatedAt = new Date();
    await db.upsert('ingredients', ingredient, orgId);

    // 3. Record Movement
    const movement: any = {
      id: Math.random().toString(36).substring(7),
      organizationId: orgId,
      ingredient: { connect: { id: ingredientId } },
      type,
      // Audit
      entityType,
      source,
      sourceId: sourceId || null,

      deltaQuantity: delta,
      unitPrice: price ?? null,
      reason: reason || 'Movement',
      createdAt: new Date(),
      targetStock: ingredient.currentStock,
    };

    // If source is ORDER, link to Order relation
    if (source === MovementSource.ORDER && sourceId) {
      movement.order = { connect: { id: sourceId } };
    }

    await db.upsert('movements', movement, orgId);

    // LOG AUDIT
    await AuditService.log({
      action: AuditAction.CREATE,
      entity: AuditEntity.STOCK_MOVEMENT,
      entityId: movement.id,
      correlationId: sourceId || movement.id,
      metadata: {
        type,
        delta,
        ingredientId,
        reason,
        source,
        newStock: ingredient.currentStock,
      },
    });

    return movement;
  },

  // REBUILD LOGIC
  async recomputeStock(orgId: string, entityId: string): Promise<number> {
    const movements = await this.getMovements(orgId);
    // Sum all deltas for this entity
    const total = movements
      .filter((m) => m.ingredientId === entityId)
      .reduce((sum, m) => sum + m.deltaQuantity, 0);
    return total;
  },

  async recomputeWAC(orgId: string, entityId: string): Promise<number> {
    const movements = await this.getMovements(orgId);
    const purchases = movements.filter(
      (m) => m.ingredientId === entityId && m.type === MovementType.PURCHASE
    );

    let totalQty = 0;
    let totalCost = 0;

    for (const p of purchases) {
      const price = p.unitPrice;
      if (price != null) {
        totalQty += p.deltaQuantity;
        totalCost += p.deltaQuantity * price;
      }
    }

    if (totalQty === 0) return 0;
    return totalCost / totalQty;
  },

  async deleteIngredient(orgId: string, id: string): Promise<boolean> {
    const existing = await db.getById('ingredients', id, orgId);
    if (!existing) return false;

    await db.delete('ingredients', id, orgId);

    await AuditService.log({
      action: AuditAction.DELETE,
      entity: AuditEntity.INGREDIENT,
      entityId: id,
      severity: AuditSeverity.WARNING,
    });

    return true;
  },
};
