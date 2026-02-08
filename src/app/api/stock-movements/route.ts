import { NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory-service';
import { MovementType } from '@/types/inventory';

import { createStockMovementSchema } from '@/lib/zod-schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parseResult = createStockMovementSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
    }

    const { ingredientId, type, quantity, unitPrice, reason, notes } = parseResult.data; // quantity is already number > 0 from schema

    // Fetch ingredient to determine category for price conversion
    const ingredient = await InventoryService.getIngredientById(ingredientId);
    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    const qtyNum = quantity;
    // Schema ensures > 0, so no need for isNaN check

    // Determine delta sign based on movement type
    let delta = Math.abs(qtyNum);
    if (
      type === MovementType.SALE ||
      type === MovementType.LOSS ||
      type === MovementType.PRODUCTION
    ) {
      delta = -delta;
    }

    // For Adjustment, trust the user's signed input
    if (type === MovementType.ADJUSTMENT) {
      delta = qtyNum;
    }

    // Convert price based on category:
    // - Ingredients: price is in €/kg, convert to €/g (divide by 1000)
    // - Packaging/Accessories: price is already in €/unit, no conversion needed
    const isPerUnit = ingredient.category === 'Packaging' || ingredient.category === 'Accessoire';
    const pricePerGram =
      unitPrice !== undefined && unitPrice !== null
        ? isPerUnit
          ? Number(unitPrice)
          : Number(unitPrice) / 1000
        : undefined;

    await InventoryService.addMovement(
      'org-1',
      ingredientId,
      type,
      delta,
      pricePerGram,
      reason + (notes ? ` - ${notes}` : '')
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to create movement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
