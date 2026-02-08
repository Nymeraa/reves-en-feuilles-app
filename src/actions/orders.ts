'use server'

import { revalidatePath } from 'next/cache'
import { OrderService } from '@/services/order-service'
import { RecipeService } from '@/services/recipe-service'
import { CreateOrderInput } from '@/types/order'

export async function createFullOrderAction(formData: FormData) {
    try {
        const input: CreateOrderInput = {
            orderNumber: formData.get('orderNumber') as string,
            customerName: formData.get('customerName') as string || 'Client inconnu',
            date: new Date(formData.get('date') as string),
            totalAmount: parseFloat(formData.get('totalAmount') as string) || 0,
            status: formData.get('status') as any,

            source: formData.get('source') as string,
            email: formData.get('email') as string,
            shippingCarrier: formData.get('shippingCarrier') as string,
            trackingNumber: formData.get('trackingNumber') as string,
            shippingCost: parseFloat(formData.get('shippingCost') as string),
            packagingType: formData.get('packagingType') as string,
            discountCode: formData.get('discountCode') as string,
            discountPercent: parseFloat(formData.get('discountPercent') as string),
            otherFees: parseFloat(formData.get('otherFees') as string),
            notes: formData.get('notes') as string
        }

        // Create Header
        const order = await OrderService.createDraftOrder('org-1', input)
        // Note: createDraftOrder in service NOW always creates as DRAFT.
        // We rely on updateOrder or manual handling to Confirm if needed.

        // Items
        const itemsJson = formData.get('items') as string
        if (itemsJson) {
            const items = JSON.parse(itemsJson)
            for (const item of items) {
                if (!item.recipeId && !item.packId && !item.ingredientId) continue

                // Determine Type based on fields present or explicit type if sent
                // The UI should send 'type'.
                // If implied:
                let type: 'RECIPE' | 'PACK' | 'ACCESSORY' = 'RECIPE';
                if (item.type) type = item.type;
                else if (item.packId) type = 'PACK';
                else if (item.ingredientId) type = 'ACCESSORY';

                await OrderService.addItemToOrder('org-1', order.id, {
                    type,
                    recipeId: item.recipeId,
                    packId: item.packId,
                    ingredientId: item.ingredientId,
                    format: item.format,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice // Pass explicit price if needed
                })
            }
        }

        // Final Confirm Calculation (if Status was PAID)
        // Since createDraftOrder initializes as DRAFT, we must now transition to PAID if requested.
        if (input.status === 'PAID') {
            await OrderService.confirmOrder('org-1', order.id);
        }

        revalidatePath('/orders')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to create order' }
    }
}

export async function updateOrderAction(orderId: string, formData: FormData) {
    try {
        const input: CreateOrderInput = {
            orderNumber: formData.get('orderNumber') as string,
            customerName: formData.get('customerName') as string,
            date: new Date(formData.get('date') as string),
            totalAmount: parseFloat(formData.get('totalAmount') as string) || 0,
            status: formData.get('status') as any,

            source: formData.get('source') as string,
            email: formData.get('email') as string,
            shippingCarrier: formData.get('shippingCarrier') as string,
            trackingNumber: formData.get('trackingNumber') as string,
            shippingCost: parseFloat(formData.get('shippingCost') as string),
            shippingPrice: parseFloat(formData.get('shippingPrice') as string), // New field if needed, fallback to calc
            packagingType: formData.get('packagingType') as string,
            discountCode: formData.get('discountCode') as string,
            discountPercent: parseFloat(formData.get('discountPercent') as string),
            otherFees: parseFloat(formData.get('otherFees') as string),
            notes: formData.get('notes') as string
        }

        const itemsJson = formData.get('items') as string;
        let items = [];
        if (itemsJson) {
            items = JSON.parse(itemsJson);
        }

        await OrderService.updateOrder('org-1', orderId, input, items);

        revalidatePath('/orders')
        revalidatePath(`/orders/${orderId}`)
        return { success: true }
    } catch (e) {
        console.error(e);
        return { error: 'Failed to update order' }
    }
}

export async function deleteOrderAction(orderId: string) {
    try {
        await OrderService.deleteOrder('org-1', orderId);
        revalidatePath('/orders');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to delete order' };
    }
}
