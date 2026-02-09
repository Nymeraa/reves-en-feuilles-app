import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Order, OrderStatus } from '@/types/order';

export async function GET() {
  try {
    const orgId = 'org-1'; // Default org for debug
    const orders = await db.readAll<Order>('orders', orgId);

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const paidStatuses = [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

    // Filter counts
    const ordersTotal = orders.length;
    const ordersPaid = orders.filter((o) => paidStatuses.includes(o.status));

    // 30d filtering (using createdAt for now as paidAt is new)
    const ordersPaid30d = ordersPaid.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);

    // Sums
    const sumPaid30d = ordersPaid30d.reduce(
      (acc, o) => ({
        totalAmount: acc.totalAmount + (o.totalAmount || 0),
        totalCost: acc.totalCost + (o.totalCost || 0),
        netProfit: acc.netProfit + (o.netProfit || 0),
      }),
      { totalAmount: 0, totalCost: 0, netProfit: 0 }
    );

    // Distinct Statuses
    const statusCounts: Record<string, number> = {};
    orders.forEach((o) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    // Recent Examples
    const examples = orders
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        paidAt: o.paidAt,
        cancelledAt: o.cancelledAt,
        totalAmount: o.totalAmount,
        totalCost: o.totalCost,
        netProfit: o.netProfit,
        margin: o.margin,
        hasSnapshots: o.cogsMaterials > 0 || o.cogsPackaging > 0,
      }));

    return NextResponse.json({
      success: true,
      data: {
        timestamp: now.toISOString(),
        orgId,
        kpis: {
          ordersTotal,
          ordersPaidAllTime: ordersPaid.length,
          ordersPaid30d: ordersPaid30d.length,
          sumPaid30d_totalAmount: sumPaid30d.totalAmount,
          sumPaid30d_totalCost: sumPaid30d.totalCost,
          sumPaid30d_netProfit: sumPaid30d.netProfit,
        },
        statusCounts,
        examples,
      },
    });
  } catch (error: any) {
    console.error('[DEBUG KPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
