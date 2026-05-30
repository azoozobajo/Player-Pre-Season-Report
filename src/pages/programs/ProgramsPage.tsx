import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { programsService } from '../../services/programsService'
import { type Program, type ProgramGroup } from '../../types'
import { Plus, Edit, Trash2, Users, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react'

const emptyProgram = { name: '', description: '', season: '', start_date: '', end_date: '', is_active: true }
const emptyGroup = { name: '', description: '' }

export function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [editingGroup, setEditingGroup] = useState<ProgramGroup | null>(null)
  const [form, setForm] = useState(emptyProgram)
  const [groupForm, setGroupForm] = useState(emptyGroup)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [groups, setGroups] = useState<Record<string, ProgramGroup[]>>({})
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadPrograms() }, [])

  const loadPrograms = async () => {
    setLoading(true)
    const data = await programsService.getPrograms().catch(() => [])
    setPrograms(data)
    setLoading(false)
  }

  const loadGroups = async (programId: string) => {
    const data = await programsService.getProgramGroups(programId).catch(() => [])
    setGroups(prev => ({ ...prev, [programId]: data }))
  }

  const toggleExpand = async (programId: string) => {
    if (expandedProgram === programId) {
      setExpandedProgram(null)
    } else {
      setExpandedProgram(programId)
      if (!groups[programId]) await loadGroups(programId)
    }
  }

  const openCreate = () => { setEditingProgram(null); setForm(emptyProgram); setModalOpen(true) }
  const openEdit = (p: Program) => { setEditingProgram(p); setForm({ name: p.name, description: p.description || '', season: p.season || '', start_date: p.start_date || '', end_date: p.end_date || '', is_active: p.is_active }); setModalOpen(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingProgram) {
        await programsService.updateProgram(editingProgram.id, form)
      } else {
        await programsService.createProgram(form)
      }
      setModalOpen(false)
      await loadPrograms()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البرنامج؟')) return
    await programsService.deleteProgram(id).catch(console.error)
    await loadPrograms()
  }

  const openGroupCreate = (program: Program) => {
    setSelectedProgram(program)
    setEditingGroup(null)
    setGroupForm(emptyGroup)
    setGroupModalOpen(true)
  }

  const openGroupEdit = (program: Program, group: ProgramGroup) => {
    setSelectedProgram(program)
    setEditingGroup(group)
    setGroupForm({ name: group.name, description: group.description || '' })
    setGroupModalOpen(true)
  }

  const handleGroupSave = async () => {
    if (!selectedProgram) return
    setSaving(true)
    try {
      if (editingGroup) {
        await programsService.updateGroup(editingGroup.id, groupForm)
      } else {
        await programsService.createGroup({ ...groupForm, program_id: selectedProgram.id })
      }
      setGroupModalOpen(false)
      await loadGroups(selectedProgram.id)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleGroupDelete = async (groupId: string, programId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return
    await programsService.deleteGroup(groupId).catch(console.error)
    await loadGroups(programId)
  }

  return (
    <AppLayout title="البرامج">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">إدارة البرامج الإعدادية</h2>
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4" /> برنامج جديد
          </Button>
        </div>

        {loading ? (
          <LoadingSpinner message="جار تحميل البرامج..." />
        ) : programs.length === 0 ? (
          <EmptyState
            title="لا يوجد برامج"
            description="قم بإنشاء برنامجك الإعدادي الأول"
            icon={<FolderOpen className="w-12 h-12" />}
            action={<Button onClick={openCreate} size="sm"><Plus className="w-4 h-4" /> إنشاء برنامج</Button>}
          />
        ) : (
          <div className="space-y-3">
            {programs.map(program => (
              <Card key={program.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0f2040] rounded-xl flex items-center justify-center text-white">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{program.name}</h3>
                        <p className="text-xs text-gray-400">{program.season} {program.start_date && `• ${program.start_date}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={program.is_active ? 'success' : 'default'}>
                        {program.is_active ? 'نشط' : 'منتهي'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(program)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(program.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleExpand(program.id)}>
                        {expandedProgram === program.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {program.description && (
                    <p className="text-sm text-gray-500 mt-2">{program.description}</p>
                  )}
                </div>

                {expandedProgram === program.id && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Users className="w-4 h-4" /> المجموعات
                      </h4>
                      <Button variant="outline" size="sm" onClick={() => openGroupCreate(program)}>
                        <Plus className="w-3 h-3" /> مجموعة
                      </Button>
                    </div>
                    {!groups[program.id] ? (
                      <p className="text-sm text-gray-400">جار التحميل...</p>
                    ) : groups[program.id].length === 0 ? (
                      <p className="text-sm text-gray-400">لا توجد مجموعات</p>
                    ) : (
                      <div className="space-y-2">
                        {groups[program.id].map(group => (
                          <div key={group.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">{group.name}</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openGroupEdit(program, group)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleGroupDelete(group.id, program.id)}>
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Program Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProgram ? 'تعديل البرنامج' : 'برنامج جديد'}>
        <div className="space-y-4">
          <Input label="اسم البرنامج *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: البرنامج الإعدادي 2024" />
          <Input label="الموسم" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} placeholder="مثال: 2024/2025" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="تاريخ البداية" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="تاريخ النهاية" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              برنامج نشط
            </label>
          </div>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
            rows={3}
            placeholder="وصف البرنامج (اختياري)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name}>حفظ</Button>
          </div>
        </div>
      </Modal>

      {/* Group Modal */}
      <Modal open={groupModalOpen} onClose={() => setGroupModalOpen(false)} title={editingGroup ? 'تعديل المجموعة' : 'مجموعة جديدة'}>
        <div className="space-y-4">
          <Input label="اسم المجموعة *" value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: المجموعة أ" />
          <Input label="الوصف" value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setGroupModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleGroupSave} loading={saving} disabled={!groupForm.name}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
