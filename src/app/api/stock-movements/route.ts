import { NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory-service';
import { MovementType, MovementSource, EntityType } from '@/types/inventory';
import { prisma } from '@/lib/db-sql';
import { createStockMovementSchema } from '@/lib/zod-schemas';

export async function GET() {
  const organizationId = 'org-1'; // Fallback to current convention
  try {
    const count = await prisma.stockMovement.count({
      where: { organizationId },
    });

    const data = await prisma.stockMovement.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        ingredient: true,
        order: true,
      },
    });

    console.log(`[API GET] StockMovements - orgId: ${organizationId}, count: ${count}`);

    return NextResponse.json(
      { success: true, count, data },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[API GET] Failed to fetch movements:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parseResult = createStockMovementSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
    }

    const { ingredientId, type, quantity, unitPrice, reason, notes, source, sourceId } =
      parseResult.data;

    // Observability: Log unknown keys for production debugging
    const knownKeys = [
      'ingredientId',
      'type',
      'quantity',
      'unitPrice',
      'reason',
      'notes',
      'source',
      'sourceId',
    ];
    const unknownKeys = Object.keys(body).filter((key) => !knownKeys.includes(key));
    if (unknownKeys.length > 0) {
      console.warn(`[API] Received unknown keys in StockMovement: ${unknownKeys.join(', ')}`);
    }

    // Fetch ingredient to determine category for price conversion
    const ingredient = await InventoryService.getIngredientById(ingredientId);
    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    // Rule: PURCHASE type usually requires a unitPrice
    if (type === MovementType.PURCHASE && (unitPrice === null || unitPrice === undefined)) {
      return NextResponse.json({ error: 'Unit price is required for purchases' }, { status: 400 });
    }

    const qtyNum = quantity;

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

    // Map category to EntityType for audit purposes
    let entityType = EntityType.INGREDIENT;
    if (ingredient.category === 'Packaging') entityType = EntityType.PACKAGING;
    if (ingredient.category === 'Accessoire') entityType = EntityType.ACCESSORY;

    await InventoryService.addMovement(
      'org-1',
      ingredientId,
      type,
      delta,
      pricePerGram,
      reason + (notes ? ` - ${notes}` : ''),
      entityType,
      (source as MovementSource) || MovementSource.MANUAL,
      sourceId || undefined
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
