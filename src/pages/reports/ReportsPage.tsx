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
import { type Program, type Player, type Indicator, type AssessmentResult, type AppSettings } from '../../types'
import { normalizeIndicatorValue, getIndicatorValue, getProgressStatus } from '../../utils/progress'
import { FileText, Download } from 'lucide-react'

export function ReportsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [results, setResults] = useState<AssessmentResult[]>([])
  const [attendance, setAttendance] = useState({ total: 0, present: 0, percentage: 0 })
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [progs, s] = await Promise.all([
      programsService.getPrograms().catch(() => []),
      settingsService.getSettings().catch(() => null),
    ])
    setPrograms(progs)
    setSettings(s)
    setLoading(false)
  }

  const handleProgramChange = async (programId: string) => {
    setSelectedProgramId(programId)
    setSelectedPlayerId('')
    setResults([])
    if (!programId) return
    const [pp, inds] = await Promise.all([
      playersService.getProgramPlayers(programId).catch(() => []),
      indicatorsService.getIndicators(programId).catch(() => []),
    ])
    setPlayers(pp.map(p => p.player).filter(Boolean) as Player[])
    setIndicators(inds)
  }

  const handlePlayerChange = async (playerId: string) => {
    setSelectedPlayerId(playerId)
    setResults([])
    if (!playerId || !selectedProgramId) return
    const sessions = await assessmentsService.getSessions(selectedProgramId).catch(() => [])
    const allResults: AssessmentResult[] = []
    for (const session of sessions.slice(-5)) {
      const res = await assessmentsService.getResults(session.id).catch(() => [])
      allResults.push(...res.filter(r => r.player_id === playerId))
    }
    const attSummary = await attendanceService.getPlayerAttendanceSummary(playerId, selectedProgramId).catch(() => ({ total: 0, present: 0, percentage: 0 }))
    setResults(allResults)
    setAttendance(attSummary)
  }

  const generatePdf = async () => {
    if (!reportRef.current) return
    setGenerating(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * pageWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight)
      const player = players.find(p => p.id === selectedPlayerId)
      pdf.save(`تقرير_${player?.full_name || 'اللاعب'}.pdf`)
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  const selectedPlayer = players.find(p => p.id === selectedPlayerId)
  const selectedProgram = programs.find(p => p.id === selectedProgramId)

  const getLatestValue = (indicatorId: string) => {
    const indicatorResults = results.filter(r => r.indicator_id === indicatorId)
    if (indicatorResults.length === 0) return null
    const latest = indicatorResults[indicatorResults.length - 1]
    return getIndicatorValue(latest)
  }

  if (loading) return <AppLayout title="التقارير"><LoadingSpinner /></AppLayout>

  return (
    <AppLayout title="التقارير">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">إنشاء تقارير اللاعبين</h2>
          {selectedPlayer && (
            <Button onClick={generatePdf} loading={generating} variant="secondary">
              <Download className="w-4 h-4" /> تحميل PDF
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

        {!selectedPlayer ? (
          <EmptyState title="اختر برنامجاً ولاعباً" description="لإنشاء تقرير" icon={<FileText className="w-10 h-10" />} />
        ) : (
          <div ref={reportRef} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" dir="rtl">
            {/* Report Header */}
            <div className="border-b-2 border-[#0a1628] pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-[#0a1628]">
                    {settings?.report_title || 'تقرير تطور اللاعب في البرنامج الإعدادي'}
                  </h1>
                  <p className="text-sm text-gray-500">{settings?.organization_name || 'النادي'}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-400">تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</p>
                </div>
              </div>
            </div>

            {/* Player Info */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-[#0a1628] mb-3">معلومات اللاعب</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">الاسم:</span><span className="font-medium">{selectedPlayer.full_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">المركز:</span><span>{selectedPlayer.position || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">رقم القميص:</span><span>{selectedPlayer.jersey_number ? `#${selectedPlayer.jersey_number}` : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الجنسية:</span><span>{selectedPlayer.nationality || '—'}</span></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-[#0a1628] mb-3">ملخص البرنامج</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">البرنامج:</span><span className="font-medium">{selectedProgram?.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الموسم:</span><span>{selectedProgram?.season || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">نسبة الحضور:</span><span className={attendance.percentage >= 75 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{attendance.percentage}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">عدد الجلسات:</span><span>{attendance.total}</span></div>
                </div>
              </div>
            </div>

            {/* Indicators Results */}
            {indicators.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-[#0a1628] mb-3">نتائج المؤشرات</h3>
                <div className="space-y-3">
                  {indicators.map(ind => {
                    const value = getLatestValue(ind.id)
                    const normalized = value !== null ? normalizeIndicatorValue(value, ind) : 0
                    const status = getProgressStatus(normalized)
                    return (
                      <div key={ind.id} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-40 shrink-0">{ind.name_ar || ind.name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${normalized}%`,
                              backgroundColor: normalized >= 75 ? '#00a86b' : normalized >= 50 ? '#f39c12' : '#e74c3c',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{normalized.toFixed(0)}%</span>
                        <span className="text-xs font-medium w-24 text-left">{value !== null ? `${value} ${ind.unit || ''}` : '—'}</span>
                        <span className="text-xs text-gray-400">{status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t pt-4 mt-6 text-center text-xs text-gray-400">
              {settings?.report_footer || 'تم إنشاء هذا التقرير بواسطة نظام تقرير اللاعب في البرنامج الإعدادي'}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
