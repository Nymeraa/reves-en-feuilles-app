"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPrismaIngredient = toPrismaIngredient;
/**
 * Strict mapper for Ingredient to ensure compatibility with Prisma schema.
 * Maps scalar supplierId to Prisma relation connect/disconnect.
 */
function toPrismaIngredient(data) {
    var _a, _b;
    var result = {
        id: data.id,
        organizationId: data.organizationId,
        name: data.name,
        slug: data.slug,
        category: data.category || 'Ingrédient',
        status: data.status,
        currentStock: data.currentStock,
        weightedAverageCost: data.weightedAverageCost,
        supplierUrl: data.supplierUrl || null,
        alertThreshold: (_a = data.alertThreshold) !== null && _a !== void 0 ? _a : null,
        notes: data.notes || null,
        subtype: data.subtype || null,
        dimensions: data.dimensions || null,
        capacity: (_b = data.capacity) !== null && _b !== void 0 ? _b : null,
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
    // Map Supplier Relation
    // IMPORTANT: We MUST delete result.supplier if it exists (leaked from spread)
    // BEFORE we set it to a Prisma relation object.
    delete result.supplier;
    if (data.supplierId && data.supplierId !== '' && data.supplierId !== 'NO_SUPPLIER') {
        result.supplier = { connect: { id: data.supplierId } };
    }
    // CRITICAL: Remove scalar supplierId to avoid "Unknown argument" error
    delete result.supplierId;
    return result;
}
