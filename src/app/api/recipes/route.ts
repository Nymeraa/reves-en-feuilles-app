import { NextResponse } from 'next/server';
import { RecipeService } from '@/services/recipe-service';
import { RecipeStatus } from '@/types/recipe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, status, items, prices } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name Required' }, { status: 400 });
    }

    // 1. Create Recipe
    const newRecipe = await RecipeService.createRecipe('org-1', {
      name,
      description,
      status: RecipeStatus.DRAFT, // Start as draft
    });

    // 2. Update with full data (items, prices, status)
    if (items || prices || status) {
      await RecipeService.updateRecipeFull('org-1', newRecipe.id, {
        name,
        description: description || '',
        status: status || RecipeStatus.DRAFT,
        items: items || [],
        prices: prices || {},
      });
    }

    return NextResponse.json({ success: true, data: { id: newRecipe.id } });
  } catch (error) {
    console.error('[API] Failed to create recipe:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
