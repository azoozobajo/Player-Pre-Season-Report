import { useEffect, useState, useRef } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { indicatorsService } from '../../services/indicatorsService'
import { assessmentsService } from '../../services/assessmentsService'
import { attendanceService } from '../../services/attendanceService'
import { settingsService } from '../../services/settingsService'
import { notesService } from '../../services/notesService'
import { categoriesService } from '../../services/categoriesService'
import { bodyCompositionService } from '../../services/bodyCompositionService'
import {
  type Program, type Player, type Indicator, type AssessmentSession,
  type AppSettings, type CoachNote, type Recommendation, type IndicatorCategory,
  type BodyCompositionRecord,
} from '../../types'
import { getIndicatorValue } from '../../utils/progress'
import { FileText, Printer, BarChart3, ChevronUp, ChevronDown, Scale } from 'lucide-react'

// ── special note categories ───────────────────────────────────────────────────
const CAT_TARGETS   = '__targets__'
const CAT_POSITIVES = '__positives__'
const CAT_NEGATIVES = '__negatives__'
const CAT_RECS_GEN  = '__general_recs__'

// ── helpers ───────────────────────────────────────────────────────────────────
function calcAge(dob?: string) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
}

function programDays(start?: string, end?: string): string {
  if (!start || !end) return '—'
  const d = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
  return `${d} يوم`
}

function fmtValue(value: number, indicator: Indicator): string {
  const unit = indicator.unit ? ` ${indicator.unit}` : ''
  if (indicator.type === 'rating') return `${value}/10`
  return `${value}${unit}`
}

interface ImprovementResult {
  pct: number
  positive: boolean
}

function calcImprovement(first: number, last: number, direction: string): ImprovementResult | null {
  if (first === 0) return null
  const diff = last - first
  if (diff === 0) return null
  const pct = Math.abs(diff / first * 100)
  let positive: boolean
  if (direction === 'lower_better')       positive = last < first
  else if (direction === 'higher_better') positive = last > first
  else positive = true
  return { pct: Math.round(pct * 10) / 10, positive }
}

function priorityLabel(p: string) {
  return p === 'high' ? 'عالية' : p === 'medium' ? 'متوسطة' : 'منخفضة'
}
function priorityColor(p: string) {
  return p === 'high' ? '#e74c3c' : p === 'medium' ? '#f39c12' : '#3498db'
}

// ── types ─────────────────────────────────────────────────────────────────────
interface IndicatorRow {
  indicator:  Indicator
  firstValue: number | null
  lastValue:  number | null
  improvement: ImprovementResult | null
  comment:    string | null
}

interface AttSummary {
  total: number; present: number; late: number; absent: number
  attended: number; percentage: number
}

interface ReportData {
  player:       Player
  program:      Program
  categories:   IndicatorCategory[]
  allIndicators: Indicator[]
  rows:         IndicatorRow[]
  sessionCount: number
  firstDate:    string
  lastDate:     string
  att:          AttSummary
  coachNotes:   CoachNote[]
  recommendations: Recommendation[]
  targets:      string
  positives:    string[]
  negatives:    string[]
  genRecs:      string
  settings:     AppSettings | null
  bodyRecs:     BodyCompositionRecord[]
}

// ── Body composition column groups ───────────────────────────────────────────
const BC_COL_GROUPS: { label: string; cols: { key: string; label: string; unit?: string }[] }[] = [
  { label: 'الأساسيات', cols: [
    { key: 'weight_kg',    label: 'الوزن',  unit: 'كجم' },
    { key: 'height_cm',   label: 'الطول',  unit: 'سم'  },
    { key: 'bmi',         label: 'BMI'                 },
    { key: 'ffmi',        label: 'FFMI'                },
  ]},
  { label: 'تركيبة الجسم', cols: [
    { key: 'body_fat_percentage', label: 'نسبة الدهون',    unit: '%'   },
    { key: 'muscle_mass_kg',      label: 'الكتلة العضلية', unit: 'كجم' },
    { key: 'fat_free_mass_kg',    label: 'الكتلة الخالية', unit: 'كجم' },
    { key: 'body_fat_mass_kg',    label: 'كتلة الدهون',    unit: 'كجم' },
    { key: 'soft_lean_mass_kg',   label: 'الكتلة الهزيلة', unit: 'كجم' },
  ]},
  { label: 'المؤشرات البيولوجية', cols: [
    { key: 'total_body_water_kg', label: 'الماء الكلي',       unit: 'كجم'  },
    { key: 'protein_kg',          label: 'البروتين',           unit: 'كجم'  },
    { key: 'mineral_kg',          label: 'المعادن',            unit: 'كجم'  },
    { key: 'visceral_fat_index',  label: 'الدهون الحشوية'                   },
    { key: 'bmr_kcal',            label: 'BMR',                unit: 'kcal' },
    { key: 'tee_kcal',            label: 'TEE',                unit: 'kcal' },
  ]},
  { label: 'المحيطات (سم)', cols: [
    { key: 'waist_cm',          label: 'الخصر'      },
    { key: 'chest_cm',          label: 'الصدر'      },
    { key: 'hip_cm',            label: 'الورك'      },
    { key: 'left_upper_arm_cm', label: 'عضد يسرى'  },
    { key: 'right_upper_arm_cm',label: 'عضد يمنى'  },
    { key: 'shoulder_width_cm', label: 'الكتفين'    },
    { key: 'left_thigh_cm',     label: 'فخذ يسرى'  },
    { key: 'right_thigh_cm',    label: 'فخذ يمنى'  },
    { key: 'waist_hip_ratio',   label: 'خصر/ورك'   },
  ]},
]
const BC_ALL_COLS = BC_COL_GROUPS.flatMap(g => g.cols)
const BC_DEFAULT_COLS = new Set(['weight_kg','height_cm','bmi','ffmi','body_fat_percentage','muscle_mass_kg','fat_free_mass_kg','visceral_fat_index','bmr_kcal','waist_cm'])

// ── Sort arrows for indicator table ──────────────────────────────────────────
function IndSortBtn({ colKey, sortCol, sortDir, onSort }: {
  colKey: string; sortCol: string | null; sortDir: 'asc' | 'desc'
  onSort: (col: string, dir: 'asc' | 'desc') => void
}) {
  return (
    <span className="inline-flex flex-col mr-1 shrink-0">
      <ChevronUp
        className={`w-2.5 h-2.5 cursor-pointer transition-colors ${sortCol === colKey && sortDir === 'asc' ? 'text-[#d4af37]' : 'text-white/35 hover:text-white/70'}`}
        onClick={e => { e.stopPropagation(); onSort(colKey, 'asc') }}
      />
      <ChevronDown
        className={`w-2.5 h-2.5 cursor-pointer transition-colors ${sortCol === colKey && sortDir === 'desc' ? 'text-[#d4af37]' : 'text-white/35 hover:text-white/70'}`}
        onClick={e => { e.stopPropagation(); onSort(colKey, 'desc') }}
      />
    </span>
  )
}

// ── Indicator report types ────────────────────────────────────────────────────
type CellValue = { numeric: number | null; text: string | null }
interface IndicatorReportData {
  indicator: Indicator
  sessions:  AssessmentSession[]
  players:   Player[]
  matrix:    Record<string, Record<string, CellValue>>
}

function calcIndicatorImprovement(
  sessions: AssessmentSession[],
  playerCells: Record<string, CellValue>,
  indicator: Indicator
): ImprovementResult | null {
  if (indicator.type === 'text' || indicator.type === 'choice') return null
  const values = sessions
    .map(s => playerCells[s.id]?.numeric)
    .filter((v): v is number => v !== null && v !== undefined)
  if (values.length < 2) return null
  return calcImprovement(values[0], values[values.length - 1], indicator.direction)
}

