import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Select } from '../../components/ui/Select'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { indicatorsService } from '../../services/indicatorsService'
import { assessmentsService } from '../../services/assessmentsService'
import { type Program, type Player, type Indicator, type AssessmentResult } from '../../types'
import { normalizeIndicatorValue, getIndicatorValue } from '../../utils/progress'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { TrendingUp } from 'lucide-react'

const COLORS = ['#0f2040', '#d4af37', '#00a86b', '#e74c3c']

export function ComparisonPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [allResults, setAllResults] = useState<Record<string, AssessmentResult[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)

  useEffect(() => { loadPrograms() }, [])

  const loadPrograms = async () => {
    const data = await programsService.getPrograms().catch(() => [])
    setPrograms(data)
    setLoading(false)
  }

  const handleProgramChange = async (programId: string) => {
    setSelectedProgramId(programId)
    setSelectedPlayerIds([])
    setAllResults({})
    if (!programId) return
    const [pp, inds] = await Promise.all([
      playersService.getProgramPlayers(programId).catch(() => []),
      indicatorsService.getIndicators(programId).catch(() => []),
    ])
    setPlayers(pp.map(p => p.player).filter(Boolean) as Player[])
    setIndicators(inds)
  }

  const togglePlayer = async (playerId: string) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(prev => prev.filter(id => id !== playerId))
    } else if (selectedPlayerIds.length < 4) {
      setSelectedPlayerIds(prev => [...prev, playerId])
      if (!allResults[playerId]) {
        setLoadingResults(true)
        const sessions = await assessmentsService.getSessions(selectedProgramId).catch(() => [])
        const results: AssessmentResult[] = []
        for (const session of sessions) {
          const sessionResults = await assessmentsService.getResults(session.id).catch(() => [])
          results.push(...sessionResults.filter(r => r.player_id === playerId))
        }
        setAllResults(prev => ({ ...prev, [playerId]: results }))
        setLoadingResults(false)
      }
    }
  }

  const getPlayerValue = (playerId: string, indicator: Indicator): number => {
    const results = allResults[playerId] || []
    const indicatorResults = results.filter(r => r.indicator_id === indicator.id)
    if (indicatorResults.length === 0) return 0
    const latest = indicatorResults[indicatorResults.length - 1]
    const value = getIndicatorValue(latest)
    if (value === null) return 0
    return normalizeIndicatorValue(value, indicator)
  }

  const getPlayerDisplayValue = (playerId: string, indicator: Indicator): string => {
    const results = allResults[playerId] || []
    const indicatorResults = results.filter(r => r.indicator_id === indicator.id)
    if (indicatorResults.length === 0) return '—'
    const latest = indicatorResults[indicatorResults.length - 1]
    const value = getIndicatorValue(latest)
    if (value !== null) {
      if (indicator.type === 'rating') return `${value}/10`
      return indicator.unit ? `${value} ${indicator.unit}` : String(value)
    }
    if (latest.value_text) return latest.value_text
    if ((latest as { value_choice?: string }).value_choice) return (latest as { value_choice?: string }).value_choice!
    return '—'
  }

  const radarData = indicators.slice(0, 10).map(ind => {
    const point: Record<string, string | number> = { subject: ind.name_ar || ind.name }
    selectedPlayerIds.forEach(pid => {
      const player = players.find(p => p.id === pid)
      if (player) point[player.full_name] = getPlayerValue(pid, ind)
    })
    return point
  })

  if (loading) return <AppLayout title="المقارنة"><LoadingSpinner /></AppLayout>

  return (
    <AppLayout title="مقارنة اللاعبين">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">مقارنة أداء اللاعبين</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="البرنامج" value={selectedProgramId} onChange={e => handleProgramChange(e.target.value)}>
            <option value="">اختر البرنامج...</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>

        {!selectedProgramId ? (
          <EmptyState title="اختر برنامجاً" description="لبدء مقارنة اللاعبين" icon={<TrendingUp className="w-10 h-10" />} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Player selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-sm text-gray-800 mb-3">
                اختر لاعبين (حتى 4)
              </h3>
              {players.length === 0 ? (
                <p className="text-xs text-gray-400">لا يوجد لاعبون</p>
              ) : (
                <div className="space-y-2">
                  {players.map((player) => {
                    const selected = selectedPlayerIds.includes(player.id)
                    const colorIdx = selectedPlayerIds.indexOf(player.id)
                    return (
                      <div
                        key={player.id}
                        onClick={() => togglePlayer(player.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${selected ? 'border-transparent' : 'border-transparent hover:bg-gray-50'}`}
                        style={selected ? { backgroundColor: `${COLORS[colorIdx]}20`, borderColor: COLORS[colorIdx] } : {}}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: selected ? COLORS[colorIdx] : '#9ca3af' }}
                        >
                          {player.full_name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{player.full_name}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Charts and table */}
            <div className="lg:col-span-3 space-y-4">
              {selectedPlayerIds.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
                  اختر لاعبين لبدء المقارنة
                </div>
              ) : loadingResults ? (
                <LoadingSpinner message="جار تحميل البيانات..." />
              ) : (
                <>
                  {/* Radar chart */}
                  {radarData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                      <h3 className="font-semibold text-sm text-gray-800 mb-4">مقارنة المؤشرات (رادار)</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                          {selectedPlayerIds.map((pid, i) => {
                            const player = players.find(p => p.id === pid)
                            return (
                              <Radar
                                key={pid}
                                name={player?.full_name || ''}
                                dataKey={player?.full_name || ''}
                                stroke={COLORS[i]}
                                fill={COLORS[i]}
                                fillOpacity={0.15}
                              />
                            )
                          })}
                          <Legend />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Comparison table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-sm text-gray-800">جدول المقارنة</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">المؤشر</th>
                            {selectedPlayerIds.map((pid, i) => {
                              const player = players.find(p => p.id === pid)
                              return (
                                <th key={pid} className="px-4 py-2 text-right text-xs font-semibold" style={{ color: COLORS[i] }}>
                                  {player?.full_name}
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {indicators.map(ind => (
                            <tr key={ind.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium text-gray-700">{ind.name_ar || ind.name}</td>
                              {selectedPlayerIds.map((pid, i) => {
                                const display = getPlayerDisplayValue(pid, ind)
                                return (
                                  <td key={pid} className="px-4 py-2">
                                    <span className="text-sm font-medium" style={{ color: display === '—' ? '#ccc' : COLORS[i] }}>
                                      {display}
                                    </span>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
