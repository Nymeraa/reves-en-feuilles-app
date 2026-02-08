import { NextResponse } from 'next/server';
import { SupplierService } from '@/services/supplier-service';

import { createSupplierSchema } from '@/lib/zod-schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parseResult = createSupplierSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
    }

    const { name, contactEmail, contactPhone, website, leadTime, defaultConditioning, notes } =
      parseResult.data;

    const newSupplier = await SupplierService.createSupplier('org-1', {
      name,
      contactEmail,
      contactPhone,
      website,
      leadTime,
      defaultConditioning,
      notes,
    });

    return NextResponse.json({ success: true, data: newSupplier });
  } catch (error) {
    console.error('[API] Failed to create supplier:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
