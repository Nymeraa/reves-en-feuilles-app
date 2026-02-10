import { NextRequest, NextResponse } from 'next/server';
import { ImportService, ImportEntity } from '@/services/import-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await params;
    const body = await request.json();
    const { orgId = 'org-1', csvText, dryRun = false, upsert = true } = body;

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
