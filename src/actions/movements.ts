'use server'

import { revalidatePath } from 'next/cache'
import { InventoryService } from '@/services/inventory-service'
import { MovementType } from '@/types/inventory'

export async function createMovementAction(prevState: any, formData: FormData) {
    const ingredientId = formData.get('ingredientId') as string
    const typeStr = formData.get('type') as string
    const quantity = parseFloat(formData.get('quantity') as string)
    const unitPrice = parseFloat(formData.get('unitPrice') as string) || undefined
    const reason = formData.get('reason') as string
    const notes = formData.get('notes') as string

    if (!ingredientId || !typeStr || isNaN(quantity)) {
        return { error: 'Missing required fields' }
    }

    try {
        const type = typeStr as MovementType

        // Fetch ingredient to determine category for price conversion
        const ingredient = await InventoryService.getIngredientById(ingredientId)
        if (!ingredient) {
            return { error: 'Ingredient not found' }
        }
        // Determine delta sign based on movement type
        let delta = Math.abs(quantity)
        if (
            type === MovementType.SALE ||
            type === MovementType.LOSS ||
            type === MovementType.PRODUCTION
        ) {
            delta = -delta
        }

        // For Adjustment, trust the user's signed input
        if (type === MovementType.ADJUSTMENT) {
            delta = quantity; // User enters +5 or -5
        }

        // Convert price based on category:
        // - Ingredients: price is in €/kg, convert to €/g (divide by 1000)
        // - Packaging/Accessories: price is already in €/unit, no conversion needed
        const isPerUnit = ingredient.category === 'Packaging' || ingredient.category === 'Accessoire'
        const pricePerGram = unitPrice !== undefined
            ? (isPerUnit ? unitPrice : unitPrice / 1000)
            : undefined

        await InventoryService.addMovement(
            'org-1',
            ingredientId,
            type,
            delta,
            pricePerGram,  // Correctly converted (or not) based on category
            reason + (notes ? ` - ${notes}` : '')
        )
        revalidatePath('/stock-movements')
        revalidatePath('/inventory')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to create movement' }
    }
}
