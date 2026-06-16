import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { indicatorsService } from '../../services/indicatorsService'
import { categoriesService } from '../../services/categoriesService'
import {
  type Program, type ProgramGroup, type Player, type ProgramPlayer,
  type Indicator, type IndicatorCategory, type IndicatorType, type IndicatorDirection,
} from '../../types'
import { Plus, Edit, Trash2, Users, FolderOpen, ChevronDown, ChevronUp, UserPlus, X, BarChart3, Target, Download } from 'lucide-react'

const emptyProgram = { name: '', description: '', season: '', start_date: '', end_date: '', is_active: true }
const emptyGroup = { name: '', description: '' }
const emptyIndicator = {
  name: '', name_ar: '', category_id: '', type: 'numeric' as IndicatorType,
  direction: 'higher_better' as IndicatorDirection, unit: '', min_value: '',
  max_value: '', target_value: '', description: '', choices: '', is_active: true, sort_order: 0,
}

type ExpandedTab = 'groups' | 'players' | 'indicators'

const TYPE_LABELS: Record<IndicatorType, string> = {
  numeric: 'رقمي', rating: 'تقييم (1-10)', text: 'نصي', choice: 'خيارات',
}

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

  // Indicator state per program
  const [programIndicators, setProgramIndicators] = useState<Record<string, Indicator[]>>({})
  const [categories, setCategories] = useState<IndicatorCategory[]>([])
  const [indicatorModalOpen, setIndicatorModalOpen] = useState(false)
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null)
  const [indicatorForm, setIndicatorForm] = useState(emptyIndicator)
  const [indicatorProgramId, setIndicatorProgramId] = useState<string>('')

  // Import from library
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importProgramId, setImportProgramId] = useState<string>('')
  const [globalIndicators, setGlobalIndicators] = useState<Indicator[]>([])
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  // Confirmations
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState<{ open: boolean; program: Program | null }>({ open: false, program: null })
  const [confirmSaveProgram, setConfirmSaveProgram] = useState(false)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<{ open: boolean; groupId: string; programId: string; name: string } | null>(null)
  const [confirmSaveGroup, setConfirmSaveGroup] = useState(false)
  const [confirmRemovePlayer, setConfirmRemovePlayer] = useState<{ open: boolean; ppId: string; programId: string; name: string } | null>(null)
  const [confirmDeleteIndicator, setConfirmDeleteIndicator] = useState<{ open: boolean; indicator: Indicator | null }>({ open: false, indicator: null })
  const [confirmSaveIndicator, setConfirmSaveIndicator] = useState(false)

  useEffect(() => { loadPrograms() }, [])
  useEffect(() => { categoriesService.getCategories().then(setCategories).catch(() => {}) }, [])

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

  const loadProgramIndicators = async (programId: string) => {
    const data = await indicatorsService.getIndicators(programId).catch(() => [])
    setProgramIndicators(prev => ({ ...prev, [programId]: data }))
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
    if (tab === 'indicators') await loadProgramIndicators(programId)
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

  // ── Indicator CRUD ──────────────────────────────────────────────────────────
  const openIndicatorCreate = (programId: string) => {
    setIndicatorProgramId(programId)
    setEditingIndicator(null)
    setIndicatorForm(emptyIndicator)
    setIndicatorModalOpen(true)
  }

  const openIndicatorEdit = (programId: string, ind: Indicator) => {
    setIndicatorProgramId(programId)
    setEditingIndicator(ind)
    setIndicatorForm({
      name: ind.name, name_ar: ind.name_ar || '', category_id: ind.category_id || '',
      type: ind.type, direction: ind.direction, unit: ind.unit || '',
      min_value: String(ind.min_value ?? ''), max_value: String(ind.max_value ?? ''),
      target_value: String(ind.target_value ?? ''), description: ind.description || '',
      choices: (ind.choices || []).join(', '), is_active: ind.is_active, sort_order: ind.sort_order,
    })
    setIndicatorModalOpen(true)
  }

  const handleIndicatorSave = () => { setConfirmSaveIndicator(true) }

  const doSaveIndicator = async () => {
    setSaving(true)
    setConfirmSaveIndicator(false)
    try {
      const data = {
        ...indicatorForm,
        program_id: indicatorProgramId,
        min_value: indicatorForm.min_value ? parseFloat(indicatorForm.min_value) : undefined,
        max_value: indicatorForm.max_value ? parseFloat(indicatorForm.max_value) : undefined,
        target_value: indicatorForm.target_value ? parseFloat(indicatorForm.target_value) : undefined,
        choices: indicatorForm.choices ? indicatorForm.choices.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        category_id: indicatorForm.category_id || undefined,
      }
      if (editingIndicator) {
        await indicatorsService.updateIndicator(editingIndicator.id, data)
      } else {
        await indicatorsService.createIndicator(data as Omit<Indicator, 'id' | 'user_id' | 'created_at' | 'category'>)
      }
      setIndicatorModalOpen(false)
      await loadProgramIndicators(indicatorProgramId)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleIndicatorDelete = (ind: Indicator) => {
    setConfirmDeleteIndicator({ open: true, indicator: ind })
  }

  const doDeleteIndicator = async () => {
    if (!confirmDeleteIndicator.indicator) return
    setSaving(true)
    try {
      await indicatorsService.deleteIndicator(confirmDeleteIndicator.indicator.id)
      await loadProgramIndicators(indicatorProgramId)
    } catch (e) { console.error(e) }
    setSaving(false)
    setConfirmDeleteIndicator({ open: false, indicator: null })
  }

  // ── Import from library ─────────────────────────────────────────────────────
  const openImportModal = async (programId: string) => {
    setImportProgramId(programId)
    setImportSelected(new Set())
    const globals = await indicatorsService.getGlobalIndicators().catch(() => [])
    // Exclude indicators already in this program
    const existing = programIndicators[programId] || []
    const existingNames = new Set(existing.map(i => (i.name_ar || i.name).trim().toLowerCase()))
    setGlobalIndicators(globals.filter(g => !existingNames.has((g.name_ar || g.name).trim().toLowerCase())))
    setImportModalOpen(true)
  }

  const toggleImportSelect = (id: string) => {
    setImportSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const doImport = async () => {
    if (importSelected.size === 0) return
    setImporting(true)
    try {
      for (const id of importSelected) {
        const src = globalIndicators.find(i => i.id === id)
        if (!src) continue
        await indicatorsService.createIndicator({
          name: src.name,
          name_ar: src.name_ar,
          program_id: importProgramId,
          category_id: src.category_id,
          type: src.type,
          direction: src.direction,
          unit: src.unit,
          min_value: src.min_value,
          max_value: src.max_value,
          target_value: src.target_value,
          choices: src.choices,
          description: src.description,
          is_active: src.is_active,
          sort_order: src.sort_order,
        } as Omit<Indicator, 'id' | 'user_id' | 'created_at' | 'category'>)
      }
      await loadProgramIndicators(importProgramId)
      setImportModalOpen(false)
    } catch (e) { console.error(e) }
    setImporting(false)
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
                      <button
                        onClick={() => switchTab(program.id, 'indicators')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                          expandedTab[program.id] === 'indicators'
                            ? 'border-[#0f2040] text-[#0f2040]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4" />
                        المؤشرات
                        {programIndicators[program.id] && (
                          <span className="bg-[#0f2040] text-white text-xs rounded-full px-1.5 py-0.5">
                            {programIndicators[program.id].length}
                          </span>
                        )}
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

                      {/* Indicators tab */}
                      {expandedTab[program.id] === 'indicators' && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">مؤشرات التقييم</h4>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openImportModal(program.id)}>
                                <Download className="w-3 h-3" /> استيراد من المكتبة
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openIndicatorCreate(program.id)}>
                                <Plus className="w-3 h-3" /> مؤشر جديد
                              </Button>
                            </div>
                          </div>
                          {!programIndicators[program.id] ? (
                            <p className="text-sm text-gray-400 text-center py-4">جار التحميل...</p>
                          ) : programIndicators[program.id].length === 0 ? (
                            <div className="text-center py-6">
                              <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                              <p className="text-sm text-gray-400 mb-3">لا توجد مؤشرات لهذا البرنامج بعد</p>
                              <Button variant="outline" size="sm" onClick={() => openIndicatorCreate(program.id)}>
                                <Plus className="w-3 h-3" /> إضافة مؤشر الآن
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {programIndicators[program.id].map(ind => (
                                <div key={ind.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-2.5">
                                    <Target className="w-4 h-4 text-gray-400 shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">{ind.name_ar || ind.name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="info">{TYPE_LABELS[ind.type]}</Badge>
                                        {ind.unit && <span className="text-xs text-gray-400">{ind.unit}</span>}
                                        {ind.category && (
                                          <span className="flex items-center gap-1 text-xs text-gray-400">
                                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ind.category.color || '#6b7280' }} />
                                            {ind.category.name_ar || ind.category.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => openIndicatorEdit(program.id, ind)}>
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setIndicatorProgramId(program.id); handleIndicatorDelete(ind) }}>
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

      {/* Indicator Modal */}
      <Modal open={indicatorModalOpen} onClose={() => setIndicatorModalOpen(false)} title={editingIndicator ? 'تعديل المؤشر' : 'مؤشر جديد'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم (عربي) *" value={indicatorForm.name_ar} onChange={e => setIndicatorForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="مثال: السرعة" />
            <Input label="الاسم (إنجليزي)" value={indicatorForm.name} onChange={e => setIndicatorForm(f => ({ ...f, name: e.target.value }))} placeholder="Speed" />
          </div>
          <Select label="القسم" value={indicatorForm.category_id} onChange={e => setIndicatorForm(f => ({ ...f, category_id: e.target.value }))}>
            <option value="">بدون قسم</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Select label="نوع المؤشر" value={indicatorForm.type} onChange={e => setIndicatorForm(f => ({ ...f, type: e.target.value as IndicatorType }))}>
              <option value="numeric">رقمي</option>
              <option value="rating">تقييم (1-10)</option>
              <option value="text">نصي</option>
              <option value="choice">خيارات</option>
            </Select>
            <Select label="الاتجاه" value={indicatorForm.direction} onChange={e => setIndicatorForm(f => ({ ...f, direction: e.target.value as IndicatorDirection }))}>
              <option value="higher_better">الأعلى أفضل</option>
              <option value="lower_better">الأقل أفضل</option>
              <option value="neutral">محايد</option>
            </Select>
          </div>
          {indicatorForm.type === 'choice' && (
            <Input label="الخيارات (مفصولة بفاصلة)" value={indicatorForm.choices} onChange={e => setIndicatorForm(f => ({ ...f, choices: e.target.value }))} placeholder="ضعيف, متوسط, جيد, ممتاز" />
          )}
          <Input label="الوحدة" value={indicatorForm.unit} onChange={e => setIndicatorForm(f => ({ ...f, unit: e.target.value }))} placeholder="ثانية، متر، كجم..." />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIndicatorModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleIndicatorSave} loading={saving} disabled={!indicatorForm.name_ar && !indicatorForm.name}>
              {editingIndicator ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
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

      {/* Confirm: delete indicator */}
      <ConfirmModal
        open={confirmDeleteIndicator.open}
        onClose={() => setConfirmDeleteIndicator({ open: false, indicator: null })}
        onConfirm={doDeleteIndicator}
        title="حذف المؤشر"
        message={`هل أنت متأكد من حذف مؤشر "${confirmDeleteIndicator.indicator?.name_ar || confirmDeleteIndicator.indicator?.name}"؟ لا يمكن التراجع.`}
        confirmLabel="حذف"
        variant="danger"
        loading={saving}
      />

      {/* Confirm: save indicator */}
      <ConfirmModal
        open={confirmSaveIndicator}
        onClose={() => setConfirmSaveIndicator(false)}
        onConfirm={doSaveIndicator}
        title={editingIndicator ? 'تأكيد تعديل المؤشر' : 'تأكيد إضافة المؤشر'}
        message={editingIndicator
          ? `هل أنت متأكد من حفظ التغييرات على "${editingIndicator.name_ar || editingIndicator.name}"؟`
          : `هل أنت متأكد من إضافة مؤشر "${indicatorForm.name_ar || indicatorForm.name}"؟`
        }
        confirmLabel={editingIndicator ? 'حفظ التعديلات' : 'إضافة'}
        variant="warning"
        loading={saving}
      />

      {/* Import from library modal */}
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="استيراد مؤشرات من المكتبة" size="lg">
        <div className="space-y-3">
          {globalIndicators.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">لا توجد مؤشرات في المكتبة أو جميعها مضافة بالفعل</p>
              <p className="text-xs text-gray-300 mt-1">أضف مؤشرات من صفحة المؤشرات أولاً</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">اختر المؤشرات التي تريد إضافتها إلى البرنامج</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setImportSelected(new Set(globalIndicators.map(i => i.id)))} className="text-xs text-[#0f2040] hover:underline">تحديد الكل</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={() => setImportSelected(new Set())} className="text-xs text-gray-400 hover:underline">إلغاء الكل</button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {globalIndicators.map(ind => (
                  <label key={ind.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={importSelected.has(ind.id)}
                      onChange={() => toggleImportSelect(ind.id)}
                      className="rounded text-[#0f2040]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{ind.name_ar || ind.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{ind.type === 'numeric' ? 'رقمي' : ind.type === 'rating' ? 'تقييم' : ind.type === 'text' ? 'نصي' : 'خيارات'}</span>
                        {ind.unit && <span className="text-xs text-gray-400">· {ind.unit}</span>}
                      </div>
                    </div>
                    {ind.category && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.category.color || '#6b7280' }} />
                        {ind.category.name_ar || ind.category.name}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {importSelected.size > 0 && (
                <p className="text-xs text-[#0f2040]">تم تحديد {importSelected.size} مؤشر</p>
              )}
            </>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>إلغاء</Button>
            {globalIndicators.length > 0 && (
              <Button onClick={doImport} loading={importing} disabled={importSelected.size === 0}>
                <Download className="w-3 h-3" /> استيراد ({importSelected.size})
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
