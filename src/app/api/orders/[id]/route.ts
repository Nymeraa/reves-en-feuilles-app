import { NextResponse } from 'next/server';
import { OrderService } from '@/services/order-service';
import { CreateOrderInput } from '@/types/order';
import { updateOrderSchema } from '@/lib/zod-schemas';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parseResult = updateOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
    }

    const {
      orderNumber,
      customerName,
      date,
      totalAmount,
      status,
      source,
      email,
      shippingCarrier,
      trackingNumber,
      shippingCost,
      shippingPrice,
      packagingType,
      discountCode,
      discountPercent,
      otherFees,
      notes,
      items,
      site,
    } = parseResult.data;

    const input: CreateOrderInput = {
      orderNumber,
      customerName,
      date: date ? new Date(date) : undefined,
      totalAmount,
      status,
      source,
      email,
      shippingCarrier,
      trackingNumber,
      shippingCost,
      shippingPrice,
      packagingType,
      discountCode,
      discountPercent,
      otherFees,
      notes,
      site,
    };

    await OrderService.updateOrder('org-1', id, input, items);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to update order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await OrderService.deleteOrder('org-1', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to delete order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
