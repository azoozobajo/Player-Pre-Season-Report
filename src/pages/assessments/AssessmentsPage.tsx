import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { indicatorsService } from '../../services/indicatorsService'
import { assessmentsService } from '../../services/assessmentsService'
import { notesService } from '../../services/notesService'
import {
  type Program, type Player, type Indicator,
  type AssessmentSession, type AssessmentResult, type CoachNote,
} from '../../types'
import {
  Plus, ClipboardList, ChevronLeft, Save, Edit, Trash2,
  MessageSquare, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Target, Lightbulb, BarChart3,
} from 'lucide-react'

// ── special categories for player-program evaluation ─────────────────────────
const CAT_TARGETS   = '__targets__'
const CAT_POSITIVES = '__positives__'
const CAT_NEGATIVES = '__negatives__'
const CAT_RECS      = '__general_recs__'

export function AssessmentsPage() {
  const [programs, setPrograms]             = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [sessions, setSessions]             = useState<AssessmentSession[]>([])
  const [selectedSession, setSelectedSession] = useState<AssessmentSession | null>(null)
  const [players, setPlayers]               = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // All program indicators
  const [programIndicators, setProgramIndicators] = useState<Indicator[]>([])
  // Only the indicators selected for the current session
  const [sessionIndicators, setSessionIndicators] = useState<Indicator[]>([])

  const [values, setValues]                 = useState<Record<string, string>>({})
  const [indicatorNotes, setIndicatorNotes] = useState<Record<string, string>>({})
  const [expandedNotes, setExpandedNotes]   = useState<Record<string, boolean>>({})
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)

  // Session create/edit
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession]     = useState<AssessmentSession | null>(null)
  const [sessionForm, setSessionForm] = useState({
    name: '', session_date: new Date().toISOString().split('T')[0], notes: '',
  })
  // Indicator selection in session modal (IDs of selected indicators)
  const [sessionIndicatorIds, setSessionIndicatorIds] = useState<Set<string>>(new Set())

  // Player evaluation panel
  const [evalExpanded, setEvalExpanded]     = useState(false)
  const [evalNotes, setEvalNotes]           = useState<Record<string, CoachNote>>({})
  const [targets, setTargets]               = useState('')
  const [positives, setPositives]           = useState<string[]>([])
  const [negatives, setNegatives]           = useState<string[]>([])
  const [genRecs, setGenRecs]               = useState('')
  const [posInput, setPosInput]             = useState('')
  const [negInput, setNegInput]             = useState('')
  const [evalSaving, setEvalSaving]         = useState(false)
  const [evalSaved, setEvalSaved]           = useState(false)

  // Confirmations
  const [confirmDelete, setConfirmDelete]   = useState<{ open: boolean; session: AssessmentSession | null }>({ open: false, session: null })
  const [confirmSaveEdit, setConfirmSaveEdit] = useState(false)
  const [confirmSaveResults, setConfirmSaveResults] = useState(false)

  useEffect(() => { loadPrograms() }, [])

  const loadPrograms = async () => {
    const data = await programsService.getPrograms().catch(() => [])
    setPrograms(data)
    setLoading(false)
  }

  const selectProgram = async (program: Program) => {
    setSelectedProgram(program)
    setSelectedSession(null)
    setSelectedPlayer(null)
    setSessionIndicators([])
    const [ss, pp, inds] = await Promise.all([
      assessmentsService.getSessions(program.id).catch(() => []),
      playersService.getProgramPlayers(program.id).catch(() => []),
      indicatorsService.getIndicators(program.id).catch(() => []),
    ])
    setSessions(ss)
    setPlayers(pp.map(p => p.player).filter(Boolean) as Player[])
    setProgramIndicators(inds)
  }

  const selectPlayer = async (player: Player) => {
    setSelectedPlayer(player)
    setEvalExpanded(false)
    if (selectedSession) {
      await loadResults(selectedSession.id, player.id)
    }
    if (selectedProgram) {
      await loadEvaluation(player.id, selectedProgram.id)
    }
  }

  const loadResults = async (sessionId: string, playerId: string) => {
    const res = await assessmentsService.getResults(sessionId).catch(() => [])
    const playerResults = res.filter(r => r.player_id === playerId)
    const vals: Record<string, string> = {}
    const notes: Record<string, string> = {}
    playerResults.forEach(r => {
      if (r.value_numeric !== null && r.value_numeric !== undefined) vals[r.indicator_id] = String(r.value_numeric)
      else if (r.value_rating !== null && r.value_rating !== undefined) vals[r.indicator_id] = String(r.value_rating)
      else if (r.value_text) vals[r.indicator_id] = r.value_text
      else if (r.value_choice) vals[r.indicator_id] = r.value_choice
      if (r.notes) notes[r.indicator_id] = r.notes
    })
    setValues(vals)
    setIndicatorNotes(notes)
  }

  const loadEvaluation = async (playerId: string, programId: string) => {
    const allNotes = await notesService.getCoachNotes(playerId, programId).catch(() => [])
    const map: Record<string, CoachNote> = {}
    for (const n of allNotes) {
      if (n.category && [CAT_TARGETS, CAT_POSITIVES, CAT_NEGATIVES, CAT_RECS].includes(n.category)) {
        map[n.category] = n
      }
    }
    setEvalNotes(map)
    setTargets(map[CAT_TARGETS]?.content || '')
    setPositives(map[CAT_POSITIVES]?.content ? map[CAT_POSITIVES].content.split('\n').filter(Boolean) : [])
    setNegatives(map[CAT_NEGATIVES]?.content ? map[CAT_NEGATIVES].content.split('\n').filter(Boolean) : [])
    setGenRecs(map[CAT_RECS]?.content || '')
  }

  const loadSessionIndicators = async (sessionId: string) => {
    const si = await assessmentsService.getSessionIndicators(sessionId).catch(() => [])
    if (si.length > 0) {
      // Use only the indicators selected for this session
      const ids = new Set(si.map(s => s.indicator_id))
      setSessionIndicators(programIndicators.filter(i => ids.has(i.id)))
    } else {
      // Fallback: session has no stored indicators → show all program indicators
      setSessionIndicators(programIndicators)
    }
  }

  const selectSession = async (session: AssessmentSession) => {
    setSelectedSession(session)
    setSelectedPlayer(null)
    setValues({})
    setIndicatorNotes({})
    await loadSessionIndicators(session.id)
  }

  // ── session CRUD ────────────────────────────────────────────────────────────
  const openCreateSession = () => {
    setEditingSession(null)
    setSessionForm({ name: '', session_date: new Date().toISOString().split('T')[0], notes: '' })
    // Default: select all program indicators
    setSessionIndicatorIds(new Set(programIndicators.map(i => i.id)))
    setSessionModalOpen(true)
  }

  const openEditSession = async (s: AssessmentSession) => {
    setEditingSession(s)
    setSessionForm({ name: s.name, session_date: s.session_date, notes: s.notes || '' })
    // Load existing session indicators
    const si = await assessmentsService.getSessionIndicators(s.id).catch(() => [])
    if (si.length > 0) {
      setSessionIndicatorIds(new Set(si.map(x => x.indicator_id)))
    } else {
      setSessionIndicatorIds(new Set(programIndicators.map(i => i.id)))
    }
    setSessionModalOpen(true)
  }

  const toggleSessionIndicator = (id: string) => {
    setSessionIndicatorIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSessionModalSave = () => { editingSession ? setConfirmSaveEdit(true) : doCreateSession() }

  const doCreateSession = async () => {
    if (!selectedProgram) return
    setSaving(true)
    try {
      const s = await assessmentsService.createSession({ ...sessionForm, program_id: selectedProgram.id, is_complete: false })
      await assessmentsService.setSessionIndicators(s.id, [...sessionIndicatorIds])
      setSessions(prev => [s, ...prev])
      setSessionModalOpen(false)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const doUpdateSession = async () => {
    if (!editingSession) return
    setSaving(true)
    try {
      const u = await assessmentsService.updateSession(editingSession.id, sessionForm)
      await assessmentsService.setSessionIndicators(u.id, [...sessionIndicatorIds])
      setSessions(prev => prev.map(s => s.id === u.id ? u : s))
      if (selectedSession?.id === u.id) {
        setSelectedSession(u)
        await loadSessionIndicators(u.id)
      }
      setSessionModalOpen(false)
      setConfirmSaveEdit(false)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const doDeleteSession = async () => {
    if (!confirmDelete.session) return
    setSaving(true)
    try {
      await assessmentsService.deleteSession(confirmDelete.session.id)
      setSessions(prev => prev.filter(s => s.id !== confirmDelete.session!.id))
      if (selectedSession?.id === confirmDelete.session.id) {
        setSelectedSession(null)
        setSelectedPlayer(null)
        setValues({})
        setIndicatorNotes({})
        setSessionIndicators([])
      }
    } catch (e) { console.error(e) }
    setSaving(false)
    setConfirmDelete({ open: false, session: null })
  }

  // ── results ─────────────────────────────────────────────────────────────────
  const doSaveResults = async () => {
    if (!selectedSession || !selectedPlayer) return
    setSaving(true)
    setConfirmSaveResults(false)
    try {
      for (const [indicatorId, value] of Object.entries(values)) {
        if (!value && !indicatorNotes[indicatorId]) continue
        const indicator = sessionIndicators.find(i => i.id === indicatorId)
        if (!indicator) continue
        const resultData: Omit<AssessmentResult, 'id' | 'created_at' | 'updated_at' | 'indicator' | 'player'> = {
          session_id: selectedSession.id,
          player_id: selectedPlayer.id,
          indicator_id: indicatorId,
          notes: indicatorNotes[indicatorId] || undefined,
        }
        if (value) {
          if (indicator.type === 'numeric') resultData.value_numeric = parseFloat(value)
          else if (indicator.type === 'rating') resultData.value_rating = parseFloat(value)
          else if (indicator.type === 'text') resultData.value_text = value
          else if (indicator.type === 'choice') resultData.value_choice = value
        }
        await assessmentsService.saveResult(resultData).catch(console.error)
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  // ── player evaluation ────────────────────────────────────────────────────────
  const saveEvaluation = async () => {
    if (!selectedPlayer || !selectedProgram) return
    setEvalSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const toSave = [
      { cat: CAT_TARGETS,   content: targets },
      { cat: CAT_POSITIVES, content: positives.join('\n') },
      { cat: CAT_NEGATIVES, content: negatives.join('\n') },
      { cat: CAT_RECS,      content: genRecs },
    ]
    for (const { cat, content } of toSave) {
      const existing = evalNotes[cat]
      if (existing) {
        await notesService.createCoachNote({
          player_id: selectedPlayer.id, program_id: selectedProgram.id,
          note_date: today, content, category: cat,
        }).catch(async () => {
          await notesService.deleteCoachNote(existing.id).catch(() => {})
          await notesService.createCoachNote({ player_id: selectedPlayer.id, program_id: selectedProgram.id, note_date: today, content, category: cat }).catch(console.error)
        })
      } else if (content.trim()) {
        await notesService.createCoachNote({ player_id: selectedPlayer.id, program_id: selectedProgram.id, note_date: today, content, category: cat }).catch(console.error)
      }
    }
    await loadEvaluation(selectedPlayer.id, selectedProgram.id)
    setEvalSaving(false)
    setEvalSaved(true)
    setTimeout(() => setEvalSaved(false), 2500)
  }

  const addBullet = (list: string[], setter: (v: string[]) => void, input: string, clearInput: () => void) => {
    const trimmed = input.trim()
    if (!trimmed) return
    setter([...list, trimmed])
    clearInput()
  }

  if (loading) return <AppLayout title="التقييمات"><LoadingSpinner /></AppLayout>

  return (
    <AppLayout title="التقييمات">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">جلسات التقييم</h2>

        {!selectedProgram ? (
          <div>
            <p className="text-sm text-gray-500 mb-3">اختر برنامجاً للبدء</p>
            {programs.length === 0 ? (
              <EmptyState title="لا توجد برامج" description="قم بإنشاء برنامج أولاً" icon={<ClipboardList className="w-10 h-10" />} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map(p => (
                  <div key={p.id} onClick={() => selectProgram(p)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-[#0f2040] hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0f2040] rounded-xl flex items-center justify-center text-white">📋</div>
                      <div><p className="font-medium text-gray-900">{p.name}</p><p className="text-xs text-gray-400">{p.season}</p></div>
                      <ChevronLeft className="w-4 h-4 text-gray-400 mr-auto" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedProgram(null)}>← العودة</Button>
              <span className="text-sm text-gray-600">البرنامج: <strong>{selectedProgram.name}</strong></span>
              {programIndicators.length === 0 && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  لا توجد مؤشرات — أضف مؤشرات من صفحة البرامج أولاً
                </span>
              )}
            </div>

            {/* 3 column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Sessions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-800">الجلسات</h3>
                  <Button size="sm" onClick={openCreateSession} disabled={programIndicators.length === 0}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                {sessions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">لا توجد جلسات</p>
                ) : (
                  <div className="space-y-1.5">
                    {sessions.map(s => (
                      <div key={s.id} className={`rounded-lg transition-colors text-sm ${selectedSession?.id === s.id ? 'bg-[#0f2040] text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                        <div onClick={() => selectSession(s)} className="p-2 cursor-pointer">
                          <p className="font-medium text-xs">{s.name}</p>
                          <p className={`text-xs ${selectedSession?.id === s.id ? 'text-white/60' : 'text-gray-400'}`}>{s.session_date}</p>
                        </div>
                        <div className={`flex gap-1 px-2 pb-1.5 border-t ${selectedSession?.id === s.id ? 'border-white/20' : 'border-gray-100'}`}>
                          <button onClick={e => { e.stopPropagation(); openEditSession(s) }} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${selectedSession?.id === s.id ? 'hover:bg-white/20 text-white/70' : 'hover:bg-gray-100 text-gray-500'}`}><Edit className="w-3 h-3" /> تعديل</button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDelete({ open: true, session: s }) }} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${selectedSession?.id === s.id ? 'hover:bg-red-400/30 text-red-300' : 'hover:bg-red-50 text-red-400'}`}><Trash2 className="w-3 h-3" /> حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Players */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-sm text-gray-800 mb-3">اللاعبون</h3>
                {!selectedSession ? (
                  <p className="text-xs text-gray-400 text-center py-4">اختر جلسة أولاً</p>
                ) : players.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">لا يوجد لاعبون في البرنامج</p>
                ) : (
                  <div className="space-y-1.5">
                    {players.map(player => (
                      <div key={player.id} onClick={() => selectPlayer(player)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedPlayer?.id === player.id ? 'bg-[#0f2040] text-white' : 'hover:bg-gray-50'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${selectedPlayer?.id === player.id ? 'bg-white text-[#0f2040]' : 'bg-[#0f2040] text-white'}`}>{player.full_name.charAt(0)}</div>
                        <div>
                          <p className="text-xs font-medium">{player.full_name}</p>
                          <p className={`text-xs ${selectedPlayer?.id === player.id ? 'text-white/60' : 'text-gray-400'}`}>{player.position || ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Results + indicator notes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-800">النتائج والتعليقات</h3>
                  {selectedPlayer && (
                    <Button size="sm" onClick={() => setConfirmSaveResults(true)} loading={saving}>
                      <Save className="w-3 h-3" /> حفظ
                    </Button>
                  )}
                </div>
                {!selectedPlayer ? (
                  <p className="text-xs text-gray-400 text-center py-4">اختر لاعباً أولاً</p>
                ) : sessionIndicators.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    <p className="text-xs">لم يتم تحديد مؤشرات لهذه الجلسة</p>
                    <p className="text-xs text-gray-300 mt-1">عدّل الجلسة لإضافة المؤشرات</p>
                  </div>
                ) : (
                  <div className="space-y-4 pl-1">
                    {sessionIndicators.map(indicator => (
                      <div key={indicator.id} className="border border-gray-100 rounded-lg p-2.5 bg-gray-50/50">
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                          {indicator.name_ar || indicator.name}
                          {indicator.unit && <span className="text-gray-400 font-normal mr-1">({indicator.unit})</span>}
                        </label>

                        {indicator.type === 'numeric' && (
                          <input type="number" value={values[indicator.id] || ''} onChange={e => setValues(v => ({ ...v, [indicator.id]: e.target.value }))} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2040] bg-white" min={indicator.min_value} max={indicator.max_value} />
                        )}
                        {indicator.type === 'rating' && (
                          <div className="flex items-center gap-2">
                            <input type="number" min={1} max={10} value={values[indicator.id] || ''} onChange={e => setValues(v => ({ ...v, [indicator.id]: e.target.value }))} className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2040] bg-white" />
                            <span className="text-xs text-gray-400">من 10</span>
                            {values[indicator.id] && (
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="h-2 rounded-full bg-[#0f2040]" style={{ width: `${(parseFloat(values[indicator.id]) / 10) * 100}%` }} />
                              </div>
                            )}
                          </div>
                        )}
                        {indicator.type === 'text' && (
                          <input type="text" value={values[indicator.id] || ''} onChange={e => setValues(v => ({ ...v, [indicator.id]: e.target.value }))} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2040] bg-white" />
                        )}
                        {indicator.type === 'choice' && (
                          <select value={values[indicator.id] || ''} onChange={e => setValues(v => ({ ...v, [indicator.id]: e.target.value }))} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2040] bg-white">
                            <option value="">اختر...</option>
                            {(indicator.choices || []).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        )}

                        <button
                          onClick={() => setExpandedNotes(n => ({ ...n, [indicator.id]: !n[indicator.id] }))}
                          className="flex items-center gap-1 mt-1.5 text-xs text-gray-400 hover:text-[#0f2040] transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {indicatorNotes[indicator.id] ? 'تعليق المدرب ✓' : 'إضافة تعليق'}
                          {expandedNotes[indicator.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {expandedNotes[indicator.id] && (
                          <textarea
                            rows={2}
                            placeholder="اشرح هنا سبب هذا التقييم أو أي ملاحظة إضافية..."
                            value={indicatorNotes[indicator.id] || ''}
                            onChange={e => setIndicatorNotes(n => ({ ...n, [indicator.id]: e.target.value }))}
                            className="w-full mt-1.5 px-2 py-1.5 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50/50 resize-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Player Evaluation Panel ──────────────────────────────────── */}
            {selectedPlayer && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setEvalExpanded(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#0f2040] rounded-lg flex items-center justify-center text-white text-xs font-bold">{selectedPlayer.full_name.charAt(0)}</div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">التقييم الشامل للاعب</p>
                      <p className="text-xs text-gray-400">{selectedPlayer.full_name} — المستهدفات، الإيجابيات والسلبيات، التوصيات</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {evalSaved && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" /> تم الحفظ</span>}
                    {evalExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {evalExpanded && (
                  <div className="border-t border-gray-100 p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                          <Target className="w-4 h-4 text-blue-500" /> المستهدفات
                        </label>
                        <textarea rows={4} placeholder="ما الذي يستهدف اللاعب تحقيقه خلال البرنامج؟" value={targets} onChange={e => setTargets(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2 mt-4">
                          <Lightbulb className="w-4 h-4 text-yellow-500" /> التوصيات
                        </label>
                        <textarea rows={4} placeholder="التوصيات النهائية للمدرب..." value={genRecs} onChange={e => setGenRecs(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-green-700 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-500" /> الإيجابيات
                        </label>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 min-h-[120px] space-y-1.5 mb-2">
                          {positives.length === 0 && <p className="text-xs text-green-400 text-center py-2">اضغط Enter لإضافة نقطة</p>}
                          {positives.map((p, i) => (
                            <div key={i} className="flex items-start gap-1.5 group">
                              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                              <span className="text-xs text-gray-700 flex-1">{p}</span>
                              <button onClick={() => setPositives(v => v.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0">×</button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={posInput} onChange={e => setPosInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addBullet(positives, setPositives, posInput, () => setPosInput('')); e.preventDefault() } }} placeholder="اكتب واضغط Enter..." className="flex-1 px-2.5 py-1.5 text-xs border border-green-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 bg-green-50" />
                          <button onClick={() => addBullet(positives, setPositives, posInput, () => setPosInput(''))} className="px-2.5 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-red-700 mb-2">
                          <XCircle className="w-4 h-4 text-red-500" /> السلبيات / نقاط التطوير
                        </label>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 min-h-[120px] space-y-1.5 mb-2">
                          {negatives.length === 0 && <p className="text-xs text-red-400 text-center py-2">اضغط Enter لإضافة نقطة</p>}
                          {negatives.map((n, i) => (
                            <div key={i} className="flex items-start gap-1.5 group">
                              <span className="text-red-400 mt-0.5 shrink-0">×</span>
                              <span className="text-xs text-gray-700 flex-1">{n}</span>
                              <button onClick={() => setNegatives(v => v.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0">×</button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={negInput} onChange={e => setNegInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addBullet(negatives, setNegatives, negInput, () => setNegInput('')); e.preventDefault() } }} placeholder="اكتب واضغط Enter..." className="flex-1 px-2.5 py-1.5 text-xs border border-red-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 bg-red-50" />
                          <button onClick={() => addBullet(negatives, setNegatives, negInput, () => setNegInput(''))} className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                      <Button onClick={saveEvaluation} loading={evalSaving} size="sm">
                        <Save className="w-4 h-4" /> حفظ التقييم الشامل
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session modal */}
      <Modal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} title={editingSession ? 'تعديل الجلسة' : 'جلسة تقييم جديدة'} size="lg">
        <div className="space-y-4">
          <Input label="اسم الجلسة *" value={sessionForm.name} onChange={e => setSessionForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: تقييم الأسبوع الأول" />
          <Input label="تاريخ الجلسة" type="date" value={sessionForm.session_date} onChange={e => setSessionForm(f => ({ ...f, session_date: e.target.value }))} />
          <textarea className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]" rows={2} placeholder="ملاحظات..." value={sessionForm.notes} onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} />

          {/* Indicator selection */}
          {programIndicators.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">المؤشرات التي ستُقاس في هذه الجلسة</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSessionIndicatorIds(new Set(programIndicators.map(i => i.id)))} className="text-xs text-[#0f2040] hover:underline">تحديد الكل</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={() => setSessionIndicatorIds(new Set())} className="text-xs text-gray-400 hover:underline">إلغاء الكل</button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {programIndicators.map(ind => (
                  <label key={ind.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={sessionIndicatorIds.has(ind.id)}
                      onChange={() => toggleSessionIndicator(ind.id)}
                      className="rounded text-[#0f2040]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ind.name_ar || ind.name}</p>
                      {ind.unit && <p className="text-xs text-gray-400">{ind.unit}</p>}
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
              {sessionIndicatorIds.size === 0 && (
                <p className="text-xs text-amber-600 mt-1">يجب اختيار مؤشر واحد على الأقل</p>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setSessionModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSessionModalSave} loading={saving} disabled={!sessionForm.name || sessionIndicatorIds.size === 0}>
              {editingSession ? 'حفظ التعديلات' : 'إنشاء'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, session: null })} onConfirm={doDeleteSession} title="حذف الجلسة" message={`هل أنت متأكد من حذف جلسة "${confirmDelete.session?.name}"؟ سيتم حذف جميع النتائج المرتبطة.`} confirmLabel="حذف" variant="danger" loading={saving} />
      <ConfirmModal open={confirmSaveEdit} onClose={() => setConfirmSaveEdit(false)} onConfirm={doUpdateSession} title="تأكيد التعديل" message="هل أنت متأكد من حفظ التغييرات على الجلسة؟" confirmLabel="حفظ" variant="warning" loading={saving} />
      <ConfirmModal open={confirmSaveResults} onClose={() => setConfirmSaveResults(false)} onConfirm={doSaveResults} title="تأكيد حفظ النتائج" message={`هل أنت متأكد من حفظ نتائج "${selectedPlayer?.full_name}" في هذه الجلسة؟`} confirmLabel="حفظ" variant="info" loading={saving} />
    </AppLayout>
  )
}
