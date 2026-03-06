import { NextResponse } from 'next/server';
import { OrderService } from '@/services/order-service';
import { CreateOrderInput } from '@/types/order';
import { createOrderSchema } from '@/lib/zod-schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parseResult = createOrderSchema.safeParse(body);
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
      packagingType,
      discountCode,
      discountPercent,
      feesOther,
      notes,
      items,
      site,
      parcelWeightKg,
    } = parseResult.data;

    const input: CreateOrderInput = {
      orderNumber,
      customerName: customerName || 'Client inconnu',
      date: date ? new Date(date) : new Date(),
      totalAmount: totalAmount || 0,
      status: status as any, // Cast to any to avoid strict Enum mismatch for now
      source,
      email,
      shippingCarrier,
      trackingNumber,
      shippingCost: shippingCost || 0,
      packagingType,
      discountCode,
      discountPercent: discountPercent || 0,
      feesOther: feesOther || 0,
      notes,
      site,
      parcelWeightGrams: parcelWeightKg,
    };

    // 1. Create Draft Order
    const order = await OrderService.createDraftOrder('org-1', input);

    // 2. Add Items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemType = item.type as 'RECIPE' | 'PACK' | 'ACCESSORY' | 'CUSTOM';

        await OrderService.addItemToOrder('org-1', order.id, {
          type: itemType,
          recipeId: item.recipeId || undefined,
          packId: item.packId || undefined,
          ingredientId: item.ingredientId || undefined,
          customItems: item.customItems || undefined,
          format: (item.format || undefined) as any,
          quantity: item.quantity,
          unitPrice: item.unitPrice || undefined,
        });
      }
    }

    // 3. Apply the correct status if it's not Draft
    if (status && status !== 'DRAFT') {
      await OrderService.updateOrder('org-1', order.id, { status: status as any });
    }

    return NextResponse.json({ success: true, data: { id: order.id } });
  } catch (error: any) {
    console.error('[API] Failed to create order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create order',
        code:
          error.name === 'PrismaClientValidationError'
            ? 'PRISMA_VALIDATION_ERROR'
            : 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
