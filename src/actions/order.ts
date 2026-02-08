'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { OrderService } from '@/services/order-service'
import { RecipeFormat } from '@/types/recipe'

export async function createOrderAction(prevState: any, formData: FormData) {
    const customerName = formData.get('customerName') as string

    if (!customerName) return { error: 'Customer Name Required' }

    try {
        const order = await OrderService.createDraftOrder('org-1', { customerName })
        redirect(`/orders/${order.id}`)
    } catch (e) {
        if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
        return { error: 'Failed to create order' }
    }
}

export async function addOrderItemAction(orderId: string, prevState: any, formData: FormData) {
    const type = (formData.get('type') as 'RECIPE' | 'PACK') || 'RECIPE';
    const recipeId = formData.get('recipeId') as string;
    const packId = formData.get('packId') as string;
    const format = parseInt(formData.get('format') as string) as RecipeFormat;
    const quantity = parseInt(formData.get('quantity') as string);
    const unitPriceRaw = formData.get('unitPrice');
    const unitPrice = unitPriceRaw ? parseFloat(unitPriceRaw as string) : undefined;

    if (!quantity) return { error: 'Quantity Required' };
    if (type === 'RECIPE' && (!recipeId || !format)) return { error: 'Recipe & Format Required' };
    if (type === 'PACK' && !packId) return { error: 'Pack Required' };

    try {
        await OrderService.addItemToOrder('org-1', orderId, {
            type,
            recipeId,
            packId,
            format,
            quantity,
            unitPrice
        });
        revalidatePath(`/orders/${orderId}`);
        return { success: true };
    } catch (e) {
        return { error: 'Failed to add item' };
    }
}

// New Generic Update Action
export async function updateOrderFieldAction(orderId: string, field: string, value: any) {
    try {
        const order = await OrderService.getOrderById(orderId);
        if (!order) return { error: 'Not found' };

        const update: any = {};
        if (field === 'totalAmount') {
            update.totalAmount = parseFloat(value);
        }
        // Add other fields as needed

        await OrderService.updateOrder('org-1', orderId, update);
        revalidatePath(`/orders/${orderId}`);
        return { success: true };
    } catch (e) {
        return { error: 'Update failed' };
    }
}

export async function confirmOrderAction(orderId: string) {
    try {
        await OrderService.confirmOrder('org-1', orderId)
        revalidatePath(`/orders/${orderId}`)
        revalidatePath('/inventory') // Stock changed
        return { success: true }
    } catch (e) {
        return { error: 'Failed to confirm order' }
    }
}
