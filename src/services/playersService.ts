import { supabase } from '../lib/supabase'
import { type Player, type ProgramPlayer } from '../types'

export const playersService = {
  async getPlayers(): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('full_name')
    if (error) throw error
    return data || []
  },

  async getPlayer(id: string): Promise<Player | null> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createPlayer(playerData: Omit<Player, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Player> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('players')
      .insert({ ...playerData, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deletePlayer(id: string): Promise<void> {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) throw error
  },

  async getProgramPlayers(programId: string): Promise<ProgramPlayer[]> {
    const { data, error } = await supabase
      .from('program_players')
      .select('*, player:players(*), group:program_groups(*)')
      .eq('program_id', programId)
    if (error) throw error
    return data || []
  },

  async assignPlayerToProgram(assignData: Omit<ProgramPlayer, 'id' | 'created_at'>): Promise<ProgramPlayer> {
    const { data, error } = await supabase
      .from('program_players')
      .insert(assignData)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async removePlayerFromProgram(id: string): Promise<void> {
    const { error } = await supabase.from('program_players').delete().eq('id', id)
    if (error) throw error
  },
}
