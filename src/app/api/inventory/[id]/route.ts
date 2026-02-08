import { NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory-service';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
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
      currentStock, // Special case for readonly/correction
      weightedAverageCost,
    } = body;

    const updated = await InventoryService.updateIngredient('org-1', id, {
      name,
      category,
      supplierId: supplierId === 'NO_SUPPLIER' ? undefined : supplierId,
      supplierUrl,
      alertThreshold: parseFloat(alertThreshold),
      notes,
      subtype,
      dimensions,
      capacity: parseFloat(capacity) || undefined,
      initialStock: currentStock !== undefined ? parseFloat(currentStock) : undefined,
      initialCost: weightedAverageCost !== undefined ? parseFloat(weightedAverageCost) : undefined,
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
