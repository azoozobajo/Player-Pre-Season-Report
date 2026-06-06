import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { type Program, type ProgramGroup, type Player, type ProgramPlayer } from '../../types'
import { Plus, Edit, Trash2, Users, FolderOpen, ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react'

const emptyProgram = { name: '', description: '', season: '', start_date: '', end_date: '', is_active: true }
const emptyGroup = { name: '', description: '' }

type ExpandedTab = 'groups' | 'players'

export function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [addPlayerModalOpen, setAddPlayerModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [editingGroup, setEditingGroup] = useState<ProgramGroup | null>(null)
  const [form, setForm] = useState(emptyProgram)
  const [groupForm, setGroupForm] = useState(emptyGroup)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [groups, setGroups] = useState<Record<string, ProgramGroup[]>>({})
  const [programPlayers, setProgramPlayers] = useState<Record<string, ProgramPlayer[]>>({})
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null)
  const [expandedTab, setExpandedTab] = useState<Record<string, ExpandedTab>>({})
  const [saving, setSaving] = useState(false)

  // Confirmations
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState<{ open: boolean; program: Program | null }>({ open: false, program: null })
  const [confirmSaveProgram, setConfirmSaveProgram] = useState(false)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<{ open: boolean; groupId: string; programId: string; name: string } | null>(null)
  const [confirmSaveGroup, setConfirmSaveGroup] = useState(false)
  const [confirmRemovePlayer, setConfirmRemovePlayer] = useState<{ open: boolean; ppId: string; programId: string; name: string } | null>(null)

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

  const loadProgramPlayers = async (programId: string) => {
    const data = await playersService.getProgramPlayers(programId).catch(() => [])
    setProgramPlayers(prev => ({ ...prev, [programId]: data }))
  }

  const toggleExpand = async (programId: string) => {
    if (expandedProgram === programId) {
      setExpandedProgram(null)
    } else {
      setExpandedProgram(programId)
      if (!expandedTab[programId]) setExpandedTab(prev => ({ ...prev, [programId]: 'players' }))
      await Promise.all([
        !groups[programId] ? loadGroups(programId) : Promise.resolve(),
        loadProgramPlayers(programId),
      ])
    }
  }

  const switchTab = async (programId: string, tab: ExpandedTab) => {
    setExpandedTab(prev => ({ ...prev, [programId]: tab }))
    if (tab === 'groups' && !groups[programId]) await loadGroups(programId)
    if (tab === 'players') await loadProgramPlayers(programId)
  }

  const openCreate = () => { setEditingProgram(null); setForm(emptyProgram); setModalOpen(true) }
  const openEdit = (p: Program) => { setEditingProgram(p); setForm({ name: p.name, description: p.description || '', season: p.season || '', start_date: p.start_date || '', end_date: p.end_date || '', is_active: p.is_active }); setModalOpen(true) }

  const handleSave = () => { setConfirmSaveProgram(true) }

  const doSaveProgram = async () => {
    setSaving(true)
    setConfirmSaveProgram(false)
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

  const handleDelete = (program: Program) => {
    setConfirmDeleteProgram({ open: true, program })
  }

  const doDeleteProgram = async () => {
    if (!confirmDeleteProgram.program) return
    setSaving(true)
    try {
      await programsService.deleteProgram(confirmDeleteProgram.program.id)
      await loadPrograms()
    } catch (e) { console.error(e) }
    setSaving(false)
    setConfirmDeleteProgram({ open: false, program: null })
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

  const handleGroupSave = () => { setConfirmSaveGroup(true) }

  const doSaveGroup = async () => {
    if (!selectedProgram) return
    setSaving(true)
    setConfirmSaveGroup(false)
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

  const handleGroupDelete = (groupId: string, programId: string, name: string) => {
    setConfirmDeleteGroup({ open: true, groupId, programId, name })
  }

  const doDeleteGroup = async () => {
    if (!confirmDeleteGroup) return
    setSaving(true)
    try {
      await programsService.deleteGroup(confirmDeleteGroup.groupId)
      await loadGroups(confirmDeleteGroup.programId)
    } catch (e) { console.error(e) }
    setSaving(false)
    setConfirmDeleteGroup(null)
  }

  const openAddPlayer = async (program: Program) => {
    setSelectedProgram(program)
    const all = await playersService.getPlayers().catch(() => [])
    setAllPlayers(all)
    setAddPlayerModalOpen(true)
  }

  const handleAddPlayer = async (playerId: string) => {
    if (!selectedProgram) return
    const alreadyIn = (programPlayers[selectedProgram.id] || []).some(pp => pp.player_id === playerId)
    if (alreadyIn) return
    setSaving(true)
    try {
      await playersService.assignPlayerToProgram({
        program_id: selectedProgram.id,
        player_id: playerId,
        status: 'active',
        joined_date: new Date().toISOString().split('T')[0],
      })
      await loadProgramPlayers(selectedProgram.id)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleRemovePlayer = (ppId: string, programId: string, name: string) => {
    setConfirmRemovePlayer({ open: true, ppId, programId, name })
  }

  const doRemovePlayer = async () => {
    if (!confirmRemovePlayer) return
    setSaving(true)
    try {
      await playersService.removePlayerFromProgram(confirmRemovePlayer.ppId)
      await loadProgramPlayers(confirmRemovePlayer.programId)
    } catch (e) { console.error(e) }
    setSaving(false)
    setConfirmRemovePlayer(null)
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
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(program)}>
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
                  <div className="border-t bg-gray-50">
                    {/* Tab switcher */}
                    <div className="flex border-b border-gray-200 bg-white">
                      <button
                        onClick={() => switchTab(program.id, 'players')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                          (expandedTab[program.id] || 'players') === 'players'
                            ? 'border-[#0f2040] text-[#0f2040]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        اللاعبون
                        {programPlayers[program.id] && (
                          <span className="bg-[#0f2040] text-white text-xs rounded-full px-1.5 py-0.5">
                            {programPlayers[program.id].length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => switchTab(program.id, 'groups')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                          expandedTab[program.id] === 'groups'
                            ? 'border-[#0f2040] text-[#0f2040]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <FolderOpen className="w-4 h-4" />
                        المجموعات
                      </button>
                    </div>

                    <div className="p-4">
                      {/* Players tab */}
                      {(expandedTab[program.id] || 'players') === 'players' && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">لاعبو البرنامج</h4>
                            <Button variant="outline" size="sm" onClick={() => openAddPlayer(program)}>
                              <UserPlus className="w-3 h-3" /> إضافة لاعب
                            </Button>
                          </div>
                          {!programPlayers[program.id] ? (
                            <p className="text-sm text-gray-400 text-center py-4">جار التحميل...</p>
                          ) : programPlayers[program.id].length === 0 ? (
                            <div className="text-center py-6">
                              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                              <p className="text-sm text-gray-400 mb-3">لم يتم إضافة لاعبين لهذا البرنامج بعد</p>
                              <Button variant="outline" size="sm" onClick={() => openAddPlayer(program)}>
                                <UserPlus className="w-3 h-3" /> إضافة لاعب الآن
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {programPlayers[program.id].map(pp => (
                                <div key={pp.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-[#0f2040] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                      {pp.player?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">{pp.player?.full_name || '—'}</p>
                                      <p className="text-xs text-gray-400">{pp.player?.position || ''}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={pp.status === 'active' ? 'success' : pp.status === 'injured' ? 'warning' : 'default'}>
                                      {pp.status === 'active' ? 'نشط' : pp.status === 'injured' ? 'مصاب' : 'غير نشط'}
                                    </Badge>
                                    <Button variant="ghost" size="sm" onClick={() => handleRemovePlayer(pp.id, program.id, pp.player?.full_name || '')}>
                                      <X className="w-3.5 h-3.5 text-red-400" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Groups tab */}
                      {expandedTab[program.id] === 'groups' && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">المجموعات</h4>
                            <Button variant="outline" size="sm" onClick={() => openGroupCreate(program)}>
                              <Plus className="w-3 h-3" /> مجموعة
                            </Button>
                          </div>
                          {!groups[program.id] ? (
                            <p className="text-sm text-gray-400 text-center py-4">جار التحميل...</p>
                          ) : groups[program.id].length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">لا توجد مجموعات</p>
                          ) : (
                            <div className="space-y-2">
                              {groups[program.id].map(group => (
                                <div key={group.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                                  <span className="text-sm font-medium text-gray-700">{group.name}</span>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => openGroupEdit(program, group)}>
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleGroupDelete(group.id, program.id, group.name)}>
                                      <Trash2 className="w-3 h-3 text-red-400" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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

      {/* Add Player to Program Modal */}
      <Modal open={addPlayerModalOpen} onClose={() => setAddPlayerModalOpen(false)} title={`إضافة لاعب إلى: ${selectedProgram?.name || ''}`} size="lg">
        <div className="space-y-3">
          {allPlayers.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">لا يوجد لاعبون. قم بإضافة لاعبين أولاً من صفحة اللاعبون.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">اضغط على اللاعب لإضافته إلى البرنامج</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {allPlayers.map(player => {
                  const alreadyIn = selectedProgram
                    ? (programPlayers[selectedProgram.id] || []).some(pp => pp.player_id === player.id)
                    : false
                  return (
                    <div
                      key={player.id}
                      onClick={() => !alreadyIn && handleAddPlayer(player.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        alreadyIn
                          ? 'bg-green-50 border-green-200 cursor-default'
                          : 'bg-white border-gray-100 hover:border-[#0f2040] hover:bg-blue-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${alreadyIn ? 'bg-green-500 text-white' : 'bg-[#0f2040] text-white'}`}>
                          {player.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{player.full_name}</p>
                          <p className="text-xs text-gray-400">{player.position || ''} {player.jersey_number ? `• #${player.jersey_number}` : ''}</p>
                        </div>
                      </div>
                      {alreadyIn ? (
                        <Badge variant="success">مضاف</Badge>
                      ) : (
                        <Button size="sm" onClick={e => { e.stopPropagation(); handleAddPlayer(player.id) }} loading={saving}>
                          <UserPlus className="w-3 h-3" /> إضافة
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setAddPlayerModalOpen(false)}>إغلاق</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm: delete program */}
      <ConfirmModal
        open={confirmDeleteProgram.open}
        onClose={() => setConfirmDeleteProgram({ open: false, program: null })}
        onConfirm={doDeleteProgram}
        title="حذف البرنامج"
        message={`هل أنت متأكد من حذف برنامج "${confirmDeleteProgram.program?.name}"؟ سيتم حذف جميع البيانات المرتبطة به ولا يمكن التراجع.`}
        confirmLabel="حذف"
        variant="danger"
        loading={saving}
      />

      {/* Confirm: save program */}
      <ConfirmModal
        open={confirmSaveProgram}
        onClose={() => setConfirmSaveProgram(false)}
        onConfirm={doSaveProgram}
        title={editingProgram ? 'تأكيد التعديل' : 'تأكيد الإضافة'}
        message={editingProgram ? `هل أنت متأكد من حفظ التغييرات على برنامج "${editingProgram.name}"؟` : `هل أنت متأكد من إنشاء برنامج "${form.name}"؟`}
        confirmLabel={editingProgram ? 'حفظ التعديلات' : 'إنشاء'}
        variant="warning"
        loading={saving}
      />

      {/* Confirm: delete group */}
      <ConfirmModal
        open={!!confirmDeleteGroup?.open}
        onClose={() => setConfirmDeleteGroup(null)}
        onConfirm={doDeleteGroup}
        title="حذف المجموعة"
        message={`هل أنت متأكد من حذف مجموعة "${confirmDeleteGroup?.name}"؟`}
        confirmLabel="حذف"
        variant="danger"
        loading={saving}
      />

      {/* Confirm: save group */}
      <ConfirmModal
        open={confirmSaveGroup}
        onClose={() => setConfirmSaveGroup(false)}
        onConfirm={doSaveGroup}
        title={editingGroup ? 'تأكيد تعديل المجموعة' : 'تأكيد إضافة المجموعة'}
        message={editingGroup ? `هل أنت متأكد من حفظ التغييرات على مجموعة "${editingGroup.name}"؟` : `هل أنت متأكد من إنشاء مجموعة "${groupForm.name}"؟`}
        confirmLabel={editingGroup ? 'حفظ التعديلات' : 'إنشاء'}
        variant="warning"
        loading={saving}
      />

      {/* Confirm: remove player */}
      <ConfirmModal
        open={!!confirmRemovePlayer?.open}
        onClose={() => setConfirmRemovePlayer(null)}
        onConfirm={doRemovePlayer}
        title="إزالة اللاعب"
        message={`هل أنت متأكد من إزالة "${confirmRemovePlayer?.name}" من هذا البرنامج؟`}
        confirmLabel="إزالة"
        variant="danger"
        loading={saving}
      />
    </AppLayout>
  )
}
