import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { indicatorsService } from '../../services/indicatorsService'
import { assessmentsService } from '../../services/assessmentsService'
import { type Program, type Player, type Indicator, type AssessmentSession, type AssessmentResult } from '../../types'
import { Plus, ClipboardList, ChevronLeft, Save } from 'lucide-react'

export function AssessmentsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [sessions, setSessions] = useState<AssessmentSession[]>([])
  const [selectedSession, setSelectedSession] = useState<AssessmentSession | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [sessionForm, setSessionForm] = useState({ name: '', session_date: new Date().toISOString().split('T')[0], notes: '' })

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
    const [ss, pp, inds] = await Promise.all([
      assessmentsService.getSessions(program.id).catch(() => []),
      playersService.getProgramPlayers(program.id).catch(() => []),
      indicatorsService.getIndicators(program.id).catch(() => []),
    ])
    setSessions(ss)
    setPlayers(pp.map(pp => pp.player).filter(Boolean) as Player[])
    setIndicators(inds)
  }

  const selectPlayer = async (player: Player) => {
    setSelectedPlayer(player)
    if (!selectedSession) return
    const res = await assessmentsService.getResults(selectedSession.id).catch(() => [])
    const playerResults = res.filter(r => r.player_id === player.id)

    const vals: Record<string, string> = {}
    playerResults.forEach(r => {
      if (r.value_numeric !== null && r.value_numeric !== undefined) vals[r.indicator_id] = String(r.value_numeric)
      else if (r.value_rating !== null && r.value_rating !== undefined) vals[r.indicator_id] = String(r.value_rating)
      else if (r.value_text) vals[r.indicator_id] = r.value_text
      else if (r.value_choice) vals[r.indicator_id] = r.value_choice
    })
    setValues(vals)
  }

  const selectSession = async (session: AssessmentSession) => {
    setSelectedSession(session)
    setSelectedPlayer(null)

    setValues({})
  }

  const handleCreateSession = async () => {
    if (!selectedProgram) return
    setSaving(true)
    try {
      const s = await assessmentsService.createSession({ ...sessionForm, program_id: selectedProgram.id, is_complete: false })
      setSessions(prev => [s, ...prev])
      setSessionModalOpen(false)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleSaveResults = async () => {
    if (!selectedSession || !selectedPlayer) return
    setSaving(true)
    try {
      for (const [indicatorId, value] of Object.entries(values)) {
        if (!value) continue
        const indicator = indicators.find(i => i.id === indicatorId)
        if (!indicator) continue
        const resultData: Omit<AssessmentResult, 'id' | 'created_at' | 'updated_at' | 'indicator' | 'player'> = {
          session_id: selectedSession.id,
          player_id: selectedPlayer.id,
          indicator_id: indicatorId,
        }
        if (indicator.type === 'numeric') resultData.value_numeric = parseFloat(value)
        else if (indicator.type === 'rating') resultData.value_rating = parseFloat(value)
        else if (indicator.type === 'text') resultData.value_text = value
        else if (indicator.type === 'choice') resultData.value_choice = value
        await assessmentsService.saveResult(resultData).catch(console.error)
      }
      alert('تم حفظ النتائج بنجاح')
    } catch (e) { console.error(e) }
    setSaving(false)
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
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.season}</p>
                      </div>
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Sessions list */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-800">الجلسات</h3>
                  <Button size="sm" onClick={() => setSessionModalOpen(true)}><Plus className="w-3 h-3" /></Button>
                </div>
                {sessions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">لا توجد جلسات</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map(s => (
                      <div
                        key={s.id}
                        onClick={() => selectSession(s)}
                        className={`p-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedSession?.id === s.id ? 'bg-[#0f2040] text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                      >
                        <p className="font-medium">{s.name}</p>
                        <p className={`text-xs ${selectedSession?.id === s.id ? 'text-white/70' : 'text-gray-400'}`}>{s.session_date}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Players list */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-sm text-gray-800 mb-3">اللاعبون</h3>
                {!selectedSession ? (
                  <p className="text-xs text-gray-400 text-center py-4">اختر جلسة أولاً</p>
                ) : players.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">لا يوجد لاعبون في البرنامج</p>
                ) : (
                  <div className="space-y-2">
                    {players.map(player => (
                      <div
                        key={player.id}
                        onClick={() => selectPlayer(player)}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedPlayer?.id === player.id ? 'bg-[#0f2040] text-white' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${selectedPlayer?.id === player.id ? 'bg-white text-[#0f2040]' : 'bg-[#0f2040] text-white'}`}>
                          {player.full_name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{player.full_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Results entry */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-800">النتائج</h3>
                  {selectedPlayer && (
                    <Button size="sm" onClick={handleSaveResults} loading={saving}>
                      <Save className="w-3 h-3" /> حفظ
                    </Button>
                  )}
                </div>
                {!selectedPlayer ? (
                  <p className="text-xs text-gray-400 text-center py-4">اختر لاعباً أولاً</p>
                ) : indicators.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">لا توجد مؤشرات</p>
                ) : (
                  <div className="space-y-3">
                    {indicators.map(indicator => (
                      <div key={indicator.id}>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          {indicator.name_ar || indicator.name}
                          {indicator.unit && <span className="text-gray-400 mr-1">({indicator.unit})</span>}
                        </label>
                        {indicator.type === 'numeric' && (
                          <input
                            type="number"
                            value={values[indicator.id] || ''}
                            onChange={e => setValues(v => ({ ...v, [indicator.id]: e.target.value }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2040]"
                            min={indicator.min_value}
                            max={indicator.max_value}
                          />
                        )}
                        {indicator.type === 'rating' && (
                          <input
                            type="number"
                            min={1} max={10}
                            value={values[indicator.id] || ''}
                            onChange={e => setValues(v => ({ ...v, [indicator.id]: e.target.value }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2040]"
                          />
                        )}
                        {indicator.type === 'text' && (
                          <input
                            type="text"
                            value={values[indicator.id] || ''}
                            onChange={e => setValues(v => ({ ...v, [indicator.id]: e.target.value }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2040]"
                          />
                        )}
                        {indicator.type === 'choice' && (
                          <select
                            value={values[indicator.id] || ''}
                            onChange={e => setValues(v => ({ ...v, [indicator.id]: e.target.value }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2040]"
                          >
                            <option value="">اختر...</option>
                            {(indicator.choices || []).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} title="جلسة تقييم جديدة">
        <div className="space-y-4">
          <Input label="اسم الجلسة *" value={sessionForm.name} onChange={e => setSessionForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: تقييم أسبوع 1" />
          <Input label="تاريخ الجلسة" type="date" value={sessionForm.session_date} onChange={e => setSessionForm(f => ({ ...f, session_date: e.target.value }))} />
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
            rows={2}
            placeholder="ملاحظات..."
            value={sessionForm.notes}
            onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setSessionModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateSession} loading={saving} disabled={!sessionForm.name}>إنشاء</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
