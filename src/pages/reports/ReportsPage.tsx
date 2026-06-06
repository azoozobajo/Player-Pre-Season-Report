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
import {
  type Program, type Player, type Indicator,
  type AppSettings, type CoachNote, type Recommendation, type IndicatorCategory,
} from '../../types'
import { getIndicatorValue } from '../../utils/progress'
import { FileText, Printer } from 'lucide-react'

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
  positive: boolean // true = improvement in the intended direction
}

function calcImprovement(first: number, last: number, direction: string): ImprovementResult | null {
  if (first === 0) return null
  const diff = last - first
  if (diff === 0) return null
  const pct = Math.abs(diff / first * 100)

  let positive: boolean
  if (direction === 'lower_better')       positive = last < first
  else if (direction === 'higher_better') positive = last > first
  else positive = true // neutral — just show change

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
}

// ═════════════════════════════════════════════════════════════════════════════
export function ReportsPage() {
  const [programs, setPrograms]       = useState<Program[]>([])
  const [players,  setPlayers]        = useState<Player[]>([])
  const [selProgramId, setSelProgramId] = useState('')
  const [selPlayerId,  setSelPlayerId]  = useState('')
  const [data, setData]               = useState<ReportData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [loadingR, setLoadingR]       = useState(false)
  const [printing, setPrinting]       = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [])
  const init = async () => {
    const progs = await programsService.getPrograms().catch(() => [])
    setPrograms(progs)
    setLoading(false)
  }

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
      const [sessions, allIndicators, rawCategories, attRaw, notes, recs, prog, player, s] = await Promise.all([
        assessmentsService.getSessions(selProgramId).catch(() => []),
        indicatorsService.getIndicators(selProgramId).catch(() => []),
        categoriesService.getCategories().catch(() => []),
        attendanceService.getPlayerAttendanceSummary(playerId, selProgramId).catch(() => ({ total:0,present:0,late:0,absent:0,attended:0,percentage:0,excused:0 })),
        notesService.getCoachNotes(playerId, selProgramId).catch(() => []),
        notesService.getRecommendations(playerId, selProgramId).catch(() => []),
        programsService.getProgram(selProgramId).catch(() => null),
        playersService.getPlayer(playerId).catch(() => null),
        settingsService.getSettings().catch(() => null),
      ])

      if (!player || !prog) { setLoadingR(false); return }

      // Evaluation special notes
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

      // Load first and last session results
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
      })
    } catch(e) { console.error(e) }
    setLoadingR(false)
  }

  // ── Print-based PDF ───────────────────────────────────────────────────────
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

  if (loading) return <AppLayout title="التقارير"><LoadingSpinner /></AppLayout>

  return (
    <AppLayout title="التقارير">
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

            {/* ══════════════════════════════════════════════════
                صفحة 1 — المقدمة (بدون أي تقييم)
            ══════════════════════════════════════════════════ */}
            <div style={{ pageBreakAfter:'always' }}>

              {/* Header */}
              <div style={{ background:'linear-gradient(135deg,#0a1628 0%,#1e3a6e 100%)', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ color:'#d4af37', fontSize:10, fontWeight:700, margin:'0 0 3px', letterSpacing:1 }}>
                    {data.settings?.organization_name || 'البرنامج الإعدادي'}
                  </p>
                  <h1 style={{ color:'#fff', fontSize:16, fontWeight:700, margin:0 }}>
                    {data.settings?.report_title || 'تقرير اللاعب في البرنامج الإعدادي'}
                  </h1>
                </div>
                <div style={{ textAlign:'left' }}>
                  <p style={{ color:'rgba(255,255,255,.5)', fontSize:9, margin:0 }}>تاريخ التقرير</p>
                  <p style={{ color:'#d4af37', fontSize:12, fontWeight:700, margin:'2px 0 0' }}>{new Date().toLocaleDateString('ar-SA')}</p>
                </div>
              </div>

              {/* Player banner */}
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

              {/* Program info + stats */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', background:'#f8f9fb', borderBottom:'1px solid #e8e8e8' }}>
                {/* Left: program details */}
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

                {/* Right: indicator stats */}
                <div style={{ padding:'16px 22px' }}>
                  <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 10px', letterSpacing:1 }}>إحصائيات القياس</p>
                  <div style={{ display:'flex', gap:20, marginBottom:10 }}>
                    <div style={{ textAlign:'center', background:'#fff', borderRadius:10, padding:'8px 14px', border:'1px solid #e8e8e8' }}>
                      <p style={{ fontSize:22, fontWeight:700, color:'#0a1628', margin:0, lineHeight:1 }}>{data.sessionCount}</p>
                      <p style={{ fontSize:9, color:'#aaa', margin:'2px 0 0' }}>جلسات تقييم</p>
                    </div>
                    <div style={{ textAlign:'center', background:'#fff', borderRadius:10, padding:'8px 14px', border:'1px solid #e8e8e8' }}>
                      <p style={{ fontSize:22, fontWeight:700, color:'#0a1628', margin:0, lineHeight:1 }}>{data.allIndicators.length}</p>
                      <p style={{ fontSize:9, color:'#aaa', margin:'2px 0 0' }}>مؤشر</p>
                    </div>
                    <div style={{ textAlign:'center', background:'#fff', borderRadius:10, padding:'8px 14px', border:'1px solid #e8e8e8' }}>
                      <p style={{ fontSize:22, fontWeight:700, color:'#0a1628', margin:0, lineHeight:1 }}>{data.categories.length}</p>
                      <p style={{ fontSize:9, color:'#aaa', margin:'2px 0 0' }}>قسم</p>
                    </div>
                  </div>
                  {/* Category breakdown */}
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

              {/* Attendance summary */}
              <div style={{ padding:'14px 22px', background:'#fff', borderBottom:'1px solid #e8e8e8' }}>
                <p style={{ fontSize:9, color:'#aaa', fontWeight:700, margin:'0 0 10px', letterSpacing:1 }}>ملخص الحضور</p>
                <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                  {/* Big number */}
                  <div style={{ textAlign:'center', flexShrink:0 }}>
                    <p style={{ fontSize:28, fontWeight:700, color:data.att.percentage >= 80 ? '#00a86b' : '#e74c3c', margin:0, lineHeight:1 }}>{data.att.percentage}%</p>
                    <p style={{ fontSize:9, color:'#aaa', margin:'2px 0 0' }}>نسبة الحضور</p>
                  </div>
                  {/* Progress bar */}
                  <div style={{ flex:1 }}>
                    <div style={{ background:'#eee', borderRadius:99, height:10, overflow:'hidden', marginBottom:8 }}>
                      <div style={{ width:`${data.att.percentage}%`, height:'100%', background:data.att.percentage>=80?'#00a86b':'#e74c3c', borderRadius:99 }} />
                    </div>
                    <div style={{ display:'flex', gap:18, fontSize:11 }}>
                      <span><strong style={{color:'#00a86b'}}>{data.att.present}</strong> <span style={{color:'#888'}}>حضر فعلاً</span></span>
                      {data.att.late > 0 && <span><strong style={{color:'#f39c12'}}>{data.att.late}</strong> <span style={{color:'#888'}}>متأخر (يُحسب حضوراً)</span></span>}
                      <span><strong style={{color:'#e74c3c'}}>{data.att.absent}</strong> <span style={{color:'#888'}}>غائب</span></span>
                      <span style={{color:'#aaa', fontSize:10}}>من إجمالي {data.att.total} جلسة</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Targets if any */}
              {data.targets && (
                <div style={{ margin:'14px 22px', background:'#f0f7ff', borderRadius:10, padding:'10px 14px', borderRight:'3px solid #3498db' }}>
                  <p style={{ fontSize:9, color:'#3498db', fontWeight:700, margin:'0 0 4px' }}>🎯 المستهدفات</p>
                  <p style={{ fontSize:11, color:'#1a1a1a', margin:0, lineHeight:1.7 }}>{data.targets}</p>
                </div>
              )}

              {/* Page 1 footer */}
              <div style={{ background:'#0a1628', padding:'7px 22px', display:'flex', justifyContent:'space-between', marginTop: data.targets ? 0 : 14 }}>
                <span style={{ color:'#d4af37', fontSize:9, fontWeight:600 }}>الصفحة 1 — مقدمة البرنامج والمعلومات الأساسية</span>
                <span style={{ color:'rgba(255,255,255,.4)', fontSize:8 }}>
                  {data.firstDate && data.lastDate ? `${data.firstDate} ← ${data.lastDate}` : ''}
                </span>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                صفحة 2 — نتائج المؤشرات (أرقام حقيقية فقط)
            ══════════════════════════════════════════════════ */}
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
                    {/* Category header */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f0f4f8', padding:'9px 14px', borderRadius:'8px 8px 0 0', borderRight:`4px solid ${cat.color||'#0a1628'}` }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:cat.color||'#0a1628', flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight:700, color:'#0a1628', flex:1 }}>{cat.name_ar||cat.name}</span>
                      <span style={{ fontSize:10, color:'#888' }}>{catRows.length} مؤشر</span>
                    </div>

                    {/* Table header */}
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
                            {/* Name */}
                            <div>
                              <p style={{ fontSize:12, fontWeight:600, color:'#1a1a1a', margin:0 }}>{row.indicator.name_ar||row.indicator.name}</p>
                              {row.indicator.type === 'rating' && <p style={{ fontSize:9, color:'#bbb', margin:'1px 0 0' }}>تقييم من 10</p>}
                              {row.indicator.unit && row.indicator.type !== 'rating' && <p style={{ fontSize:9, color:'#bbb', margin:'1px 0 0' }}>الوحدة: {row.indicator.unit}</p>}
                            </div>

                            {/* First value */}
                            <div style={{ textAlign:'center' }}>
                              {row.firstValue !== null
                                ? <span style={{ fontSize:15, fontWeight:600, color:'#555' }}>{fmtValue(row.firstValue, row.indicator)}</span>
                                : <span style={{ fontSize:12, color:'#ccc' }}>—</span>
                              }
                            </div>

                            {/* Last value */}
                            <div style={{ textAlign:'center' }}>
                              {row.lastValue !== null
                                ? <span style={{ fontSize:15, fontWeight:700, color:'#0a1628' }}>{fmtValue(row.lastValue, row.indicator)}</span>
                                : <span style={{ fontSize:12, color:'#ccc' }}>—</span>
                              }
                            </div>

                            {/* Improvement */}
                            <div style={{ textAlign:'center' }}>
                              {imp ? (
                                <span style={{ fontSize:13, fontWeight:700, color: imp.positive ? '#00a86b' : '#e74c3c' }}>
                                  {imp.positive ? '▲' : '▼'} {imp.pct}%
                                </span>
                              ) : (
                                <span style={{ fontSize:12, color:'#ccc' }}>—</span>
                              )}
                            </div>

                            {/* Comment */}
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

              {/* Uncategorized */}
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

              {/* Page 2 footer */}
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, paddingTop:8, borderTop:'1px solid #e8e8e8' }}>
                <span style={{fontSize:8,color:'#ccc'}}>الصفحة 2 — نتائج المؤشرات التفصيلية</span>
                <span style={{fontSize:8,color:'#ccc'}}>{data.player.full_name} • {data.program.name}</span>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                صفحة 3 — التقييم الشامل والتوصيات
            ══════════════════════════════════════════════════ */}
            {(data.positives.length > 0 || data.negatives.length > 0 || data.genRecs || data.coachNotes.length > 0 || data.recommendations.length > 0) && (
              <div className="page-break" style={{ pageBreakBefore:'always', padding:'22px' }}>
                <div style={{ borderBottom:'2px solid #0a1628', paddingBottom:8, marginBottom:18 }}>
                  <p style={{ fontSize:9, color:'#aaa', margin:'0 0 2px', letterSpacing:1 }}>التقييم الكيفي</p>
                  <h2 style={{ fontSize:15, fontWeight:700, color:'#0a1628', margin:0 }}>التقييم الشامل والتوصيات</h2>
                </div>

                {/* Positives + Negatives */}
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

                {/* General recommendations */}
                {data.genRecs && (
                  <div style={{ background:'#fffbf0', border:'1px solid #f0e0a0', borderRadius:10, padding:'12px 14px', marginBottom:18, borderRight:'3px solid #f39c12' }}>
                    <p style={{ fontSize:10, color:'#f39c12', fontWeight:700, margin:'0 0 5px' }}>💡 التوصيات العامة</p>
                    <p style={{ fontSize:12, color:'#333', margin:0, lineHeight:1.7 }}>{data.genRecs}</p>
                  </div>
                )}

                {/* Coach notes */}
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

                {/* Structured recommendations */}
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

                {/* Closing summary */}
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
                  <span style={{fontSize:8,color:'#ccc'}}>{data.settings?.report_footer||'تم إنشاؤه بواسطة نظام إدارة البرنامج الإعدادي'}</span>
                  <span style={{fontSize:8,color:'#ccc'}}>الصفحة 3</span>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </AppLayout>
  )
}
