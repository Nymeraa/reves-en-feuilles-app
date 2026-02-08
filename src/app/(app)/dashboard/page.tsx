
import { DashboardService } from '@/services/dashboard-service';
import { AnalyticsService } from '@/services/analytics-service';
import { DashboardView } from '@/components/pilotage/dashboard-view';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const orgId = 'org-1';

    // Fetch dashboard data with trends
    const [trendsData, alerts, topRecipes, recentOrders] = await Promise.all([
        DashboardService.getSummaryWithTrends(orgId),
        DashboardService.getAlerts(orgId),
        AnalyticsService.getTopRecipes(orgId, 10),
        AnalyticsService.getRecentSales(orgId, 10)
    ]);

    return (
        <DashboardView
            trendsData={trendsData}
            alerts={alerts}
            topRecipes={topRecipes}
            recentOrders={recentOrders}
        />
    );
}
