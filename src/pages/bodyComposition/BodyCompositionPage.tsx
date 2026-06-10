import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { bodyCompositionService } from '../../services/bodyCompositionService'
import { type Program, type Player, type BodyCompositionRecord } from '../../types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { Plus, Scale, Trash2, ChevronDown, ChevronUp, TrendingUp, Activity, Ruler } from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────
function f(v?: number, dec = 1): string {
  if (v === undefined || v === null) return '—'
  return v.toFixed(dec)
}

function pN(s: string): number | undefined {
  const n = parseFloat(s)
  return isNaN(n) ? undefined : n
}

function calcAge(dob?: string): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
}

// ── Simple metric card ────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, big = false }: { label: string; value?: number; unit?: string; big?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className={`font-bold ${big ? 'text-2xl' : 'text-lg'} text-gray-900`}>{f(value)}</span>
        {unit && <span className="text-xs text-gray-400 mb-0.5">{unit}</span>}
      </div>
    </div>
  )
}

// ── Section toggle ────────────────────────────────────────────────────────────
function FormSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}

// ── empty form ────────────────────────────────────────────────────────────────
const emptyForm: Record<string, string> = {
  measurement_date: new Date().toISOString().split('T')[0],
  weight_kg: '', height_cm: '', bmi: '', ffmi: '',
  fat_free_mass_kg: '', body_fat_percentage: '', muscle_mass_kg: '',
  body_fat_mass_kg: '', soft_lean_mass_kg: '',
  total_body_water_kg: '', protein_kg: '', mineral_kg: '',
  bmr_kcal: '', visceral_fat_index: '', tee_kcal: '',
  left_arm_lean_kg: '', right_arm_lean_kg: '', trunk_lean_kg: '',
  left_leg_lean_kg: '', right_leg_lean_kg: '',
  left_arm_fat_kg: '', right_arm_fat_kg: '', trunk_fat_kg: '',
  left_leg_fat_kg: '', right_leg_fat_kg: '',
  left_upper_arm_cm: '', right_upper_arm_cm: '',
  shoulder_width_cm: '', chest_cm: '', waist_cm: '', hip_cm: '',
  left_thigh_cm: '', right_thigh_cm: '', waist_hip_ratio: '',
  notes: '',
}

function recToForm(r: BodyCompositionRecord): Record<string, string> {
  const s = (v?: number) => v !== undefined && v !== null ? String(v) : ''
  return {
    measurement_date: r.measurement_date,
    weight_kg: s(r.weight_kg), height_cm: s(r.height_cm), bmi: s(r.bmi), ffmi: s(r.ffmi),
    fat_free_mass_kg: s(r.fat_free_mass_kg), body_fat_percentage: s(r.body_fat_percentage),
    muscle_mass_kg: s(r.muscle_mass_kg), body_fat_mass_kg: s(r.body_fat_mass_kg),
    soft_lean_mass_kg: s(r.soft_lean_mass_kg),
    total_body_water_kg: s(r.total_body_water_kg), protein_kg: s(r.protein_kg),
    mineral_kg: s(r.mineral_kg), bmr_kcal: s(r.bmr_kcal),
    visceral_fat_index: s(r.visceral_fat_index), tee_kcal: s(r.tee_kcal),
    left_arm_lean_kg: s(r.left_arm_lean_kg), right_arm_lean_kg: s(r.right_arm_lean_kg),
    trunk_lean_kg: s(r.trunk_lean_kg), left_leg_lean_kg: s(r.left_leg_lean_kg),
    right_leg_lean_kg: s(r.right_leg_lean_kg),
    left_arm_fat_kg: s(r.left_arm_fat_kg), right_arm_fat_kg: s(r.right_arm_fat_kg),
    trunk_fat_kg: s(r.trunk_fat_kg), left_leg_fat_kg: s(r.left_leg_fat_kg),
    right_leg_fat_kg: s(r.right_leg_fat_kg),
    left_upper_arm_cm: s(r.left_upper_arm_cm), right_upper_arm_cm: s(r.right_upper_arm_cm),
    shoulder_width_cm: s(r.shoulder_width_cm), chest_cm: s(r.chest_cm),
    waist_cm: s(r.waist_cm), hip_cm: s(r.hip_cm),
    left_thigh_cm: s(r.left_thigh_cm), right_thigh_cm: s(r.right_thigh_cm),
    waist_hip_ratio: s(r.waist_hip_ratio),
    notes: r.notes || '',
  }
}

