import { MovementSource } from '@/types/inventory';

/**
 * Strict mapper for StockMovement to ensure compatibility with Prisma schema.
 */
export function toPrismaStockMovement(data: any) {
  const prismaMovement: any = {
    id: data.id,
    organizationId: data.organizationId,
    type: data.type,
    entityType: data.entityType,
    source: data.source,
    deltaQuantity: data.deltaQuantity,
    unitPrice: data.unitPrice ?? null,
    totalPrice: data.totalPrice ?? null,
    targetStock: data.targetStock ?? null,
    reason: data.reason ?? null,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
  };

  // Map Ingredient Relation (IngredientId is backing field but we use connect)
  if (data.ingredientId) {
    prismaMovement.ingredient = { connect: { id: data.ingredientId } };
  } else if (data.ingredient && data.ingredient.connect) {
    prismaMovement.ingredient = data.ingredient;
  }

  // Map Order Relation (sourceId back references Order.id)
  // We ONLY link to order if source is 'ORDER'
  if (data.source === MovementSource.ORDER && data.sourceId) {
    prismaMovement.order = { connect: { id: data.sourceId } };
  } else if (data.order && data.order.connect) {
    prismaMovement.order = data.order;
  }

  // CRITICAL: Ensure sourceId and ingredientId are NOT passed as scalar fields
  // if they are backing relations, to avoid "Unknown argument" errors in some Prisma versions.
  delete prismaMovement.sourceId;
  delete prismaMovement.ingredientId;

  return prismaMovement;
}
