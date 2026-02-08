
import { AnalyticsService } from './analytics-service';
import { InventoryService } from './inventory-service';
import { AuditService } from './audit-service';
import { AuditSeverity } from '@/types/audit';
import { Ingredient } from '@/types/inventory';

export interface DashboardSummary {
    revenue: number; // Total Paid (Product + Shipping)
    productRevenue: number;
    cogs: number; // Product COGS
    shippingNet: number; // Charged - Real
    realMargin: number;
    realMarginPercent: number;
    orderCount: number;
    completeOrderCount: number;
    averageBasket: number;
}

export interface DashboardAlert {
    id: string;
    type: 'STOCK_CRITICAL' | 'NEGATIVE_MARGIN' | 'MISSING_SHIPPING' | 'SYSTEM_WARNING';
    severity: 'HIGH' | 'MEDIUM';
    message: string;
    link?: string;
    metadata?: any;
}

export const DashboardService = {
    async getSummary(orgId: string, period: 'today' | '7d' | '30d' | 'all' = '7d'): Promise<DashboardSummary> {
        const endDate = new Date();
        const startDate = new Date();

        // precise start of day?
        startDate.setHours(0, 0, 0, 0);

        if (period === 'today') {
            // startDate is already today 00:00
        } else if (period === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else {
            startDate.setFullYear(2000); // All time
        }

        // Reuse Analytics Logic for consistency
        const { orders, stats } = await AnalyticsService.getOrderProfitability(orgId, startDate, endDate);

        // Calculate specific Dashboard KPIs
        // stats has totalRevenue (Paid), totalCost (Real), totalMargin (Real).
        // specific breakdowns:
        const productRevenue = orders.reduce((sum, o) => sum + o.productRevenue, 0);
        const cogs = orders.reduce((sum, o) => sum + o.productCOGS, 0);
        const shippingCharged = orders.reduce((sum, o) => sum + o.shippingCharged, 0);
        const shippingReal = orders.reduce((sum, o) => sum + o.shippingRealCost, 0);

        return {
            revenue: stats.totalRevenue,
            productRevenue,
            cogs,
            shippingNet: shippingCharged - shippingReal,
            realMargin: stats.completeMargin, // Use Total Real Marge
            orderCount: orders.length,
            completeOrderCount: stats.completeOrderCount,
            realMarginPercent: stats.globalMarginPercent,
            averageBasket: orders.length > 0 ? stats.totalRevenue / orders.length : 0
        };
    },

    async getAlerts(orgId: string): Promise<DashboardAlert[]> {
        const alerts: DashboardAlert[] = [];

        // STOCK ALERTS ONLY (filtered by proximity to threshold)
        const ingredients = await InventoryService.getIngredients(orgId);
        ingredients.forEach(i => {
            const threshold = i.alertThreshold || 1000; // Default 1kg
            const warningLevel = threshold * 0.8; // 80% of threshold = warning zone

            // Critical: at or below threshold
            if (i.currentStock <= threshold) {
                alerts.push({
                    id: `stock-${i.id}`,
                    type: 'STOCK_CRITICAL',
                    severity: 'HIGH', // Red alert
                    message: `${i.name}: Stock critique (${i.currentStock.toFixed(0)}g / ${threshold}g)`,
                    link: '/inventory'
                });
            }
            // Warning: between 80% and 100% of threshold 
            else if (i.currentStock > warningLevel && i.currentStock <= threshold * 1.2) {
                alerts.push({
                    id: `stock-${i.id}`,
                    type: 'STOCK_CRITICAL',
                    severity: 'MEDIUM', // Orange warning
                    message: `${i.name}: Stock faible (${i.currentStock.toFixed(0)}g / ${threshold}g)`,
                    link: '/inventory'
                });
            }
        });



        return alerts;
    },

    async getSummaryWithTrends(orgId: string, period: '30d' = '30d'): Promise<{
        current: DashboardSummary;
        previous: DashboardSummary;
        trends: {
            revenueChange: number;
            profitChange: number;
            marginChange: number;
            orderCountChange: number;
        };
    }> {
        const now = new Date();

        // Current period (last 30 days)
        const currentEnd = new Date(now);
        const currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 30);

        // Previous period (30 days before that)
        const previousEnd = new Date(currentStart);
        const previousStart = new Date(previousEnd);
        previousStart.setDate(previousStart.getDate() - 30);

        // Get data for both periods
        const [currentOrders, previousOrders] = await Promise.all([
            AnalyticsService.getOrderProfitability(orgId, currentStart, currentEnd),
            AnalyticsService.getOrderProfitability(orgId, previousStart, previousEnd)
        ]);

        // Build summaries
        const buildSummary = (data: any): DashboardSummary => {
            const { orders, stats } = data;
            return {
                revenue: stats.totalRevenue,
                productRevenue: orders.reduce((sum: number, o: any) => sum + o.productRevenue, 0),
                cogs: orders.reduce((sum: number, o: any) => sum + o.productCOGS, 0),
                shippingNet: orders.reduce((sum: number, o: any) => sum + (o.shippingCharged - o.shippingRealCost), 0),
                realMargin: stats.completeMargin,
                orderCount: orders.length,
                completeOrderCount: stats.completeOrderCount,
                realMarginPercent: stats.globalMarginPercent,
                averageBasket: orders.length > 0 ? stats.totalRevenue / orders.length : 0
            };
        };

        const current = buildSummary(currentOrders);
        const previous = buildSummary(previousOrders);

        // Calculate percentage changes
        const calcChange = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        return {
            current,
            previous,
            trends: {
                revenueChange: calcChange(current.revenue, previous.revenue),
                profitChange: calcChange(current.realMargin, previous.realMargin),
                marginChange: current.realMarginPercent - previous.realMarginPercent,
                orderCountChange: calcChange(current.orderCount, previous.orderCount)
            }
        };
    },

    async getRecentActivity(orgId: string, limit = 10) {
        return AuditService.getLogs({ limit });
    }
};
