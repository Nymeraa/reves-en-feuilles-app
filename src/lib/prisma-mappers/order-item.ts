/**
 * Strict mapper for OrderItem to ensure compatibility with Prisma schema.
 * OrderItems in our schema use flat scalar IDs (recipeId, packId, ingredientId)
 * and do NOT have nested relation objects like 'recipe: { connect: ... }'.
 */
export function toPrismaOrderItem(item: any) {
  const prismaItem: any = {
    id: item.id,
    type: item.type,
    name: item.name,
    quantity: item.quantity,
    format: item.format,
    versionNumber: item.versionNumber,
    unitPriceSnapshot: item.unitPriceSnapshot,
    unitCostSnapshot: item.unitCostSnapshot,
    unitMaterialCostSnapshot: item.unitMaterialCostSnapshot,
    unitPackagingCostSnapshot: item.unitPackagingCostSnapshot,
    totalPrice: item.totalPrice,
  };

  // Explicitly map valid scalar IDs only
  if (item.recipeId) prismaItem.recipeId = item.recipeId;
  if (item.packId) prismaItem.packId = item.packId;
  if (item.ingredientId) prismaItem.ingredientId = item.ingredientId;

  // Ensure no other fields (like orderId or relation objects) leak through
  return prismaItem;
}
