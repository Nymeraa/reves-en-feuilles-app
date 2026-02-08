import { AppSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { db } from '@/lib/db';

export const SettingsService = {
  async getSettings(orgId?: string): Promise<AppSettings> {
    // Settings are singleton "global" usually, or per org?
    // Current DB-JSON implementation uses 'settings.json' which is a single object.
    // DB-SQL uses keys.
    // Our types say 'settings' entity.
    // getById('settings', 'global') ?

    try {
      const settings = await db.getById<AppSettings>('settings', 'global', orgId);
      return { ...DEFAULT_SETTINGS, ...(settings || {}) };
    } catch (e) {
      // If table doesn't exist or empty
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(newSettings: Partial<AppSettings>, orgId?: string): Promise<AppSettings> {
    const current = await this.getSettings(orgId);
    const updated = { ...current, ...newSettings, id: 'global' }; // Ensure ID
    await db.upsert('settings', updated, orgId);
    return updated;
  },
};
