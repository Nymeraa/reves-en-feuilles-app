import { NextResponse } from 'next/server';
import { PackService } from '@/services/pack-service';
import { PackStatus } from '@/types/pack';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, status, price, recipes, packaging } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name Required' }, { status: 400 });
    }

    // 1. Create Pack
    const newPack = await PackService.createPack('org-1', {
      name,
      description: description || '',
    });

    // 2. Update with full data if provided
    if (recipes || packaging || status || price !== undefined) {
      await PackService.updatePackFull('org-1', newPack.id, {
        name,
        description: description || '',
        status: status || PackStatus.DRAFT,
        price: parseFloat(price) || 0,
        recipes: recipes || [],
        packaging: packaging || [],
      });
    }

    return NextResponse.json({ success: true, data: { id: newPack.id } });
  } catch (error) {
    console.error('[API] Failed to create pack:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
