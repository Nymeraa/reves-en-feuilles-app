
import { InventoryService } from '../src/services/inventory-service';
import { SettingsService } from '../src/services/settings-service';
import { DEFAULT_SETTINGS } from '../src/types/settings';

async function verifyTax() {
    console.log('--- Verification: Simulation Tax Status ---');

    // 1. Check Settings
    console.log('--- Settings ---');
    try {
        const settings = await SettingsService.getSettings();
        console.log('Current Settings:', JSON.stringify(settings, null, 2));
        console.log('Default Settings:', JSON.stringify(DEFAULT_SETTINGS, null, 2));

        const vatIng = 1 + (settings.tvaIngredients / 100);
        const vatPack = 1 + (settings.tvaPackaging / 100);
        console.log(`Multiplier Ingredient (5.5% expected): ${vatIng}`);
        console.log(`Multiplier Packaging (20% expected): ${vatPack}`);

        if (vatIng === 1 || vatPack === 1) {
            console.error('FAIL: VAT Multipliers are 1. Tax is NOT applied!');
        }

    } catch (error) {
        console.error('Failed to load settings:', error);
    }

    // 2. Check Ingredients (as before)
    const orgId = 'org-1';
    const ingredients = await InventoryService.getIngredients(orgId);

    // ... rest of checking code can stay or be simplified
}

verifyTax().catch(console.error);
