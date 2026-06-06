import { supabase } from '../lib/supabase'
import { categoriesService } from './categoriesService'

const DEFAULT_CATEGORIES = [
  { name: 'Physical',  name_ar: 'البدني',    color: '#e74c3c', icon: 'activity', sort_order: 1 },
  { name: 'Fitness',   name_ar: 'اللياقي',   color: '#16a085', icon: 'zap',      sort_order: 2 },
  { name: 'Technical', name_ar: 'المهاري',   color: '#3498db', icon: 'target',   sort_order: 3 },
  { name: 'Tactical',  name_ar: 'التكتيكي',  color: '#2ecc71', icon: 'map',      sort_order: 4 },
  { name: 'Mental',    name_ar: 'الذهني',    color: '#9b59b6', icon: 'brain',    sort_order: 5 },
  { name: 'Medical',   name_ar: 'الطبي',     color: '#f39c12', icon: 'heart',    sort_order: 6 },
]

export const categorySeedService = {
  async seedDefaultCategories(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Step 1: Remove duplicates from DB
    await categoriesService.removeDuplicates()

    // Step 2: Fetch what's left (already deduped)
    const { data: existing } = await supabase
      .from('indicator_categories')
      .select('id, name, name_ar')
      .eq('user_id', user.id)

    const existingMap = new Map((existing || []).map(c => [c.name, c]))

    // Step 3: Insert missing default categories
    const toInsert = DEFAULT_CATEGORIES.filter(c => !existingMap.has(c.name))
    if (toInsert.length > 0) {
      await supabase.from('indicator_categories').insert(
        toInsert.map(c => ({ ...c, user_id: user.id }))
      )
    }

    // Step 4: Fix wrong Arabic names (التقني → المهاري, etc.)
    const renames: Record<string, string> = {
      Physical:  'البدني',
      Fitness:   'اللياقي',
      Technical: 'المهاري',
      Tactical:  'التكتيكي',
      Mental:    'الذهني',
      Medical:   'الطبي',
    }
    for (const [engName, correctAr] of Object.entries(renames)) {
      const row = existingMap.get(engName)
      if (row && row.name_ar !== correctAr) {
        await supabase
          .from('indicator_categories')
          .update({ name_ar: correctAr })
          .eq('id', row.id)
      }
    }
  },
}
