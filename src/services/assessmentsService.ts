import { supabase } from '../lib/supabase'
import { type AssessmentSession, type AssessmentResult, type SessionIndicator } from '../types'

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
      .select('*, indicator:indicators(*, category:indicator_categories(*)), session:assessment_sessions!inner(*)')
      .eq('player_id', playerId)
      .eq('session.program_id', programId)
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

  async getSessionIndicators(sessionId: string): Promise<SessionIndicator[]> {
    const { data, error } = await supabase
      .from('session_indicators')
      .select('*, indicator:indicators(*, category:indicator_categories(*))')
      .eq('session_id', sessionId)
      .order('created_at')
    if (error) throw error
    return data || []
  },

  async setSessionIndicators(sessionId: string, indicatorIds: string[]): Promise<void> {
    await supabase.from('session_indicators').delete().eq('session_id', sessionId)
    if (indicatorIds.length === 0) return
    const rows = indicatorIds.map(indicator_id => ({ session_id: sessionId, indicator_id }))
    const { error } = await supabase.from('session_indicators').insert(rows)
    if (error) throw error
  },

  async getPlayerSessionCount(playerId: string, programId: string): Promise<number> {
    const { data, error } = await supabase
      .from('assessment_results')
      .select('session_id, assessment_sessions!inner(program_id)')
      .eq('player_id', playerId)
      .eq('assessment_sessions.program_id', programId)
    if (error) return 0
    const uniqueSessions = new Set((data || []).map((r: { session_id: string }) => r.session_id))
    return uniqueSessions.size
  },
}
