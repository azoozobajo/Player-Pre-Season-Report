import { supabase } from '../lib/supabase'
import { type Indicator } from '../types'

export const indicatorsService = {
  async getIndicators(programId?: string): Promise<Indicator[]> {
    let query = supabase
      .from('indicators')
      .select('*, category:indicator_categories(*)')
      .order('sort_order')

    if (programId) {
      query = query.or(`program_id.eq.${programId},program_id.is.null`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async createIndicator(indicatorData: Omit<Indicator, 'id' | 'user_id' | 'created_at' | 'category'>): Promise<Indicator> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('indicators')
      .insert({ ...indicatorData, user_id: user?.id })
      .select('*, category:indicator_categories(*)')
      .single()
    if (error) throw error
    return data
  },

  async updateIndicator(id: string, updates: Partial<Indicator>): Promise<Indicator> {
    const { category: _cat, ...rest } = updates as Indicator
    const { data, error } = await supabase
      .from('indicators')
      .update(rest)
      .eq('id', id)
      .select('*, category:indicator_categories(*)')
      .single()
    if (error) throw error
    return data
  },

  async deleteIndicator(id: string): Promise<void> {
    const { error } = await supabase.from('indicators').delete().eq('id', id)
    if (error) throw error
  },
}
