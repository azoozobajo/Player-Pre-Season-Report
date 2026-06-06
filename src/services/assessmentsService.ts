import { supabase } from '../lib/supabase'
import { type AssessmentSession, type AssessmentResult } from '../types'

export const assessmentsService = {
  async getSessions(programId: string): Promise<AssessmentSession[]> {
    const { data, error } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('program_id', programId)
      .order('session_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createSession(sessionData: Omit<AssessmentSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<AssessmentSession> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('assessment_sessions')
      .insert({ ...sessionData, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateSession(id: string, updates: Partial<AssessmentSession>): Promise<AssessmentSession> {
    const { data, error } = await supabase
      .from('assessment_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase.from('assessment_sessions').delete().eq('id', id)
    if (error) throw error
  },

  async getResults(sessionId: string): Promise<AssessmentResult[]> {
    const { data, error } = await supabase
      .from('assessment_results')
      .select('*, indicator:indicators(*, category:indicator_categories(*)), player:players(*)')
      .eq('session_id', sessionId)
    if (error) throw error
    return data || []
  },

  async getPlayerResults(playerId: string, programId: string): Promise<AssessmentResult[]> {
    const { data, error } = await supabase
      .from('assessment_results')
      .select('*, indicator:indicators(*, category:indicator_categories(*)), session:assessment_sessions(*)')
      .eq('player_id', playerId)
      .eq('assessment_sessions.program_id', programId)
    if (error) throw error
    return data || []
  },

  async saveResult(resultData: Omit<AssessmentResult, 'id' | 'created_at' | 'updated_at' | 'indicator' | 'player'>): Promise<AssessmentResult> {
    const { data, error } = await supabase
      .from('assessment_results')
      .upsert(resultData, { onConflict: 'session_id,player_id,indicator_id' })
      .select('*, indicator:indicators(*)')
      .single()
    if (error) throw error
    return data
  },

  async updateResult(id: string, updates: Partial<AssessmentResult>): Promise<AssessmentResult> {
    const { data, error } = await supabase
      .from('assessment_results')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteResult(id: string): Promise<void> {
    const { error } = await supabase.from('assessment_results').delete().eq('id', id)
    if (error) throw error
  },
}
