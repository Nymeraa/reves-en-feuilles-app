'use server'

import { SettingsService } from '@/services/settings-service'
import { AppSettings } from '@/types/settings'
import { revalidatePath } from 'next/cache'

export async function updateSettingsAction(formData: FormData) {
    const rawData: Partial<AppSettings> = {
        urssafRate: Number(formData.get('urssafRate')),
        shopifyTransactionPercent: Number(formData.get('shopifyTransactionPercent')),
        shopifyFixedFee: Number(formData.get('shopifyFixedFee')),
        defaultOtherFees: Number(formData.get('defaultOtherFees')),
        tvaIngredients: Number(formData.get('tvaIngredients')),
        tvaPackaging: Number(formData.get('tvaPackaging')),
    }

    await SettingsService.updateSettings(rawData)
    revalidatePath('/settings')
    return { success: true }
}
