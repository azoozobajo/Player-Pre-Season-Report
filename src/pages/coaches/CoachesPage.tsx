import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { coachesService } from '../../services/coachesService'
import { type Coach } from '../../types'
import { Plus, Edit, Trash2, UserCog } from 'lucide-react'

const emptyCoach = { full_name: '', specialization: '', phone: '', email: '', notes: '', is_active: true }

export function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null)
  const [form, setForm] = useState(emptyCoach)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCoaches() }, [])

  const loadCoaches = async () => {
    setLoading(true)
    const data = await coachesService.getCoaches().catch(() => [])
    setCoaches(data)
    setLoading(false)
  }

  const openCreate = () => { setEditingCoach(null); setForm(emptyCoach); setModalOpen(true) }
  const openEdit = (c: Coach) => {
    setEditingCoach(c)
    setForm({ full_name: c.full_name, specialization: c.specialization || '', phone: c.phone || '', email: c.email || '', notes: c.notes || '', is_active: c.is_active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingCoach) {
        await coachesService.updateCoach(editingCoach.id, form)
      } else {
        await coachesService.createCoach(form as Omit<Coach, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      }
      setModalOpen(false)
      await loadCoaches()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المدرب؟')) return
    await coachesService.deleteCoach(id).catch(console.error)
    await loadCoaches()
  }

  return (
    <AppLayout title="المدربون">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">إدارة المدربين ({coaches.length})</h2>
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4" /> مدرب جديد</Button>
        </div>

        {loading ? (
          <LoadingSpinner message="جار تحميل المدربين..." />
        ) : coaches.length === 0 ? (
          <EmptyState
            title="لا يوجد مدربون"
            description="قم بإضافة المدربين للبرنامج"
            icon={<UserCog className="w-12 h-12" />}
            action={<Button onClick={openCreate} size="sm"><Plus className="w-4 h-4" /> إضافة مدرب</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map(coach => (
              <div key={coach.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#1e3a6e] rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {coach.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{coach.full_name}</h3>
                      {coach.specialization && <p className="text-sm text-gray-500">{coach.specialization}</p>}
                    </div>
                  </div>
                  <Badge variant={coach.is_active ? 'success' : 'default'}>
                    {coach.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>

                <div className="mt-3 space-y-1">
                  {coach.phone && <p className="text-xs text-gray-400">📞 {coach.phone}</p>}
                  {coach.email && <p className="text-xs text-gray-400">✉️ {coach.email}</p>}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openEdit(coach)} className="flex-1">
                    <Edit className="w-4 h-4" /> تعديل
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(coach.id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCoach ? 'تعديل المدرب' : 'مدرب جديد'}>
        <div className="space-y-4">
          <Input label="الاسم الكامل *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          <Input label="التخصص" value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="مدرب لياقة، مدرب تقني..." />
          <Input label="الهاتف" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
            rows={2}
            placeholder="ملاحظات..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            مدرب نشط
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.full_name}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
