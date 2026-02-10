import { NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory-service';
import { createIngredientSchema, updateIngredientSchema } from '@/lib/zod-schemas';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parse = createIngredientSchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      name,
      category,
      supplierId,
      supplierUrl,
      initialStock,
      initialCost,
      alertThreshold,
      notes,
      subtype,
      dimensions,
      capacity,
    } = parse.data;

    const newIngredient = await InventoryService.createIngredient('org-1', {
      name,
      category: category ?? undefined,
      supplierId: supplierId === 'NO_SUPPLIER' ? undefined : (supplierId ?? undefined),
      supplierUrl: supplierUrl ?? undefined,
      initialStock: initialStock,
      initialCost: initialCost,
      alertThreshold: alertThreshold ?? undefined,
      notes: notes ?? undefined,
      subtype: subtype ?? undefined,
      dimensions: dimensions ?? undefined,
      capacity: capacity ?? undefined,
    });

    return NextResponse.json({ success: true, data: newIngredient });
  } catch (error: any) {
    console.error('[API] Failed to create ingredient:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create ingredient',
        code:
          error.name === 'PrismaClientValidationError'
            ? 'PRISMA_VALIDATION_ERROR'
            : 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
