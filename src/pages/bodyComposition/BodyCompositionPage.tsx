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
function getStatus(v?: number, min?: number, max?: number): { label: string; color: string; bg: string } {
  if (v === undefined || v === null || !min || !max) return { label: '', color: '#888', bg: '#f5f5f5' }
  if (v < min) return { label: 'منخفض', color: '#3498db', bg: '#eaf4ff' }
  if (v > max) return { label: 'مرتفع', color: '#e74c3c', bg: '#fff0f0' }
  return { label: 'طبيعي', color: '#00a86b', bg: '#f0faf5' }
}

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

// ── Range bar component ───────────────────────────────────────────────────────
function RangeBar({ value, min, max, unit }: { value?: number; min?: number; max?: number; unit?: string }) {
  if (!value || !min || !max) return null
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const st = getStatus(value, min, max)
  return (
    <div className="mt-1">
      <div className="relative h-2 bg-gray-200 rounded-full">
        <div className="absolute inset-0 mx-4 bg-green-200 rounded-full" />
        <div className="absolute h-3 w-1 bg-gray-700 rounded-full top-[-2px]" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }} />
      </div>
      <div className="flex justify-between text-[10px] mt-0.5">
        <span className="text-gray-400">{min}{unit}</span>
        <span className="font-semibold" style={{ color: st.color }}>{st.label}</span>
        <span className="text-gray-400">{max}{unit}</span>
      </div>
    </div>
  )
}

