'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation' // Not used in modal flow but good to have
import { RecipeService } from '@/services/recipe-service'
import { RecipeStatus } from '@/types/recipe'

export async function createRecipeAction(prevState: any, formData: FormData) {
    const name = formData.get('name') as string
    if (!name) return { error: 'Name Required' }

    try {
        const recipe = await RecipeService.createRecipe('org-1', { name })
        revalidatePath('/recipes')
        return { success: true, recipeId: recipe.id }
    } catch (e) {
        return { error: 'Failed to create' }
    }
}

export async function saveRecipeFullAction(recipeId: string, prevState: any, formData: FormData) {
    // We expect a JSON blob for complex data like items and prices, or we parse form fields
    // For simplicity with the Modal's client-side state, we might receive a JSON string
    const jsonString = formData.get('data') as string;
    if (!jsonString) return { error: 'No data' };

    const data = JSON.parse(jsonString);

    try {
        await RecipeService.updateRecipeFull('org-1', recipeId, {
            name: data.name,
            description: data.description,
            status: data.status,
            items: data.items,
            prices: data.prices
        });
        revalidatePath('/recipes');
    } catch (e) {
        return { error: 'Failed to save' };
    }
}

export async function duplicateRecipeAction(recipeId: string) {
    try {
        const recipe = await RecipeService.duplicateRecipe('org-1', recipeId);
        revalidatePath('/recipes');
        return { success: true, data: recipe };
    } catch (e) {
        return { error: 'Failed to duplicate' };
    }

}

export async function deleteRecipeAction(id: string) {
    try {
        const success = await RecipeService.deleteRecipe('org-1', id);
        if (!success) return { error: 'Recipe not found' };
        revalidatePath('/recipes');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete' };
    }
}
