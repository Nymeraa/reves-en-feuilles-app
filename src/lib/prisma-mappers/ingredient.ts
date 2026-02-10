/**
 * Strict mapper for Ingredient to ensure compatibility with Prisma schema.
 * Maps scalar supplierId to Prisma relation connect/disconnect.
 */
export function toPrismaIngredient(data: any) {
  const result: any = {
    id: data.id,
    organizationId: data.organizationId,
    name: data.name,
    slug: data.slug,
    category: data.category || 'Ingrédient',
    status: data.status,
    currentStock: data.currentStock,
    weightedAverageCost: data.weightedAverageCost,
    supplierUrl: data.supplierUrl || null,
    alertThreshold: data.alertThreshold ?? null,
    notes: data.notes || null,
    subtype: data.subtype || null,
    dimensions: data.dimensions || null,
    capacity: data.capacity ?? null,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
  };

  // Map Supplier Relation
  // IMPORTANT: We MUST delete result.supplier if it exists (leaked from spread)
  // BEFORE we set it to a Prisma relation object.
  delete result.supplier;

  if (data.supplierId && data.supplierId !== '' && data.supplierId !== 'NO_SUPPLIER') {
    result.supplier = { connect: { id: data.supplierId } };
  } else if (
    data.supplierId === null ||
    data.supplierId === 'NO_SUPPLIER' ||
    data.supplierId === ''
  ) {
    // For updates, we might want to disconnect if it was set before.
    // However, if Prisma schema doesn't allow null on scalar but allow disconnect on relation.
    // In our case supplierId is optional scalar, so disconnect works or setting null.
    // Using disconnect is safer for Prisma relations.
    result.supplier = { disconnect: true };
  }

  // CRITICAL: Remove scalar supplierId to avoid "Unknown argument" error
  delete result.supplierId;

  return result;
}
