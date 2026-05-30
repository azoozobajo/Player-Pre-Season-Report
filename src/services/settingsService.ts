import { supabase } from '../lib/supabase'
import { type AppSettings } from '../types'

export const settingsService = {
  async getSettings(): Promise<AppSettings | null> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', user?.id)
      .single()
    return data
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ ...settings, user_id: user?.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
