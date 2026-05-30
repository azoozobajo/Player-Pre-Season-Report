import { supabase } from '../lib/supabase'
import { type Program, type ProgramGroup } from '../types'

export const programsService = {
  async getPrograms(): Promise<Program[]> {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getProgram(id: string): Promise<Program | null> {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createProgram(programData: Omit<Program, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Program> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('programs')
      .insert({ ...programData, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateProgram(id: string, updates: Partial<Program>): Promise<Program> {
    const { data, error } = await supabase
      .from('programs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteProgram(id: string): Promise<void> {
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getProgramGroups(programId: string): Promise<ProgramGroup[]> {
    const { data, error } = await supabase
      .from('program_groups')
      .select('*')
      .eq('program_id', programId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async createGroup(groupData: Omit<ProgramGroup, 'id' | 'created_at'>): Promise<ProgramGroup> {
    const { data, error } = await supabase
      .from('program_groups')
      .insert(groupData)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateGroup(id: string, updates: Partial<ProgramGroup>): Promise<ProgramGroup> {
    const { data, error } = await supabase
      .from('program_groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteGroup(id: string): Promise<void> {
    const { error } = await supabase
      .from('program_groups')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
