import { NextResponse } from 'next/server';
import { OrderService } from '@/services/order-service';
import { AddOrderItemInput } from '@/types/order';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Body should match AddOrderItemInput partially or fully
    const { type, recipeId, packId, ingredientId, format, quantity, unitPrice } = body;

    const input: AddOrderItemInput = {
      type: type || 'RECIPE',
      recipeId,
      packId,
      ingredientId,
      format: format ? (Number(format) as any) : undefined,
      quantity: Number(quantity),
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
    };

    if (!input.quantity) {
      return NextResponse.json({ error: 'Quantity Required' }, { status: 400 });
    }

    await OrderService.addItemToOrder('org-1', id, input);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to add order item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
