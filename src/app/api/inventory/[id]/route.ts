import { NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory-service';
import { updateIngredientSchema } from '@/lib/zod-schemas';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await request.json();
    const parse = updateIngredientSchema.safeParse(json);

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
      alertThreshold,
      notes,
      subtype,
      dimensions,
      capacity,
      currentStock,
      weightedAverageCost,
    } = parse.data;

    const updated = await InventoryService.updateIngredient('org-1', id, {
      name: name ?? undefined,
      category: category ?? undefined,
      supplierId: supplierId === 'NO_SUPPLIER' ? undefined : (supplierId ?? undefined),
      supplierUrl: supplierUrl ?? undefined,
      alertThreshold: alertThreshold ?? undefined,
      notes: notes ?? undefined,
      subtype: subtype ?? undefined,
      dimensions: dimensions ?? undefined,
      capacity: capacity ?? undefined,
      initialStock: currentStock ?? undefined,
      initialCost: weightedAverageCost ?? undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[API] Failed to update ingredient:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await InventoryService.deleteIngredient('org-1', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to delete ingredient:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
