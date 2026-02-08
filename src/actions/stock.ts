'use server'

import { revalidatePath } from 'next/cache'
import { InventoryService } from '@/services/inventory-service'
import { MovementType } from '@/types/inventory'

export async function addStockMovementAction(prevState: any, formData: FormData) {
    const ingredientId = formData.get('ingredientId') as string
    const type = formData.get('type') as MovementType
    const delta = parseFloat(formData.get('quantity') as string)
    const price = formData.get('price') ? parseFloat(formData.get('price') as string) : undefined
    const reason = formData.get('reason') as string

    if (!ingredientId || !type || isNaN(delta)) {
        return { error: 'Invalid Input' }
    }

    // Fetch ingredient to determine category
    const ingredient = await InventoryService.getIngredientById(ingredientId)
    if (!ingredient) {
        return { error: 'Ingredient not found' }
    }

    // Logic: For LOSS/USE, delta should be negative in DB, but user might input positive.
    // We handle sign based on type.
    let finalDelta = delta;
    if ((type === MovementType.LOSS || type === MovementType.PRODUCTION) && delta > 0) {
        finalDelta = -delta;
    }

    // Convert price based on category:
    // - Ingredients: price is in €/kg, convert to €/g (divide by 1000)
    // - Packaging/Accessories: price is already in €/unit, no conversion needed
    const isPerUnit = ingredient.category === 'Packaging' || ingredient.category === 'Accessoire'
    const pricePerGram = price !== undefined
        ? (isPerUnit ? price : price / 1000)
        : undefined;

    try {
        await InventoryService.addMovement('org-1', ingredientId, type, finalDelta, pricePerGram, reason)
        revalidatePath('/inventory')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to update stock' }
    }
}
