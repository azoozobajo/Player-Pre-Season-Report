import { supabase } from '../lib/supabase'
import { type CoachNote, type Recommendation } from '../types'

export const notesService = {
  async getCoachNotes(playerId: string, programId: string): Promise<CoachNote[]> {
    const { data, error } = await supabase
      .from('coach_notes')
      .select('*, coach:coaches(*)')
      .eq('player_id', playerId)
      .eq('program_id', programId)
      .order('note_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createCoachNote(noteData: Omit<CoachNote, 'id' | 'user_id' | 'created_at' | 'coach'>): Promise<CoachNote> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('coach_notes')
      .insert({ ...noteData, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteCoachNote(id: string): Promise<void> {
    const { error } = await supabase.from('coach_notes').delete().eq('id', id)
    if (error) throw error
  },

  async getRecommendations(playerId: string, programId: string): Promise<Recommendation[]> {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('player_id', playerId)
      .eq('program_id', programId)
      .order('recommendation_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createRecommendation(recData: Omit<Recommendation, 'id' | 'user_id' | 'created_at'>): Promise<Recommendation> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('recommendations')
      .insert({ ...recData, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateRecommendation(id: string, updates: Partial<Recommendation>): Promise<Recommendation> {
    const { data, error } = await supabase
      .from('recommendations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteRecommendation(id: string): Promise<void> {
    const { error } = await supabase.from('recommendations').delete().eq('id', id)
    if (error) throw error
  },
}
