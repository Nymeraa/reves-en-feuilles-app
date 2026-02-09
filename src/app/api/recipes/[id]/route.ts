import { NextResponse } from 'next/server';
import { RecipeService } from '@/services/recipe-service';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, items, prices } = body;

    await RecipeService.updateRecipeFull('org-1', id, {
      name,
      description: description || '',
      status,
      items: items || [],
      prices: prices || {},
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Failed to update recipe:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update recipe',
        code:
          error.name === 'PrismaClientValidationError'
            ? 'PRISMA_VALIDATION_ERROR'
            : 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = await RecipeService.deleteRecipe('org-1', id);
    if (!success) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Failed to delete recipe:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete recipe',
        code:
          error.name === 'PrismaClientValidationError'
            ? 'PRISMA_VALIDATION_ERROR'
            : 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