// ── Metric card with range ────────────────────────────────────────────────────
function MetricCard({
  label, value, unit, min, max, big = false
}: { label: string; value?: number; unit?: string; min?: number; max?: number; big?: boolean }) {
  const st = getStatus(value, min, max)
  const hasRange = min !== undefined && max !== undefined && value !== undefined
  return (
    <div className={`rounded-xl border p-3 ${hasRange ? '' : 'border-gray-100 bg-white'}`}
      style={hasRange ? { borderColor: st.color + '40', backgroundColor: st.bg } : {}}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className={`font-bold ${big ? 'text-2xl' : 'text-lg'} text-gray-900`}>{f(value)}</span>
        {unit && <span className="text-xs text-gray-400 mb-0.5">{unit}</span>}
        {hasRange && (
          <span className="text-xs font-semibold mr-auto" style={{ color: st.color }}>{st.label}</span>
        )}
      </div>
      {hasRange && <RangeBar value={value} min={min} max={max} unit={unit} />}
      {hasRange && <p className="text-[10px] text-gray-400 mt-1">المدى الطبيعي: {min}–{max} {unit}</p>}
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

// ── Measurement row (value + min + max) ───────────────────────────────────────
function MRow({
  label, unit, vk, mink, maxk, form, setForm,
}: {
  label: string; unit?: string; vk: string; mink?: string; maxk?: string;
  form: Record<string, string>; setForm: (fn: (f: Record<string, string>) => Record<string, string>) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-600">{label}{unit ? ` (${unit})` : ''}</p>
      <div className={`grid gap-2 ${mink && maxk ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <Input
          label="القيمة"
          type="number"
          step="0.01"
          value={form[vk] || ''}
          onChange={e => setForm(f => ({ ...f, [vk]: e.target.value }))}
        />
        {mink && (
          <Input
            label="أدنى الطبيعي"
            type="number"
            step="0.01"
            value={form[mink] || ''}
            onChange={e => setForm(f => ({ ...f, [mink]: e.target.value }))}
          />
        )}
        {maxk && (
          <Input
            label="أعلى الطبيعي"
            type="number"
            step="0.01"
            value={form[maxk] || ''}
            onChange={e => setForm(f => ({ ...f, [maxk]: e.target.value }))}
          />
        )}
      </div>
    </div>
  )
}

// ── empty form ────────────────────────────────────────────────────────────────
const emptyForm: Record<string, string> = {
  measurement_date: new Date().toISOString().split('T')[0],
  weight_kg: '', height_cm: '', bmi: '', ffmi: '',
  fat_free_mass_kg: '', fat_free_mass_min: '', fat_free_mass_max: '',
  body_fat_percentage: '', body_fat_percentage_min: '', body_fat_percentage_max: '',
  muscle_mass_kg: '', muscle_mass_min: '', muscle_mass_max: '',
  body_fat_mass_kg: '', body_fat_mass_min: '', body_fat_mass_max: '',
  soft_lean_mass_kg: '', soft_lean_mass_min: '', soft_lean_mass_max: '',
  total_body_water_kg: '', total_body_water_min: '', total_body_water_max: '',
  protein_kg: '', protein_min: '', protein_max: '',
  mineral_kg: '', mineral_min: '', mineral_max: '',
  bmr_kcal: '',
  visceral_fat_index: '', visceral_fat_min: '', visceral_fat_max: '',
  tee_kcal: '',
  left_arm_lean_kg: '', left_arm_lean_min: '', left_arm_lean_max: '',
  right_arm_lean_kg: '', right_arm_lean_min: '', right_arm_lean_max: '',
  trunk_lean_kg: '', trunk_lean_min: '', trunk_lean_max: '',
  left_leg_lean_kg: '', left_leg_lean_min: '', left_leg_lean_max: '',
  right_leg_lean_kg: '', right_leg_lean_min: '', right_leg_lean_max: '',
  left_arm_fat_kg: '', left_arm_fat_min: '', left_arm_fat_max: '',
  right_arm_fat_kg: '', right_arm_fat_min: '', right_arm_fat_max: '',
  trunk_fat_kg: '', trunk_fat_min: '', trunk_fat_max: '',
  left_leg_fat_kg: '', left_leg_fat_min: '', left_leg_fat_max: '',
  right_leg_fat_kg: '', right_leg_fat_min: '', right_leg_fat_max: '',
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
    fat_free_mass_kg: s(r.fat_free_mass_kg), fat_free_mass_min: s(r.fat_free_mass_min), fat_free_mass_max: s(r.fat_free_mass_max),
    body_fat_percentage: s(r.body_fat_percentage), body_fat_percentage_min: s(r.body_fat_percentage_min), body_fat_percentage_max: s(r.body_fat_percentage_max),
    muscle_mass_kg: s(r.muscle_mass_kg), muscle_mass_min: s(r.muscle_mass_min), muscle_mass_max: s(r.muscle_mass_max),
    body_fat_mass_kg: s(r.body_fat_mass_kg), body_fat_mass_min: s(r.body_fat_mass_min), body_fat_mass_max: s(r.body_fat_mass_max),
    soft_lean_mass_kg: s(r.soft_lean_mass_kg), soft_lean_mass_min: s(r.soft_lean_mass_min), soft_lean_mass_max: s(r.soft_lean_mass_max),
    total_body_water_kg: s(r.total_body_water_kg), total_body_water_min: s(r.total_body_water_min), total_body_water_max: s(r.total_body_water_max),
    protein_kg: s(r.protein_kg), protein_min: s(r.protein_min), protein_max: s(r.protein_max),
    mineral_kg: s(r.mineral_kg), mineral_min: s(r.mineral_min), mineral_max: s(r.mineral_max),
    bmr_kcal: s(r.bmr_kcal), visceral_fat_index: s(r.visceral_fat_index), visceral_fat_min: s(r.visceral_fat_min), visceral_fat_max: s(r.visceral_fat_max), tee_kcal: s(r.tee_kcal),
    left_arm_lean_kg: s(r.left_arm_lean_kg), left_arm_lean_min: s(r.left_arm_lean_min), left_arm_lean_max: s(r.left_arm_lean_max),
    right_arm_lean_kg: s(r.right_arm_lean_kg), right_arm_lean_min: s(r.right_arm_lean_min), right_arm_lean_max: s(r.right_arm_lean_max),
    trunk_lean_kg: s(r.trunk_lean_kg), trunk_lean_min: s(r.trunk_lean_min), trunk_lean_max: s(r.trunk_lean_max),
    left_leg_lean_kg: s(r.left_leg_lean_kg), left_leg_lean_min: s(r.left_leg_lean_min), left_leg_lean_max: s(r.left_leg_lean_max),
    right_leg_lean_kg: s(r.right_leg_lean_kg), right_leg_lean_min: s(r.right_leg_lean_min), right_leg_lean_max: s(r.right_leg_lean_max),
    left_arm_fat_kg: s(r.left_arm_fat_kg), left_arm_fat_min: s(r.left_arm_fat_min), left_arm_fat_max: s(r.left_arm_fat_max),
    right_arm_fat_kg: s(r.right_arm_fat_kg), right_arm_fat_min: s(r.right_arm_fat_min), right_arm_fat_max: s(r.right_arm_fat_max),
    trunk_fat_kg: s(r.trunk_fat_kg), trunk_fat_min: s(r.trunk_fat_min), trunk_fat_max: s(r.trunk_fat_max),
    left_leg_fat_kg: s(r.left_leg_fat_kg), left_leg_fat_min: s(r.left_leg_fat_min), left_leg_fat_max: s(r.left_leg_fat_max),
    right_leg_fat_kg: s(r.right_leg_fat_kg), right_leg_fat_min: s(r.right_leg_fat_min), right_leg_fat_max: s(r.right_leg_fat_max),
    left_upper_arm_cm: s(r.left_upper_arm_cm), right_upper_arm_cm: s(r.right_upper_arm_cm),
    shoulder_width_cm: s(r.shoulder_width_cm), chest_cm: s(r.chest_cm), waist_cm: s(r.waist_cm), hip_cm: s(r.hip_cm),
    left_thigh_cm: s(r.left_thigh_cm), right_thigh_cm: s(r.right_thigh_cm), waist_hip_ratio: s(r.waist_hip_ratio),
    notes: r.notes || '',
  }
}

function formToRecord(form: Record<string, string>): Partial<BodyCompositionRecord> {
  return {
    measurement_date: form.measurement_date,
    weight_kg: pN(form.weight_kg), height_cm: pN(form.height_cm), bmi: pN(form.bmi), ffmi: pN(form.ffmi),
    fat_free_mass_kg: pN(form.fat_free_mass_kg), fat_free_mass_min: pN(form.fat_free_mass_min), fat_free_mass_max: pN(form.fat_free_mass_max),
    body_fat_percentage: pN(form.body_fat_percentage), body_fat_percentage_min: pN(form.body_fat_percentage_min), body_fat_percentage_max: pN(form.body_fat_percentage_max),
    muscle_mass_kg: pN(form.muscle_mass_kg), muscle_mass_min: pN(form.muscle_mass_min), muscle_mass_max: pN(form.muscle_mass_max),
    body_fat_mass_kg: pN(form.body_fat_mass_kg), body_fat_mass_min: pN(form.body_fat_mass_min), body_fat_mass_max: pN(form.body_fat_mass_max),
    soft_lean_mass_kg: pN(form.soft_lean_mass_kg), soft_lean_mass_min: pN(form.soft_lean_mass_min), soft_lean_mass_max: pN(form.soft_lean_mass_max),
    total_body_water_kg: pN(form.total_body_water_kg), total_body_water_min: pN(form.total_body_water_min), total_body_water_max: pN(form.total_body_water_max),
    protein_kg: pN(form.protein_kg), protein_min: pN(form.protein_min), protein_max: pN(form.protein_max),
    mineral_kg: pN(form.mineral_kg), mineral_min: pN(form.mineral_min), mineral_max: pN(form.mineral_max),
    bmr_kcal: pN(form.bmr_kcal), visceral_fat_index: pN(form.visceral_fat_index), visceral_fat_min: pN(form.visceral_fat_min), visceral_fat_max: pN(form.visceral_fat_max), tee_kcal: pN(form.tee_kcal),
    left_arm_lean_kg: pN(form.left_arm_lean_kg), left_arm_lean_min: pN(form.left_arm_lean_min), left_arm_lean_max: pN(form.left_arm_lean_max),
    right_arm_lean_kg: pN(form.right_arm_lean_kg), right_arm_lean_min: pN(form.right_arm_lean_min), right_arm_lean_max: pN(form.right_arm_lean_max),
    trunk_lean_kg: pN(form.trunk_lean_kg), trunk_lean_min: pN(form.trunk_lean_min), trunk_lean_max: pN(form.trunk_lean_max),
    left_leg_lean_kg: pN(form.left_leg_lean_kg), left_leg_lean_min: pN(form.left_leg_lean_min), left_leg_lean_max: pN(form.left_leg_lean_max),
    right_leg_lean_kg: pN(form.right_leg_lean_kg), right_leg_lean_min: pN(form.right_leg_lean_min), right_leg_lean_max: pN(form.right_leg_lean_max),
    left_arm_fat_kg: pN(form.left_arm_fat_kg), left_arm_fat_min: pN(form.left_arm_fat_min), left_arm_fat_max: pN(form.left_arm_fat_max),
    right_arm_fat_kg: pN(form.right_arm_fat_kg), right_arm_fat_min: pN(form.right_arm_fat_min), right_arm_fat_max: pN(form.right_arm_fat_max),
    trunk_fat_kg: pN(form.trunk_fat_kg), trunk_fat_min: pN(form.trunk_fat_min), trunk_fat_max: pN(form.trunk_fat_max),
    left_leg_fat_kg: pN(form.left_leg_fat_kg), left_leg_fat_min: pN(form.left_leg_fat_min), left_leg_fat_max: pN(form.left_leg_fat_max),
    right_leg_fat_kg: pN(form.right_leg_fat_kg), right_leg_fat_min: pN(form.right_leg_fat_min), right_leg_fat_max: pN(form.right_leg_fat_max),
    left_upper_arm_cm: pN(form.left_upper_arm_cm), right_upper_arm_cm: pN(form.right_upper_arm_cm),
    shoulder_width_cm: pN(form.shoulder_width_cm), chest_cm: pN(form.chest_cm), waist_cm: pN(form.waist_cm), hip_cm: pN(form.hip_cm),
    left_thigh_cm: pN(form.left_thigh_cm), right_thigh_cm: pN(form.right_thigh_cm), waist_hip_ratio: pN(form.waist_hip_ratio),
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

  const latest  = records[records.length - 1]
  const first   = records[0]
  const age     = calcAge(selectedPlayer?.date_of_birth)

  // ── Chart data ────────────────────────────────────────────────────────────
  const trendData = records.map(r => ({
    date: r.measurement_date,
    'الوزن كجم':       r.weight_kg,
    'الدهون %':        r.body_fat_percentage,
    'عضلات كجم':       r.muscle_mass_kg,
    'كتلة خالية كجم':  r.fat_free_mass_kg,
  }))

  const girthData = records.map(r => ({
    date: r.measurement_date,
    'خصر': r.waist_cm,
    'صدر': r.chest_cm,
    'ورك': r.hip_cm,
  }))

  const segmentData = latest ? [
    { name: 'ذراع يسرى', هزيل: latest.left_arm_lean_kg, دهون: latest.left_arm_fat_kg },
    { name: 'ذراع يمنى', هزيل: latest.right_arm_lean_kg, دهون: latest.right_arm_fat_kg },
    { name: 'جذع',       هزيل: latest.trunk_lean_kg,      دهون: latest.trunk_fat_kg },
    { name: 'ساق يسرى',  هزيل: latest.left_leg_lean_kg,  دهون: latest.left_leg_fat_kg },
    { name: 'ساق يمنى',  هزيل: latest.right_leg_lean_kg, دهون: latest.right_leg_fat_kg },
  ] : []

  const hasSegment = segmentData.some(d => d.هزيل || d.دهون)

  const radarData = (() => {
    if (!latest || !first || records.length < 2) return []
    const normalize = (val?: number, min?: number, max?: number) => {
      if (!val || !min || !max || max === min) return 50
      return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100))
    }
    return [
      { subject: 'كتلة خالية', آخر: normalize(latest.fat_free_mass_kg, latest.fat_free_mass_min, latest.fat_free_mass_max), أول: normalize(first.fat_free_mass_kg, first.fat_free_mass_min, first.fat_free_mass_max) },
      { subject: 'دهون %', آخر: normalize(latest.body_fat_percentage, latest.body_fat_percentage_min, latest.body_fat_percentage_max), أول: normalize(first.body_fat_percentage, first.body_fat_percentage_min, first.body_fat_percentage_max) },
      { subject: 'عضلات', آخر: normalize(latest.muscle_mass_kg, latest.muscle_mass_min, latest.muscle_mass_max), أول: normalize(first.muscle_mass_kg, first.muscle_mass_min, first.muscle_mass_max) },
      { subject: 'ماء', آخر: normalize(latest.total_body_water_kg, latest.total_body_water_min, latest.total_body_water_max), أول: normalize(first.total_body_water_kg, first.total_body_water_min, first.total_body_water_max) },
      { subject: 'دهون حشوية', آخر: normalize(latest.visceral_fat_index, latest.visceral_fat_min, latest.visceral_fat_max), أول: normalize(first.visceral_fat_index, first.visceral_fat_min, first.visceral_fat_max) },
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
                {age && <div className="text-center"><p className="text-lg font-bold">{age}</p><p className="text-xs text-white/50">سنة</p></div>}
                {latest?.weight_kg && <div className="text-center"><p className="text-lg font-bold">{f(latest.weight_kg)}</p><p className="text-xs text-white/50">وزن كجم</p></div>}
                {latest?.bmi && <div className="text-center"><p className="text-lg font-bold">{f(latest.bmi)}</p><p className="text-xs text-white/50">BMI</p></div>}
                {latest?.body_fat_percentage && <div className="text-center"><p className="text-lg font-bold">{f(latest.body_fat_percentage)}%</p><p className="text-xs text-white/50">دهون</p></div>}
                {latest?.muscle_mass_kg && <div className="text-center"><p className="text-lg font-bold">{f(latest.muscle_mass_kg)}</p><p className="text-xs text-white/50">عضلات كجم</p></div>}
                <div className="mr-auto text-xs text-white/40">آخر قياس: {latest?.measurement_date}</div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
              {[
                { id: 'summary', label: 'ملخص', icon: Scale },
                { id: 'charts',  label: 'الرسوم البيانية', icon: TrendingUp },
                { id: 'records', label: 'السجلات', icon: Activity },
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

            {/* ── Summary Tab ────────────────────────────────────────────── */}
            {activeTab === 'summary' && latest && (
              <div className="space-y-4">
                {/* Basic */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">الأساسيات</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard label="الوزن" value={latest.weight_kg} unit="كجم" big />
                    <MetricCard label="الطول" value={latest.height_cm} unit="سم" big />
                    <MetricCard label="BMI"   value={latest.bmi} big />
                    <MetricCard label="FFMI"  value={latest.ffmi} big />
                  </div>
                </div>

                {/* Body Composition */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">تركيبة الجسم</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <MetricCard label="الكتلة الخالية من الدهون" value={latest.fat_free_mass_kg} unit="كجم" min={latest.fat_free_mass_min} max={latest.fat_free_mass_max} />
                    <MetricCard label="نسبة الدهون" value={latest.body_fat_percentage} unit="%" min={latest.body_fat_percentage_min} max={latest.body_fat_percentage_max} />
                    <MetricCard label="الكتلة العضلية الهيكلية" value={latest.muscle_mass_kg} unit="كجم" min={latest.muscle_mass_min} max={latest.muscle_mass_max} />
                    <MetricCard label="كتلة الدهون" value={latest.body_fat_mass_kg} unit="كجم" min={latest.body_fat_mass_min} max={latest.body_fat_mass_max} />
                    <MetricCard label="الكتلة الهزيلة الناعمة" value={latest.soft_lean_mass_kg} unit="كجم" min={latest.soft_lean_mass_min} max={latest.soft_lean_mass_max} />
                  </div>
                </div>

                {/* Biological */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">المؤشرات البيولوجية</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <MetricCard label="الماء الكلي" value={latest.total_body_water_kg} unit="كجم" min={latest.total_body_water_min} max={latest.total_body_water_max} />
                    <MetricCard label="البروتين" value={latest.protein_kg} unit="كجم" min={latest.protein_min} max={latest.protein_max} />
                    <MetricCard label="المعادن" value={latest.mineral_kg} unit="كجم" min={latest.mineral_min} max={latest.mineral_max} />
                    <MetricCard label="مؤشر الدهون الحشوية" value={latest.visceral_fat_index} min={latest.visceral_fat_min} max={latest.visceral_fat_max} />
                    <MetricCard label="معدل الأيض الأساسي" value={latest.bmr_kcal} unit="kcal" />
                    <MetricCard label="إجمالي إنفاق الطاقة" value={latest.tee_kcal} unit="kcal" />
                  </div>
                </div>

                {/* Segment Analysis */}
                {hasSegment && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm">تحليل الأجزاء</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">الجزء</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-[#0f2040]">كتلة هزيلة (كجم)</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-[#0f2040]">المدى الطبيعي</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">الحالة</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-[#d4af37]">دهون (كجم)</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-[#d4af37]">المدى الطبيعي</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {[
                            { name: 'ذراع يسرى', lk: 'left_arm_lean_kg',  lmin: 'left_arm_lean_min',  lmax: 'left_arm_lean_max',  fk: 'left_arm_fat_kg',  fmin: 'left_arm_fat_min',  fmax: 'left_arm_fat_max'  },
                            { name: 'ذراع يمنى', lk: 'right_arm_lean_kg', lmin: 'right_arm_lean_min', lmax: 'right_arm_lean_max', fk: 'right_arm_fat_kg', fmin: 'right_arm_fat_min', fmax: 'right_arm_fat_max' },
                            { name: 'الجذع',     lk: 'trunk_lean_kg',     lmin: 'trunk_lean_min',     lmax: 'trunk_lean_max',     fk: 'trunk_fat_kg',     fmin: 'trunk_fat_min',     fmax: 'trunk_fat_max'     },
                            { name: 'ساق يسرى',  lk: 'left_leg_lean_kg',  lmin: 'left_leg_lean_min',  lmax: 'left_leg_lean_max',  fk: 'left_leg_fat_kg',  fmin: 'left_leg_fat_min',  fmax: 'left_leg_fat_max'  },
                            { name: 'ساق يمنى',  lk: 'right_leg_lean_kg', lmin: 'right_leg_lean_min', lmax: 'right_leg_lean_max', fk: 'right_leg_fat_kg', fmin: 'right_leg_fat_min', fmax: 'right_leg_fat_max' },
                          ].map(seg => {
                            const lv = (latest as Record<string, number | undefined>)[seg.lk]
                            const lmin = (latest as Record<string, number | undefined>)[seg.lmin]
                            const lmax = (latest as Record<string, number | undefined>)[seg.lmax]
                            const fv = (latest as Record<string, number | undefined>)[seg.fk]
                            const fmin = (latest as Record<string, number | undefined>)[seg.fmin]
                            const fmax = (latest as Record<string, number | undefined>)[seg.fmax]
                            const lst = getStatus(lv, lmin, lmax)
                            const fst = getStatus(fv, fmin, fmax)
                            return (
                              <tr key={seg.name} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-700">{seg.name}</td>
                                <td className="px-3 py-2 text-center font-semibold text-[#0f2040]">{f(lv)}</td>
                                <td className="px-3 py-2 text-center text-xs text-gray-400">{lmin && lmax ? `${lmin}–${lmax}` : '—'}</td>
                                <td className="px-3 py-2 text-center"><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: lst.color, background: lst.bg }}>{lst.label || '—'}</span></td>
                                <td className="px-3 py-2 text-center font-semibold text-[#c09020]">{f(fv)}</td>
                                <td className="px-3 py-2 text-center text-xs text-gray-400">{fmin && fmax ? `${fmin}–${fmax}` : '—'}</td>
                                <td className="px-3 py-2 text-center"><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: fst.color, background: fst.bg }}>{fst.label || '—'}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Girth */}
                {(latest.waist_cm || latest.chest_cm || latest.hip_cm || latest.left_upper_arm_cm) && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2"><Ruler className="w-4 h-4" /> المحيطات (سم)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                        <div key={String(lbl)} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">{lbl}</p>
                          <p className="text-lg font-bold text-gray-900">{f(val as number | undefined)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Charts Tab ─────────────────────────────────────────────── */}
            {activeTab === 'charts' && (
              <div className="space-y-4">
                {/* Chart type selector */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'trend', label: 'الاتجاه الزمني' },
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
                        <Tooltip formatter={(v: number) => `${v} كجم`} />
                        <Legend />
                        <Bar dataKey="هزيل" fill="#00a86b" radius={[4,4,0,0]} />
                        <Bar dataKey="دهون" fill="#e74c3c" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {chartType === 'radar' && radarData.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-semibold text-sm text-gray-800 mb-4">مقارنة أول قياس مقابل آخر قياس (موضع داخل المدى الطبيعي)</h3>
                    <p className="text-xs text-gray-400 mb-4">50 = منتصف المدى الطبيعي. فوق 100 = مرتفع، تحت 0 = منخفض</p>
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

            {/* ── Records Tab ────────────────────────────────────────────── */}
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
                          <td className="px-3 py-2 text-gray-700">{r.weight_kg ? `${r.weight_kg}` : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.body_fat_percentage ? `${r.body_fat_percentage}%` : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.muscle_mass_kg ? `${r.muscle_mass_kg}` : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.bmi ? f(r.bmi) : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.ffmi ? f(r.ffmi) : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.waist_cm ? `${r.waist_cm}` : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.bmr_kcal ? `${r.bmr_kcal}` : '—'}</td>
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

      {/* ── Data Entry Modal ─────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingRecord ? 'تعديل القياس' : 'قياس جديد'} size="lg">
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pl-1">
          <Input label="تاريخ القياس *" type="date" value={form.measurement_date} onChange={e => setForm(f => ({ ...f, measurement_date: e.target.value }))} />

          <FormSection title="أ — الأساسيات" defaultOpen>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="الوزن (كجم)" type="number" step="0.1" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
              <Input label="الطول (سم)"  type="number" step="0.1" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
              <Input label="BMI"          type="number" step="0.01" value={form.bmi}       onChange={e => setForm(f => ({ ...f, bmi: e.target.value }))} />
              <Input label="FFMI"         type="number" step="0.01" value={form.ffmi}      onChange={e => setForm(f => ({ ...f, ffmi: e.target.value }))} />
            </div>
          </FormSection>

          <FormSection title="ب — تركيبة الجسم">
            <MRow label="الكتلة الخالية من الدهون" unit="كجم"  vk="fat_free_mass_kg"    mink="fat_free_mass_min"       maxk="fat_free_mass_max"       form={form} setForm={setForm} />
            <MRow label="نسبة الدهون"              unit="%"    vk="body_fat_percentage" mink="body_fat_percentage_min" maxk="body_fat_percentage_max" form={form} setForm={setForm} />
            <MRow label="الكتلة العضلية الهيكلية"  unit="كجم"  vk="muscle_mass_kg"      mink="muscle_mass_min"         maxk="muscle_mass_max"         form={form} setForm={setForm} />
            <MRow label="كتلة الدهون"              unit="كجم"  vk="body_fat_mass_kg"    mink="body_fat_mass_min"       maxk="body_fat_mass_max"       form={form} setForm={setForm} />
            <MRow label="الكتلة الهزيلة الناعمة"   unit="كجم"  vk="soft_lean_mass_kg"   mink="soft_lean_mass_min"      maxk="soft_lean_mass_max"      form={form} setForm={setForm} />
          </FormSection>

          <FormSection title="ج — المؤشرات البيولوجية">
            <MRow label="الماء الكلي للجسم"          unit="كجم"   vk="total_body_water_kg"  mink="total_body_water_min"  maxk="total_body_water_max"  form={form} setForm={setForm} />
            <MRow label="البروتين"                    unit="كجم"   vk="protein_kg"            mink="protein_min"           maxk="protein_max"           form={form} setForm={setForm} />
            <MRow label="المعادن"                     unit="كجم"   vk="mineral_kg"            mink="mineral_min"           maxk="mineral_max"           form={form} setForm={setForm} />
            <MRow label="مؤشر الدهون الحشوية"          vk="visceral_fat_index"     mink="visceral_fat_min"     maxk="visceral_fat_max"     form={form} setForm={setForm} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="معدل الأيض الأساسي (kcal)" type="number" value={form.bmr_kcal}  onChange={e => setForm(f => ({ ...f, bmr_kcal: e.target.value }))} />
              <Input label="إجمالي إنفاق الطاقة (kcal)" type="number" value={form.tee_kcal} onChange={e => setForm(f => ({ ...f, tee_kcal: e.target.value }))} />
            </div>
          </FormSection>

          <FormSection title="د — تحليل الأجزاء: الكتلة الهزيلة">
            <p className="text-xs text-gray-400">لكل جزء: القيمة + أدنى المدى الطبيعي + أعلى المدى الطبيعي</p>
            <MRow label="الذراع اليسرى"  unit="كجم" vk="left_arm_lean_kg"  mink="left_arm_lean_min"  maxk="left_arm_lean_max"  form={form} setForm={setForm} />
            <MRow label="الذراع اليمنى"  unit="كجم" vk="right_arm_lean_kg" mink="right_arm_lean_min" maxk="right_arm_lean_max" form={form} setForm={setForm} />
            <MRow label="الجذع"           unit="كجم" vk="trunk_lean_kg"     mink="trunk_lean_min"     maxk="trunk_lean_max"     form={form} setForm={setForm} />
            <MRow label="الساق اليسرى"   unit="كجم" vk="left_leg_lean_kg"  mink="left_leg_lean_min"  maxk="left_leg_lean_max"  form={form} setForm={setForm} />
            <MRow label="الساق اليمنى"   unit="كجم" vk="right_leg_lean_kg" mink="right_leg_lean_min" maxk="right_leg_lean_max" form={form} setForm={setForm} />
          </FormSection>

          <FormSection title="د — تحليل الأجزاء: الدهون">
            <MRow label="الذراع اليسرى"  unit="كجم" vk="left_arm_fat_kg"  mink="left_arm_fat_min"  maxk="left_arm_fat_max"  form={form} setForm={setForm} />
            <MRow label="الذراع اليمنى"  unit="كجم" vk="right_arm_fat_kg" mink="right_arm_fat_min" maxk="right_arm_fat_max" form={form} setForm={setForm} />
            <MRow label="الجذع"           unit="كجم" vk="trunk_fat_kg"     mink="trunk_fat_min"     maxk="trunk_fat_max"     form={form} setForm={setForm} />
            <MRow label="الساق اليسرى"   unit="كجم" vk="left_leg_fat_kg"  mink="left_leg_fat_min"  maxk="left_leg_fat_max"  form={form} setForm={setForm} />
            <MRow label="الساق اليمنى"   unit="كجم" vk="right_leg_fat_kg" mink="right_leg_fat_min" maxk="right_leg_fat_max" form={form} setForm={setForm} />
          </FormSection>

          <FormSection title="هـ — المحيطات (سم)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input label="عضد يسرى (سم)" type="number" step="0.1" value={form.left_upper_arm_cm}  onChange={e => setForm(f => ({ ...f, left_upper_arm_cm: e.target.value }))} />
              <Input label="عضد يمنى (سم)" type="number" step="0.1" value={form.right_upper_arm_cm} onChange={e => setForm(f => ({ ...f, right_upper_arm_cm: e.target.value }))} />
              <Input label="عرض الكتفين (سم)" type="number" step="0.1" value={form.shoulder_width_cm} onChange={e => setForm(f => ({ ...f, shoulder_width_cm: e.target.value }))} />
              <Input label="الصدر (سم)"     type="number" step="0.1" value={form.chest_cm}          onChange={e => setForm(f => ({ ...f, chest_cm: e.target.value }))} />
              <Input label="الخصر (سم)"     type="number" step="0.1" value={form.waist_cm}          onChange={e => setForm(f => ({ ...f, waist_cm: e.target.value }))} />
              <Input label="الورك (سم)"     type="number" step="0.1" value={form.hip_cm}            onChange={e => setForm(f => ({ ...f, hip_cm: e.target.value }))} />
              <Input label="فخذ يسرى (سم)"  type="number" step="0.1" value={form.left_thigh_cm}    onChange={e => setForm(f => ({ ...f, left_thigh_cm: e.target.value }))} />
              <Input label="فخذ يمنى (سم)"  type="number" step="0.1" value={form.right_thigh_cm}   onChange={e => setForm(f => ({ ...f, right_thigh_cm: e.target.value }))} />
              <Input label="نسبة الخصر/الورك" type="number" step="0.001" value={form.waist_hip_ratio} onChange={e => setForm(f => ({ ...f, waist_hip_ratio: e.target.value }))} />
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
