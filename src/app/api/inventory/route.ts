import { NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name Required' }, { status: 400 });
    }

    const newIngredient = await InventoryService.createIngredient('org-1', {
      name,
      category,
      supplierId: supplierId === 'NO_SUPPLIER' ? undefined : supplierId,
      supplierUrl,
      initialStock: parseFloat(initialStock) || 0,
      initialCost: parseFloat(initialCost) || 0,
      alertThreshold: parseFloat(alertThreshold) || 100,
      notes,
      subtype,
      dimensions,
      capacity: parseFloat(capacity) || undefined,
    });

    return NextResponse.json({ success: true, data: newIngredient });
  } catch (error) {
    console.error('[API] Failed to create ingredient:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
