'use client';

import { DashboardSummary, DashboardAlert } from '@/services/dashboard-service';
import { Order } from '@/types/order';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Package, Plus, Download } from 'lucide-react';
import Link from 'next/link';

interface Props {
    trendsData: {
        current: DashboardSummary;
        previous: DashboardSummary;
        trends: {
            revenueChange: number;
            profitChange: number;
            marginChange: number;
            orderCountChange: number;
        };
    };
    alerts: DashboardAlert[];
    topRecipes: Array<{
        id: string;
        name: string;
        quantitySold: number;
        revenue: number;
    }>;
    recentOrders: Order[];
}

export function DashboardView({ trendsData, alerts, topRecipes, recentOrders }: Props) {
    const { current, trends } = trendsData;

    const TrendIndicator = ({ value, isPercentage = true }: { value: number; isPercentage?: boolean }) => {
        const isPositive = value >= 0;
        const Icon = isPositive ? TrendingUp : TrendingDown;
        const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

        return (
            <span className={`text-xs flex items-center gap-1 ${colorClass}`}>
                <Icon className="w-3 h-3" />
                {isPositive && '+'}{value.toFixed(1)}{isPercentage && '%'} vs mois dernier
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* HEADER & ACTIONS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord</h1>
                    <p className="text-slate-500">Vue d'ensemble et actions prioritaires.</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" asChild>
                        <Link href="/orders/new"><Plus className="w-4 h-4 mr-2" /> Nouvelle Commande</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                        <Link href="/stock-movements"><Plus className="w-4 h-4 mr-2" /> Mouvement Stock</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                        <Link href="/tools/backup"><Download className="w-4 h-4 mr-2" /> Backup</Link>
                    </Button>
                </div>
            </div>

            {/* ALERTS SECTION - Stock Only */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold flex items-center text-red-600">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Alertes Prioritaires ({alerts.length})
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`p-4 rounded-lg border flex items-start gap-4 ${alert.severity === 'HIGH'
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-orange-50 border-orange-200 text-orange-800'
                                    }`}
                            >
                                <div className="mt-1"><Package className="h-4 w-4" /></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{alert.message}</p>
                                    {alert.link && (
                                        <Link href={alert.link} className="text-xs underline mt-1 block opacity-80 hover:opacity-100">
                                            Voir détails
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPI GRID WITH TRENDS */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Performance Commerciale (30 derniers jours)</h2>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Revenue Card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{current.revenue.toFixed(2)} €</div>
                            <p className="text-xs text-muted-foreground mb-1">
                                {current.orderCount} commandes
                            </p>
                            <TrendIndicator value={trends.revenueChange} />
                        </CardContent>
                    </Card>

                    {/* Profit Card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Net</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${current.realMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {current.realMargin.toFixed(2)} €
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                                Marge moyenne: {current.realMarginPercent.toFixed(1)}%
                            </p>
                            <TrendIndicator value={trends.profitChange} />
                        </CardContent>
                    </Card>

                    {/* Average Basket */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Panier Moyen</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{current.averageBasket.toFixed(2)} €</div>
                            <p className="text-xs text-muted-foreground">
                                Par commande
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Top 10 Recipes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Recettes</CardTitle>
                        <CardDescription>Recettes les plus vendues (30 derniers jours)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topRecipes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucune vente enregistrée</p>
                        ) : (
                            <div className="space-y-3">
                                {topRecipes.map((recipe, index) => (
                                    <div key={recipe.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0">
                                                {index + 1}
                                            </Badge>
                                            <div>
                                                <p className="text-sm font-medium">{recipe.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {recipe.quantitySold} unités • {recipe.revenue.toFixed(2)} €
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Commandes Récentes</CardTitle>
                                <CardDescription>Dernières commandes enregistrées</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/orders">Voir tout</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentOrders.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucune commande</p>
                        ) : (
                            <div className="space-y-3">
                                {recentOrders.map(order => (
                                    <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium">
                                                Commande #{order.orderNumber}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {order.customerName} • {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={
                                                order.status === 'PAID' ? 'default' :
                                                    order.status === 'SHIPPED' ? 'secondary' :
                                                        order.status === 'DELIVERED' ? 'outline' :
                                                            'destructive'
                                            }>
                                                {order.status}
                                            </Badge>
                                            <p className="text-sm font-semibold mt-1">{order.totalAmount.toFixed(2)} €</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
