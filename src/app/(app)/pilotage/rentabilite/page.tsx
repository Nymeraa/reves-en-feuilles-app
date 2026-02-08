
import { AnalyticsService } from '@/services/analytics-service';
import { ProfitabilityDashboard } from '@/components/pilotage/profitability-dashboard';

export const dynamic = 'force-dynamic';

export default async function ProfitabilityPage() {
    // Default: Last 30 days
    // In real app, searchParams would control this.
    const productStats = await AnalyticsService.getProductProfitability('org-1');
    const orderStats = await AnalyticsService.getOrderProfitability('org-1');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Rentabilité</h1>
                <p className="text-slate-500">
                    Analyse financière stricte basée sur les coûts historiques (Snapshots).
                    Exclut les commandes annulées.
                </p>
            </div>

            <ProfitabilityDashboard
                productData={productStats}
                orderData={orderStats}
            />
        </div>
    );
}
