
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';

interface Props {
    productData: any[]; // Defined in service
    orderData: { orders: any[], stats: any };
}

export function ProfitabilityDashboard({ productData, orderData }: Props) {
    const { stats, orders } = orderData;

    const downloadCsv = async (type: 'products' | 'orders') => {
        // In a real app we'd call an API route. 
        // For prototype, we can fetch from API or rely on Server Actions.
        // Let's assume we implement a quick API route or just Client Side generation if data is here.
        // Data is here, let's just generate CSV client side for speed.

        let content = '';
        if (type === 'products') {
            const header = ['Produit', 'Type', 'Quantité', 'CA Produit', 'COGS Produit', 'Marge Brute €', 'Marge %'];
            const rows = productData.map(p => [
                p.name, p.type, p.quantitySold, p.revenue.toFixed(2), p.cogs.toFixed(2), p.margin.toFixed(2), p.marginPercent.toFixed(2) + '%'
            ]);
            content = [header, ...rows].map(e => e.join(',')).join('\n');
        } else {
            const header = ['Date', 'Commande', 'Client', 'Total Payé', 'Coût Réel', 'Marge Réelle €', 'Marge %'];
            const rows = orders.map(o => [
                o.date, o.orderNumber, o.customerName, o.totalPaid.toFixed(2), o.totalRealCost.toFixed(2), o.realMargin.toFixed(2), o.realMarginPercent.toFixed(2) + '%'
            ]);
            content = [header, ...rows].map(e => e.join(',')).join('\n');
        }

        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rentabilite_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            {/* KPI CARDS - REAL ORDER MARGIN FOCUS */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CA Total (Payé)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} €</div>
                        <p className="text-xs text-muted-foreground">Produits + Livraison</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Coût Réel Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCost.toFixed(2)} €</div>
                        <p className="text-xs text-muted-foreground">COGS + Livraison + Frais</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Marge Réelle €</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.totalMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {stats.totalMargin.toFixed(2)} €
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Marge Réelle %</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.globalMarginPercent < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {stats.globalMarginPercent.toFixed(1)} %
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="orders" className="w-full">
                <div className="flex justify-between items-center mb-4">
                    <TabsList>
                        <TabsTrigger value="orders">Commandes (Marge Réelle)</TabsTrigger>
                        <TabsTrigger value="products">Produits (Marge Brute)</TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => downloadCsv('orders')}>
                            <Download className="w-4 h-4 mr-2" />
                            CSV Commandes
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadCsv('products')}>
                            <Download className="w-4 h-4 mr-2" />
                            CSV Produits
                        </Button>
                    </div>
                </div>

                <TabsContent value="orders">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Commande</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead className="text-right">Total Payé</TableHead>
                                    <TableHead className="text-right">Coût Réel</TableHead>
                                    <TableHead className="text-right">Marge €</TableHead>
                                    <TableHead className="text-right">Marge %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((o: any) => (
                                    <TableRow key={o.id}>
                                        <TableCell>{new Date(o.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                                        <TableCell>{o.customerName}</TableCell>
                                        <TableCell className="text-right font-medium">{o.totalPaid.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right text-slate-500">{o.totalRealCost.toFixed(2)} €</TableCell>
                                        <TableCell className={`text-right font-bold ${o.realMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {o.realMargin.toFixed(2)} €
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {o.realMarginPercent.toFixed(1)} %
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="products">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produit</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Quantité</TableHead>
                                    <TableHead className="text-right">CA Produit</TableHead>
                                    <TableHead className="text-right">COGS Produit</TableHead>
                                    <TableHead className="text-right">Marge Brute €</TableHead>
                                    <TableHead className="text-right">Marge %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productData.map((p: any) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{p.type}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{p.quantitySold}</TableCell>
                                        <TableCell className="text-right text-slate-600">{p.revenue.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right text-slate-400">{p.cogs.toFixed(2)} €</TableCell>
                                        <TableCell className={`text-right font-bold ${p.margin < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                            {p.margin.toFixed(2)} €
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {p.marginPercent.toFixed(1)} %
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
