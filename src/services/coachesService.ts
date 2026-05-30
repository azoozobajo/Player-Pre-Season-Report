import { supabase } from '../lib/supabase'
import { type Coach, type ProgramCoach } from '../types'

export const coachesService = {
  async getCoaches(): Promise<Coach[]> {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .order('full_name')
    if (error) throw error
    return data || []
  },

  async createCoach(coachData: Omit<Coach, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Coach> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('coaches')
      .insert({ ...coachData, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateCoach(id: string, updates: Partial<Coach>): Promise<Coach> {
    const { data, error } = await supabase
      .from('coaches')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteCoach(id: string): Promise<void> {
    const { error } = await supabase.from('coaches').delete().eq('id', id)
    if (error) throw error
  },

  async getProgramCoaches(programId: string): Promise<ProgramCoach[]> {
    const { data, error } = await supabase
      .from('program_coaches')
      .select('*, coach:coaches(*)')
      .eq('program_id', programId)
    if (error) throw error
    return data || []
  },

  async assignCoachToProgram(assignData: Omit<ProgramCoach, 'id' | 'created_at'>): Promise<ProgramCoach> {
    const { data, error } = await supabase
      .from('program_coaches')
      .insert(assignData)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async removeCoachFromProgram(id: string): Promise<void> {
    const { error } = await supabase.from('program_coaches').delete().eq('id', id)
    if (error) throw error
  },
}
