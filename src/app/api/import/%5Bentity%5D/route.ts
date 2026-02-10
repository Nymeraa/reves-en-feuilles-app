import { NextRequest, NextResponse } from 'next/server';
import { ImportService, ImportEntity } from '@/services/import-service';

/**
 * Helper to extract entity from context.params, handling Next.js 15+ Promise requirements.
 */
async function getEntity(context: any): Promise<string | null> {
  if (!context || !context.params) return null;
  const p = context.params;
  const params = p instanceof Promise ? await p : p;
  return params?.entity || null;
}

export async function POST(request: NextRequest, context: any) {
  try {
    const entity = await getEntity(context);
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
