import { NextResponse } from 'next/server';
import { SupplierService } from '@/services/supplier-service';

import { updateSupplierSchema } from '@/lib/zod-schemas';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parseResult = updateSupplierSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
    }

    const { name, contactEmail, contactPhone, website, leadTime, defaultConditioning, notes } =
      parseResult.data;

    const updated = await SupplierService.updateSupplier('org-1', id, {
      name,
      contactEmail,
      contactPhone,
      website,
      leadTime,
      defaultConditioning,
      notes,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[API] Failed to update supplier:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await SupplierService.deleteSupplier('org-1', id);
    if (!result) {
      return NextResponse.json({ error: 'Not found or in use' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to delete supplier:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
