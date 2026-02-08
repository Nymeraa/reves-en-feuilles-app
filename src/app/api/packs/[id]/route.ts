import { NextResponse } from 'next/server';
import { PackService } from '@/services/pack-service';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, price, recipes, packaging } = body;

    await PackService.updatePackFull('org-1', id, {
      name,
      description: description || '',
      status,
      price: parseFloat(price) || 0,
      recipes: recipes || [],
      packaging: packaging || [],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to update pack:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = await PackService.deletePack('org-1', id);
    if (!success) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to delete pack:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
