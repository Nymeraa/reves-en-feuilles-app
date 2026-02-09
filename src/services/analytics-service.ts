import { db } from '@/lib/db';
import { Order, OrderStatus } from '@/types/order';
import { InventoryService } from './inventory-service'; // Added import

export interface AnalyticsSummary {
  revenue: number;
  profit: number;
  cogsMaterials: number;
  cogsPackaging: number;
  cogsShipping: number;
  cogsOther: number;

  orderCount: number;
  averageBasket: number;
  marginPercentage: number;
}

export interface TopProduct {
  id: string; // SKU or Name if no global product ID
  name: string;
  type: 'RECIPE' | 'PACK' | 'ACCESSORY';
  quantity: number;
  revenue: number;
}

export interface StockAlert {
  id: string;
  name: string;
  currentStock: number;
  threshold: number;
}

export const AnalyticsService = {
  async getSummary(orgId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsSummary> {
    const orders = await db.readAll<Order>('orders', orgId);

    const filtered = orders.filter((o) => {
      if (o.organizationId !== orgId) return false;
      // Whitelist Status
      if (![OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(o.status))
        return false;

      // Date logic: Prefer paidAt for financial reporting, fallback to createdAt
      const date = o.paidAt ? new Date(o.paidAt) : new Date(o.createdAt);
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });

    let revenue = 0; // Total Paid (Products + Shipping)
    let profit = 0;
    let cogsMaterials = 0;
    let cogsPackaging = 0;
    let cogsShipping = 0;
    let fees = 0; // Separate from COGS (URSSAF, platform fees, etc.)

    for (const order of filtered) {
      // Revenue = Product Sales + Shipping Billed
      const shippingBilled = order.shippingPrice || 0;
      const totalRevenue = order.totalAmount + shippingBilled;
      revenue += totalRevenue;

      // COGS from Header (Source of Truth for History)
      let mCogs = order.cogsMaterials || 0;
      let pCogs = order.cogsPackaging || 0;

      // Guard: If both are 0 but totalCost exists, use totalCost as materials proxy
      if (mCogs === 0 && pCogs === 0 && order.totalCost > 0) {
        mCogs = order.totalCost;
      }

      cogsMaterials += mCogs;
      cogsPackaging += pCogs;

      // Shipping Cost (part of COGS)
      cogsShipping += order.shippingCost || 0;

      // Fees (separate from COGS) - use feesTotal if available, else feesOther
      const orderFees = (order.feesTotal ?? 0) || (order.feesOther ?? 0);
      fees += orderFees;

      // Profit for this order
      profit +=
        order.netProfit ?? totalRevenue - (mCogs + pCogs + (order.shippingCost || 0) + orderFees);
    }

    const totalCOGS = cogsMaterials + cogsPackaging + cogsShipping;
    const count = filtered.length;

    return {
      revenue,
      profit,
      cogsMaterials,
      cogsPackaging,
      cogsShipping,
      cogsOther: fees, // Fees (not COGS), but kept as cogsOther for interface compatibility
      orderCount: count,
      averageBasket: count > 0 ? revenue / count : 0,
      marginPercentage: revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  },

  async getTopProducts(orgId: string, limit = 5): Promise<TopProduct[]> {
    const orders = await db.readAll<Order>('orders', orgId);
    const productMap = new Map<string, TopProduct>();

    for (const order of orders) {
      if (order.organizationId !== orgId) continue;
      if (![OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status))
        continue;

      for (const item of order.items) {
        const key = `${item.type}-${item.recipeId || item.packId}`;
        const existing = productMap.get(key);

        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.totalPrice;
        } else {
          productMap.set(key, {
            id: (item.recipeId || item.packId)!,
            name: item.name,
            type: item.type,
            quantity: item.quantity,
            revenue: item.totalPrice,
          });
        }
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },

  async getTopRecipes(
    orgId: string,
    limit = 10,
    startDate?: Date,
    endDate?: Date
  ): Promise<
    Array<{
      id: string;
      name: string;
      quantitySold: number;
      revenue: number;
    }>
  > {
    const orders = await db.readAll<Order>('orders', orgId);
    const recipeMap = new Map<
      string,
      {
        id: string;
        name: string;
        quantitySold: number;
        revenue: number;
      }
    >();

    for (const order of orders) {
      if (order.organizationId !== orgId) continue;
      if (![OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status))
        continue;

      // Date filtering: Prefer paidAt, fallback to createdAt
      const orderDate = order.paidAt ? new Date(order.paidAt) : new Date(order.createdAt);
      if (startDate && orderDate < startDate) continue;
      if (endDate && orderDate > endDate) continue;

      for (const item of order.items) {
        // Only count RECIPE items
        if (item.type !== 'RECIPE' || !item.recipeId) continue;

        const existing = recipeMap.get(item.recipeId);

        if (existing) {
          existing.quantitySold += item.quantity;
          existing.revenue += item.totalPrice;
        } else {
          recipeMap.set(item.recipeId, {
            id: item.recipeId,
            name: item.name,
            quantitySold: item.quantity,
            revenue: item.totalPrice,
          });
        }
      }
    }

    return Array.from(recipeMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold) // Sort by quantity, not revenue
      .slice(0, limit);
  },

  async getStockAlerts(orgId: string): Promise<StockAlert[]> {
    const ingredients = await db.readAll<any>('ingredients', orgId);
    // Filter low stock
    return ingredients
      .filter((i) => {
        const threshold = i.threshold || 1000; // Default 1kg
        return (i.currentStock || 0) <= threshold && i.status === 'ACTIVE';
      })
      .map((i) => ({
        id: i.id,
        name: i.name,
        currentStock: i.currentStock,
        threshold: i.threshold || 1000,
      }));
  },

  async getRecentSales(orgId: string, limit = 5): Promise<Order[]> {
    const orders = await db.readAll<Order>('orders', orgId);
    return orders
      .filter(
        (o) =>
          o.organizationId === orgId &&
          [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(o.status)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async getSalesTimeline(orgId: string, days = 30) {
    const orders = await db.readAll<Order>('orders', orgId);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyData = new Map<string, { date: string; revenue: number; profit: number }>();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0];
      dailyData.set(iso, { date: iso, revenue: 0, profit: 0 });
    }

    orders.forEach((o) => {
      if (
        o.organizationId !== orgId ||
        ![OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(o.status)
      )
        return;

      const date = o.paidAt ? new Date(o.paidAt) : new Date(o.createdAt);
      if (date < startDate || date > endDate) return;

      const iso = date.toISOString().split('T')[0];
      const entry = dailyData.get(iso);
      if (entry) {
        const totalRevenue = o.totalAmount + (o.shippingPrice || 0);
        entry.revenue += totalRevenue;
        entry.profit += o.netProfit;
      }
    });

    return Array.from(dailyData.values());
  },

  // PRODUCT PROFITABILITY (Gross Margin: Revenue - Product COGS)
  // Excludes Shipping.
  async getProductProfitability(orgId: string, startDate?: Date, endDate?: Date) {
    const orders = await db.readAll<Order>('orders', orgId);
    const productMap = new Map<
      string,
      {
        id: string;
        name: string;
        type: 'RECIPE' | 'PACK' | 'ACCESSORY';
        quantitySold: number;
        revenue: number; // Product Revenue
        cogs: number; // Product COGS (Materials + Packaging)
      }
    >();

    for (const order of orders) {
      if (order.organizationId !== orgId) continue;
      // STRICT: Only PAID, SHIPPED, or DELIVERED. Exclude CANCELLED, DRAFT.
      if (![OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status))
        continue;

      const date = order.paidAt ? new Date(order.paidAt) : new Date(order.createdAt);
      if (startDate && date < startDate) continue;
      if (endDate && date > endDate) continue;

      for (const item of order.items) {
        // Key by ID to aggregate versions (User wants Product analysis)
        const key = `${item.type}-${item.recipeId || item.packId}`;
        const existing = productMap.get(key);

        // Source of Truth: Item Snapshots
        const itemRevenue = item.totalPrice; // UnitPriceSnapshot * Qty
        const itemCOGS = (item.unitCostSnapshot || 0) * item.quantity;

        if (existing) {
          existing.quantitySold += item.quantity;
          existing.revenue += itemRevenue;
          existing.cogs += itemCOGS;
        } else {
          productMap.set(key, {
            id: (item.recipeId || item.packId)!,
            name: item.name,
            type: item.type,
            quantitySold: item.quantity,
            revenue: itemRevenue,
            cogs: itemCOGS,
          });
        }
      }
    }

    return Array.from(productMap.values())
      .map((p) => ({
        ...p,
        margin: p.revenue - p.cogs,
        marginPercent: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.margin - a.margin);
  },

  // ORDER PROFITABILITY (Real Margin: Total Paid - Total Real Cost)
  // Includes Shipping Charged & Shipping Real Cost.
  // ORDER PROFITABILITY (Real Margin: Total Paid - Total Real Cost)
  // Includes Shipping Charged & Shipping Real Cost.
  async getOrderProfitability(orgId: string, startDate?: Date, endDate?: Date) {
    const orders = await db.readAll<Order>('orders', orgId);

    const filtered = orders.filter((o) => {
      if (o.organizationId !== orgId) return false;
      if (![OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(o.status))
        return false;

      const date = o.paidAt ? new Date(o.paidAt) : new Date(o.createdAt);
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });

    const detailedOrders = filtered.map((order) => {
      const productRevenue = order.totalAmount; // Sum of items
      const shippingCharged = order.shippingPrice || 0;
      const totalPaid = productRevenue + shippingCharged;

      const productCOGS = (order.cogsMaterials || 0) + (order.cogsPackaging || 0); // Header Snapshot (Should match sum of items)

      // Strict check for missing shipping: Charged > 0 but Cost undefined/null.
      // Note: cost=0 is valid (free internal shipping).
      const isShippingMissing =
        shippingCharged > 0 && (order.shippingCost === undefined || order.shippingCost === null);

      const shippingRealCost = order.shippingCost || 0;

      // Fee Logic: Use Snapshot Total if available (New), else fallback to legacy otherFees
      const totalFees = (order.feesTotal ?? 0) || (order.feesOther ?? 0);

      const totalRealCost = productCOGS + shippingRealCost + totalFees;

      const realMargin = totalPaid - totalRealCost;
      const realMarginPercent = totalPaid > 0 ? (realMargin / totalPaid) * 100 : 0;

      return {
        id: order.id,
        orderNumber: order.orderNumber || order.id,
        date: order.createdAt,
        customerName: order.customerName,

        // Components
        productRevenue,
        shippingCharged,
        totalPaid,

        productCOGS,
        shippingRealCost,
        totalFees, // Added field
        totalRealCost,

        realMargin,
        realMarginPercent,

        isShippingMissing,
      };
    });

    // Global Stats
    const stats = detailedOrders.reduce(
      (acc, o) => {
        const isComplete = !o.isShippingMissing;
        return {
          totalRevenue: acc.totalRevenue + o.totalPaid,
          totalCost: acc.totalCost + o.totalRealCost,
          totalMargin: acc.totalMargin + o.realMargin,
          completeOrderCount: acc.completeOrderCount + (isComplete ? 1 : 0),
          completeMargin: acc.completeMargin + (isComplete ? o.realMargin : 0),
        };
      },
      { totalRevenue: 0, totalCost: 0, totalMargin: 0, completeOrderCount: 0, completeMargin: 0 }
    );

    const globalMarginPercent =
      stats.totalRevenue > 0 ? (stats.totalMargin / stats.totalRevenue) * 100 : 0;

    return {
      orders: detailedOrders.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      stats: {
        ...stats,
        globalMarginPercent,
      },
    };
  },

  // CSV Exports (Delegating to methods above)
  async getProductProfitabilityCsv(orgId: string, startDate?: Date, endDate?: Date) {
    const { stringify } = require('csv-stringify/sync');
    const products = await this.getProductProfitability(orgId, startDate, endDate);

    const data = products.map((p) => ({
      Name: p.name,
      Type: p.type,
      Quantity: p.quantitySold,
      RevenueProduct: p.revenue.toFixed(2),
      COGSProduct: p.cogs.toFixed(2),
      GrossMargin: p.margin.toFixed(2),
      GrossMarginPercent: p.marginPercent.toFixed(2) + '%',
    }));
    return stringify(data, { header: true });
  },

  async getOrderProfitabilityCsv(orgId: string, startDate?: Date, endDate?: Date) {
    const { stringify } = require('csv-stringify/sync');
    const { orders } = await this.getOrderProfitability(orgId, startDate, endDate);

    const data = orders.map((o) => ({
      Date: new Date(o.date).toISOString().split('T')[0],
      Order: o.orderNumber,
      Customer: o.customerName,
      ProductRevenue: o.productRevenue.toFixed(2),
      ShippingCharged: o.shippingCharged.toFixed(2),
      TotalPaid: o.totalPaid.toFixed(2),
      ProductCOGS: o.productCOGS.toFixed(2),
      ShippingRealCost: o.shippingRealCost.toFixed(2),
      TotalFees: (o.totalFees ?? 0).toFixed(2), // Added
      TotalRealCost: o.totalRealCost.toFixed(2),
      RealMargin: o.realMargin.toFixed(2),
      RealMarginPercent: o.realMarginPercent.toFixed(2) + '%',
    }));
    return stringify(data, { header: true });
  },

  async getSalesCsv(orgId: string, startDate?: Date, endDate?: Date) {
    return this.getOrderProfitabilityCsv(orgId, startDate, endDate);
  },

  async getInventoryMovementsCsv(orgId: string, startDate?: Date, endDate?: Date) {
    const { stringify } = require('csv-stringify/sync');
    const movements = await InventoryService.getMovements(orgId);

    // Filter
    const filtered = movements.filter((m) => {
      const date = new Date(m.createdAt);
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });

    const data = filtered.map((m) => ({
      Date: new Date(m.createdAt).toISOString().split('T')[0],
      Type: m.type,
      ItemName: m.reason || 'Unknown', // Using reason as proxy for name/desc
      Quantity: m.deltaQuantity,
      Source: m.source,
      EntityType: m.entityType,
    }));

    return stringify(data, { header: true });
  },
};
