import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { attendanceService } from '../../services/attendanceService'
import { type Program, type Player, type AttendanceSession, type AttendanceRecord, type AttendanceStatus } from '../../types'
import { Plus, Calendar, ChevronLeft } from 'lucide-react'
import { clsx } from 'clsx'

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  excused: 'مبرر',
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700 hover:bg-green-200',
  absent: 'bg-red-100 text-red-700 hover:bg-red-200',
  late: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  excused: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
}

export function AttendancePage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [sessionForm, setSessionForm] = useState({ session_date: new Date().toISOString().split('T')[0], session_type: 'تدريب', notes: '' })

  useEffect(() => { loadPrograms() }, [])

  const loadPrograms = async () => {
    const data = await programsService.getPrograms().catch(() => [])
    setPrograms(data)
    setLoading(false)
  }

  const selectProgram = async (program: Program) => {
    setSelectedProgram(program)
    setSelectedSession(null)
    const [ss, pp] = await Promise.all([
      attendanceService.getAttendanceSessions(program.id).catch(() => []),
      playersService.getProgramPlayers(program.id).catch(() => []),
    ])
    setSessions(ss)
    setPlayers(pp.map(p => p.player).filter(Boolean) as Player[])
  }

  const selectSession = async (session: AttendanceSession) => {
    setSelectedSession(session)
    const recs = await attendanceService.getAttendanceRecords(session.id).catch(() => [])
    setRecords(recs)
  }

  const getPlayerStatus = (playerId: string): AttendanceStatus | null => {
    const rec = records.find(r => r.player_id === playerId)
    return rec ? rec.status : null
  }

  const setStatus = async (playerId: string, status: AttendanceStatus) => {
    if (!selectedSession) return
    setSaving(true)
    const rec = await attendanceService.saveAttendanceRecord({
      attendance_session_id: selectedSession.id,
      player_id: playerId,
      status,
    }).catch(console.error)
    if (rec) {
      setRecords(prev => {
        const existing = prev.findIndex(r => r.player_id === playerId)
        if (existing >= 0) {
          const copy = [...prev]
          copy[existing] = rec
          return copy
        }
        return [...prev, rec]
      })
    }
    setSaving(false)
  }

  const handleCreateSession = async () => {
    if (!selectedProgram) return
    setSaving(true)
    try {
      const s = await attendanceService.createAttendanceSession({ ...sessionForm, program_id: selectedProgram.id })
      setSessions(prev => [s, ...prev])
      setSessionModalOpen(false)
      selectSession(s)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const presentCount = records.filter(r => r.status === 'present').length
  const absentCount = records.filter(r => r.status === 'absent').length

  if (loading) return <AppLayout title="الحضور"><LoadingSpinner /></AppLayout>

  return (
    <AppLayout title="الحضور">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">إدارة الحضور</h2>

        {!selectedProgram ? (
          <div>
            <p className="text-sm text-gray-500 mb-3">اختر برنامجاً للبدء</p>
            {programs.length === 0 ? (
              <EmptyState title="لا توجد برامج" icon={<Calendar className="w-10 h-10" />} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map(p => (
                  <div key={p.id} onClick={() => selectProgram(p)} className="bg-white rounded-xl p-4 cursor-pointer hover:border-[#0f2040] border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0f2040] rounded-xl flex items-center justify-center text-white">📅</div>
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Sessions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">الجلسات</h3>
                  <Button size="sm" onClick={() => setSessionModalOpen(true)}><Plus className="w-3 h-3" /></Button>
                </div>
                <div className="space-y-2">
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => selectSession(s)}
                      className={`p-2 rounded-lg cursor-pointer text-sm transition-colors ${selectedSession?.id === s.id ? 'bg-[#0f2040] text-white' : 'hover:bg-gray-50'}`}
                    >
                      <p className="font-medium">{s.session_date}</p>
                      <p className={`text-xs ${selectedSession?.id === s.id ? 'text-white/70' : 'text-gray-400'}`}>{s.session_type}</p>
                    </div>
                  ))}
                  {sessions.length === 0 && <p className="text-xs text-gray-400 text-center py-3">لا توجد جلسات</p>}
                </div>
              </div>

              {/* Players grid */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                {!selectedSession ? (
                  <div className="text-center py-8 text-gray-400 text-sm">اختر جلسة من القائمة</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm">
                        {selectedSession.session_date} - {selectedSession.session_type}
                      </h3>
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-600">✓ {presentCount} حاضر</span>
                        <span className="text-red-600">✗ {absentCount} غائب</span>
                      </div>
                    </div>
                    {players.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">لا يوجد لاعبون في البرنامج</p>
                    ) : (
                      <div className="space-y-2">
                        {players.map(player => {
                          const status = getPlayerStatus(player.id)
                          return (
                            <div key={player.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#0f2040] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {player.full_name.charAt(0)}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{player.full_name}</span>
                              </div>
                              <div className="flex gap-1">
                                {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map(s => (
                                  <button
                                    key={s}
                                    onClick={() => setStatus(player.id, s)}
                                    className={clsx(
                                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                                      status === s ? STATUS_COLORS[s] : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    )}
                                  >
                                    {STATUS_LABELS[s]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} title="جلسة حضور جديدة">
        <div className="space-y-4">
          <Input label="التاريخ" type="date" value={sessionForm.session_date} onChange={e => setSessionForm(f => ({ ...f, session_date: e.target.value }))} />
          <Input label="نوع الجلسة" value={sessionForm.session_type} onChange={e => setSessionForm(f => ({ ...f, session_type: e.target.value }))} placeholder="تدريب، مباراة..." />
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
            rows={2}
            placeholder="ملاحظات..."
            value={sessionForm.notes}
            onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setSessionModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateSession} loading={saving}>إنشاء</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