function formToRecord(form: Record<string, string>): Partial<BodyCompositionRecord> {
  return {
    measurement_date: form.measurement_date,
    weight_kg: pN(form.weight_kg), height_cm: pN(form.height_cm),
    bmi: pN(form.bmi), ffmi: pN(form.ffmi),
    fat_free_mass_kg: pN(form.fat_free_mass_kg),
    body_fat_percentage: pN(form.body_fat_percentage),
    muscle_mass_kg: pN(form.muscle_mass_kg),
    body_fat_mass_kg: pN(form.body_fat_mass_kg),
    soft_lean_mass_kg: pN(form.soft_lean_mass_kg),
    total_body_water_kg: pN(form.total_body_water_kg),
    protein_kg: pN(form.protein_kg), mineral_kg: pN(form.mineral_kg),
    bmr_kcal: pN(form.bmr_kcal), visceral_fat_index: pN(form.visceral_fat_index),
    tee_kcal: pN(form.tee_kcal),
    left_arm_lean_kg: pN(form.left_arm_lean_kg), right_arm_lean_kg: pN(form.right_arm_lean_kg),
    trunk_lean_kg: pN(form.trunk_lean_kg), left_leg_lean_kg: pN(form.left_leg_lean_kg),
    right_leg_lean_kg: pN(form.right_leg_lean_kg),
    left_arm_fat_kg: pN(form.left_arm_fat_kg), right_arm_fat_kg: pN(form.right_arm_fat_kg),
    trunk_fat_kg: pN(form.trunk_fat_kg), left_leg_fat_kg: pN(form.left_leg_fat_kg),
    right_leg_fat_kg: pN(form.right_leg_fat_kg),
    left_upper_arm_cm: pN(form.left_upper_arm_cm), right_upper_arm_cm: pN(form.right_upper_arm_cm),
    shoulder_width_cm: pN(form.shoulder_width_cm), chest_cm: pN(form.chest_cm),
    waist_cm: pN(form.waist_cm), hip_cm: pN(form.hip_cm),
    left_thigh_cm: pN(form.left_thigh_cm), right_thigh_cm: pN(form.right_thigh_cm),
    waist_hip_ratio: pN(form.waist_hip_ratio),
    notes: form.notes || undefined,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
export function BodyCompositionPage() {
  const [programs, setPrograms]           = useState<Program[]>([])
  const [players, setPlayers]             = useState<Player[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedPlayerId, setSelectedPlayerId]   = useState('')
  const [selectedPlayer, setSelectedPlayer]       = useState<Player | null>(null)
  const [records, setRecords]             = useState<BodyCompositionRecord[]>([])
  const [loading, setLoading]             = useState(true)
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingRecord, setEditingRecord] = useState<BodyCompositionRecord | null>(null)
  const [form, setForm]                   = useState<Record<string, string>>(emptyForm)
  const [saving, setSaving]               = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<BodyCompositionRecord | null>(null)
  const [activeTab, setActiveTab]         = useState<'summary' | 'charts' | 'records'>('summary')
  const [chartType, setChartType]         = useState<'trend' | 'segment' | 'radar'>('trend')

  useEffect(() => { loadPrograms() }, [])

  const loadPrograms = async () => {
    const data = await programsService.getPrograms().catch(() => [])
    setPrograms(data)
    setLoading(false)
  }

  const handleProgramChange = async (programId: string) => {
    setSelectedProgramId(programId); setSelectedPlayerId(''); setRecords([]); setSelectedPlayer(null)
    if (!programId) return
    const pp = await playersService.getProgramPlayers(programId).catch(() => [])
    setPlayers(pp.map(p => p.player).filter(Boolean) as Player[])
  }

  const handlePlayerChange = async (playerId: string) => {
    setSelectedPlayerId(playerId); setRecords([])
    const player = players.find(p => p.id === playerId) || null
    setSelectedPlayer(player)
    if (!playerId || !selectedProgramId) return
    const data = await bodyCompositionService.getRecords(playerId, selectedProgramId).catch(() => [])
    setRecords(data)
  }

  const openCreate = () => {
    setEditingRecord(null)
    setForm({ ...emptyForm, measurement_date: new Date().toISOString().split('T')[0] })
    setModalOpen(true)
  }

  const openEdit = (r: BodyCompositionRecord) => {
    setEditingRecord(r)
    setForm(recToForm(r))
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!selectedPlayerId || !selectedProgramId) return
    setSaving(true)
    try {
      const recData = formToRecord(form)
      if (editingRecord) {
        await bodyCompositionService.updateRecord(editingRecord.id, recData)
      } else {
        await bodyCompositionService.createRecord({
          ...recData,
          player_id: selectedPlayerId,
          program_id: selectedProgramId,
        } as Omit<BodyCompositionRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      }
      setModalOpen(false)
      await handlePlayerChange(selectedPlayerId)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    await bodyCompositionService.deleteRecord(confirmDelete.id).catch(console.error)
    setConfirmDelete(null)
    await handlePlayerChange(selectedPlayerId)
  }

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const latest = records[records.length - 1]
  const first  = records[0]
  const age    = calcAge(selectedPlayer?.date_of_birth)

  // ── Chart data ────────────────────────────────────────────────────────────
  const trendData = records.map(r => ({
    date: r.measurement_date,
    'الوزن كجم':      r.weight_kg,
    'الدهون %':       r.body_fat_percentage,
    'عضلات كجم':      r.muscle_mass_kg,
    'كتلة خالية كجم': r.fat_free_mass_kg,
  }))

  const girthData = records.map(r => ({
    date: r.measurement_date,
    'خصر': r.waist_cm,
    'صدر': r.chest_cm,
    'ورك': r.hip_cm,
  }))

  const segmentData = latest ? [
    { name: 'ذراع يسرى', هزيل: latest.left_arm_lean_kg,  دهون: latest.left_arm_fat_kg  },
    { name: 'ذراع يمنى', هزيل: latest.right_arm_lean_kg, دهون: latest.right_arm_fat_kg },
    { name: 'جذع',       هزيل: latest.trunk_lean_kg,      دهون: latest.trunk_fat_kg     },
    { name: 'ساق يسرى',  هزيل: latest.left_leg_lean_kg,  دهون: latest.left_leg_fat_kg  },
    { name: 'ساق يمنى',  هزيل: latest.right_leg_lean_kg, دهون: latest.right_leg_fat_kg },
  ] : []
  const hasSegment = segmentData.some(d => d.هزيل || d.دهون)

  const radarData = (() => {
    if (!latest || !first || records.length < 2) return []
    return [
      { subject: 'وزن',        آخر: latest.weight_kg         ?? 0, أول: first.weight_kg         ?? 0 },
      { subject: 'دهون %',     آخر: latest.body_fat_percentage ?? 0, أول: first.body_fat_percentage ?? 0 },
      { subject: 'عضلات',      آخر: latest.muscle_mass_kg     ?? 0, أول: first.muscle_mass_kg     ?? 0 },
      { subject: 'كتلة خالية', آخر: latest.fat_free_mass_kg   ?? 0, أول: first.fat_free_mass_kg   ?? 0 },
      { subject: 'ماء',        آخر: latest.total_body_water_kg ?? 0, أول: first.total_body_water_kg ?? 0 },
    ]
  })()

  if (loading) return <AppLayout title="قياسات الجسم"><LoadingSpinner /></AppLayout>

  return (
    <AppLayout title="قياسات الجسم">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">متابعة قياسات تركيبة الجسم</h2>
          {selectedPlayerId && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" /> قياس جديد
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="البرنامج" value={selectedProgramId} onChange={e => handleProgramChange(e.target.value)}>
            <option value="">اختر البرنامج...</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="اللاعب" value={selectedPlayerId} onChange={e => handlePlayerChange(e.target.value)} disabled={!selectedProgramId}>
            <option value="">اختر اللاعب...</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </Select>
        </div>

        {!selectedPlayerId ? (
          <EmptyState title="اختر برنامجاً ولاعباً" description="لمتابعة قياسات تركيبة الجسم" icon={<Scale className="w-10 h-10" />} />
        ) : records.length === 0 ? (
          <EmptyState
            title="لا توجد قياسات"
            description="أضف أول قياس لهذا اللاعب"
            icon={<Scale className="w-10 h-10" />}
            action={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> إضافة قياس</Button>}
          />
        ) : (
          <div className="space-y-4">
            {/* Player info bar */}
            {selectedPlayer && (
              <div className="bg-[#0f2040] rounded-xl p-3 flex items-center gap-4 text-white flex-wrap">
                <div className="w-10 h-10 rounded-full bg-[#d4af37] flex items-center justify-center text-[#0a1628] font-bold text-lg shrink-0">
                  {selectedPlayer.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{selectedPlayer.full_name}</p>
                  <p className="text-xs text-white/60">{selectedPlayer.position || ''}</p>
                </div>
                {age         && <div className="text-center"><p className="text-lg font-bold">{age}</p><p className="text-xs text-white/50">سنة</p></div>}
                {latest?.weight_kg           && <div className="text-center"><p className="text-lg font-bold">{f(latest.weight_kg)}</p><p className="text-xs text-white/50">وزن كجم</p></div>}
                {latest?.bmi                 && <div className="text-center"><p className="text-lg font-bold">{f(latest.bmi)}</p><p className="text-xs text-white/50">BMI</p></div>}
                {latest?.body_fat_percentage && <div className="text-center"><p className="text-lg font-bold">{f(latest.body_fat_percentage)}%</p><p className="text-xs text-white/50">دهون</p></div>}
                {latest?.muscle_mass_kg      && <div className="text-center"><p className="text-lg font-bold">{f(latest.muscle_mass_kg)}</p><p className="text-xs text-white/50">عضلات كجم</p></div>}
                <div className="mr-auto text-xs text-white/40">آخر قياس: {latest?.measurement_date}</div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
              {[
                { id: 'summary', label: 'ملخص',             icon: Scale },
                { id: 'charts',  label: 'الرسوم البيانية',  icon: TrendingUp },
                { id: 'records', label: 'السجلات',           icon: Activity },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === id ? 'bg-[#0f2040] text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {/* ── Summary ── */}
            {activeTab === 'summary' && latest && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">الأساسيات</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard label="الوزن"  value={latest.weight_kg}  unit="كجم" big />
                    <MetricCard label="الطول"  value={latest.height_cm}  unit="سم"  big />
                    <MetricCard label="BMI"    value={latest.bmi}                   big />
                    <MetricCard label="FFMI"   value={latest.ffmi}                  big />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">تركيبة الجسم</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <MetricCard label="الكتلة الخالية من الدهون" value={latest.fat_free_mass_kg}    unit="كجم" />
                    <MetricCard label="نسبة الدهون"              value={latest.body_fat_percentage} unit="%"   />
                    <MetricCard label="الكتلة العضلية الهيكلية"  value={latest.muscle_mass_kg}      unit="كجم" />
                    <MetricCard label="كتلة الدهون"              value={latest.body_fat_mass_kg}    unit="كجم" />
                    <MetricCard label="الكتلة الهزيلة الناعمة"   value={latest.soft_lean_mass_kg}   unit="كجم" />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">المؤشرات البيولوجية</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <MetricCard label="الماء الكلي"         value={latest.total_body_water_kg} unit="كجم" />
                    <MetricCard label="البروتين"            value={latest.protein_kg}          unit="كجم" />
                    <MetricCard label="المعادن"             value={latest.mineral_kg}          unit="كجم" />
                    <MetricCard label="الدهون الحشوية"      value={latest.visceral_fat_index}             />
                    <MetricCard label="معدل الأيض الأساسي"  value={latest.bmr_kcal}            unit="kcal"/>
                    <MetricCard label="إجمالي إنفاق الطاقة" value={latest.tee_kcal}            unit="kcal"/>
                  </div>
                </div>

                {hasSegment && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm">تحليل الأجزاء</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">الجزء</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-[#0f2040]">كتلة هزيلة (كجم)</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-[#d4af37]">دهون (كجم)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {[
                            { name: 'ذراع يسرى', lv: latest.left_arm_lean_kg,  fv: latest.left_arm_fat_kg  },
                            { name: 'ذراع يمنى', lv: latest.right_arm_lean_kg, fv: latest.right_arm_fat_kg },
                            { name: 'الجذع',     lv: latest.trunk_lean_kg,      fv: latest.trunk_fat_kg     },
                            { name: 'ساق يسرى',  lv: latest.left_leg_lean_kg,  fv: latest.left_leg_fat_kg  },
                            { name: 'ساق يمنى',  lv: latest.right_leg_lean_kg, fv: latest.right_leg_fat_kg },
                          ].map(seg => (
                            <tr key={seg.name} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-700">{seg.name}</td>
                              <td className="px-3 py-2 text-center font-semibold text-[#0f2040]">{f(seg.lv)}</td>
                              <td className="px-3 py-2 text-center font-semibold text-[#c09020]">{f(seg.fv)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(latest.waist_cm || latest.chest_cm || latest.left_upper_arm_cm) && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2"><Ruler className="w-4 h-4" /> المحيطات (سم)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {[
                        ['محيط العضد الأيسر', latest.left_upper_arm_cm],
                        ['محيط العضد الأيمن', latest.right_upper_arm_cm],
                        ['عرض الكتفين',       latest.shoulder_width_cm],
                        ['محيط الصدر',        latest.chest_cm],
                        ['محيط الخصر',        latest.waist_cm],
                        ['محيط الورك',        latest.hip_cm],
                        ['محيط الفخذ الأيسر', latest.left_thigh_cm],
                        ['محيط الفخذ الأيمن', latest.right_thigh_cm],
                        ['نسبة الخصر/الورك',  latest.waist_hip_ratio],
                      ].filter(([, v]) => v !== undefined && v !== null).map(([lbl, val]) => (
                        <MetricCard key={String(lbl)} label={String(lbl)} value={val as number} unit="سم" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Charts ── */}
            {activeTab === 'charts' && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'trend',   label: 'الاتجاه الزمني' },
                    { id: 'segment', label: 'تحليل الأجزاء' },
                    ...(records.length >= 2 ? [{ id: 'radar', label: 'مقارنة أول وآخر قياس' }] : []),
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setChartType(t.id as typeof chartType)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${chartType === t.id ? 'bg-[#0f2040] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0f2040]'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {chartType === 'trend' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <h3 className="font-semibold text-sm text-gray-800 mb-4">تطور تركيبة الجسم</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="الوزن كجم"      stroke="#0f2040" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="الدهون %"        stroke="#e74c3c" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="عضلات كجم"       stroke="#00a86b" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="كتلة خالية كجم"  stroke="#3498db" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <h3 className="font-semibold text-sm text-gray-800 mb-4">تطور المحيطات (سم)</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={girthData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="خصر" stroke="#f39c12" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="صدر" stroke="#9b59b6" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="ورك"  stroke="#e67e22" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {chartType === 'segment' && hasSegment && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-semibold text-sm text-gray-800 mb-4">تحليل الأجزاء — آخر قياس</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={segmentData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} unit=" كجم" />
                        <Tooltip formatter={(v) => [`${v} كجم`]} />
                        <Legend />
                        <Bar dataKey="هزيل" fill="#00a86b" radius={[4,4,0,0]} />
                        <Bar dataKey="دهون" fill="#e74c3c" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {chartType === 'radar' && radarData.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-semibold text-sm text-gray-800 mb-4">مقارنة أول قياس مقابل آخر قياس</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <Radar name={`آخر قياس (${records[records.length - 1]?.measurement_date})`} dataKey="آخر" stroke="#0f2040" fill="#0f2040" fillOpacity={0.2} />
                        <Radar name={`أول قياس (${records[0]?.measurement_date})`} dataKey="أول" stroke="#d4af37" fill="#d4af37" fillOpacity={0.15} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ── Records ── */}
            {activeTab === 'records' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0f2040] text-white">
                      <tr>
                        {['التاريخ','وزن','دهون%','عضلات','BMI','FFMI','خصر','BMR','دهون حشوية',''].map(h => (
                          <th key={h} className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...records].reverse().map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.measurement_date}</td>
                          <td className="px-3 py-2 text-gray-700">{r.weight_kg ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.body_fat_percentage ? `${r.body_fat_percentage}%` : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.muscle_mass_kg ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.bmi ? f(r.bmi) : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.ffmi ? f(r.ffmi) : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.waist_cm ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.bmr_kcal ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.visceral_fat_index ?? '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 text-xs">تعديل</button>
                              <button onClick={() => setConfirmDelete(r)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingRecord ? 'تعديل القياس' : 'قياس جديد'} size="lg">
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pl-1">
          <Input label="تاريخ القياس *" type="date" value={form.measurement_date} onChange={setField('measurement_date')} />

          <FormSection title="أ — الأساسيات" defaultOpen>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="الوزن (كجم)"  type="number" step="0.1"  value={form.weight_kg}  onChange={setField('weight_kg')} />
              <Input label="الطول (سم)"   type="number" step="0.1"  value={form.height_cm}  onChange={setField('height_cm')} />
              <Input label="BMI"           type="number" step="0.01" value={form.bmi}         onChange={setField('bmi')} />
              <Input label="FFMI"          type="number" step="0.01" value={form.ffmi}        onChange={setField('ffmi')} />
            </div>
          </FormSection>

          <FormSection title="ب — تركيبة الجسم">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input label="الكتلة الخالية من الدهون (كجم)" type="number" step="0.1" value={form.fat_free_mass_kg}    onChange={setField('fat_free_mass_kg')} />
              <Input label="نسبة الدهون (%)"                 type="number" step="0.1" value={form.body_fat_percentage} onChange={setField('body_fat_percentage')} />
              <Input label="الكتلة العضلية الهيكلية (كجم)"   type="number" step="0.1" value={form.muscle_mass_kg}      onChange={setField('muscle_mass_kg')} />
              <Input label="كتلة الدهون (كجم)"               type="number" step="0.1" value={form.body_fat_mass_kg}    onChange={setField('body_fat_mass_kg')} />
              <Input label="الكتلة الهزيلة الناعمة (كجم)"    type="number" step="0.1" value={form.soft_lean_mass_kg}   onChange={setField('soft_lean_mass_kg')} />
            </div>
          </FormSection>

          <FormSection title="ج — المؤشرات البيولوجية">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input label="الماء الكلي (كجم)"             type="number" step="0.1" value={form.total_body_water_kg}  onChange={setField('total_body_water_kg')} />
              <Input label="البروتين (كجم)"                type="number" step="0.1" value={form.protein_kg}           onChange={setField('protein_kg')} />
              <Input label="المعادن (كجم)"                 type="number" step="0.1" value={form.mineral_kg}           onChange={setField('mineral_kg')} />
              <Input label="مؤشر الدهون الحشوية"           type="number" step="0.1" value={form.visceral_fat_index}   onChange={setField('visceral_fat_index')} />
              <Input label="معدل الأيض الأساسي (kcal)"     type="number"            value={form.bmr_kcal}             onChange={setField('bmr_kcal')} />
              <Input label="إجمالي إنفاق الطاقة (kcal)"    type="number"            value={form.tee_kcal}             onChange={setField('tee_kcal')} />
            </div>
          </FormSection>

          <FormSection title="د — تحليل الأجزاء: الكتلة الهزيلة (كجم)">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Input label="ذراع يسرى" type="number" step="0.01" value={form.left_arm_lean_kg}  onChange={setField('left_arm_lean_kg')} />
              <Input label="ذراع يمنى" type="number" step="0.01" value={form.right_arm_lean_kg} onChange={setField('right_arm_lean_kg')} />
              <Input label="الجذع"      type="number" step="0.01" value={form.trunk_lean_kg}     onChange={setField('trunk_lean_kg')} />
              <Input label="ساق يسرى"  type="number" step="0.01" value={form.left_leg_lean_kg}  onChange={setField('left_leg_lean_kg')} />
              <Input label="ساق يمنى"  type="number" step="0.01" value={form.right_leg_lean_kg} onChange={setField('right_leg_lean_kg')} />
            </div>
          </FormSection>

          <FormSection title="د — تحليل الأجزاء: الدهون (كجم)">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Input label="ذراع يسرى" type="number" step="0.01" value={form.left_arm_fat_kg}  onChange={setField('left_arm_fat_kg')} />
              <Input label="ذراع يمنى" type="number" step="0.01" value={form.right_arm_fat_kg} onChange={setField('right_arm_fat_kg')} />
              <Input label="الجذع"      type="number" step="0.01" value={form.trunk_fat_kg}     onChange={setField('trunk_fat_kg')} />
              <Input label="ساق يسرى"  type="number" step="0.01" value={form.left_leg_fat_kg}  onChange={setField('left_leg_fat_kg')} />
              <Input label="ساق يمنى"  type="number" step="0.01" value={form.right_leg_fat_kg} onChange={setField('right_leg_fat_kg')} />
            </div>
          </FormSection>

          <FormSection title="هـ — المحيطات (سم)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input label="عضد يسرى"        type="number" step="0.1" value={form.left_upper_arm_cm}  onChange={setField('left_upper_arm_cm')} />
              <Input label="عضد يمنى"        type="number" step="0.1" value={form.right_upper_arm_cm} onChange={setField('right_upper_arm_cm')} />
              <Input label="عرض الكتفين"     type="number" step="0.1" value={form.shoulder_width_cm}  onChange={setField('shoulder_width_cm')} />
              <Input label="الصدر"           type="number" step="0.1" value={form.chest_cm}           onChange={setField('chest_cm')} />
              <Input label="الخصر"           type="number" step="0.1" value={form.waist_cm}           onChange={setField('waist_cm')} />
              <Input label="الورك"           type="number" step="0.1" value={form.hip_cm}             onChange={setField('hip_cm')} />
              <Input label="فخذ يسرى"        type="number" step="0.1" value={form.left_thigh_cm}      onChange={setField('left_thigh_cm')} />
              <Input label="فخذ يمنى"        type="number" step="0.1" value={form.right_thigh_cm}     onChange={setField('right_thigh_cm')} />
              <Input label="نسبة الخصر/الورك" type="number" step="0.001" value={form.waist_hip_ratio} onChange={setField('waist_hip_ratio')} />
            </div>
          </FormSection>

          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
            rows={2}
            placeholder="ملاحظات..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
          <Button onClick={handleSave} loading={saving}>{editingRecord ? 'حفظ التعديلات' : 'حفظ القياس'}</Button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف القياس"
        message={`هل أنت متأكد من حذف قياس ${confirmDelete?.measurement_date}؟`}
        confirmLabel="حذف"
        variant="danger"
      />
    </AppLayout>
  )
}
