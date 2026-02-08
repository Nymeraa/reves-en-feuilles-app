import { SettingsService } from '@/services/settings-service'
import SettingsClientPage from './client-page'

export default async function SettingsPage() {
    const settings = await SettingsService.getSettings()

    return <SettingsClientPage settings={settings} />
}
