import { supabase } from '../lib/supabase'
import { type BodyCompositionRecord } from '../types'

export const bodyCompositionService = {
  async getRecords(playerId: string, programId: string): Promise<BodyCompositionRecord[]> {
    const { data, error } = await supabase
      .from('body_composition_records')
      .select('*')
      .eq('player_id', playerId)
      .eq('program_id', programId)
      .order('measurement_date', { ascending: true })
    if (error) throw error
    return data || []
  },

  async createRecord(recordData: Omit<BodyCompositionRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<BodyCompositionRecord> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('body_composition_records')
      .insert({ ...recordData, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateRecord(id: string, updates: Partial<BodyCompositionRecord>): Promise<BodyCompositionRecord> {
    const { data, error } = await supabase
      .from('body_composition_records')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteRecord(id: string): Promise<void> {
    const { error } = await supabase.from('body_composition_records').delete().eq('id', id)
    if (error) throw error
  },
}
