import { supabase } from '../lib/supabase'

const DEFAULT_CATEGORIES = [
  { name: 'Physical', name_ar: 'البدني', color: '#e74c3c', icon: 'activity', sort_order: 1 },
  { name: 'Technical', name_ar: 'التقني', color: '#3498db', icon: 'target', sort_order: 2 },
  { name: 'Tactical', name_ar: 'التكتيكي', color: '#2ecc71', icon: 'map', sort_order: 3 },
  { name: 'Mental', name_ar: 'الذهني', color: '#9b59b6', icon: 'brain', sort_order: 4 },
  { name: 'Medical', name_ar: 'الطبي', color: '#f39c12', icon: 'heart', sort_order: 5 },
]

export const categorySeedService = {
  async seedDefaultCategories(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing } = await supabase
      .from('indicator_categories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (existing && existing.length > 0) return

    const categories = DEFAULT_CATEGORIES.map(cat => ({ ...cat, user_id: user.id }))
    await supabase.from('indicator_categories').insert(categories)
  },
}
