import { NextResponse } from 'next/server';
import { SupplierService } from '@/services/supplier-service';
import { createSupplierSchema } from '@/lib/zod-schemas';
import { nullToUndefinedDeep } from '@/lib/null-utils';

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    // Debug: Log null keys
    const nullKeys = Object.entries(rawBody)
      .filter(([_, v]) => v === null)
      .map(([k]) => k);

    if (nullKeys.length > 0) {
      console.log(`[API] Supplier creation: found null keys: ${nullKeys.join(', ')}`);
    }

    const body = nullToUndefinedDeep(rawBody);
    const parseResult = createSupplierSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('[API] Zod validation failed for supplier:', parseResult.error.format());
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

export async function GET() {
  try {
    const suppliers = await SupplierService.getSuppliers('org-1');
    return NextResponse.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('[API] Failed to fetch suppliers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
