import { supabase } from '../lib/supabase'
import { type IndicatorCategory } from '../types'

export const categoriesService = {
  async getCategories(): Promise<IndicatorCategory[]> {
    const { data, error } = await supabase
      .from('indicator_categories')
      .select('*')
      .order('sort_order')
    if (error) throw error
    return data || []
  },

  async createCategory(categoryData: Omit<IndicatorCategory, 'id' | 'user_id' | 'created_at'>): Promise<IndicatorCategory> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('indicator_categories')
      .insert({ ...categoryData, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateCategory(id: string, updates: Partial<IndicatorCategory>): Promise<IndicatorCategory> {
    const { data, error } = await supabase
      .from('indicator_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from('indicator_categories').delete().eq('id', id)
    if (error) throw error
  },
}
