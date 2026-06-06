import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { indicatorsService } from '../../services/indicatorsService'
import { categoriesService } from '../../services/categoriesService'
import { type Indicator, type IndicatorCategory, type IndicatorType, type IndicatorDirection } from '../../types'
import { Plus, Edit, Trash2, BarChart3, Target, ChevronDown, ChevronUp, Tag } from 'lucide-react'

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

const PRESET_COLORS = ['#e74c3c', '#16a085', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#e67e22', '#1abc9c', '#34495e', '#e91e63']

export function IndicatorsPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [categories, setCategories] = useState<IndicatorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null)
  const [form, setForm] = useState(emptyIndicator)
  const [saving, setSaving] = useState(false)
  const [categoriesExpanded, setCategoriesExpanded] = useState(false)

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<IndicatorCategory | null>(null)
  const [catForm, setCatForm] = useState({ name_ar: '', name: '', color: '#3498db', sort_order: 10 })

  // Confirmations
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; indicator: Indicator | null }>({ open: false, indicator: null })
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<{ open: boolean; cat: IndicatorCategory | null }>({ open: false, cat: null })
  const [confirmSaveCat, setConfirmSaveCat] = useState(false)

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

  // Indicator CRUD
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

  const handleSaveClick = () => { setConfirmSave(true) }

  const doSave = async () => {
    setSaving(true)
    setConfirmSave(false)
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

  const handleDeleteClick = (ind: Indicator) => { setConfirmDelete({ open: true, indicator: ind }) }

  const doDelete = async () => {
    if (!confirmDelete.indicator) return
    setSaving(true)
    try {
      await indicatorsService.deleteIndicator(confirmDelete.indicator.id)
      await loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
    setConfirmDelete({ open: false, indicator: null })
  }

  // Category CRUD
  const openCatCreate = () => {
    setEditingCat(null)
    setCatForm({ name_ar: '', name: '', color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)], sort_order: categories.length + 1 })
    setCatModalOpen(true)
  }
  const openCatEdit = (cat: IndicatorCategory) => {
    setEditingCat(cat)
    setCatForm({ name_ar: cat.name_ar || '', name: cat.name, color: cat.color || '#3498db', sort_order: cat.sort_order })
    setCatModalOpen(true)
  }

  const handleCatSaveClick = () => { setConfirmSaveCat(true) }

  const doSaveCat = async () => {
    setSaving(true)
    setConfirmSaveCat(false)
    try {
      if (editingCat) {
        await categoriesService.updateCategory(editingCat.id, catForm)
      } else {
        await categoriesService.createCategory(catForm)
      }
      setCatModalOpen(false)
      await loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleCatDeleteClick = (cat: IndicatorCategory) => { setConfirmDeleteCat({ open: true, cat }) }

  const doDeleteCat = async () => {
    if (!confirmDeleteCat.cat) return
    setSaving(true)
    try {
      await categoriesService.deleteCategory(confirmDeleteCat.cat.id)
      await loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
    setConfirmDeleteCat({ open: false, cat: null })
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
        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(ind)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
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

        {/* Category Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setCategoriesExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#0f2040]" />
              إدارة الأقسام ({categories.length})
            </div>
            {categoriesExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {categoriesExpanded && (
            <div className="border-t border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">يمكنك إضافة أقسام مخصصة حسب احتياجك</p>
                <Button variant="outline" size="sm" onClick={openCatCreate}>
                  <Plus className="w-3 h-3" /> قسم جديد
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#6b7280' }} />
                      <span className="text-sm font-medium text-gray-800">{cat.name_ar || cat.name}</span>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={() => openCatEdit(cat)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                        <Edit className="w-3 h-3 text-gray-500" />
                      </button>
                      <button onClick={() => handleCatDeleteClick(cat)} className="p-1 rounded hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Indicator Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingIndicator ? 'تعديل المؤشر' : 'مؤشر جديد'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم (عربي) *" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="مثال: السرعة" />
            <Input label="الاسم (إنجليزي)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Speed" />
          </div>
          <Select label="القسم" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
            <option value="">بدون قسم</option>
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
            <Button onClick={handleSaveClick} loading={saving} disabled={!form.name_ar && !form.name}>
              {editingIndicator ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title={editingCat ? 'تعديل القسم' : 'قسم جديد'}>
        <div className="space-y-4">
          <Input label="اسم القسم (عربي) *" value={catForm.name_ar} onChange={e => setCatForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="مثال: البيومكانيكا" />
          <Input label="اسم القسم (إنجليزي)" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Biomechanics" />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">اللون</label>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setCatForm(f => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-full transition-transform ${catForm.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={catForm.color}
                onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))}
                className="w-8 h-8 rounded-full cursor-pointer border border-gray-300"
                title="لون مخصص"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCatModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleCatSaveClick} loading={saving} disabled={!catForm.name_ar}>
              {editingCat ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm: delete indicator */}
      <ConfirmModal
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, indicator: null })}
        onConfirm={doDelete}
        title="حذف المؤشر"
        message={`هل أنت متأكد من حذف مؤشر "${confirmDelete.indicator?.name_ar || confirmDelete.indicator?.name}"؟ لا يمكن التراجع.`}
        confirmLabel="حذف"
        variant="danger"
        loading={saving}
      />

      {/* Confirm: save indicator */}
      <ConfirmModal
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title={editingIndicator ? 'تأكيد التعديل' : 'تأكيد الإضافة'}
        message={editingIndicator
          ? `هل أنت متأكد من حفظ التغييرات على "${editingIndicator.name_ar || editingIndicator.name}"؟`
          : `هل أنت متأكد من إضافة مؤشر "${form.name_ar || form.name}"؟`
        }
        confirmLabel={editingIndicator ? 'حفظ التعديلات' : 'إضافة'}
        variant="warning"
        loading={saving}
      />

      {/* Confirm: delete category */}
      <ConfirmModal
        open={confirmDeleteCat.open}
        onClose={() => setConfirmDeleteCat({ open: false, cat: null })}
        onConfirm={doDeleteCat}
        title="حذف القسم"
        message={`هل أنت متأكد من حذف قسم "${confirmDeleteCat.cat?.name_ar}"؟ المؤشرات المرتبطة به ستصبح بدون قسم.`}
        confirmLabel="حذف"
        variant="danger"
        loading={saving}
      />

      {/* Confirm: save category */}
      <ConfirmModal
        open={confirmSaveCat}
        onClose={() => setConfirmSaveCat(false)}
        onConfirm={doSaveCat}
        title={editingCat ? 'تأكيد تعديل القسم' : 'تأكيد إضافة القسم'}
        message={editingCat
          ? `هل أنت متأكد من حفظ التغييرات على قسم "${editingCat.name_ar}"؟`
          : `هل أنت متأكد من إضافة قسم "${catForm.name_ar}"؟`
        }
        confirmLabel={editingCat ? 'حفظ' : 'إضافة'}
        variant="warning"
        loading={saving}
      />
    </AppLayout>
  )
}
