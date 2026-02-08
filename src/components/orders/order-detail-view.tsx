'use client';

import { useState } from 'react';
import { Order, OrderStatus } from '@/types/order';
import { Recipe } from '@/types/recipe';
import { Ingredient } from '@/types/inventory';
import { Pack } from '@/types/pack';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Printer, Trash } from 'lucide-react';
import { OrderDialog } from './order-dialog';
import { useRouter } from 'next/navigation';

import { AppSettings } from '@/types/settings';

interface OrderDetailViewProps {
  order: Order;
  recipes: Recipe[];
  ingredients: Ingredient[];
  packs: Pack[];
  settings: AppSettings;
}

export function OrderDetailView({
  order,
  recipes,
  ingredients,
  packs,
  settings,
}: OrderDetailViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            N° Commande:{' '}
            <span className="font-mono font-medium text-slate-900">
              {order.orderNumber || order.id}
            </span>
          </div>
          <Badge variant={order.status === OrderStatus.PAID ? 'default' : 'secondary'}>
            {order.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" /> Imprimer
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Edit className="w-4 h-4 mr-2" /> Modifier
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (
                confirm(
                  'Êtes-vous sûr de vouloir supprimer cette commande ? Cela annulera les mouvements de stock associés.'
                )
              ) {
                const { apiFetch } = await import('@/lib/api-client');
                await apiFetch(`/api/orders/${order.id}`, { method: 'DELETE' });
                router.push('/orders');
              }
            }}
          >
            <Trash className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations Client</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <span className="text-slate-500 block">Nom:</span> {order.customerName}
            </div>
            <div>
              <span className="text-slate-500 block">Email:</span> {order.email || '-'}
            </div>
            <div>
              <span className="text-slate-500 block">Source:</span> {order.source || '-'}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Livraison</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <span className="text-slate-500 block">Transporteur:</span>{' '}
              {order.shippingCarrier || '-'}
            </div>
            <div>
              <span className="text-slate-500 block">N° Suivi:</span> {order.trackingNumber || '-'}
            </div>
            <div>
              <span className="text-slate-500 block">Coût (Payé par nous):</span>{' '}
              {order.shippingCost?.toFixed(2)} €
            </div>
          </CardContent>
        </Card>

        {/* Financials Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Finances</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Client:</span>
              <span className="font-bold">{order.totalAmount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Coût Livraison Client:</span>
              <span>{(order.shippingPrice || 0).toFixed(2)} €</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Marge:</span>
                <span
                  className={
                    order.margin >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'
                  }
                >
                  {order.margin?.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Profit:</span>
                <span
                  className={
                    order.netProfit >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'
                  }
                >
                  {order.netProfit?.toFixed(2)} €
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lignes de commande</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-medium text-slate-500">Type</th>
                  <th className="p-3 text-left font-medium text-slate-500">Nom</th>
                  <th className="p-3 text-left font-medium text-slate-500">Format</th>
                  <th className="p-3 text-right font-medium text-slate-500">Quantité</th>
                  <th className="p-3 text-right font-medium text-slate-500">
                    Coût Unitaire (Est.)
                  </th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">
                        {item.type}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-slate-500">{item.format ? `${item.format}g` : '-'}</td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right text-slate-500">
                      {item.unitCostSnapshot ? item.unitCostSnapshot.toFixed(2) : '-'} €
                    </td>
                  </tr>
                ))}
                {(!order.items || order.items.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Aucun produit
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Financial Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détail des Coûts (COGS)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Matières Premières (Recettes):</span>
              <span>{(order.cogsMaterials || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Packaging (Sachets + Carton):</span>
              <span>{(order.cogsPackaging || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1 mt-1">
              <span className="text-slate-500">Total Produit:</span>
              <span>{(order.totalCost || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-dashed">
              <span className="text-slate-500">Livraison Facturée (Client):</span>
              <span>{(order.shippingPrice || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Coût Livraison (Réel):</span>
              <span className="text-rose-600">- {(order.shippingCost || 0).toFixed(2)} €</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Frais & Taxes (Estimés)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">URSSAF ({settings.urssafRate}%):</span>
              <span>{(order.feesUrssaf || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shopify / Transaction:</span>
              <span>{(order.feesShopify || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Autres Frais:</span>
              <span>{(order.feesOther || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1 mt-1">
              <span className="text-slate-500">Total Frais:</span>
              <span>{(order.feesTotal || 0).toFixed(2)} €</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 italic">
          {order.notes || 'Aucune note.'}
        </CardContent>
      </Card>

      <OrderDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        recipes={recipes}
        packs={packs}
        ingredients={ingredients}
        settings={settings}
        initialData={order}
        onSuccess={() => {
          setIsDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
