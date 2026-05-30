import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { indicatorsService } from '../../services/indicatorsService'
import { categoriesService } from '../../services/categoriesService'
import { type Indicator, type IndicatorCategory, type IndicatorType, type IndicatorDirection } from '../../types'
import { Plus, Edit, Trash2, BarChart3, Target } from 'lucide-react'

const TYPE_LABELS: Record<IndicatorType, string> = {
  numeric: 'رقمي',
  rating: 'تقييم (1-10)',
  text: 'نصي',
  choice: 'خيارات',
}

const DIR_LABELS: Record<IndicatorDirection, string> = {
  higher_better: 'الأعلى أفضل',
  lower_better: 'الأقل أفضل',
  neutral: 'محايد',
}

const emptyIndicator = {
  name: '', name_ar: '', category_id: '', type: 'numeric' as IndicatorType, direction: 'higher_better' as IndicatorDirection,
  unit: '', min_value: '', max_value: '', target_value: '', description: '', choices: '', is_active: true, sort_order: 0,
}

export function IndicatorsPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [categories, setCategories] = useState<IndicatorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null)
  const [form, setForm] = useState(emptyIndicator)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [ind, cats] = await Promise.all([
      indicatorsService.getIndicators().catch(() => []),
      categoriesService.getCategories().catch(() => []),
    ])
    setIndicators(ind)
    setCategories(cats)
    setLoading(false)
  }

  const grouped = categories.map(cat => ({
    category: cat,
    indicators: indicators.filter(i => i.category_id === cat.id),
  })).filter(g => g.indicators.length > 0)
  const uncategorized = indicators.filter(i => !i.category_id)

  const openCreate = () => { setEditingIndicator(null); setForm(emptyIndicator); setModalOpen(true) }
  const openEdit = (ind: Indicator) => {
    setEditingIndicator(ind)
    setForm({
      name: ind.name, name_ar: ind.name_ar || '', category_id: ind.category_id || '', type: ind.type,
      direction: ind.direction, unit: ind.unit || '', min_value: String(ind.min_value ?? ''), max_value: String(ind.max_value ?? ''),
      target_value: String(ind.target_value ?? ''), description: ind.description || '',
      choices: (ind.choices || []).join(', '), is_active: ind.is_active, sort_order: ind.sort_order,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        ...form,
        min_value: form.min_value ? parseFloat(form.min_value) : undefined,
        max_value: form.max_value ? parseFloat(form.max_value) : undefined,
        target_value: form.target_value ? parseFloat(form.target_value) : undefined,
        choices: form.choices ? form.choices.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        category_id: form.category_id || undefined,
      }
      if (editingIndicator) {
        await indicatorsService.updateIndicator(editingIndicator.id, data)
      } else {
        await indicatorsService.createIndicator(data as Omit<Indicator, 'id' | 'user_id' | 'created_at' | 'category'>)
      }
      setModalOpen(false)
      await loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المؤشر؟')) return
    await indicatorsService.deleteIndicator(id).catch(console.error)
    await loadData()
  }

  const renderIndicatorRow = (ind: Indicator) => (
    <div key={ind.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Target className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">{ind.name_ar || ind.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="info">{TYPE_LABELS[ind.type]}</Badge>
            <Badge variant="default">{DIR_LABELS[ind.direction]}</Badge>
            {ind.unit && <span className="text-xs text-gray-400">وحدة: {ind.unit}</span>}
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => openEdit(ind)}><Edit className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleDelete(ind.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
      </div>
    </div>
  )

  return (
    <AppLayout title="المؤشرات">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">إدارة المؤشرات ({indicators.length})</h2>
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4" /> مؤشر جديد</Button>
        </div>

        {loading ? (
          <LoadingSpinner message="جار تحميل المؤشرات..." />
        ) : indicators.length === 0 ? (
          <EmptyState
            title="لا توجد مؤشرات"
            description="قم بإنشاء مؤشرات التقييم للبرنامج"
            icon={<BarChart3 className="w-12 h-12" />}
            action={<Button onClick={openCreate} size="sm"><Plus className="w-4 h-4" /> إنشاء مؤشر</Button>}
          />
        ) : (
          <div className="space-y-4">
            {grouped.map(({ category, indicators: catInds }) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || '#6b7280' }} />
                  <h3 className="font-semibold text-gray-800">{category.name_ar || category.name}</h3>
                  <Badge variant="default">{catInds.length} مؤشر</Badge>
                </div>
                <div className="p-3 space-y-2">
                  {catInds.map(renderIndicatorRow)}
                </div>
              </div>
            ))}
            {uncategorized.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-800">غير مصنف</h3>
                </div>
                <div className="p-3 space-y-2">{uncategorized.map(renderIndicatorRow)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingIndicator ? 'تعديل المؤشر' : 'مؤشر جديد'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم (عربي) *" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="مثال: السرعة" />
            <Input label="الاسم (إنجليزي)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Speed" />
          </div>
          <Select label="الفئة" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
            <option value="">بدون فئة</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Select label="نوع المؤشر" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as IndicatorType }))}>
              <option value="numeric">رقمي</option>
              <option value="rating">تقييم (1-10)</option>
              <option value="text">نصي</option>
              <option value="choice">خيارات</option>
            </Select>
            <Select label="الاتجاه" value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as IndicatorDirection }))}>
              <option value="higher_better">الأعلى أفضل</option>
              <option value="lower_better">الأقل أفضل</option>
              <option value="neutral">محايد</option>
            </Select>
          </div>
          {form.type === 'numeric' && (
            <div className="grid grid-cols-3 gap-4">
              <Input label="الحد الأدنى" type="number" value={form.min_value} onChange={e => setForm(f => ({ ...f, min_value: e.target.value }))} />
              <Input label="الحد الأقصى" type="number" value={form.max_value} onChange={e => setForm(f => ({ ...f, max_value: e.target.value }))} />
              <Input label="القيمة المستهدفة" type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} />
            </div>
          )}
          {form.type === 'choice' && (
            <Input label="الخيارات (مفصولة بفاصلة)" value={form.choices} onChange={e => setForm(f => ({ ...f, choices: e.target.value }))} placeholder="ضعيف, متوسط, جيد, ممتاز" />
          )}
          <Input label="الوحدة" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="ثانية، متر، كجم..." />
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
            rows={2}
            placeholder="وصف المؤشر..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name_ar && !form.name}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
