"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPrismaStockMovement = toPrismaStockMovement;
var inventory_1 = require("@/types/inventory");
/**
 * Strict mapper for StockMovement to ensure compatibility with Prisma schema.
 */
function toPrismaStockMovement(data) {
    var _a, _b, _c, _d;
    var prismaMovement = {
        id: data.id,
        organizationId: data.organizationId,
        type: data.type,
        entityType: data.entityType,
        source: data.source,
        deltaQuantity: data.deltaQuantity,
        unitPrice: (_a = data.unitPrice) !== null && _a !== void 0 ? _a : null,
        totalPrice: (_b = data.totalPrice) !== null && _b !== void 0 ? _b : null,
        targetStock: (_c = data.targetStock) !== null && _c !== void 0 ? _c : null,
        reason: (_d = data.reason) !== null && _d !== void 0 ? _d : null,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    };
    // Map Ingredient Relation (IngredientId is backing field but we use connect)
    if (data.ingredientId) {
        prismaMovement.ingredient = { connect: { id: data.ingredientId } };
    }
    else if (data.ingredient && data.ingredient.connect) {
        prismaMovement.ingredient = data.ingredient;
    }
    // Map Order Relation (sourceId back references Order.id)
    // We ONLY link to order if source is 'ORDER'
    if (data.source === inventory_1.MovementSource.ORDER && data.sourceId) {
        prismaMovement.order = { connect: { id: data.sourceId } };
    }
    else if (data.order && data.order.connect) {
        prismaMovement.order = data.order;
    }
    // CRITICAL: Ensure sourceId and ingredientId are NOT passed as scalar fields
    // if they are backing relations, to avoid "Unknown argument" errors in some Prisma versions.
    delete prismaMovement.sourceId;
    delete prismaMovement.ingredientId;
    return prismaMovement;
}
