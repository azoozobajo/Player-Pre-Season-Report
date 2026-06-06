import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { playersService } from '../../services/playersService'
import { notesService } from '../../services/notesService'
import { supabase } from '../../lib/supabase'
import { type Player, type Program, type CoachNote, type Recommendation } from '../../types'
import {
  ArrowRight, User, ClipboardList, Calendar, Scale,
  MessageSquare, Lightbulb, FileText, Save, Plus, Trash2,
  CheckCircle, XCircle, Target, Edit,
} from 'lucide-react'

type RecommendationForm = Pick<Recommendation, 'title' | 'content' | 'priority' | 'status'>

// ── special note categories ───────────────────────────────────────────────────
const CAT_TARGETS   = '__targets__'
const CAT_POSITIVES = '__positives__'
const CAT_NEGATIVES = '__negatives__'
const CAT_RECS_GEN  = '__general_recs__'

const TABS = [
  { id: 'overview',        label: 'نظرة عامة',       icon: User },
  { id: 'notes',           label: 'ملاحظات المدرب',   icon: MessageSquare },
  { id: 'recommendations', label: 'التوصيات',         icon: Lightbulb },
  { id: 'assessments',     label: 'التقييمات',        icon: ClipboardList },
  { id: 'attendance',      label: 'الحضور',           icon: Calendar },
  { id: 'body',            label: 'قياسات الجسم',     icon: Scale },
  { id: 'reports',         label: 'التقارير',         icon: FileText },
]

