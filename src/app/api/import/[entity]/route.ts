import { NextRequest, NextResponse } from 'next/server';
import { ImportService, ImportEntity } from '@/services/import-service';

export async function POST(request: NextRequest, { params }: { params: { entity: string } }) {
  try {
    // START FIX: Direct access to params without Promise
    const { entity } = params;
    // END FIX

    const body = await request.json();
    const { orgId = 'org-1', csvText, dryRun = false, upsert = true } = body;

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity parameter is missing' },
        { status: 400 }
      );
    }

    if (!csvText) {
      return NextResponse.json({ success: false, error: 'csvText is required' }, { status: 400 });
    }

    // Validate entity type
    const validEntities: ImportEntity[] = [
      'ingredients',
      'recipes',
      'packs',
      'packaging',
      'accessories',
      'orders',
      'suppliers',
    ];

    if (!validEntities.includes(entity as ImportEntity)) {
      return NextResponse.json(
        { success: false, error: `Invalid entity type: ${entity}` },
        { status: 400 }
      );
    }

    const result = await ImportService.executeImport(orgId, entity as ImportEntity, csvText, {
      dryRun,
      upsert,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API] Import failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Optional fallback to avoid HTML 405/404
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
