'use server'

import { revalidatePath } from 'next/cache'
import { PackService } from '@/services/pack-service'

export async function createPackAction(prevState: any, formData: FormData) {
    const name = formData.get('name') as string
    if (!name) return { error: 'Name Required' }

    try {
        const pack = await PackService.createPack('org-1', { name })
        revalidatePath('/catalogue/packs')
        return { success: true, packId: pack.id }
    } catch (e) {
        return { error: 'Failed to create' }
    }
}

export async function savePackFullAction(packId: string, prevState: any, formData: FormData) {
    const jsonString = formData.get('data') as string;
    if (!jsonString) return { error: 'No data' };

    const data = JSON.parse(jsonString);

    try {
        await PackService.updatePackFull('org-1', packId, data);
        revalidatePath('/catalogue/packs');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to save' };
    }

}

export async function deletePackAction(id: string) {
    try {
        const success = await PackService.deletePack('org-1', id);
        if (!success) return { error: 'Pack not found' };
        revalidatePath('/catalogue/packs');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete' };
    }
}
