'use server'

import { revalidatePath } from 'next/cache'
import { SupplierService } from '@/services/supplier-service'

export async function createSupplierAction(prevState: any, formData: FormData) {
    const name = formData.get('name') as string

    if (!name) return { error: 'Name Required' }

    try {
        await SupplierService.createSupplier({
            name,
            contactEmail: formData.get('contactEmail') as string,
            contactPhone: formData.get('contactPhone') as string,
            website: formData.get('website') as string,
            leadTime: Number(formData.get('leadTime')) || undefined, // undefined if 0/NaN? Handle carefully
            defaultConditioning: formData.get('defaultConditioning') as string,
            notes: formData.get('notes') as string,
            status: 'ACTIVE'
        })
        revalidatePath('/suppliers') // TODO: Check route
        return { success: true }
    } catch (e) {
        return { error: 'Failed to create' }
    }
}

export async function updateSupplierAction(id: string, prevState: any, formData: FormData) {
    const name = formData.get('name') as string

    try {
        await SupplierService.updateSupplier(id, {
            name,
            contactEmail: formData.get('contactEmail') as string,
            contactPhone: formData.get('contactPhone') as string,
            website: formData.get('website') as string,
            leadTime: Number(formData.get('leadTime')) || 0,
            defaultConditioning: formData.get('defaultConditioning') as string,
            notes: formData.get('notes') as string,
        })
        revalidatePath('/suppliers')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to update' }
    }
}

export async function deleteSupplierAction(id: string) {
    try {
        await SupplierService.deleteSupplier(id)
        revalidatePath('/suppliers')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to delete' }
    }
}