// ═════════════════════════════════════════════════════════════════════════════
export function ReportsPage() {
  const [programs, setPrograms]         = useState<Program[]>([])
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState<'player' | 'indicator' | 'bodycomp'>('player')

  // ── Player report tab ─────────────────────────────────────────────────────
  const [players,  setPlayers]          = useState<Player[]>([])
  const [selProgramId, setSelProgramId] = useState('')
  const [selPlayerId,  setSelPlayerId]  = useState('')
  const [data, setData]                 = useState<ReportData | null>(null)
  const [loadingR, setLoadingR]         = useState(false)
  const [printing, setPrinting]         = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  // ── Indicator report tab ──────────────────────────────────────────────────
  const [indProgramId, setIndProgramId]   = useState('')
  const [indIndicators, setIndIndicators] = useState<Indicator[]>([])
  const [indIndicatorId, setIndIndicatorId] = useState('')
  const [indReport, setIndReport]         = useState<IndicatorReportData | null>(null)
  const [loadingIndProg, setLoadingIndProg] = useState(false)
  const [loadingIndR, setLoadingIndR]     = useState(false)
  const indReportRef = useRef<HTMLDivElement>(null)
  const [printingInd, setPrintingInd]     = useState(false)
  const [indSortCol, setIndSortCol]       = useState<string | null>(null)
  const [indSortDir, setIndSortDir]       = useState<'asc' | 'desc'>('desc')

  // ── Body comp sheet tab ───────────────────────────────────────────────────
  const [bcRepProgramId, setBcRepProgramId] = useState('')
  const [bcRepPlayers, setBcRepPlayers]     = useState<Player[]>([])
  const [bcRepRecords, setBcRepRecords]     = useState<Record<string, BodyCompositionRecord | null>>({})
  const [bcRepLoading, setBcRepLoading]     = useState(false)
  const [bcRepSelCols, setBcRepSelCols]     = useState<Set<string>>(new Set(BC_DEFAULT_COLS))
  const [bcRepSortCol, setBcRepSortCol]     = useState<string | null>(null)
  const [bcRepSortDir, setBcRepSortDir]     = useState<'asc' | 'desc'>('desc')

  useEffect(() => { init() }, [])
  const init = async () => {
    const progs = await programsService.getPrograms().catch(() => [])
    setPrograms(progs)
    setLoading(false)
  }

  // ── Player report handlers ─────────────────────────────────────────────────
  const onProgramChange = async (pid: string) => {
    setSelProgramId(pid); setSelPlayerId(''); setData(null)
    if (!pid) return
    const pp = await playersService.getProgramPlayers(pid).catch(() => [])
    setPlayers(pp.map(p => p.player).filter(Boolean) as Player[])
  }

  const onPlayerChange = async (playerId: string) => {
    setSelPlayerId(playerId); setData(null)
    if (!playerId || !selProgramId) return
    setLoadingR(true)
    try {
      const [sessions, allIndicators, rawCategories, attRaw, notes, recs, prog, player, s, bodyRecs] = await Promise.all([
        assessmentsService.getSessions(selProgramId).catch(() => []),
        indicatorsService.getIndicators(selProgramId).catch(() => []),
        categoriesService.getCategories().catch(() => []),
        attendanceService.getPlayerAttendanceSummary(playerId, selProgramId).catch(() => ({ total:0,present:0,late:0,absent:0,attended:0,percentage:0,excused:0 })),
        notesService.getCoachNotes(playerId, selProgramId).catch(() => []),
        notesService.getRecommendations(playerId, selProgramId).catch(() => []),
        programsService.getProgram(selProgramId).catch(() => null),
        playersService.getPlayer(playerId).catch(() => null),
        settingsService.getSettings().catch(() => null),
        bodyCompositionService.getRecords(playerId, selProgramId).catch(() => []),
      ])

      if (!player || !prog) { setLoadingR(false); return }

      const eMap: Record<string, CoachNote> = {}
      for (const n of notes) {
        if (n.category && [CAT_TARGETS,CAT_POSITIVES,CAT_NEGATIVES,CAT_RECS_GEN].includes(n.category)) eMap[n.category] = n
      }
      const targets   = eMap[CAT_TARGETS]?.content || ''
      const positives = eMap[CAT_POSITIVES]?.content?.split('\n').filter(Boolean) || []
      const negatives = eMap[CAT_NEGATIVES]?.content?.split('\n').filter(Boolean) || []
      const genRecs   = eMap[CAT_RECS_GEN]?.content || ''
      const coachNotes = notes.filter(n => !n.category || ![CAT_TARGETS,CAT_POSITIVES,CAT_NEGATIVES,CAT_RECS_GEN].includes(n.category))

      const sorted = [...sessions].sort((a,b) => a.session_date.localeCompare(b.session_date))

      let firstMap = new Map<string, number|null>()
      let lastMap  = new Map<string, number|null>()
      let commentMap = new Map<string, string>()

      if (sorted.length > 0) {
        const [fRes, lRes] = await Promise.all([
          assessmentsService.getResults(sorted[0].id).catch(() => []),
          assessmentsService.getResults(sorted[sorted.length-1].id).catch(() => []),
        ])
        for (const r of fRes.filter(r => r.player_id === playerId)) {
          firstMap.set(r.indicator_id, getIndicatorValue(r))
        }
        for (const r of lRes.filter(r => r.player_id === playerId)) {
          lastMap.set(r.indicator_id, getIndicatorValue(r))
          if (r.notes) commentMap.set(r.indicator_id, r.notes)
        }
      }

      const rows: IndicatorRow[] = allIndicators.map(ind => {
        const fv = firstMap.has(ind.id) ? firstMap.get(ind.id)! : null
        const lv = lastMap.has(ind.id)  ? lastMap.get(ind.id)!  : null
        const imp = (fv !== null && lv !== null) ? calcImprovement(fv, lv, ind.direction) : null
        return { indicator: ind, firstValue: fv, lastValue: lv, improvement: imp, comment: commentMap.get(ind.id) || null }
      })

      const usedCatIds = new Set(allIndicators.map(i => i.category_id).filter(Boolean))
      const cats = rawCategories.filter(c => usedCatIds.has(c.id))
      const att = attRaw as AttSummary

      setData({
        player, program: prog, categories: cats, allIndicators, rows,
        sessionCount: sorted.length,
        firstDate: sorted[0]?.session_date || '',
        lastDate:  sorted[sorted.length-1]?.session_date || '',
        att, coachNotes: coachNotes.slice().reverse(), recommendations: recs,
        targets, positives, negatives, genRecs, settings: s,
        bodyRecs: bodyRecs as BodyCompositionRecord[],
      })
    } catch(e) { console.error(e) }
    setLoadingR(false)
  }

  // ── Indicator report handlers ─────────────────────────────────────────────
  const onIndProgramChange = async (pid: string) => {
    setIndProgramId(pid); setIndIndicatorId(''); setIndReport(null); setIndIndicators([])
    if (!pid) return
    setLoadingIndProg(true)
    const inds = await indicatorsService.getIndicators(pid).catch(() => [])
    setIndIndicators(inds)
    setLoadingIndProg(false)
  }

  const onIndIndicatorChange = async (indId: string) => {
    setIndIndicatorId(indId); setIndReport(null)
    if (!indId || !indProgramId) return
    setLoadingIndR(true)
    try {
      const indicator = indIndicators.find(i => i.id === indId)
      if (!indicator) { setLoadingIndR(false); return }

      const [sessions, programPlayers] = await Promise.all([
        assessmentsService.getSessions(indProgramId).catch(() => []),
        playersService.getProgramPlayers(indProgramId).catch(() => []),
      ])

      const sortedSessions = [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date))
      const allPlayers = programPlayers.map(pp => pp.player).filter(Boolean) as Player[]

      const allSessionResults = await Promise.all(
        sortedSessions.map(s => assessmentsService.getResults(s.id).catch(() => []))
      )

      const matrix: Record<string, Record<string, CellValue>> = {}
      for (let i = 0; i < sortedSessions.length; i++) {
        const session = sortedSessions[i]
        const results = allSessionResults[i].filter(r => r.indicator_id === indId)
        for (const r of results) {
          if (!matrix[r.player_id]) matrix[r.player_id] = {}
          matrix[r.player_id][session.id] = {
            numeric: r.value_numeric ?? r.value_rating ?? null,
            text: r.value_text ?? (r as { value_choice?: string }).value_choice ?? null,
          }
        }
      }

      const activePlayers = allPlayers.filter(p => matrix[p.id] && Object.keys(matrix[p.id]).length > 0)
      setIndReport({ indicator, sessions: sortedSessions, players: activePlayers, matrix })
    } catch(e) { console.error(e) }
    setLoadingIndR(false)
  }

  const onBcRepProgramChange = async (pid: string) => {
    setBcRepProgramId(pid); setBcRepPlayers([]); setBcRepRecords({}); setBcRepSortCol(null)
    if (!pid) return
    setBcRepLoading(true)
    try {
      const pp = await playersService.getProgramPlayers(pid).catch(() => [])
      const pl = pp.map(p => p.player).filter(Boolean) as Player[]
      setBcRepPlayers(pl)
      const recs: Record<string, BodyCompositionRecord | null> = {}
      await Promise.all(pl.map(async p => {
        const data = await bodyCompositionService.getRecords(p.id, pid).catch(() => [])
        recs[p.id] = data.length > 0 ? data[data.length - 1] : null
      }))
      setBcRepRecords(recs)
    } catch(e) { console.error(e) }
    setBcRepLoading(false)
  }

  // ── Print player report ───────────────────────────────────────────────────
  const handlePrint = () => {
    if (!reportRef.current) return
    setPrinting(true)
    const win = window.open('', '_blank', 'width=900,height=800')
    if (!win) { alert('يرجى السماح بالنوافذ المنبثقة في المتصفح'); setPrinting(false); return }
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>تقرير ${data?.player.full_name || 'اللاعب'}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; background: #fff; direction: rtl; }
@page { size: A4; margin: 6mm; }
.page-break { page-break-before: always; }
@media print { .no-print { display: none !important; } }
</style>
</head>
<body>
${reportRef.current.innerHTML}
<div class="no-print" style="position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#0a1628;color:#fff;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.3)" onclick="window.print()">
🖨️ طباعة / حفظ كـ PDF
</div>
</body></html>`)
    win.document.close()
    if (win.document.readyState === 'complete') {
      setTimeout(() => { win.print(); setPrinting(false) }, 600)
    } else {
      win.onload = () => { setTimeout(() => { win.print(); setPrinting(false) }, 400) }
    }
  }

  // ── Print indicator report ────────────────────────────────────────────────
  const handlePrintInd = () => {
    if (!indReportRef.current) return
    setPrintingInd(true)
    const win = window.open('', '_blank', 'width=900,height=800')
    if (!win) { alert('يرجى السماح بالنوافذ المنبثقة في المتصفح'); setPrintingInd(false); return }
    const prog = programs.find(p => p.id === indProgramId)
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>كشف ${indReport?.indicator.name_ar || 'المؤشر'}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; background: #fff; direction: rtl; font-size: 12px; }
@page { size: A4 landscape; margin: 8mm; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: right; }
th { background: #f0f4f8; font-weight: 700; font-size: 11px; }
@media print { .no-print { display: none !important; } }
</style>
</head>
<body>
<div style="margin-bottom:12px">
  <h2 style="font-size:16px;color:#0a1628;margin-bottom:4px">كشف نتائج: ${indReport?.indicator.name_ar || ''}</h2>
  <p style="color:#888;font-size:11px">البرنامج: ${prog?.name || ''} • تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
</div>
${indReportRef.current.innerHTML}
<div class="no-print" style="position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#0a1628;color:#fff;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:13px;" onclick="window.print()">
🖨️ طباعة / حفظ كـ PDF
</div>
</body></html>`)
    win.document.close()
    if (win.document.readyState === 'complete') {
      setTimeout(() => { win.print(); setPrintingInd(false) }, 600)
    } else {
      win.onload = () => { setTimeout(() => { win.print(); setPrintingInd(false) }, 400) }
    }
  }

  if (loading) return <AppLayout title="التقارير"><LoadingSpinner /></AppLayout>

  const showImprovementCol = indReport && (indReport.indicator.type === 'numeric' || indReport.indicator.type === 'rating')

  const handleIndSort = (col: string, dir: 'asc' | 'desc') => {
    setIndSortCol(col); setIndSortDir(dir)
  }

  const sortedBcRepPlayers = bcRepSortCol
    ? [...bcRepPlayers].sort((a, b) => {
        const ar = bcRepRecords[a.id]
        const br = bcRepRecords[b.id]
        const av = ar ? (ar as unknown as Record<string, unknown>)[bcRepSortCol] as number | null : null
        const bv = br ? (br as unknown as Record<string, unknown>)[bcRepSortCol] as number | null : null
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        return bcRepSortDir === 'asc' ? av - bv : bv - av
      })
    : bcRepPlayers

  const sortedIndPlayers = (() => {
    if (!indReport) return []
    const pl = [...indReport.players]
    if (!indSortCol) return pl
    return pl.sort((a, b) => {
      let av: number | null = null, bv: number | null = null
      if (indSortCol === '__imp__') {
        const ai = calcIndicatorImprovement(indReport.sessions, indReport.matrix[a.id] || {}, indReport.indicator)
        const bi = calcIndicatorImprovement(indReport.sessions, indReport.matrix[b.id] || {}, indReport.indicator)
        av = ai ? (ai.positive ? ai.pct : -ai.pct) : null
        bv = bi ? (bi.positive ? bi.pct : -bi.pct) : null
      } else {
        av = indReport.matrix[a.id]?.[indSortCol]?.numeric ?? null
        bv = indReport.matrix[b.id]?.[indSortCol]?.numeric ?? null
      }
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return indSortDir === 'asc' ? av - bv : bv - av
    })
  })()

  return (
    <AppLayout title="التقارير">
      <div className="space-y-4">

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
          <button
            onClick={() => setActiveTab('player')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'player' ? 'bg-[#0f2040] text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <FileText className="w-4 h-4" /> تقرير اللاعب
          </button>
          <button
            onClick={() => setActiveTab('indicator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'indicator' ? 'bg-[#0f2040] text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <BarChart3 className="w-4 h-4" /> كشف نتائج المؤشر
          </button>
          <button
            onClick={() => setActiveTab('bodycomp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'bodycomp' ? 'bg-[#0f2040] text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Scale className="w-4 h-4" /> كشف قياسات الجسم
          </button>
        </div>

        {/* ── Player Report Tab ─────────────────────────────────────────────── */}
        {activeTab === 'player' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-gray-800">إنشاء تقارير اللاعبين</h2>
              {data && (
                <Button onClick={handlePrint} loading={printing}>
                  <Printer className="w-4 h-4" /> طباعة / تحميل PDF
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="البرنامج" value={selProgramId} onChange={e => onProgramChange(e.target.value)}>
                <option value="">اختر البرنامج...</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Select label="اللاعب" value={selPlayerId} onChange={e => onPlayerChange(e.target.value)} disabled={!selProgramId}>
                <option value="">اختر اللاعب...</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </div>

            {loadingR && <LoadingSpinner message="جار تحميل بيانات التقرير..." />}
            {!data && !loadingR && <EmptyState title="اختر برنامجاً ولاعباً" description="لإنشاء التقرير" icon={<FileText className="w-10 h-10" />} />}

            {data && !loadingR && (
              <div ref={reportRef} dir="rtl" style={{ fontFamily:'Arial,Helvetica,sans-serif', color:'#1a1a1a', background:'#fff' }}>

                {/* Page 1 */}
                <div style={{ pageBreakAfter:'always' }}>
                  <div style={{ background:'linear-gradient(135deg,#0a1628 0%,#1e3a6e 100%)', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <p style={{ color:'#d4af37', fontSize:10, fontWeight:700, margin:'0 0 3px', letterSpacing:1 }}>
                        {data.settings?.organization_name || 'Penta EPDP'}
                      </p>
                      <h1 style={{ color:'#fff', fontSize:16, fontWeight:700, margin:0 }}>
                        {data.settings?.report_title || 'تقرير تطور اللاعب — Penta EPDP'}
                      </h1>
                    </div>
                    <div style={{ textAlign:'left' }}>
                      <p style={{ color:'rgba(255,255,255,.5)', fontSize:9, margin:0 }}>تاريخ التقرير</p>
                      <p style={{ color:'#d4af37', fontSize:12, fontWeight:700, margin:'2px 0 0' }}>{new Date().toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>

                  <div style={{ background:'linear-gradient(135deg,#0f2040 0%,#163060 100%)', padding:'20px 24px', display:'flex', alignItems:'center', gap:18 }}>
                    <div style={{ width:90, height:90, borderRadius:14, background:'#d4af37', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'3px solid rgba(212,175,55,.4)', overflow:'hidden' }}>
                      {data.player.photo_url
                        ? <img src={data.player.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : <span style={{ fontSize:36, fontWeight:700, color:'#0a1628' }}>{data.player.full_name.charAt(0)}</span>
                      }
                    </div>
                    <div style={{ flex:1 }}>
                      <h2 style={{ color:'#fff', fontSize:22, fontWeight:700, margin:'0 0 6px' }}>{data.player.full_name}</h2>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 16px' }}>
                        {data.player.position       && <span style={{ color:'#d4af37', fontSize:12, fontWeight:600 }}>📍 {data.player.position}</span>}
                        {data.player.jersey_number  && <span style={{ color:'rgba(255,255,255,.8)', fontSize:12 }}>👕 #{data.player.jersey_number}</span>}
                        {calcAge(data.player.date_of_birth) && <span style={{ color:'rgba(255,255,255,.8)', fontSize:12 }}>🎂 {calcAge(data.player.date_of_birth)} سنة</span>}
                        {data.player.nationality    && <span style={{ color:'rgba(255,255,255,.8)', fontSize:12 }}>🌍 {data.player.nationality}</span>}
                        {data.player.height_cm      && <span style={{ color:'rgba(255,255,255,.8)', fontSize:12 }}>📏 {data.player.height_cm} سم</span>}
                        {data.player.weight_kg      && <span style={{ color:'rgba(255,255,255,.8)', fontSize:12 }}>⚖️ {data.player.weight_kg} كجم</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', background:'#f8f9fb', borderBottom:'1px solid #e8e8e8' }}>
                    <div style={{ padding:'16px 22px', borderLeft:'1px solid #e8e8e8' }}>
                      <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 10px', letterSpacing:1 }}>معلومات البرنامج</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 12px' }}>
                        {[
                          ['اسم البرنامج', data.program.name],
                          ['الموسم',       data.program.season || '—'],
                          ['تاريخ البدء',  data.program.start_date || '—'],
                          ['تاريخ الانتهاء', data.program.end_date || '—'],
                          ['مدة البرنامج', programDays(data.program.start_date, data.program.end_date)],
                        ].map(([lbl, val]) => (
                          <div key={lbl}>
                            <p style={{ fontSize:8, color:'#bbb', margin:'0 0 1px' }}>{lbl}</p>
                            <p style={{ fontSize:11, fontWeight:600, color:'#1a1a1a', margin:0 }}>{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding:'16px 22px' }}>
                      <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 10px', letterSpacing:1 }}>إحصائيات القياس</p>
                      <div style={{ display:'flex', gap:20, marginBottom:10 }}>
                        {[
                          [data.sessionCount, 'جلسات تقييم'],
                          [data.allIndicators.length, 'مؤشر'],
                          [data.categories.length, 'قسم'],
                        ].map(([val, lbl]) => (
                          <div key={String(lbl)} style={{ textAlign:'center', background:'#fff', borderRadius:10, padding:'8px 14px', border:'1px solid #e8e8e8' }}>
                            <p style={{ fontSize:22, fontWeight:700, color:'#0a1628', margin:0, lineHeight:1 }}>{val}</p>
                            <p style={{ fontSize:9, color:'#aaa', margin:'2px 0 0' }}>{lbl}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {data.categories.map(cat => {
                          const cnt = data.allIndicators.filter(i => i.category_id === cat.id).length
                          return (
                            <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:4, background:'#fff', border:'1px solid #e8e8e8', borderRadius:8, padding:'3px 8px' }}>
                              <div style={{ width:7, height:7, borderRadius:'50%', background:cat.color||'#888', flexShrink:0 }} />
                              <span style={{ fontSize:10, color:'#555' }}>{cat.name_ar||cat.name}</span>
                              <span style={{ fontSize:9, color:'#aaa', background:'#f0f0f0', borderRadius:6, padding:'0 4px' }}>{cnt}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding:'14px 22px', background:'#fff', borderBottom:'1px solid #e8e8e8' }}>
                    <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 10px', letterSpacing:1 }}>ملخص الحضور</p>
                    <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                      <div style={{ textAlign:'center', flexShrink:0 }}>
                        <p style={{ fontSize:28, fontWeight:700, color:data.att.percentage >= 80 ? '#00a86b' : '#e74c3c', margin:0, lineHeight:1 }}>{data.att.percentage}%</p>
                        <p style={{ fontSize:9, color:'#aaa', margin:'2px 0 0' }}>نسبة الحضور</p>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ background:'#eee', borderRadius:99, height:10, overflow:'hidden', marginBottom:8 }}>
                          <div style={{ width:`${data.att.percentage}%`, height:'100%', background:data.att.percentage>=80?'#00a86b':'#e74c3c', borderRadius:99 }} />
                        </div>
                        <div style={{ display:'flex', gap:18, fontSize:11 }}>
                          <span><strong style={{color:'#00a86b'}}>{data.att.present}</strong> <span style={{color:'#888'}}>حضر فعلاً</span></span>
                          {data.att.late > 0 && <span><strong style={{color:'#f39c12'}}>{data.att.late}</strong> <span style={{color:'#888'}}>متأخر</span></span>}
                          <span><strong style={{color:'#e74c3c'}}>{data.att.absent}</strong> <span style={{color:'#888'}}>غائب</span></span>
                          <span style={{color:'#aaa', fontSize:10}}>من إجمالي {data.att.total} جلسة</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {data.targets && (
                    <div style={{ margin:'14px 22px', background:'#f0f7ff', borderRadius:10, padding:'10px 14px', borderRight:'3px solid #3498db' }}>
                      <p style={{ fontSize:9, color:'#3498db', fontWeight:700, margin:'0 0 4px' }}>🎯 المستهدفات</p>
                      <p style={{ fontSize:11, color:'#1a1a1a', margin:0, lineHeight:1.7 }}>{data.targets}</p>
                    </div>
                  )}

                  <div style={{ background:'#0a1628', padding:'7px 22px', display:'flex', justifyContent:'space-between', marginTop: data.targets ? 0 : 14 }}>
                    <span style={{ color:'#d4af37', fontSize:9, fontWeight:600 }}>الصفحة 1 — مقدمة البرنامج والمعلومات الأساسية</span>
                    <span style={{ color:'rgba(255,255,255,.4)', fontSize:8 }}>
                      {data.firstDate && data.lastDate ? `${data.firstDate} ← ${data.lastDate}` : ''}
                    </span>
                  </div>
                </div>

                {/* Page 2 — Body Composition (only if records exist) */}
                {data.bodyRecs.length > 0 && (() => {
                  const latest = data.bodyRecs[data.bodyRecs.length - 1]
                  const first  = data.bodyRecs[0]
                  const age    = calcAge(data.player.date_of_birth)

                  function fv(v?: number, d = 1) { return v !== undefined && v !== null ? v.toFixed(d) : '—' }
                  function st(v?: number, mn?: number, mx?: number) {
                    if (!v || !mn || !mx) return { label: '', color: '#888' }
                    if (v < mn) return { label: 'منخفض', color: '#3498db' }
                    if (v > mx) return { label: 'مرتفع', color: '#e74c3c' }
                    return { label: 'طبيعي', color: '#00a86b' }
                  }
                  function pct(v?: number, mn?: number, mx?: number) {
                    if (!v || !mn || !mx || mx === mn) return 50
                    return Math.min(100, Math.max(0, ((v - mn) / (mx - mn)) * 100))
                  }
                  function rangeBar(v?: number, mn?: number, mx?: number, unit = '') {
                    if (!v || !mn || !mx) return ''
                    const p = pct(v, mn, mx)
                    const s = st(v, mn, mx)
                    return `
                      <div style="position:relative;height:5px;background:#e8e8e8;border-radius:3px;margin:3px 0">
                        <div style="position:absolute;inset:0;margin:0 12%;background:#c3e8d6;border-radius:3px"></div>
                        <div style="position:absolute;width:5px;height:9px;background:#333;border-radius:2px;top:-2px;left:${p}%;transform:translateX(-50%)"></div>
                      </div>
                      <div style="display:flex;justify-content:space-between;font-size:8px;color:#aaa"><span>${mn}${unit}</span><span style="font-weight:700;color:${s.color}">${s.label}</span><span>${mx}${unit}</span></div>
                    `
                  }
                  function metricBox(label: string, value?: number, unit = '', mn?: number, mx?: number) {
                    const s = st(value, mn, mx)
                    const hasRange = value !== undefined && mn !== undefined && mx !== undefined
                    return `
                      <div style="background:${hasRange ? s.color + '12' : '#f8f8f8'};border:1px solid ${hasRange ? s.color + '40' : '#eee'};border-radius:8px;padding:7px 9px">
                        <p style="font-size:8px;color:#aaa;margin:0 0 2px">${label}</p>
                        <div style="display:flex;align-items:baseline;gap:3px">
                          <span style="font-size:16px;font-weight:700;color:#1a1a1a">${fv(value)}</span>
                          <span style="font-size:9px;color:#aaa">${unit}</span>
                          ${hasRange ? `<span style="font-size:9px;font-weight:700;color:${s.color};margin-right:auto">${s.label}</span>` : ''}
                        </div>
                        ${hasRange ? rangeBar(value, mn, mx, unit) : ''}
                        ${hasRange ? `<p style="font-size:7px;color:#ccc;margin:2px 0 0">المدى: ${mn}–${mx}${unit}</p>` : ''}
                      </div>`
                  }

                  const improvRow = (label: string, fVal?: number, lVal?: number, unit = '', dir = 'higher_better') => {
                    if (fVal === undefined || lVal === undefined) return ''
                    const diff = lVal - fVal
                    const impPct = fVal !== 0 ? Math.abs(diff / fVal * 100).toFixed(1) : null
                    const positive = dir === 'lower_better' ? lVal < fVal : lVal > fVal
                    const impLabel = diff === 0 ? '—' : impPct ? `${positive ? '▲' : '▼'} ${impPct}%` : '—'
                    const impColor = diff === 0 ? '#aaa' : positive ? '#00a86b' : '#e74c3c'
                    return `<tr style="border-bottom:1px solid #f0f0f0">
                      <td style="padding:5px 8px;font-size:10px;color:#333">${label}</td>
                      <td style="padding:5px 8px;font-size:11px;font-weight:600;text-align:center;color:#555">${fv(fVal)} ${unit}</td>
                      <td style="padding:5px 8px;font-size:11px;font-weight:700;text-align:center;color:#0a1628">${fv(lVal)} ${unit}</td>
                      <td style="padding:5px 8px;font-size:11px;font-weight:700;text-align:center;color:${impColor}">${impLabel}</td>
                    </tr>`
                  }

                  return (
                    <div className="page-break" style={{ pageBreakBefore:'always', padding:'22px' }}>
                      {/* Header */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14, borderBottom:'2px solid #0a1628', paddingBottom:8 }}>
                        <div>
                          <p style={{ fontSize:9, color:'#aaa', margin:'0 0 2px', letterSpacing:1 }}>تحليل تركيبة الجسم — InBody</p>
                          <h2 style={{ fontSize:15, fontWeight:700, color:'#0a1628', margin:0 }}>قياسات الجسم</h2>
                        </div>
                        <div style={{ textAlign:'left', fontSize:9, color:'#aaa', lineHeight:1.8 }}>
                          {age && <div>العمر: <strong style={{color:'#555'}}>{age} سنة</strong></div>}
                          <div>آخر قياس: <strong style={{color:'#555'}}>{latest.measurement_date}</strong></div>
                          <div>عدد القياسات: <strong style={{color:'#555'}}>{data.bodyRecs.length}</strong></div>
                        </div>
                      </div>

                      {/* Basic metrics */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}
                        dangerouslySetInnerHTML={{ __html: [
                          metricBox('الوزن', latest.weight_kg, 'كجم'),
                          metricBox('الطول', latest.height_cm, 'سم'),
                          metricBox('BMI',   latest.bmi),
                          metricBox('FFMI',  latest.ffmi),
                        ].join('') }}
                      />

                      {/* Body composition */}
                      <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 6px', letterSpacing:1 }}>تركيبة الجسم</p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}
                        dangerouslySetInnerHTML={{ __html: [
                          metricBox('الكتلة الخالية من الدهون', latest.fat_free_mass_kg, 'كجم', latest.fat_free_mass_min, latest.fat_free_mass_max),
                          metricBox('نسبة الدهون', latest.body_fat_percentage, '%', latest.body_fat_percentage_min, latest.body_fat_percentage_max),
                          metricBox('الكتلة العضلية الهيكلية', latest.muscle_mass_kg, 'كجم', latest.muscle_mass_min, latest.muscle_mass_max),
                          metricBox('كتلة الدهون', latest.body_fat_mass_kg, 'كجم', latest.body_fat_mass_min, latest.body_fat_mass_max),
                          metricBox('الكتلة الهزيلة الناعمة', latest.soft_lean_mass_kg, 'كجم', latest.soft_lean_mass_min, latest.soft_lean_mass_max),
                          metricBox('الدهون الحشوية', latest.visceral_fat_index, '', latest.visceral_fat_min, latest.visceral_fat_max),
                        ].join('') }}
                      />

                      {/* Biological */}
                      <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 6px', letterSpacing:1 }}>المؤشرات البيولوجية</p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}
                        dangerouslySetInnerHTML={{ __html: [
                          metricBox('الماء الكلي', latest.total_body_water_kg, 'كجم', latest.total_body_water_min, latest.total_body_water_max),
                          metricBox('البروتين', latest.protein_kg, 'كجم', latest.protein_min, latest.protein_max),
                          metricBox('المعادن', latest.mineral_kg, 'كجم', latest.mineral_min, latest.mineral_max),
                          metricBox('معدل الأيض', latest.bmr_kcal, 'kcal'),
                        ].join('') }}
                      />

                      {/* Segment Analysis */}
                      {(latest.left_arm_lean_kg || latest.trunk_lean_kg || latest.left_leg_lean_kg) && (
                        <div style={{ marginBottom:14 }}>
                          <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 6px', letterSpacing:1 }}>تحليل الأجزاء</p>
                          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                            <thead>
                              <tr style={{ background:'#f0f4f8' }}>
                                <th style={{ padding:'5px 8px', textAlign:'right', fontSize:9, color:'#888' }}>الجزء</th>
                                <th style={{ padding:'5px 8px', textAlign:'center', fontSize:9, color:'#0a1628' }}>كتلة هزيلة</th>
                                <th style={{ padding:'5px 8px', textAlign:'center', fontSize:9, color:'#aaa' }}>المدى</th>
                                <th style={{ padding:'5px 8px', textAlign:'center', fontSize:9, color:'#aaa' }}>الحالة</th>
                                <th style={{ padding:'5px 8px', textAlign:'center', fontSize:9, color:'#d4af37' }}>دهون</th>
                                <th style={{ padding:'5px 8px', textAlign:'center', fontSize:9, color:'#aaa' }}>المدى</th>
                                <th style={{ padding:'5px 8px', textAlign:'center', fontSize:9, color:'#aaa' }}>الحالة</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { name:'ذراع يسرى', lv:latest.left_arm_lean_kg,  lmn:latest.left_arm_lean_min,  lmx:latest.left_arm_lean_max,  fv_:latest.left_arm_fat_kg,  fmn:latest.left_arm_fat_min,  fmx:latest.left_arm_fat_max  },
                                { name:'ذراع يمنى', lv:latest.right_arm_lean_kg, lmn:latest.right_arm_lean_min, lmx:latest.right_arm_lean_max, fv_:latest.right_arm_fat_kg, fmn:latest.right_arm_fat_min, fmx:latest.right_arm_fat_max },
                                { name:'الجذع',     lv:latest.trunk_lean_kg,     lmn:latest.trunk_lean_min,     lmx:latest.trunk_lean_max,     fv_:latest.trunk_fat_kg,     fmn:latest.trunk_fat_min,     fmx:latest.trunk_fat_max     },
                                { name:'ساق يسرى',  lv:latest.left_leg_lean_kg,  lmn:latest.left_leg_lean_min,  lmx:latest.left_leg_lean_max,  fv_:latest.left_leg_fat_kg,  fmn:latest.left_leg_fat_min,  fmx:latest.left_leg_fat_max  },
                                { name:'ساق يمنى',  lv:latest.right_leg_lean_kg, lmn:latest.right_leg_lean_min, lmx:latest.right_leg_lean_max, fv_:latest.right_leg_fat_kg, fmn:latest.right_leg_fat_min, fmx:latest.right_leg_fat_max },
                              ].map((seg, i) => {
                                const lstS = st(seg.lv, seg.lmn, seg.lmx)
                                const fstS = st(seg.fv_, seg.fmn, seg.fmx)
                                return (
                                  <tr key={seg.name} style={{ borderBottom:'1px solid #f0f0f0', background: i%2===0 ? '#fff':'#fafcff' }}>
                                    <td style={{ padding:'5px 8px', fontWeight:600, color:'#333' }}>{seg.name}</td>
                                    <td style={{ padding:'5px 8px', textAlign:'center', fontWeight:700, color:'#0a1628' }}>{fv(seg.lv)}</td>
                                    <td style={{ padding:'5px 8px', textAlign:'center', fontSize:9, color:'#aaa' }}>{seg.lmn && seg.lmx ? `${seg.lmn}–${seg.lmx}` : '—'}</td>
                                    <td style={{ padding:'5px 8px', textAlign:'center' }}><span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:5, color:lstS.color, background:lstS.color+'18' }}>{lstS.label||'—'}</span></td>
                                    <td style={{ padding:'5px 8px', textAlign:'center', fontWeight:700, color:'#c09020' }}>{fv(seg.fv_)}</td>
                                    <td style={{ padding:'5px 8px', textAlign:'center', fontSize:9, color:'#aaa' }}>{seg.fmn && seg.fmx ? `${seg.fmn}–${seg.fmx}` : '—'}</td>
                                    <td style={{ padding:'5px 8px', textAlign:'center' }}><span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:5, color:fstS.color, background:fstS.color+'18' }}>{fstS.label||'—'}</span></td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Girth + First vs Last */}
                      <div style={{ display:'grid', gridTemplateColumns: data.bodyRecs.length >= 2 ? '1fr 1fr' : '1fr', gap:14 }}>
                        {/* Girth */}
                        {(latest.waist_cm || latest.chest_cm || latest.left_upper_arm_cm) && (
                          <div>
                            <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 6px', letterSpacing:1 }}>المحيطات (سم)</p>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                              {[
                                ['عضد يسرى', latest.left_upper_arm_cm], ['عضد يمنى', latest.right_upper_arm_cm],
                                ['الكتفين',   latest.shoulder_width_cm], ['الصدر',    latest.chest_cm],
                                ['الخصر',     latest.waist_cm],          ['الورك',     latest.hip_cm],
                                ['فخذ يسرى',  latest.left_thigh_cm],    ['فخذ يمنى',  latest.right_thigh_cm],
                              ].filter(([, v]) => v !== undefined && v !== null).map(([lbl, val]) => (
                                <div key={String(lbl)} style={{ background:'#f8f8f8', borderRadius:6, padding:'5px 7px' }}>
                                  <p style={{ fontSize:8, color:'#aaa', margin:'0 0 1px' }}>{lbl}</p>
                                  <p style={{ fontSize:13, fontWeight:700, color:'#1a1a1a', margin:0 }}>{fv(val as number|undefined, 0)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* First vs Last comparison */}
                        {data.bodyRecs.length >= 2 && (
                          <div>
                            <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 6px', letterSpacing:1 }}>مقارنة أول قياس ← آخر قياس</p>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                              <thead>
                                <tr style={{ background:'#f0f4f8' }}>
                                  <th style={{ padding:'4px 6px', textAlign:'right', fontSize:9, color:'#888' }}>المؤشر</th>
                                  <th style={{ padding:'4px 6px', textAlign:'center', fontSize:9, color:'#888' }}>أول</th>
                                  <th style={{ padding:'4px 6px', textAlign:'center', fontSize:9, color:'#888' }}>آخر</th>
                                  <th style={{ padding:'4px 6px', textAlign:'center', fontSize:9, color:'#888' }}>تغير</th>
                                </tr>
                              </thead>
                              <tbody dangerouslySetInnerHTML={{ __html: [
                                improvRow('الوزن', first.weight_kg, latest.weight_kg, 'كجم', 'neutral'),
                                improvRow('الدهون %', first.body_fat_percentage, latest.body_fat_percentage, '%', 'lower_better'),
                                improvRow('العضلات', first.muscle_mass_kg, latest.muscle_mass_kg, 'كجم', 'higher_better'),
                                improvRow('الكتلة الخالية', first.fat_free_mass_kg, latest.fat_free_mass_kg, 'كجم', 'higher_better'),
                                improvRow('الدهون الحشوية', first.visceral_fat_index, latest.visceral_fat_index, '', 'lower_better'),
                                improvRow('محيط الخصر', first.waist_cm, latest.waist_cm, 'سم', 'lower_better'),
                              ].join('') }} />
                            </table>
                          </div>
                        )}
                      </div>

                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:12, paddingTop:8, borderTop:'1px solid #e8e8e8' }}>
                        <span style={{fontSize:8,color:'#ccc'}}>الصفحة 2 — قياسات تركيبة الجسم</span>
                        <span style={{fontSize:8,color:'#ccc'}}>{data.player.full_name} • {data.program.name}</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Page 3 (was Page 2) */}
                <div className="page-break" style={{ pageBreakBefore:'always', padding:'22px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:16, borderBottom:'2px solid #0a1628', paddingBottom:8 }}>
                    <div>
                      <p style={{ fontSize:9, color:'#aaa', margin:'0 0 2px', letterSpacing:1 }}>نتائج الاختبارات والتقييمات</p>
                      <h2 style={{ fontSize:15, fontWeight:700, color:'#0a1628', margin:0 }}>المؤشرات — نتائج تفصيلية</h2>
                    </div>
                    <div style={{ textAlign:'left', fontSize:9, color:'#aaa', lineHeight:1.8 }}>
                      {data.firstDate && <div>جلسة البداية: <strong style={{color:'#555'}}>{data.firstDate}</strong></div>}
                      {data.lastDate  && <div>جلسة النهاية: <strong style={{color:'#555'}}>{data.lastDate}</strong></div>}
                    </div>
                  </div>

                  {data.rows.length === 0 && (
                    <p style={{ color:'#aaa', textAlign:'center', padding:'40px 0' }}>لا توجد نتائج مسجلة</p>
                  )}

                  {data.categories.map(cat => {
                    const catRows = data.rows.filter(r => r.indicator.category_id === cat.id && (r.lastValue !== null || r.firstValue !== null))
                    if (!catRows.length) return null
                    return (
                      <div key={cat.id} style={{ marginBottom:22 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f0f4f8', padding:'9px 14px', borderRadius:'8px 8px 0 0', borderRight:`4px solid ${cat.color||'#0a1628'}` }}>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:cat.color||'#0a1628', flexShrink:0 }} />
                          <span style={{ fontSize:13, fontWeight:700, color:'#0a1628', flex:1 }}>{cat.name_ar||cat.name}</span>
                          <span style={{ fontSize:10, color:'#888' }}>{catRows.length} مؤشر</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'2.5fr 1.2fr 1.2fr 1.2fr 2.5fr', background:'#fafafa', padding:'7px 14px', fontSize:9, fontWeight:600, color:'#999', border:'1px solid #e8e8e8', borderTop:'none', gap:8 }}>
                          <span>المؤشر</span>
                          <span style={{textAlign:'center'}}>جلسة البداية</span>
                          <span style={{textAlign:'center'}}>جلسة النهاية</span>
                          <span style={{textAlign:'center'}}>التحسن</span>
                          <span>تعليق المدرب</span>
                        </div>
                        {catRows.map((row, idx) => {
                          const imp = row.improvement
                          const isLast = idx === catRows.length - 1
                          return (
                            <div key={row.indicator.id} style={{ border:'1px solid #e8e8e8', borderTop:'none', borderRadius: isLast ? '0 0 8px 8px' : '0', background: idx%2===0 ? '#fff' : '#fafcff' }}>
                              <div style={{ display:'grid', gridTemplateColumns:'2.5fr 1.2fr 1.2fr 1.2fr 2.5fr', padding:'10px 14px', gap:8, alignItems:'center' }}>
                                <div>
                                  <p style={{ fontSize:12, fontWeight:600, color:'#1a1a1a', margin:0 }}>{row.indicator.name_ar||row.indicator.name}</p>
                                  {row.indicator.type === 'rating' && <p style={{ fontSize:9, color:'#bbb', margin:'1px 0 0' }}>تقييم من 10</p>}
                                  {row.indicator.unit && row.indicator.type !== 'rating' && <p style={{ fontSize:9, color:'#bbb', margin:'1px 0 0' }}>الوحدة: {row.indicator.unit}</p>}
                                </div>
                                <div style={{ textAlign:'center' }}>
                                  {row.firstValue !== null
                                    ? <span style={{ fontSize:15, fontWeight:600, color:'#555' }}>{fmtValue(row.firstValue, row.indicator)}</span>
                                    : <span style={{ fontSize:12, color:'#ccc' }}>—</span>
                                  }
                                </div>
                                <div style={{ textAlign:'center' }}>
                                  {row.lastValue !== null
                                    ? <span style={{ fontSize:15, fontWeight:700, color:'#0a1628' }}>{fmtValue(row.lastValue, row.indicator)}</span>
                                    : <span style={{ fontSize:12, color:'#ccc' }}>—</span>
                                  }
                                </div>
                                <div style={{ textAlign:'center' }}>
                                  {imp ? (
                                    <span style={{ fontSize:13, fontWeight:700, color: imp.positive ? '#00a86b' : '#e74c3c' }}>
                                      {imp.positive ? '▲' : '▼'} {imp.pct}%
                                    </span>
                                  ) : (
                                    <span style={{ fontSize:12, color:'#ccc' }}>—</span>
                                  )}
                                </div>
                                <div>
                                  {row.comment
                                    ? <p style={{ fontSize:10, color:'#333', margin:0, lineHeight:1.5, background:'#f0f7ff', borderRadius:6, padding:'5px 8px', borderRight:'2px solid #3498db' }}>{row.comment}</p>
                                    : <p style={{ fontSize:10, color:'#ddd', margin:0, fontStyle:'italic' }}>—</p>
                                  }
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}

                  {(() => {
                    const ucRows = data.rows.filter(r => !r.indicator.category_id && (r.lastValue !== null || r.firstValue !== null))
                    if (!ucRows.length) return null
                    return (
                      <div style={{ marginBottom:22 }}>
                        <div style={{ background:'#f0f4f8', padding:'9px 14px', borderRadius:'8px 8px 0 0', borderRight:'4px solid #888' }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'#555' }}>مؤشرات أخرى</span>
                        </div>
                        {ucRows.map((row, idx) => (
                          <div key={row.indicator.id} style={{ display:'grid', gridTemplateColumns:'2.5fr 1.2fr 1.2fr 1.2fr 2.5fr', padding:'10px 14px', gap:8, alignItems:'center', border:'1px solid #e8e8e8', borderTop:'none', borderRadius:idx===ucRows.length-1?'0 0 8px 8px':'0', background:idx%2===0?'#fff':'#fafcff' }}>
                            <p style={{ fontSize:12, fontWeight:600, color:'#1a1a1a', margin:0 }}>{row.indicator.name_ar||row.indicator.name}</p>
                            <div style={{textAlign:'center'}}>{row.firstValue !== null ? <span style={{fontSize:15,fontWeight:600,color:'#555'}}>{fmtValue(row.firstValue, row.indicator)}</span> : <span style={{color:'#ccc'}}>—</span>}</div>
                            <div style={{textAlign:'center'}}>{row.lastValue !== null ? <span style={{fontSize:15,fontWeight:700,color:'#0a1628'}}>{fmtValue(row.lastValue, row.indicator)}</span> : <span style={{color:'#ccc'}}>—</span>}</div>
                            <div style={{textAlign:'center'}}>{row.improvement ? <span style={{fontSize:13,fontWeight:700,color:row.improvement.positive?'#00a86b':'#e74c3c'}}>{row.improvement.positive?'▲':'▼'} {row.improvement.pct}%</span> : <span style={{color:'#ccc'}}>—</span>}</div>
                            <div>{row.comment ? <p style={{fontSize:10,color:'#333',margin:0,lineHeight:1.5,background:'#f0f7ff',borderRadius:6,padding:'5px 8px',borderRight:'2px solid #3498db'}}>{row.comment}</p> : <p style={{fontSize:10,color:'#ddd',margin:0,fontStyle:'italic'}}>—</p>}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, paddingTop:8, borderTop:'1px solid #e8e8e8' }}>
                    <span style={{fontSize:8,color:'#ccc'}}>{data.bodyRecs.length > 0 ? 'الصفحة 3' : 'الصفحة 2'} — نتائج المؤشرات التفصيلية</span>
                    <span style={{fontSize:8,color:'#ccc'}}>{data.player.full_name} • {data.program.name}</span>
                  </div>
                </div>

                {/* Page 3 */}
                {(data.positives.length > 0 || data.negatives.length > 0 || data.genRecs || data.coachNotes.length > 0 || data.recommendations.length > 0) && (
                  <div className="page-break" style={{ pageBreakBefore:'always', padding:'22px' }}>
                    <div style={{ borderBottom:'2px solid #0a1628', paddingBottom:8, marginBottom:18 }}>
                      <p style={{ fontSize:9, color:'#aaa', margin:'0 0 2px', letterSpacing:1 }}>التقييم الكيفي</p>
                      <h2 style={{ fontSize:15, fontWeight:700, color:'#0a1628', margin:0 }}>التقييم الشامل والتوصيات</h2>
                    </div>

                    {(data.positives.length > 0 || data.negatives.length > 0) && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
                        <div style={{ background:'#f0faf5', border:'1px solid #c3e8d6', borderRadius:10, padding:'12px 14px' }}>
                          <p style={{ fontSize:10, color:'#00a86b', fontWeight:700, margin:'0 0 8px' }}>✅ الإيجابيات</p>
                          {data.positives.length === 0
                            ? <p style={{fontSize:11,color:'#bbb',fontStyle:'italic'}}>—</p>
                            : data.positives.map((p,i) => (
                              <div key={i} style={{ display:'flex', gap:6, marginBottom:5 }}>
                                <span style={{color:'#00a86b',fontWeight:700,flexShrink:0}}>•</span>
                                <span style={{fontSize:11,color:'#1a1a1a',lineHeight:1.6}}>{p}</span>
                              </div>
                            ))
                          }
                        </div>
                        <div style={{ background:'#fff5f5', border:'1px solid #fbc8c8', borderRadius:10, padding:'12px 14px' }}>
                          <p style={{ fontSize:10, color:'#e74c3c', fontWeight:700, margin:'0 0 8px' }}>❌ نقاط التطوير</p>
                          {data.negatives.length === 0
                            ? <p style={{fontSize:11,color:'#bbb',fontStyle:'italic'}}>—</p>
                            : data.negatives.map((n,i) => (
                              <div key={i} style={{ display:'flex', gap:6, marginBottom:5 }}>
                                <span style={{color:'#e74c3c',fontWeight:700,flexShrink:0}}>•</span>
                                <span style={{fontSize:11,color:'#1a1a1a',lineHeight:1.6}}>{n}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}

                    {data.genRecs && (
                      <div style={{ background:'#fffbf0', border:'1px solid #f0e0a0', borderRadius:10, padding:'12px 14px', marginBottom:18, borderRight:'3px solid #f39c12' }}>
                        <p style={{ fontSize:10, color:'#f39c12', fontWeight:700, margin:'0 0 5px' }}>💡 التوصيات العامة</p>
                        <p style={{ fontSize:12, color:'#333', margin:0, lineHeight:1.7 }}>{data.genRecs}</p>
                      </div>
                    )}

                    {data.coachNotes.length > 0 && (
                      <div style={{ marginBottom:18 }}>
                        <p style={{ fontSize:10, color:'#555', fontWeight:700, margin:'0 0 8px' }}>📝 ملاحظات المدرب</p>
                        {data.coachNotes.map((note, i) => (
                          <div key={note.id||i} style={{ background:'#f8faff', border:'1px solid #dde8f8', borderRadius:8, padding:'10px 12px', borderRight:'3px solid #3498db', marginBottom:8 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{fontSize:10,fontWeight:600,color:'#0a1628'}}>{note.category||'ملاحظة'}</span>
                              <span style={{fontSize:9,color:'#bbb'}}>{note.note_date}</span>
                            </div>
                            <p style={{ fontSize:11, color:'#333', margin:0, lineHeight:1.6 }}>{note.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {data.recommendations.length > 0 && (
                      <div style={{ marginBottom:18 }}>
                        <p style={{ fontSize:10, color:'#555', fontWeight:700, margin:'0 0 8px' }}>📋 التوصيات الرسمية</p>
                        {data.recommendations.map((rec, i) => (
                          <div key={rec.id||i} style={{ background:'#fffbf0', border:'1px solid #f0e8d0', borderRadius:8, padding:'10px 12px', borderRight:`3px solid ${priorityColor(rec.priority)}`, marginBottom:8 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                              <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                                <span style={{fontSize:8,fontWeight:700,color:'#fff',background:priorityColor(rec.priority),padding:'2px 7px',borderRadius:7}}>{priorityLabel(rec.priority)}</span>
                                <span style={{fontSize:12,fontWeight:700,color:'#0a1628'}}>{rec.title}</span>
                              </div>
                              <span style={{fontSize:9,color:'#bbb'}}>{rec.recommendation_date}</span>
                            </div>
                            <p style={{ fontSize:11, color:'#555', margin:'0 0 5px', lineHeight:1.6 }}>{rec.content}</p>
                            <span style={{fontSize:8,background:'#eee',color:'#666',padding:'1px 7px',borderRadius:7}}>
                              {rec.status==='pending'?'قيد الانتظار':rec.status==='in_progress'?'قيد التنفيذ':'مكتمل'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ background:'linear-gradient(135deg,#0a1628 0%,#1e3a6e 100%)', borderRadius:12, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <p style={{color:'#d4af37',fontSize:9,margin:'0 0 3px',fontWeight:700,letterSpacing:1}}>نهاية التقرير</p>
                        <p style={{color:'#fff',fontSize:13,fontWeight:700,margin:0}}>{data.player.full_name}</p>
                        <p style={{color:'rgba(255,255,255,.5)',fontSize:10,margin:'1px 0 0'}}>{data.program.name} • {data.program.season||''}</p>
                      </div>
                      <div style={{ display:'flex', gap:20, textAlign:'center' }}>
                        <div>
                          <p style={{color:'#d4af37',fontSize:22,fontWeight:700,margin:0,lineHeight:1}}>{data.att.percentage}%</p>
                          <p style={{color:'rgba(255,255,255,.5)',fontSize:8,margin:'2px 0 0'}}>نسبة الحضور</p>
                        </div>
                        <div>
                          <p style={{color:'#d4af37',fontSize:22,fontWeight:700,margin:0,lineHeight:1}}>{data.allIndicators.length}</p>
                          <p style={{color:'rgba(255,255,255,.5)',fontSize:8,margin:'2px 0 0'}}>مؤشر تم قياسه</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:14, paddingTop:8, borderTop:'1px solid #e8e8e8' }}>
                      <span style={{fontSize:8,color:'#ccc'}}>{data.settings?.report_footer||'Penta EPDP — Elite Player Development Program'}</span>
                      <span style={{fontSize:8,color:'#ccc'}}>{data.bodyRecs.length > 0 ? 'الصفحة 4' : 'الصفحة 3'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Indicator Report Tab ──────────────────────────────────────────── */}
        {activeTab === 'indicator' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-gray-800">كشف نتائج اللاعبين حسب المؤشر</h2>
              {indReport && (
                <Button onClick={handlePrintInd} loading={printingInd}>
                  <Printer className="w-4 h-4" /> طباعة / تحميل PDF
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="البرنامج" value={indProgramId} onChange={e => onIndProgramChange(e.target.value)}>
                <option value="">اختر البرنامج...</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Select
                label="المؤشر"
                value={indIndicatorId}
                onChange={e => onIndIndicatorChange(e.target.value)}
                disabled={!indProgramId || loadingIndProg}
              >
                <option value="">{loadingIndProg ? 'جار التحميل...' : 'اختر المؤشر...'}</option>
                {indIndicators.map(i => <option key={i.id} value={i.id}>{i.name_ar || i.name}</option>)}
              </Select>
            </div>

            {loadingIndR && <LoadingSpinner message="جار تحميل النتائج..." />}
            {!indReport && !loadingIndR && (
              <EmptyState
                title="اختر برنامجاً ومؤشراً"
                description="لعرض كشف نتائج اللاعبين"
                icon={<BarChart3 className="w-10 h-10" />}
              />
            )}

            {indReport && !loadingIndR && (
              <>
                {/* Summary bar */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-6 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-400">المؤشر</p>
                    <p className="text-sm font-semibold text-gray-900">{indReport.indicator.name_ar || indReport.indicator.name}</p>
                  </div>
                  {indReport.indicator.unit && (
                    <div>
                      <p className="text-xs text-gray-400">الوحدة</p>
                      <p className="text-sm font-semibold text-gray-900">{indReport.indicator.unit}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400">عدد الجلسات</p>
                    <p className="text-sm font-semibold text-gray-900">{indReport.sessions.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">عدد اللاعبين</p>
                    <p className="text-sm font-semibold text-gray-900">{indReport.players.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">نوع المؤشر</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {indReport.indicator.type === 'numeric' ? 'رقمي' : indReport.indicator.type === 'rating' ? 'تقييم 1-10' : indReport.indicator.type === 'text' ? 'نصي' : 'خيارات'}
                    </p>
                  </div>
                </div>

                {indReport.players.length === 0 ? (
                  <EmptyState
                    title="لا توجد نتائج"
                    description="لم يتم تسجيل أي نتيجة لهذا المؤشر"
                    icon={<BarChart3 className="w-10 h-10" />}
                  />
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto" ref={indReportRef}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#0f2040] text-white">
                            <th className="px-4 py-3 text-right font-semibold text-xs whitespace-nowrap sticky right-0 bg-[#0f2040] z-10">
                              اسم اللاعب
                            </th>
                            {indReport.sessions.map(s => (
                              <th key={s.id} className="px-4 py-3 text-center font-semibold text-xs whitespace-nowrap min-w-[100px]">
                                <div className="flex items-center justify-center gap-0.5">
                                  <div>
                                    <div>{s.name}</div>
                                    <div className="font-normal opacity-70 text-[10px]">{s.session_date}</div>
                                  </div>
                                  <IndSortBtn colKey={s.id} sortCol={indSortCol} sortDir={indSortDir} onSort={handleIndSort} />
                                </div>
                              </th>
                            ))}
                            {showImprovementCol && (
                              <th className="px-4 py-3 text-center font-semibold text-xs whitespace-nowrap bg-[#1e3a6e]">
                                <div className="flex items-center justify-center gap-0.5">
                                  <div>
                                    <div>التحسن</div>
                                    <div className="font-normal opacity-70 text-[10px]">(أول ← آخر)</div>
                                  </div>
                                  <IndSortBtn colKey="__imp__" sortCol={indSortCol} sortDir={indSortDir} onSort={handleIndSort} />
                                </div>
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sortedIndPlayers.map((player, idx) => {
                            const playerCells = indReport.matrix[player.id] || {}
                            const imp = showImprovementCol
                              ? calcIndicatorImprovement(indReport.sessions, playerCells, indReport.indicator)
                              : null

                            return (
                              <tr key={player.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                <td className={`px-4 py-3 font-semibold text-gray-800 whitespace-nowrap sticky right-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#0f2040] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                      {player.full_name.charAt(0)}
                                    </div>
                                    {player.full_name}
                                  </div>
                                </td>
                                {indReport.sessions.map(s => {
                                  const cell = playerCells[s.id]
                                  const isSorted = indSortCol === s.id
                                  let display = '—'
                                  if (cell) {
                                    if (cell.numeric !== null) {
                                      display = indReport.indicator.type === 'rating'
                                        ? `${cell.numeric}/10`
                                        : `${cell.numeric}${indReport.indicator.unit ? ' ' + indReport.indicator.unit : ''}`
                                    } else if (cell.text) {
                                      display = cell.text
                                    }
                                  }
                                  return (
                                    <td key={s.id} className={`px-4 py-3 text-center ${isSorted ? 'bg-[#d4af37]/10' : ''}`}>
                                      <span className={`text-sm font-medium ${display === '—' ? 'text-gray-300' : isSorted ? 'text-[#0f2040] font-bold' : 'text-gray-800'}`}>
                                        {display}
                                      </span>
                                    </td>
                                  )
                                })}
                                {showImprovementCol && (
                                  <td className="px-4 py-3 text-center bg-[#f8f9fb]">
                                    {imp ? (
                                      <span className={`text-sm font-bold ${imp.positive ? 'text-green-600' : 'text-red-500'}`}>
                                        {imp.positive ? '▲' : '▼'} {imp.pct}%
                                      </span>
                                    ) : (
                                      <span className="text-gray-300 text-sm">—</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Body Composition Sheet Tab ──────────────────────────────────── */}
        {activeTab === 'bodycomp' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">كشف قياسات الجسم</h2>

            <Select label="البرنامج" value={bcRepProgramId} onChange={e => onBcRepProgramChange(e.target.value)}>
              <option value="">اختر البرنامج...</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>

            {!bcRepProgramId && !bcRepLoading && (
              <EmptyState title="اختر برنامجاً" description="لعرض كشف قياسات الجسم لجميع اللاعبين" icon={<Scale className="w-10 h-10" />} />
            )}
            {bcRepLoading && <LoadingSpinner message="جار تحميل البيانات..." />}
            {!bcRepLoading && bcRepProgramId && bcRepPlayers.length === 0 && (
              <EmptyState title="لا يوجد لاعبون" description="لا يوجد لاعبون مسجلون في هذا البرنامج" icon={<Scale className="w-10 h-10" />} />
            )}

            {!bcRepLoading && bcRepPlayers.length > 0 && (
              <>
                {/* Column selector */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">اختر المؤشرات للعرض في الجدول</p>
                  <div className="space-y-3">
                    {BC_COL_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">{group.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.cols.map(col => {
                            const checked = bcRepSelCols.has(col.key)
                            return (
                              <label
                                key={col.key}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-all select-none ${checked ? 'bg-[#0f2040] border-[#0f2040] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#0f2040] hover:text-[#0f2040]'}`}
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={checked}
                                  onChange={e => {
                                    const next = new Set(bcRepSelCols)
                                    if (e.target.checked) next.add(col.key)
                                    else next.delete(col.key)
                                    setBcRepSelCols(next)
                                  }}
                                />
                                <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-white border-white' : 'border-gray-300'}`}>
                                  {checked && <span className="block w-1.5 h-1.5 rounded-sm bg-[#0f2040]" />}
                                </span>
                                {col.label}
                                {col.unit && <span className={`text-[10px] ${checked ? 'opacity-70' : 'text-gray-400'}`}>({col.unit})</span>}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => setBcRepSelCols(new Set(BC_ALL_COLS.map(c => c.key)))} className="text-xs text-[#0f2040] hover:underline">تحديد الكل</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => setBcRepSelCols(new Set(BC_DEFAULT_COLS))} className="text-xs text-[#0f2040] hover:underline">الافتراضي</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => setBcRepSelCols(new Set())} className="text-xs text-gray-400 hover:underline">إلغاء الكل</button>
                  </div>
                </div>

                {bcRepSelCols.size === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">اختر مؤشراً واحداً على الأقل لعرض الجدول</p>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#0f2040] text-white">
                          <tr>
                            <th className="px-4 py-3 text-right text-xs font-semibold sticky right-0 bg-[#0f2040] z-10 min-w-[140px]">اللاعب</th>
                            <th className="px-3 py-3 text-center text-xs font-semibold whitespace-nowrap min-w-[95px]">آخر قياس</th>
                            {BC_ALL_COLS.filter(col => bcRepSelCols.has(col.key)).map(col => (
                              <th key={col.key} className="px-3 py-3 text-xs font-semibold whitespace-nowrap min-w-[85px]">
                                <div className="flex items-center justify-center gap-0.5">
                                  <div className="text-center">
                                    <div>{col.label}</div>
                                    {col.unit && <div className="font-normal opacity-60 text-[9px]">({col.unit})</div>}
                                  </div>
                                  <IndSortBtn colKey={col.key} sortCol={bcRepSortCol} sortDir={bcRepSortDir} onSort={(k, d) => { setBcRepSortCol(k); setBcRepSortDir(d) }} />
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sortedBcRepPlayers.map((player, idx) => {
                            const rec = bcRepRecords[player.id]
                            return (
                              <tr key={player.id} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/50'}>
                                <td className={`px-4 py-3 font-semibold text-gray-800 whitespace-nowrap sticky right-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#0f2040] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                      {player.full_name.charAt(0)}
                                    </div>
                                    {player.full_name}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center text-xs text-gray-400 whitespace-nowrap">
                                  {rec?.measurement_date ?? '—'}
                                </td>
                                {BC_ALL_COLS.filter(col => bcRepSelCols.has(col.key)).map(col => {
                                  const val = rec ? (rec as unknown as Record<string, unknown>)[col.key] as number | undefined : undefined
                                  const isSorted = bcRepSortCol === col.key
                                  return (
                                    <td key={col.key} className={`px-3 py-3 text-center ${isSorted ? 'bg-[#d4af37]/10' : ''}`}>
                                      <span className={`text-sm font-medium ${val == null ? 'text-gray-300' : isSorted ? 'text-[#0f2040] font-bold' : 'text-gray-800'}`}>
                                        {val != null ? val.toFixed(1) : '—'}
                                      </span>
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
