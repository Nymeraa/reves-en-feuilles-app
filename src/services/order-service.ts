import { Order, OrderStatus, CreateOrderInput, AddOrderItemInput, OrderItem } from '@/types/order';
import { RecipeService } from './recipe-service';
import { InventoryService } from './inventory-service';
import { PackService } from './pack-service';
import { MovementType, EntityType, MovementSource } from '@/types/inventory';
import { db } from '@/lib/db';
import { AuditService } from './audit-service';
import { AuditAction, AuditEntity } from '@/types/audit';
import { PackagingService } from '@/services/packaging-service';

// Helper: Check if a status has stock already deducted
function hasStockDeducted(status: OrderStatus): boolean {
  return [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(status);
}

export const OrderService = {
  // Deprecated? Or just mapped to getAll
  // readOrders is used by scripts maybe?
  readOrders: () => db.readAll<Order>('orders'),

  async getOrders(orgId: string): Promise<Order[]> {
    const orders = await db.readAll<Order>('orders', orgId);
    // Ensure Dates are Date objects (Prisma does this, JSON needs conversion)
    // new Date() is safe for both
    return orders
      .map((o) => ({ ...o, createdAt: new Date(o.createdAt), updatedAt: new Date(o.updatedAt) }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    const order = await db.getById<Order>('orders', id);
    if (!order) return undefined;

    return { ...order, createdAt: new Date(order.createdAt), updatedAt: new Date(order.updatedAt) };
  },

  async createDraftOrder(orgId: string, input: CreateOrderInput): Promise<Order> {
    const newOrder: Order = {
      id: Math.random().toString(36).substring(7),
      organizationId: orgId,
      orderNumber: input.orderNumber,
      customerName: input.customerName,
      status: OrderStatus.DRAFT,
      items: [],
      manualTotal: input.totalAmount ? true : false,
      totalAmount: input.totalAmount || 0,
      totalCost: 0,
      createdAt: input.date || new Date(),
      updatedAt: new Date(),

      // New fields
      source: input.source || null,
      email: input.email || null,
      shippingCarrier: input.shippingCarrier || null,
      trackingNumber: input.trackingNumber || null,
      shippingPrice: input.shippingPrice ?? null,
      shippingCost: input.shippingCost ?? null,
      packagingType: input.packagingType || null,
      discountCode: input.discountCode || null,
      discountPercent: input.discountPercent ?? null,
      feesOther: input.feesOther ?? 0,
      notes: input.notes || null,

      // Init financials
      cogsMaterials: 0,
      cogsPackaging: 0,
      netProfit: 0,
      margin: 0,
      feesUrssaf: 0,
      feesShopify: 0,
      feesTotal: 0,
    };

    await db.upsert('orders', newOrder, orgId);
    return newOrder;
  },

  async addItemToOrder(orgId: string, orderId: string, input: AddOrderItemInput) {
    const order = await db.getById<Order>('orders', orderId, orgId);
    if (!order) throw new Error('Order not found');

    if (order.status !== OrderStatus.DRAFT) throw new Error('Order not editable');

    let name = '';
    let versionNumber = 0;
    let unitCost = 0;
    let unitPrice = 0;
    let unitMaterialCost = 0;
    let unitPackagingCost = 0;

    const { SettingsService } = await import('./settings-service');
    const settings = await SettingsService.getSettings();
    const tvaIngResult = 1 + settings.tvaIngredients / 100;
    const tvaPackResult = 1 + settings.tvaPackaging / 100;

    if (input.type === 'RECIPE') {
      if (!input.recipeId || !input.format)
        throw new Error('Recipe ID and Format required for Recipe Item');
      const recipe = await RecipeService.getRecipeById(input.recipeId);
      if (!recipe) throw new Error('Recipe not found');

      name = recipe.name;
      versionNumber = recipe.version;

      const costPerGram = recipe.totalIngredientCost || 0;
      const weightGrams = input.format;
      const materialCostHT = weightGrams * costPerGram;
      unitMaterialCost = materialCostHT * tvaIngResult;

      const doypack = await PackagingService.findPackagingForFormat(orgId, input.format, 'Sachet');
      if (doypack) {
        const packCostPerUnit = doypack.weightedAverageCost || 0;
        unitPackagingCost = packCostPerUnit * tvaPackResult;
      }

      unitCost = unitMaterialCost + unitPackagingCost;
      unitPrice = input.unitPrice || unitCost * 2.5;
    } else if (input.type === 'PACK') {
      if (!input.packId) throw new Error('Pack ID required for Pack Item');
      const pack = await PackService.getPackById(input.packId);
      if (!pack) throw new Error('Pack not found');

      name = pack.name;
      versionNumber = pack.version;

      unitMaterialCost = (pack.totalCost || 0) * tvaIngResult;
      unitPackagingCost = 0;

      unitCost = unitMaterialCost + unitPackagingCost;
      unitPrice = input.unitPrice || pack.price;
    } else if (input.type === 'ACCESSORY') {
      if (!input.ingredientId) throw new Error('Ingredient ID required');
      const ingredient = await InventoryService.getIngredientById(input.ingredientId);
      if (!ingredient) throw new Error('Ingredient not found');

      name = ingredient.name;
      versionNumber = 1;

      const accessoryCostPerUnit = ingredient.weightedAverageCost || 0;
      unitMaterialCost = accessoryCostPerUnit * tvaPackResult;
      unitPackagingCost = 0;

      unitCost = unitMaterialCost;
      unitPrice = input.unitPrice || unitCost * 2;
    }

    const newItem: OrderItem = {
      id: Math.random().toString(36).substring(7),
      orderId,
      type: input.type,
      recipeId: input.recipeId,
      packId: input.packId,
      ingredientId: input.ingredientId,
      format: input.format,
      quantity: input.quantity,
      name,
      versionNumber,
      unitCostSnapshot: unitCost,
      unitMaterialCostSnapshot: unitMaterialCost,
      unitPackagingCostSnapshot: unitPackagingCost,
      unitPriceSnapshot: unitPrice,
      totalPrice: unitPrice * input.quantity,
    };

    order.items.push(newItem);

    // Use Unified Calculation
    await this.calculateFinancials(orgId, order);

    order.updatedAt = new Date();

    await db.upsert('orders', order, orgId);
  },

  async calculateFinancials(orgId: string, order: Order) {
    const { SettingsService } = await import('./settings-service');
    const settings = await SettingsService.getSettings();

    let totalMaterialCost = 0;
    let totalPackagingCost = 0;

    for (const item of order.items) {
      totalMaterialCost += (item.unitMaterialCostSnapshot || 0) * item.quantity;
      totalPackagingCost += (item.unitPackagingCostSnapshot || 0) * item.quantity;
    }

    // Add carton/shipping box packaging if applicable
    if (order.packagingType && order.packagingType !== 'Aucun') {
      const ingredients = await InventoryService.getIngredients(orgId);
      let carton = order.packagingId
        ? ingredients.find((i) => i.id === order.packagingId)
        : undefined;
      if (!carton) carton = ingredients.find((i) => i.id === order.packagingType);
      if (!carton) carton = ingredients.find((i) => i.name === order.packagingType);

      if (carton) {
        const packagingVAT = 1 + settings.tvaPackaging / 100;
        totalPackagingCost += (carton.weightedAverageCost || 0) * packagingVAT;
      }
    }

    const roundCurrency = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

    order.cogsMaterials = roundCurrency(totalMaterialCost);
    order.cogsPackaging = roundCurrency(totalPackagingCost);
    order.totalCost = roundCurrency(order.cogsMaterials + order.cogsPackaging);

    if (!order.manualTotal) {
      order.totalAmount = roundCurrency(order.items.reduce((sum, i) => sum + i.totalPrice, 0));
    }

    const totalRevenue = roundCurrency(order.totalAmount + (order.shippingPrice || 0));

    order.feesUrssaf = roundCurrency(totalRevenue * (settings.urssafRate / 100));
    order.feesShopify = roundCurrency(
      totalRevenue * (settings.shopifyTransactionPercent / 100) + settings.shopifyFixedFee
    );
    if (order.feesOther === undefined || order.feesOther === null) order.feesOther = 0.1;
    order.feesTotal = roundCurrency(
      (order.feesUrssaf || 0) + (order.feesShopify || 0) + (order.feesOther || 0)
    );

    order.netProfit = roundCurrency(
      totalRevenue - order.totalCost - (order.shippingCost || 0) - order.feesTotal
    );
    order.margin = totalRevenue > 0 ? (order.netProfit / totalRevenue) * 100 : 0;
  },

  async deductOrderStock(orgId: string, order: Order) {
    for (const item of order.items) {
      if (item.type === 'RECIPE') {
        if (!item.recipeId) continue;
        const version = await RecipeService.getRecipeVersion(item.recipeId, item.versionNumber);
        const recipeCurrent = await RecipeService.getRecipeById(item.recipeId);
        const itemsToDeduct = version ? version.items : recipeCurrent?.items || [];
        const totalGramsSold = (item.format || 0) * item.quantity;

        for (const recipeItem of itemsToDeduct) {
          const ingredientUsage = (totalGramsSold * recipeItem.percentage) / 100;
          await InventoryService.addMovement(
            orgId,
            recipeItem.ingredientId,
            MovementType.SALE,
            -ingredientUsage,
            undefined,
            `Order #${order.id} - ${item.quantity}x ${item.name}`,
            EntityType.INGREDIENT,
            MovementSource.ORDER,
            order.id
          );
        }

        const doypackIng = await PackagingService.findPackagingForFormat(
          orgId,
          item.format || 0,
          'Sachet'
        );
        if (doypackIng) {
          await InventoryService.addMovement(
            orgId,
            doypackIng.id,
            MovementType.SALE,
            -item.quantity,
            undefined,
            `Order #${order.id} - Doypack ${item.format}g for ${item.name}`,
            EntityType.PACKAGING,
            MovementSource.ORDER,
            order.id
          );
        }
      } else if (item.type === 'PACK') {
        if (!item.packId) continue;
        const packVersion = await PackService.getPackVersion(item.packId, item.versionNumber);
        const packCurrent = await PackService.getPackById(item.packId);
        const packToUse = packVersion || packCurrent;
        if (!packToUse) continue;

        for (const pRecipe of packToUse.recipes) {
          const pRecipeEntity = await RecipeService.getRecipeById(pRecipe.recipeId);
          if (!pRecipeEntity) continue;
          const totalGramsSold = (pRecipe.format as number) * pRecipe.quantity * item.quantity;

          for (const ing of pRecipeEntity.items) {
            const ingredientUsage = (totalGramsSold * ing.percentage) / 100;
            await InventoryService.addMovement(
              orgId,
              ing.ingredientId,
              MovementType.SALE,
              -ingredientUsage,
              undefined,
              `Order #${order.id} (Pack ${item.name}) - ${item.quantity}x Pack -> ${pRecipe.quantity}x ${pRecipeEntity.name}`,
              EntityType.INGREDIENT,
              MovementSource.ORDER,
              order.id
            );
          }
          const doypack = await PackagingService.findPackagingForFormat(
            orgId,
            pRecipe.format as number,
            'Sachet'
          );
          if (doypack) {
            await InventoryService.addMovement(
              orgId,
              doypack.id,
              MovementType.SALE,
              -(pRecipe.quantity * item.quantity),
              undefined,
              `Order #${order.id} (Pack) - Doypack for ${pRecipeEntity.name}`,
              EntityType.PACKAGING,
              MovementSource.ORDER,
              order.id
            );
          }
        }
        for (const pPkg of packToUse.packaging) {
          await InventoryService.addMovement(
            orgId,
            pPkg.ingredientId,
            MovementType.SALE,
            -(pPkg.quantity * item.quantity),
            undefined,
            `Order #${order.id} (Pack ${item.name}) - Packaging`,
            EntityType.PACKAGING,
            MovementSource.ORDER,
            order.id
          );
        }
      } else if (item.type === 'ACCESSORY') {
        if (item.ingredientId) {
          await InventoryService.addMovement(
            orgId,
            item.ingredientId,
            MovementType.SALE,
            -item.quantity,
            undefined,
            `Order #${order.id} - Accessory ${item.name}`,
            EntityType.INGREDIENT,
            MovementSource.ORDER,
            order.id
          );
        }
      }
    }

    if (order.packagingType) {
      const allIngredients = await InventoryService.getIngredients(orgId);
      let carton = order.packagingId
        ? allIngredients.find((i) => i.id === order.packagingId)
        : undefined;
      if (!carton && order.packagingType)
        carton = allIngredients.find((i) => i.id === order.packagingType);
      if (!carton && order.packagingType)
        carton = allIngredients.find((i) => i.name === order.packagingType);

      if (carton) {
        order.packagingId = carton.id;
        await InventoryService.addMovement(
          orgId,
          carton.id,
          MovementType.SALE,
          -1,
          undefined,
          `Order #${order.id} - Shipping Box (${carton.name})`,
          EntityType.PACKAGING,
          MovementSource.ORDER,
          order.id
        );
      }
    }
  },

  async confirmOrder(orgId: string, orderId: string) {
    const order = await db.getById<Order>('orders', orderId, orgId);
    if (!order) throw new Error('Order not found');

    if (order.status !== OrderStatus.DRAFT) {
      console.warn(`Attempted to confirm order ${orderId} but status is ${order.status}`);
      return;
    }

    await this.calculateFinancials(orgId, order);
    await this.deductOrderStock(orgId, order);

    order.status = OrderStatus.PAID;
    order.paidAt = new Date();
    order.updatedAt = new Date();

    await db.upsert('orders', order, orgId);

    void AuditService.log({
      action: AuditAction.CONFIRM,
      entity: AuditEntity.ORDER,
      entityId: order.id,
      metadata: { totalAmount: order.totalAmount, status: OrderStatus.PAID, organizationId: orgId },
    });

    const { ActivityService } = await import('./activity-service');
    await ActivityService.log(
      orgId,
      'UPDATE' as any,
      'Order',
      order.id,
      `Order confirmed: ${order.totalAmount.toFixed(2)}€`
    );
  },

  async updateOrder(
    orgId: string,
    orderId: string,
    input: Partial<CreateOrderInput>,
    itemsInput?: AddOrderItemInput[]
  ) {
    const order = await db.getById<Order>('orders', orderId, orgId);
    if (!order) throw new Error('Order not found');

    const oldStatus = order.status;
    const newStatus = input.status || order.status;

    const oldHadStock = hasStockDeducted(oldStatus);
    const newNeedsStock = hasStockDeducted(newStatus);

    if (newStatus === OrderStatus.PAID && oldStatus !== OrderStatus.PAID && !order.paidAt) {
      order.paidAt = new Date();
    }
    if (
      newStatus === OrderStatus.CANCELLED &&
      oldStatus !== OrderStatus.CANCELLED &&
      !order.cancelledAt
    ) {
      order.cancelledAt = new Date();
    }

    if (oldHadStock && (!newNeedsStock || itemsInput)) {
      await this.revertOrderStock(orgId, order);
    }

    order.orderNumber = input.orderNumber || order.orderNumber;
    order.customerName = input.customerName || order.customerName;
    order.createdAt = input.date || order.createdAt;
    order.source = input.source;
    order.email = input.email;
    order.status = newStatus;

    if (input.totalAmount !== undefined && input.totalAmount !== null) {
      order.totalAmount = input.totalAmount;
      order.manualTotal = true;
    }

    order.shippingCarrier = input.shippingCarrier || null;
    order.trackingNumber = input.trackingNumber || null;
    order.shippingCost = input.shippingCost ?? null;
    order.shippingPrice = input.shippingPrice ?? null;
    order.packagingType = input.packagingType || null;
    order.discountCode = input.discountCode || null;
    order.discountPercent = input.discountPercent ?? null;
    order.feesOther = input.feesOther ?? null;
    order.notes = input.notes || null;
    order.updatedAt = new Date();

    if (itemsInput) {
      order.items = [];

      for (const itemIn of itemsInput) {
        let name = '';
        let versionNumber = 0;
        let unitCost = 0;
        let unitPrice = 0;
        let unitMaterialCost = 0;
        let unitPackagingCost = 0;

        const { SettingsService } = await import('./settings-service');
        const settings = await SettingsService.getSettings();
        const tvaIngResult = 1 + settings.tvaIngredients / 100;
        const tvaPackResult = 1 + settings.tvaPackaging / 100;

        if (itemIn.type === 'RECIPE' && itemIn.recipeId) {
          const r = await RecipeService.getRecipeById(itemIn.recipeId);
          if (r) {
            name = r.name;
            versionNumber = r.version;
            const costPerGram = r.totalIngredientCost || 0;
            const weightGrams = itemIn.format || 0;
            const matCostHT = weightGrams * costPerGram;
            unitMaterialCost = matCostHT * tvaIngResult;
            const doypack = await PackagingService.findPackagingForFormat(
              orgId,
              itemIn.format || 0,
              'Sachet'
            );
            if (doypack) {
              const packCostPerUnit = doypack.weightedAverageCost || 0;
              unitPackagingCost = packCostPerUnit * tvaPackResult;
            }
            unitCost = unitMaterialCost + unitPackagingCost;
            unitPrice = itemIn.unitPrice || unitCost * 2.5;
          }
        } else if (itemIn.type === 'PACK' && itemIn.packId) {
          const p = await PackService.getPackById(itemIn.packId);
          if (p) {
            name = p.name;
            versionNumber = p.version;
            unitMaterialCost = (p.totalCost || 0) * tvaIngResult;
            unitPackagingCost = 0;
            unitCost = unitMaterialCost;
            unitPrice = itemIn.unitPrice || p.price;
          }
        } else if (itemIn.type === 'ACCESSORY' && itemIn.ingredientId) {
          const i = await InventoryService.getIngredientById(itemIn.ingredientId);
          if (i) {
            name = i.name;
            versionNumber = 1;
            const accessoryCostPerUnit = i.weightedAverageCost || 0;
            unitMaterialCost = accessoryCostPerUnit * tvaPackResult;
            unitPackagingCost = 0;
            unitCost = unitMaterialCost;
            unitPrice = itemIn.unitPrice || unitCost * 2;
          }
        }

        order.items.push({
          id: Math.random().toString(36).substring(7),
          orderId: order.id,
          type: itemIn.type,
          recipeId: itemIn.recipeId,
          packId: itemIn.packId,
          ingredientId: itemIn.ingredientId,
          format: itemIn.format,
          quantity: itemIn.quantity,
          name,
          versionNumber,
          unitPriceSnapshot: unitPrice,
          unitCostSnapshot: unitCost,
          unitMaterialCostSnapshot: unitMaterialCost,
          unitPackagingCostSnapshot: unitPackagingCost,
          totalPrice: unitPrice * itemIn.quantity,
        });
      }
    }

    await this.calculateFinancials(orgId, order);
    await db.upsert('orders', order, orgId);

    if (newNeedsStock && (!oldHadStock || itemsInput)) {
      await this.deductOrderStock(orgId, order);
    }
  },

  async deleteOrder(orgId: string, orderId: string) {
    const order = await db.getById<Order>('orders', orderId, orgId);
    if (!order) throw new Error('Order not found');

    if ([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) {
      await this.revertOrderStock(orgId, order);
    }

    await db.delete('orders', orderId, orgId);

    await AuditService.log({
      action: AuditAction.DELETE,
      entity: AuditEntity.ORDER,
      entityId: orderId,
      metadata: { reason: 'User Delete' },
    });
  },

  async revertOrderStock(orgId: string, order: Order) {
    for (const item of order.items) {
      if (item.type === 'RECIPE') {
        if (!item.recipeId) continue;
        const version = await RecipeService.getRecipeVersion(item.recipeId, item.versionNumber);
        if (!version) continue;

        const totalGrams = (item.format || 0) * item.quantity;
        for (const rItem of version.items) {
          const usage = (totalGrams * rItem.percentage) / 100;
          await InventoryService.addMovement(
            orgId,
            rItem.ingredientId,
            MovementType.ADJUSTMENT,
            usage,
            undefined,
            `Revert Order #${order.id} - Restock`,
            EntityType.INGREDIENT,
            MovementSource.ORDER,
            order.id
          );
        }

        const doypackIng = await PackagingService.findPackagingForFormat(
          orgId,
          item.format || 0,
          'Sachet'
        );
        if (doypackIng) {
          await InventoryService.addMovement(
            orgId,
            doypackIng.id,
            MovementType.ADJUSTMENT,
            item.quantity,
            undefined,
            `Revert Order #${order.id} - Restock Doypack`,
            EntityType.PACKAGING,
            MovementSource.ORDER,
            order.id
          );
        }
      } else if (item.type === 'PACK') {
        if (!item.packId) continue;
        const version = await PackService.getPackVersion(item.packId, item.versionNumber);
        if (!version) continue;

        for (const pRecipe of version.recipes) {
          const pRecipeEntity = await RecipeService.getRecipeById(pRecipe.recipeId);
          if (!pRecipeEntity) continue;
          const totalGrams = (pRecipe.format as number) * pRecipe.quantity * item.quantity;
          for (const ing of pRecipeEntity.items) {
            const usage = (totalGrams * ing.percentage) / 100;
            await InventoryService.addMovement(
              orgId,
              ing.ingredientId,
              MovementType.ADJUSTMENT,
              usage,
              undefined,
              `Revert Order #${order.id} (Pack) - Restock`,
              EntityType.INGREDIENT,
              MovementSource.ORDER,
              order.id
            );
          }
        }
        for (const pPkg of version.packaging) {
          await InventoryService.addMovement(
            orgId,
            pPkg.ingredientId,
            MovementType.ADJUSTMENT,
            pPkg.quantity * item.quantity,
            undefined,
            `Revert Order #${order.id} (Pack) - Return Pkg`,
            EntityType.PACKAGING,
            MovementSource.ORDER,
            order.id
          );
        }
      }
    }

    if (order.packagingId) {
      await InventoryService.addMovement(
        orgId,
        order.packagingId,
        MovementType.ADJUSTMENT,
        1,
        undefined,
        `Revert Order #${order.id} - Restock Box`,
        EntityType.PACKAGING,
        MovementSource.ORDER,
        order.id
      );
    } else if (order.packagingType) {
      const allIngredients = await InventoryService.getIngredients(orgId);
      const carton = allIngredients.find((i) => i.name === order.packagingType);
      if (carton) {
        await InventoryService.addMovement(
          orgId,
          carton.id,
          MovementType.ADJUSTMENT,
          1,
          undefined,
          `Revert Order #${order.id} - Restock Box (Name Match)`,
          EntityType.PACKAGING,
          MovementSource.ORDER,
          order.id
        );
      }
    }
  },

  async cancelOrder(orgId: string, orderId: string) {
    const order = await db.getById<Order>('orders', orderId, orgId);
    if (!order) throw new Error('Order not found');

    if (order.status === OrderStatus.CANCELLED) return;

    if (order.status === OrderStatus.DRAFT) {
      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.updatedAt = new Date();
      await db.upsert('orders', order, orgId);
      return;
    }

    if ([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) {
      await this.revertOrderStock(orgId, order);

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.updatedAt = new Date();
      await db.upsert('orders', order, orgId);

      await AuditService.log({
        action: AuditAction.CANCEL,
        entity: AuditEntity.ORDER,
        entityId: orderId,
        correlationId: orderId,
        metadata: { status: 'RESTOCKED' },
      });
      return;
    }

    if (order.status === OrderStatus.SHIPPED) {
      throw new Error('Cards shipped cannot be cancelled automatically. Use Refund workflow.');
    }
  },
};