export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer]       = useState<Player | null>(null)
  const [programs, setPrograms]   = useState<Program[]>([])
  const [selProgram, setSelProgram] = useState<Program | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // ── Evaluation (notes tab) ─────────────────────────────────────────────────
  const [evalNoteMap, setEvalNoteMap]   = useState<Record<string, CoachNote>>({})
  const [targets, setTargets]           = useState('')
  const [positives, setPositives]       = useState<string[]>([])
  const [negatives, setNegatives]       = useState<string[]>([])
  const [genRecs, setGenRecs]           = useState('')
  const [posInput, setPosInput]         = useState('')
  const [negInput, setNegInput]         = useState('')
  const [coachNotes, setCoachNotes]     = useState<CoachNote[]>([])
  const [evalSaving, setEvalSaving]     = useState(false)
  const [evalSaved, setEvalSaved]       = useState(false)

  // ── Recommendations tab ────────────────────────────────────────────────────
  const [recs, setRecs]                 = useState<Recommendation[]>([])
  const [recModal, setRecModal]         = useState(false)
  const [editingRec, setEditingRec]     = useState<Recommendation | null>(null)
  const [recForm, setRecForm]           = useState<RecommendationForm>({ title: '', content: '', priority: 'medium', status: 'pending' })
  const [recSaving, setRecSaving]       = useState(false)
  const [confirmDelRec, setConfirmDelRec] = useState<Recommendation | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const load = async () => {
      const [p, pp] = await Promise.all([
        playersService.getPlayer(id).catch(() => null),
        supabase.from('program_players')
          .select('*, program:programs(*)')
          .eq('player_id', id)
          .then(r => r.data || []),
      ])
      setPlayer(p)
      const progs = (pp as { program: Program }[]).map(x => x.program).filter(Boolean)
      setPrograms(progs)
      if (progs.length > 0) setSelProgram(progs[0])
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!id || !selProgram) return
    loadEvaluation(id, selProgram.id)
    loadRecommendations(id, selProgram.id)
  }, [id, selProgram])

  const loadEvaluation = async (playerId: string, programId: string) => {
    const all = await notesService.getCoachNotes(playerId, programId).catch(() => [])
    const map: Record<string, CoachNote> = {}
    const regular: CoachNote[] = []
    for (const n of all) {
      if (n.category && [CAT_TARGETS, CAT_POSITIVES, CAT_NEGATIVES, CAT_RECS_GEN].includes(n.category)) {
        map[n.category] = n
      } else {
        regular.push(n)
      }
    }
    setEvalNoteMap(map)
    setTargets(map[CAT_TARGETS]?.content || '')
    setPositives(map[CAT_POSITIVES]?.content?.split('\n').filter(Boolean) || [])
    setNegatives(map[CAT_NEGATIVES]?.content?.split('\n').filter(Boolean) || [])
    setGenRecs(map[CAT_RECS_GEN]?.content || '')
    setCoachNotes(regular.slice().reverse())
  }

  const loadRecommendations = async (playerId: string, programId: string) => {
    const data = await notesService.getRecommendations(playerId, programId).catch(() => [])
    setRecs(data)
  }

  // ── Save evaluation ────────────────────────────────────────────────────────
  const saveEvaluation = async () => {
    if (!id || !selProgram) return
    setEvalSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const toSave = [
      { cat: CAT_TARGETS,   content: targets },
      { cat: CAT_POSITIVES, content: positives.join('\n') },
      { cat: CAT_NEGATIVES, content: negatives.join('\n') },
      { cat: CAT_RECS_GEN,  content: genRecs },
    ]
    for (const { cat, content } of toSave) {
      const existing = evalNoteMap[cat]
      if (existing) {
        await notesService.deleteCoachNote(existing.id).catch(() => {})
      }
      if (content.trim()) {
        await notesService.createCoachNote({
          player_id: id, program_id: selProgram.id,
          note_date: today, content, category: cat,
        }).catch(console.error)
      }
    }
    await loadEvaluation(id, selProgram.id)
    setEvalSaving(false)
    setEvalSaved(true)
    setTimeout(() => setEvalSaved(false), 2500)
  }

  const addBullet = (list: string[], setter: (v: string[]) => void, val: string, clear: () => void) => {
    const t = val.trim(); if (!t) return
    setter([...list, t]); clear()
  }

  // ── Recommendations CRUD ───────────────────────────────────────────────────
  const openNewRec = () => {
    setEditingRec(null)
    setRecForm({ title: '', content: '', priority: 'medium', status: 'pending' })
    setRecModal(true)
  }
  const openEditRec = (r: Recommendation) => {
    setEditingRec(r)
    setRecForm({ title: r.title, content: r.content, priority: r.priority, status: r.status })
    setRecModal(true)
  }
  const saveRec = async () => {
    if (!id || !selProgram || !recForm.title.trim()) return
    setRecSaving(true)
    try {
      if (editingRec) {
        await notesService.updateRecommendation(editingRec.id, recForm)
      } else {
        await notesService.createRecommendation({
          player_id: id, program_id: selProgram.id,
          recommendation_date: new Date().toISOString().split('T')[0],
          ...recForm,
        } as Omit<Recommendation, 'id' | 'user_id' | 'created_at'>)
      }
      setRecModal(false)
      await loadRecommendations(id, selProgram.id)
    } catch (e) { console.error(e) }
    setRecSaving(false)
  }
  const deleteRec = async (r: Recommendation) => {
    await notesService.deleteRecommendation(r.id).catch(console.error)
    setConfirmDelRec(null)
    if (id && selProgram) await loadRecommendations(id, selProgram.id)
  }

  const priorityLabel = (p: string) => p === 'high' ? 'عالية' : p === 'medium' ? 'متوسطة' : 'منخفضة'
  const priorityColor = (p: string) => p === 'high' ? 'danger' : p === 'medium' ? 'warning' : 'info'
  const statusLabel   = (s: string) => s === 'pending' ? 'قيد الانتظار' : s === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'

  if (loading) return <AppLayout title="ملف اللاعب"><LoadingSpinner /></AppLayout>
  if (!player) return <AppLayout title="ملف اللاعب"><p className="text-gray-500 text-center py-8">لاعب غير موجود</p></AppLayout>

  const age = player.date_of_birth
    ? Math.floor((Date.now() - new Date(player.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <AppLayout title={player.full_name}>
      <div className="space-y-5">
        <Link to="/players" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowRight className="w-4 h-4" /> العودة إلى اللاعبين
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-l from-[#0a1628] to-[#1e3a6e] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            {/* Avatar with photo support */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-3 border-[#d4af37]/40 bg-[#d4af37]">
              {player.photo_url
                ? <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-[#0a1628] text-3xl font-bold">{player.full_name.charAt(0)}</div>
              }
            </div>
            <div>
              <h2 className="text-xl font-bold">{player.full_name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {player.position      && <Badge variant="gold">{player.position}</Badge>}
                {player.jersey_number && <span className="text-white/70 text-sm">#{player.jersey_number}</span>}
                {age                  && <span className="text-white/70 text-sm">{age} سنة</span>}
                {player.nationality   && <span className="text-white/70 text-sm">{player.nationality}</span>}
              </div>
            </div>
            <div className="mr-auto flex items-center gap-4">
              {player.height_cm && <div className="text-center"><p className="text-lg font-bold">{player.height_cm}</p><p className="text-xs text-white/50">سم</p></div>}
              {player.weight_kg && <div className="text-center"><p className="text-lg font-bold">{player.weight_kg}</p><p className="text-xs text-white/50">كجم</p></div>}
            </div>
          </div>
        </div>

        {/* Program selector */}
        {programs.length > 0 && (
          <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <span className="text-sm font-medium text-gray-600 shrink-0">البرنامج:</span>
            {programs.length === 1 ? (
              <span className="text-sm font-semibold text-[#0f2040]">{selProgram?.name}</span>
            ) : (
              <select
                value={selProgram?.id || ''}
                onChange={e => setSelProgram(programs.find(p => p.id === e.target.value) || null)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
              >
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-[#0f2040] text-white font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">

          {/* ── Overview ─────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">المعلومات الأساسية</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ['الاسم الكامل',     player.full_name],
                  ['المركز',           player.position        || '—'],
                  ['رقم القميص',       player.jersey_number   ? `#${player.jersey_number}` : '—'],
                  ['الجنسية',          player.nationality     || '—'],
                  ['تاريخ الميلاد',    player.date_of_birth   || '—'],
                  ['العمر',            age                    ? `${age} سنة` : '—'],
                  ['الطول',            player.height_cm       ? `${player.height_cm} سم`  : '—'],
                  ['الوزن',            player.weight_kg       ? `${player.weight_kg} كجم` : '—'],
                  ['الهاتف',           player.phone           || '—'],
                  ['البريد الإلكتروني', player.email          || '—'],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{lbl}</p>
                    <p className="text-sm font-medium text-gray-900">{val}</p>
                  </div>
                ))}
              </div>
              {player.notes && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 mb-1">ملاحظات</p>
                  <p className="text-sm text-gray-700">{player.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Coach Notes & Evaluation ──────────────────────────────────── */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {!selProgram ? (
                <p className="text-sm text-gray-400 text-center py-6">اللاعب غير مرتبط بأي برنامج</p>
              ) : (
                <>
                  {/* Evaluation fields */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">التقييم الشامل للاعب</h3>
                      <div className="flex items-center gap-2">
                        {evalSaved && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" /> تم الحفظ</span>}
                        <Button size="sm" onClick={saveEvaluation} loading={evalSaving}>
                          <Save className="w-3.5 h-3.5" /> حفظ التقييم
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      {/* Targets + GenRecs */}
                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                            <Target className="w-4 h-4 text-blue-500" /> المستهدفات
                          </label>
                          <textarea rows={4} placeholder="ما الذي يستهدف اللاعب تحقيقه في هذا البرنامج؟"
                            value={targets} onChange={e => setTargets(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500" /> التوصيات النهائية
                          </label>
                          <textarea rows={4} placeholder="التوصيات العامة للمدرب..."
                            value={genRecs} onChange={e => setGenRecs(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                          />
                        </div>
                      </div>

                      {/* Positives */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-green-700 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-500" /> الإيجابيات
                        </label>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 min-h-[120px] space-y-1.5 mb-2">
                          {positives.length === 0 && <p className="text-xs text-green-400 text-center py-2">اضغط Enter لإضافة نقطة</p>}
                          {positives.map((p, i) => (
                            <div key={i} className="flex items-start gap-1.5 group">
                              <span className="text-green-500 mt-0.5 shrink-0 font-bold">•</span>
                              <span className="text-xs text-gray-700 flex-1">{p}</span>
                              <button onClick={() => setPositives(v => v.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">×</button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={posInput} onChange={e => setPosInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { addBullet(positives, setPositives, posInput, () => setPosInput('')); e.preventDefault() } }}
                            placeholder="اكتب واضغط Enter..."
                            className="flex-1 px-2.5 py-1.5 text-xs border border-green-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 bg-green-50"
                          />
                          <button onClick={() => addBullet(positives, setPositives, posInput, () => setPosInput(''))} className="px-2.5 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>

                      {/* Negatives */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-red-700 mb-2">
                          <XCircle className="w-4 h-4 text-red-500" /> نقاط التطوير
                        </label>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 min-h-[120px] space-y-1.5 mb-2">
                          {negatives.length === 0 && <p className="text-xs text-red-400 text-center py-2">اضغط Enter لإضافة نقطة</p>}
                          {negatives.map((n, i) => (
                            <div key={i} className="flex items-start gap-1.5 group">
                              <span className="text-red-400 mt-0.5 shrink-0 font-bold">•</span>
                              <span className="text-xs text-gray-700 flex-1">{n}</span>
                              <button onClick={() => setNegatives(v => v.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">×</button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={negInput} onChange={e => setNegInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { addBullet(negatives, setNegatives, negInput, () => setNegInput('')); e.preventDefault() } }}
                            placeholder="اكتب واضغط Enter..."
                            className="flex-1 px-2.5 py-1.5 text-xs border border-red-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 bg-red-50"
                          />
                          <button onClick={() => addBullet(negatives, setNegatives, negInput, () => setNegInput(''))} className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Regular coach notes (read-only list) */}
                  {coachNotes.length > 0 && (
                    <div className="border-t pt-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">ملاحظات إضافية من جلسات التقييم</h4>
                      <div className="space-y-2">
                        {coachNotes.map((n, i) => (
                          <div key={n.id || i} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-semibold text-blue-700">{n.category || 'ملاحظة'}</span>
                              <span className="text-xs text-gray-400">{n.note_date}</span>
                            </div>
                            <p className="text-sm text-gray-700">{n.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Recommendations ───────────────────────────────────────────── */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {!selProgram ? (
                <p className="text-sm text-gray-400 text-center py-6">اللاعب غير مرتبط بأي برنامج</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">التوصيات الرسمية</h3>
                    <Button size="sm" onClick={openNewRec}>
                      <Plus className="w-3.5 h-3.5" /> توصية جديدة
                    </Button>
                  </div>

                  {recs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Lightbulb className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                      <p className="text-sm">لا توجد توصيات. أضف أول توصية لهذا اللاعب.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recs.map((r, i) => (
                        <div key={r.id || i} className={`border rounded-xl p-4 ${r.priority === 'high' ? 'border-red-200 bg-red-50' : r.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Badge variant={priorityColor(r.priority) as 'danger' | 'warning' | 'info'}>{priorityLabel(r.priority)}</Badge>
                                <span className="text-sm font-semibold text-gray-900">{r.title}</span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{r.content}</p>
                              <div className="flex items-center gap-3">
                                <Badge variant="default">{statusLabel(r.status)}</Badge>
                                <span className="text-xs text-gray-400">{r.recommendation_date}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="sm" onClick={() => openEditRec(r)}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => setConfirmDelRec(r)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Static redirect tabs ──────────────────────────────────────── */}
          {activeTab === 'assessments' && (
            <div className="text-center py-8 text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">اذهب إلى صفحة التقييمات لإدارة نتائج هذا اللاعب وتعليقات المؤشرات</p>
              <Link to="/assessments" className="mt-3 inline-block text-sm text-[#0f2040] font-medium hover:underline">الذهاب إلى التقييمات</Link>
            </div>
          )}
          {activeTab === 'attendance' && (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">اذهب إلى صفحة الحضور لمتابعة حضور هذا اللاعب</p>
              <Link to="/attendance" className="mt-3 inline-block text-sm text-[#0f2040] font-medium hover:underline">الذهاب إلى الحضور</Link>
            </div>
          )}
          {activeTab === 'body' && (
            <div className="text-center py-8 text-gray-400">
              <Scale className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">اذهب إلى صفحة قياسات الجسم لمتابعة تطور هذا اللاعب</p>
              <Link to="/body-composition" className="mt-3 inline-block text-sm text-[#0f2040] font-medium hover:underline">الذهاب إلى قياسات الجسم</Link>
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">اذهب إلى صفحة التقارير لإنشاء تقرير لهذا اللاعب</p>
              <Link to="/reports" className="mt-3 inline-block text-sm text-[#0f2040] font-medium hover:underline">الذهاب إلى التقارير</Link>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation modal */}
      <Modal open={recModal} onClose={() => setRecModal(false)} title={editingRec ? 'تعديل التوصية' : 'توصية جديدة'}>
        <div className="space-y-4">
          <Input label="عنوان التوصية *" value={recForm.title} onChange={e => setRecForm(f => ({ ...f, title: e.target.value }))} placeholder="مثال: تطوير السرعة الانفجارية" />
          <textarea rows={4} placeholder="تفاصيل التوصية..."
            value={recForm.content} onChange={e => setRecForm(f => ({ ...f, content: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040] resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="الأولوية" value={recForm.priority} onChange={e => setRecForm(f => ({ ...f, priority: e.target.value as Recommendation['priority'] }))}>
              <option value="high">عالية</option>
              <option value="medium">متوسطة</option>
              <option value="low">منخفضة</option>
            </Select>
            <Select label="الحالة" value={recForm.status} onChange={e => setRecForm(f => ({ ...f, status: e.target.value as Recommendation['status'] }))}>
              <option value="pending">قيد الانتظار</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="completed">مكتمل</option>
            </Select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setRecModal(false)}>إلغاء</Button>
            <Button onClick={saveRec} loading={recSaving} disabled={!recForm.title.trim()}>
              {editingRec ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelRec}
        onClose={() => setConfirmDelRec(null)}
        onConfirm={() => confirmDelRec && deleteRec(confirmDelRec)}
        title="حذف التوصية"
        message={`هل أنت متأكد من حذف توصية "${confirmDelRec?.title}"؟`}
        confirmLabel="حذف"
        variant="danger"
      />
    </AppLayout>
  )
}
