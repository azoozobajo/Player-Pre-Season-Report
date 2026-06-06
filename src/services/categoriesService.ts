import { supabase } from '../lib/supabase'
import { type IndicatorCategory } from '../types'

export const categoriesService = {
  async getCategories(): Promise<IndicatorCategory[]> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('indicator_categories')
      .select('*')
      .eq('user_id', user?.id)
      .order('sort_order')
    if (error) throw error

    // Deduplicate only by id — each row is unique by definition.
    // We no longer dedup by name since custom categories may have no English name (name='')
    // and that caused multiple custom categories to be hidden.
    // The removeDuplicates() called from Dashboard handles real DB duplicates safely.
    const seen = new Set<string>()
    return (data || []).filter(cat => {
      if (seen.has(cat.id)) return false
      seen.add(cat.id)
      return true
    })
  },

  async createCategory(categoryData: Omit<IndicatorCategory, 'id' | 'user_id' | 'created_at'>): Promise<IndicatorCategory> {
    const { data: { user } } = await supabase.auth.getUser()
    // If English name is empty, use Arabic name as fallback so removeDuplicates
    // won't collapse multiple custom categories under the same empty name key.
    const payload = {
      ...categoryData,
      name: categoryData.name?.trim() || categoryData.name_ar || '',
      user_id: user?.id,
    }
    const { data, error } = await supabase
      .from('indicator_categories')
      .insert(payload)
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

  // Hard cleanup: removes real duplicates from DB.
  // Only deduplicates rows where name is non-empty — custom categories with empty
  // names are left untouched to avoid deleting legitimate user-created categories.
  async removeDuplicates(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('indicator_categories')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (!data || data.length === 0) return

    const seen = new Map<string, string>() // name → id to keep
    const toDelete: string[] = []

    for (const row of data) {
      // Only dedup rows that have a meaningful (non-empty) name
      if (!row.name || row.name.trim() === '') continue
      if (seen.has(row.name)) {
        toDelete.push(row.id)
      } else {
        seen.set(row.name, row.id)
      }
    }

    if (toDelete.length > 0) {
      await supabase.from('indicator_categories').delete().in('id', toDelete)
    }
  },
}
