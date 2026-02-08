import { NextResponse } from 'next/server';
import { SettingsService } from '@/services/settings-service';
import { AppSettings } from '@/types/settings';

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // Simple validation/sanitization (could use Zod but minimal schema needed)
    const rawData: Partial<AppSettings> = {
      urssafRate: Number(body.urssafRate),
      shopifyTransactionPercent: Number(body.shopifyTransactionPercent),
      shopifyFixedFee: Number(body.shopifyFixedFee),
      defaultOtherFees: Number(body.defaultOtherFees),
      tvaIngredients: Number(body.tvaIngredients),
      tvaPackaging: Number(body.tvaPackaging),
    };

    await SettingsService.updateSettings(rawData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to update settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
