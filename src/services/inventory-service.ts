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

    const newIngredient: any = {
      id: Math.random().toString(36).substring(7),
      organizationId: orgId,
      name: input.name || 'Sans nom',
      slug: (input.name || 'ing-tmp').toLowerCase().replace(/\s+/g, '-'),
      category: input.category || 'Ingrédient',
      status: IngredientStatus.ACTIVE,
      currentStock: 0, // Start at 0, movement will add initialStock
      weightedAverageCost: costPerGram,
      supplierId: input.supplierId && input.supplierId !== '' ? input.supplierId : null,
      supplierUrl: input.supplierUrl || null,
      alertThreshold: input.alertThreshold ?? null,
      notes: input.notes || null,

      subtype: input.subtype || null,
      dimensions: input.dimensions || null,
      capacity: input.capacity ?? null,

      updatedAt: new Date(),
    };

    await db.upsert('ingredients', newIngredient, orgId);

    // Initial movement (This will set currentStock to initialStock via addMovement logic)
    if (input.initialStock && input.initialStock > 0) {
      await this.addMovement(
        orgId,
        newIngredient.id,
        MovementType.PURCHASE,
        input.initialStock,
        costPerGram,
        'Stock initial',
        EntityType.INGREDIENT,
        MovementSource.INITIAL
      );
    }

    return newIngredient;
  },

  async bulkCreateIngredients(
    orgId: string,
    rows: any[],
    mode: 'create' | 'upsert' = 'create'
  ): Promise<Ingredient[]> {
    const results = [];
    for (const row of rows) {
      results.push(await this.createIngredient(orgId, row));
    }
    return results;
  },

  async addMovement(
    orgId: string,
    ingredientId: string,
    type: MovementType,
    quantity: number,
    unitPrice?: number,
    reason?: string,
    entityType: EntityType = EntityType.INGREDIENT,
    source: MovementSource = MovementSource.MANUAL,
    sourceId?: string
  ): Promise<StockMovement> {
    const ingredient = await this.getIngredientById(ingredientId, orgId);
    if (!ingredient && entityType === EntityType.INGREDIENT) {
      throw new Error('Ingredient not found');
    }

    const movement: StockMovement = {
      id: Math.random().toString(36).substring(7),
      organizationId: orgId,
      ingredientId,
      entityType,
      source,
      sourceId: sourceId || null,
      type,
      deltaQuantity: quantity,
      unitPrice: unitPrice || null,
      totalPrice: unitPrice ? Math.abs(quantity * unitPrice) : null,
      reason: reason || null,
      createdAt: new Date(),
    };

    await db.append('movements', movement);

    if (ingredient && entityType === EntityType.INGREDIENT) {
      let newWAC = ingredient.weightedAverageCost;
      const currentStock = ingredient.currentStock;

      // Calculate Moving Average Cost (CUMP) on PURCHASE
      if (
        type === MovementType.PURCHASE &&
        quantity > 0 &&
        unitPrice !== undefined &&
        unitPrice !== null
      ) {
        const oldTotalValue = currentStock * ingredient.weightedAverageCost;
        const incomingValue = quantity * unitPrice;
        const newTotalStock = currentStock + quantity;

        if (newTotalStock > 0) {
          // If previous stock was negative, we might want to just take the new price or do the math?
          // Standard CUMP usually assumes positive stock.
          // If we had negative stock (e.g. -5) and we buy 10 at new price.
          // The math: (-5 * OldPrice + 10 * NewPrice) / 5.
          // This allows "paying back" the debt at the old estimated rate.
          // However, if stock was 0 or negative, typically we might just want to align with the new price if the old price was 0?
          // Let's stick to the pure math formula, but handle the case where we start from 0 stock and 0 cost.
          newWAC = (oldTotalValue + incomingValue) / newTotalStock;
        } else if (newTotalStock === 0) {
          // If we are exactly at 0, WAC is undefined or we keep the last known?
          // Let's keep the last known or the new price.
          // Usually if stock is 0, value is 0. But we keep a unit cost reference.
          newWAC = unitPrice;
        }
      }

      const newStock = currentStock + quantity;

      await db.upsert(
        'ingredients',
        {
          ...ingredient,
          currentStock: newStock,
          weightedAverageCost: newWAC,
          updatedAt: new Date(),
        },
        orgId
      );
    }

    void AuditService.log({
      action: AuditAction.CREATE,
      entity: AuditEntity.STOCK_MOVEMENT,
      entityId: movement.id,
      severity: AuditSeverity.INFO,
      metadata: { type, quantity, ingredientId, reason, organizationId: orgId },
    });

    return movement;
  },

  async updateIngredient(
    orgId: string,
    id: string,
    input: CreateIngredientInput
  ): Promise<Ingredient> {
    const existing = await this.getIngredientById(id, orgId);
    if (!existing) throw new Error('Ingredient not found');

    const normalizeSupplierId = (id: string | null | undefined) => {
      if (id === undefined) return undefined;
      if (id === null || id === '' || id === 'NO_SUPPLIER') return null;
      return id;
    };

    const supplierId = normalizeSupplierId(input.supplierId);

    const updated: Ingredient = {
      ...existing,
      name: input.name ?? existing.name,
      slug: input.name ? input.name.toLowerCase().replace(/\s+/g, '-') : existing.slug,
      category: input.category ?? existing.category,
      supplierId: supplierId !== undefined ? supplierId : existing.supplierId,
      supplierUrl: input.supplierUrl !== undefined ? input.supplierUrl : existing.supplierUrl,
      alertThreshold:
        input.alertThreshold !== undefined ? input.alertThreshold : existing.alertThreshold,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      subtype: input.subtype !== undefined ? input.subtype : existing.subtype,
      dimensions: input.dimensions !== undefined ? input.dimensions : existing.dimensions,
      capacity: input.capacity !== undefined ? input.capacity : existing.capacity,
      updatedAt: new Date(),
    };

    // If currentStock or weightedAverageCost are passed (via initialStock/initialCost in API), update them
    if (input.initialStock !== undefined) updated.currentStock = input.initialStock;
    if (input.initialCost !== undefined) {
      const isPerUnit = updated.category === 'Packaging' || updated.category === 'Accessoire';
      updated.weightedAverageCost = isPerUnit ? input.initialCost : input.initialCost / 1000;
    }

    await db.upsert('ingredients', updated, orgId);

    void AuditService.log({
      action: AuditAction.UPDATE,
      entity: AuditEntity.INGREDIENT,
      entityId: id,
      severity: AuditSeverity.INFO,
      metadata: { changes: input, organizationId: orgId },
    });

    return updated;
  },

  async deleteIngredient(orgId: string, id: string): Promise<void> {
    await db.delete('ingredients', id, orgId);

    void AuditService.log({
      action: AuditAction.DELETE,
      entity: AuditEntity.INGREDIENT,
      entityId: id,
      severity: AuditSeverity.WARNING,
      metadata: { organizationId: orgId },
    });
  },

  async recomputeStock(orgId: string, ingredientId: string): Promise<number> {
    const movements = await this.getMovements(orgId, ingredientId);
    const total = movements.reduce((acc, m) => acc + m.deltaQuantity, 0);

    const ingredient = await this.getIngredientById(ingredientId, orgId);
    if (ingredient) {
      await db.upsert(
        'ingredients',
        { ...ingredient, currentStock: total, updatedAt: new Date() },
        orgId
      );
    }

    return total;
  },

  async recomputeWAC(orgId: string, ingredientId: string): Promise<number> {
    const movements = await this.getMovements(orgId, ingredientId);
    const purchases = movements.filter((m) => m.type === MovementType.PURCHASE);

    if (purchases.length === 0) return 0;

    const totalQuantity = purchases.reduce((acc, m) => acc + m.deltaQuantity, 0);
    const totalCost = purchases.reduce((acc, m) => acc + (m.totalPrice || 0), 0);

    const wac = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    const ingredient = await this.getIngredientById(ingredientId, orgId);
    if (ingredient) {
      await db.upsert(
        'ingredients',
        { ...ingredient, weightedAverageCost: wac, updatedAt: new Date() },
        orgId
      );
    }

    return wac;
  },

  async getMovements(orgId: string, ingredientId?: string): Promise<StockMovement[]> {
    const all = await db.readAll<StockMovement>('movements', orgId);
    if (ingredientId) {
      return all.filter((m) => m.ingredientId === ingredientId);
    }
    return all;
  },
};
