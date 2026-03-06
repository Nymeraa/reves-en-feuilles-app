"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlDb = exports.isAvailable = exports.prisma = void 0;
var pg_1 = require("pg");
var adapter_pg_1 = require("@prisma/adapter-pg");
var client_1 = require("@prisma/client");
var order_item_1 = require("./prisma-mappers/order-item");
var stock_movement_1 = require("./prisma-mappers/stock-movement");
var ingredient_1 = require("./prisma-mappers/ingredient");
var connectionString = process.env.DATABASE_URL;
// Singleton prisma client
var globalForPrisma = global;
var prismaInstance;
if (!globalForPrisma.prisma) {
    var pool = new pg_1.Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }, // Required for Supabase/Vercel (self-signed certs in chain)
    });
    var adapter = new adapter_pg_1.PrismaPg(pool);
    prismaInstance = new client_1.PrismaClient({ adapter: adapter });
}
else {
    prismaInstance = globalForPrisma.prisma;
}
exports.prisma = prismaInstance;
exports.isAvailable = true; // generated client is present
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
/**
 * Recursively converts 'undefined' to 'null' for Prisma compatibility.
 * Prisma rejects 'undefined' but accepts 'null' for optional fields.
 */
function sanitizeData(data) {
    if (data === undefined)
        return null;
    if (data === null)
        return null;
    if (data instanceof Date)
        return data;
    if (Array.isArray(data))
        return data.map(function (item) { return sanitizeData(item); });
    if (typeof data === 'object') {
        var sanitized = {};
        for (var key in data) {
            // Special case: don't sanitize nested Prisma relation objects like 'connect', 'create'
            // But we still want to sanitize values inside them.
            sanitized[key] = sanitizeData(data[key]);
        }
        return sanitized;
    }
    return data;
}
function getModel(entity) {
    if (!exports.prisma)
        throw new Error('Prisma not initialized');
    switch (entity) {
        case 'ingredients':
            return exports.prisma.ingredient;
        case 'recipes':
            return exports.prisma.recipe;
        case 'orders':
            return exports.prisma.order;
        case 'packs':
            return exports.prisma.pack;
        case 'suppliers':
            return exports.prisma.supplier;
        case 'settings':
            return exports.prisma.settings;
        case 'audit-logs':
            return exports.prisma.auditLog;
        case 'activity-logs':
            return exports.prisma.activityLog;
        case 'movements':
            return exports.prisma.stockMovement;
        case 'recipe-versions':
            return exports.prisma.recipeVersion;
        case 'pack-versions':
            return exports.prisma.packVersion;
        default:
            throw new Error("Unknown entity type: ".concat(entity));
    }
}
function getModelName(entity) {
    switch (entity) {
        case 'ingredients':
            return 'ingredient';
        case 'recipes':
            return 'recipe';
        case 'orders':
            return 'order';
        case 'packs':
            return 'pack';
        case 'suppliers':
            return 'supplier';
        case 'settings':
            return 'settings';
        case 'audit-logs':
            return 'auditLog';
        case 'activity-logs':
            return 'activityLog';
        case 'movements':
            return 'stockMovement';
        case 'recipe-versions':
            return 'recipeVersion';
        case 'pack-versions':
            return 'packVersion';
        default:
            throw new Error("Unknown entity type: ".concat(entity));
    }
}
var PRISMA_ORDER_FIELDS = [
    'id',
    'organizationId',
    'orderNumber',
    'customerName',
    'status',
    'manualTotal',
    'totalAmount',
    'totalCost',
    'createdAt',
    'updatedAt',
    'paidAt',
    'cancelledAt',
    'source',
    'email',
    'shippingCarrier',
    'trackingNumber',
    'shippingPrice',
    'shippingCost',
    'packagingType',
    'packagingId',
    'discountCode',
    'discountPercent',
    'notes',
    'feesUrssaf',
    'feesShopify',
    'feesOther',
    'feesTotal',
    'cogsMaterials',
    'cogsPackaging',
    'netProfit',
    'margin',
    'parcelWeightGrams',
];
var PRISMA_ORDER_ITEM_FIELDS = [
    'id',
    'type',
    'name',
    'quantity',
    'recipeId',
    'packId',
    'ingredientId',
    'format',
    'versionNumber',
    'unitPriceSnapshot',
    'unitCostSnapshot',
    'unitMaterialCostSnapshot',
    'unitPackagingCostSnapshot',
    'totalPrice',
];
var PRISMA_MOVEMENT_FIELDS = [
    'id',
    'organizationId',
    'type',
    'entityType',
    'source',
    'deltaQuantity',
    'unitPrice',
    'totalPrice',
    'targetStock',
    'reason',
    'createdAt',
];
exports.sqlDb = {
    readAll: function (entity, orgId) {
        return __awaiter(this, void 0, void 0, function () {
            var model, where, include, s, error_1, column;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        model = getModel(entity);
                        where = orgId ? { organizationId: orgId } : {};
                        include = undefined;
                        if (entity === 'ingredients')
                            include = { supplier: true };
                        if (entity === 'recipes')
                            include = { items: true };
                        if (entity === 'packs')
                            include = { items: true };
                        if (entity === 'orders')
                            include = { items: true };
                        if (entity === 'movements')
                            include = {}; // No includes needed usually?
                        if (!(entity === 'settings')) return [3 /*break*/, 2];
                        return [4 /*yield*/, exports.prisma.settings.findUnique({ where: { id: 'global' } })];
                    case 1:
                        s = _c.sent();
                        return [2 /*return*/, s ? [s] : []];
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, model.findMany({ where: where, include: include })];
                    case 3: return [2 /*return*/, (_c.sent())];
                    case 4:
                        error_1 = _c.sent();
                        if (error_1.code === 'P2022') {
                            column = ((_a = error_1.meta) === null || _a === void 0 ? void 0 : _a.column) || ((_b = error_1.meta) === null || _b === void 0 ? void 0 : _b.field) || '(unknown)';
                            console.error("[Prisma P2022] Table \"".concat(entity, "\" is missing column: ").concat(column));
                            console.error("[Prisma Context] Full Error:", JSON.stringify(error_1, null, 2));
                        }
                        throw error_1;
                    case 5: return [2 /*return*/];
                }
            });
        });
    },
    getById: function (entity, id, orgId) {
        return __awaiter(this, void 0, void 0, function () {
            var model, include, item;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        model = getModel(entity);
                        if (entity === 'settings') {
                            return [2 /*return*/, exports.prisma.settings.findUnique({ where: { id: 'global' } })];
                        }
                        include = undefined;
                        if (entity === 'ingredients')
                            include = { supplier: true };
                        if (entity === 'recipes')
                            include = { items: true };
                        if (entity === 'packs')
                            include = { items: true };
                        if (entity === 'orders')
                            include = { items: true };
                        return [4 /*yield*/, model.findUnique({ where: { id: id }, include: include })];
                    case 1:
                        item = _a.sent();
                        if (item && orgId && item.organizationId !== orgId && entity !== 'activity-logs') {
                            // Activity logs validation might be looser or strict?
                            // Current schema has organizationId on ActivityLog, so checks are fine.
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, item];
                }
            });
        });
    },
    upsert: function (entity, data, orgId) {
        return __awaiter(this, void 0, void 0, function () {
            var model, sanitized_1, fields_1, filtered, payload, sanitized, mapped, modelName_1, items_1, scalarData_1, mapped, items, allScalarData, scalarData, entitiesWithRelationalItems, itemsWithMappedData_1, finalItems, finalSanitized;
            var _this = this;
            return __generator(this, function (_a) {
                model = getModel(entity);
                if (entity === 'settings') {
                    sanitized_1 = sanitizeData(data);
                    fields_1 = [
                        'urssafRate',
                        'shopifyTransactionPercent',
                        'shopifyFixedFee',
                        'defaultOtherFees',
                        'tvaIngredients',
                        'tvaPackaging',
                    ];
                    filtered = Object.keys(sanitized_1)
                        .filter(function (key) { return fields_1.includes(key); })
                        .reduce(function (obj, key) {
                        obj[key] = sanitized_1[key];
                        return obj;
                    }, {});
                    payload = __assign(__assign({}, filtered), { id: 'global' });
                    console.log('[DB-SQL] Upserting Settings:', JSON.stringify(payload, null, 2));
                    return [2 /*return*/, exports.prisma.settings.upsert({
                            where: { id: 'global' },
                            create: payload,
                            update: filtered,
                        })];
                }
                sanitized = sanitizeData(data);
                // Use specific mappers for entities with relations to ensure schema compliance
                if (entity === 'movements') {
                    mapped = (0, stock_movement_1.toPrismaStockMovement)(sanitized);
                    modelName_1 = getModelName(entity);
                    items_1 = mapped.items, scalarData_1 = __rest(mapped, ["items"]);
                    return [2 /*return*/, exports.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var createData, updateData;
                            return __generator(this, function (_a) {
                                createData = __assign({}, scalarData_1);
                                updateData = __assign({}, scalarData_1);
                                if (items_1 && Array.isArray(items_1) && items_1.length > 0) {
                                    createData.items = { create: items_1 };
                                    updateData.items = { deleteMany: {}, create: items_1 };
                                }
                                return [2 /*return*/, tx[modelName_1].upsert({
                                        where: { id: scalarData_1.id },
                                        create: createData,
                                        update: updateData,
                                    })];
                            });
                        }); })];
                }
                if (entity === 'ingredients') {
                    mapped = (0, ingredient_1.toPrismaIngredient)(sanitized);
                    return [2 /*return*/, model.upsert({
                            where: { id: mapped.id },
                            create: mapped,
                            update: mapped,
                        })];
                }
                items = sanitized.items, allScalarData = __rest(sanitized, ["items"]);
                scalarData = allScalarData;
                if (entity === 'orders') {
                    scalarData = Object.keys(allScalarData)
                        .filter(function (key) { return PRISMA_ORDER_FIELDS.includes(key); })
                        .reduce(function (obj, key) {
                        obj[key] = allScalarData[key];
                        return obj;
                    }, {});
                }
                entitiesWithRelationalItems = ['recipes', 'packs', 'orders'];
                if (items && Array.isArray(items) && entitiesWithRelationalItems.includes(entity)) {
                    itemsWithMappedData_1 = items.map(function (item) {
                        var newItem = __assign({}, item);
                        // Whitelist for items if entity is orders
                        if (entity === 'orders') {
                            var mapped = (0, order_item_1.toPrismaOrderItem)(newItem);
                            // Development Guard: Ensure no relation objects leaked through
                            if (process.env.NODE_ENV === 'development') {
                                var hasConnect = Object.values(mapped).some(function (val) { return val && typeof val === 'object' && ('connect' in val || 'create' in val); });
                                if (hasConnect) {
                                    throw new Error("[Prisma Guard] OrderItem contains nested relation objects: ".concat(JSON.stringify(mapped)));
                                }
                            }
                            return mapped;
                        }
                        // Default relation connect logic (Recipes, Packs)
                        if (newItem.ingredientId) {
                            newItem.ingredient = { connect: { id: newItem.ingredientId } };
                            delete newItem.ingredientId;
                        }
                        if (newItem.recipeId) {
                            newItem.recipe = { connect: { id: newItem.recipeId } };
                            delete newItem.recipeId;
                        }
                        if (newItem.packId) {
                            newItem.pack = { connect: { id: newItem.packId } };
                            delete newItem.packId;
                        }
                        return newItem;
                    });
                    finalItems = itemsWithMappedData_1;
                    return [2 /*return*/, exports.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var createData, updateData;
                            return __generator(this, function (_a) {
                                createData = __assign({}, scalarData);
                                updateData = __assign({}, scalarData);
                                createData.items = { create: itemsWithMappedData_1 };
                                updateData.items = { deleteMany: {}, create: itemsWithMappedData_1 };
                                return [2 /*return*/, tx[getModelName(entity)].upsert({
                                        where: { id: data.id },
                                        create: createData,
                                        update: updateData,
                                        include: { items: true },
                                    })];
                            });
                        }); }, { timeout: 20000 })];
                }
                finalSanitized = sanitized;
                if (entity === 'orders') {
                    finalSanitized = Object.keys(sanitized)
                        .filter(function (key) { return PRISMA_ORDER_FIELDS.includes(key); })
                        .reduce(function (obj, key) {
                        obj[key] = sanitized[key];
                        return obj;
                    }, {});
                }
                return [2 /*return*/, model.upsert({
                        where: { id: data.id },
                        create: finalSanitized,
                        update: finalSanitized,
                    })];
            });
        });
    },
    delete: function (entity, id, orgId) {
        return __awaiter(this, void 0, void 0, function () {
            var model;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        model = getModel(entity);
                        return [4 /*yield*/, model.delete({ where: { id: id } })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    append: function (entity, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Usually just create
                return [2 /*return*/, this.upsert(entity, data)];
            });
        });
    },
};
