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
import { attendanceService } from '../../services/attendanceService'
import { type Program, type Player, type AttendanceSession, type AttendanceRecord, type AttendanceStatus } from '../../types'
import { Plus, Calendar, ChevronLeft, Edit, Trash2, CalendarDays } from 'lucide-react'
import { clsx } from 'clsx'

// Only show present / late / absent — excused removed from UI (late counts as present)
const STATUS_LABELS: Partial<Record<AttendanceStatus, string>> = {
  present: 'حاضر',
  late:    'متأخر',
  absent:  'غائب',
}

const STATUS_COLORS: Partial<Record<AttendanceStatus, string>> = {
  present: 'bg-green-100 text-green-700 hover:bg-green-200',
  late:    'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  absent:  'bg-red-100 text-red-700 hover:bg-red-200',
}

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function generateDatesBetween(start: string, end: string, selectedDays: number[]): string[] {
  if (!start || !end || selectedDays.length === 0) return []
  const dates: string[] = []
  const cur = new Date(start)
  const endDate = new Date(end)
  while (cur <= endDate) {
    if (selectedDays.includes(cur.getDay())) {
      dates.push(cur.toISOString().split('T')[0])
    }
    cur.setDate(cur.getDate() + 1)
  }
  return dates
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

  // Single session modal
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null)
  const [sessionForm, setSessionForm] = useState({ session_date: new Date().toISOString().split('T')[0], session_type: 'تدريب', notes: '' })

  // Batch sessions modal
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchForm, setBatchForm] = useState({
    start_date: '',
    end_date: '',
    session_type: 'تدريب',
    selected_days: [0, 1, 2, 3, 4] as number[],
  })
  const [batchPreview, setBatchPreview] = useState<string[]>([])

  // Confirmations
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; session: AttendanceSession | null }>({ open: false, session: null })
  const [confirmSaveEdit, setConfirmSaveEdit] = useState(false)
  const [confirmBatch, setConfirmBatch] = useState(false)

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
        if (existing >= 0) { const copy = [...prev]; copy[existing] = rec; return copy }
        return [...prev, rec]
      })
    }
    setSaving(false)
  }

  // Single session
  const openCreateSession = () => {
    setEditingSession(null)
    setSessionForm({ session_date: new Date().toISOString().split('T')[0], session_type: 'تدريب', notes: '' })
    setSessionModalOpen(true)
  }
  const openEditSession = (session: AttendanceSession) => {
    setEditingSession(session)
    setSessionForm({ session_date: session.session_date, session_type: session.session_type || 'تدريب', notes: session.notes || '' })
    setSessionModalOpen(true)
  }
  const handleSessionModalSave = () => {
    if (editingSession) { setConfirmSaveEdit(true) } else { doCreateSession() }
  }
  const doCreateSession = async () => {
    if (!selectedProgram) return
    setSaving(true)
    try {
      const s = await attendanceService.createAttendanceSession({ ...sessionForm, program_id: selectedProgram.id })
      setSessions(prev => [s, ...prev].sort((a, b) => b.session_date.localeCompare(a.session_date)))
      setSessionModalOpen(false)
      selectSession(s)
    } catch (e) { console.error(e) }
    setSaving(false)
  }
  const doUpdateSession = async () => {
    if (!editingSession) return
    setSaving(true)
    try {
      const updated = await attendanceService.updateAttendanceSession(editingSession.id, sessionForm)
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
      if (selectedSession?.id === updated.id) setSelectedSession(updated)
      setSessionModalOpen(false)
      setConfirmSaveEdit(false)
    } catch (e) { console.error(e) }
    setSaving(false)
  }
  const handleDeleteSession = (session: AttendanceSession) => { setConfirmDelete({ open: true, session }) }
  const doDeleteSession = async () => {
    if (!confirmDelete.session) return
    setSaving(true)
    try {
      await attendanceService.deleteAttendanceSession(confirmDelete.session.id)
      setSessions(prev => prev.filter(s => s.id !== confirmDelete.session!.id))
      if (selectedSession?.id === confirmDelete.session.id) { setSelectedSession(null); setRecords([]) }
    } catch (e) { console.error(e) }
    setSaving(false)
    setConfirmDelete({ open: false, session: null })
  }

  // Batch sessions
  const openBatch = () => {
    const today = new Date().toISOString().split('T')[0]
    setBatchForm({ start_date: today, end_date: today, session_type: 'تدريب', selected_days: [0, 1, 2, 3, 4] })
    setBatchPreview([])
    setBatchModalOpen(true)
  }
  const updateBatchPreview = (form: typeof batchForm) => {
    const dates = generateDatesBetween(form.start_date, form.end_date, form.selected_days)
    setBatchPreview(dates)
  }
  const toggleDay = (day: number) => {
    const newDays = batchForm.selected_days.includes(day)
      ? batchForm.selected_days.filter(d => d !== day)
      : [...batchForm.selected_days, day]
    const updated = { ...batchForm, selected_days: newDays }
    setBatchForm(updated)
    updateBatchPreview(updated)
  }
  const updateBatchField = (field: string, value: string) => {
    const updated = { ...batchForm, [field]: value }
    setBatchForm(updated)
    updateBatchPreview(updated)
  }

  const handleBatchCreate = () => {
    if (batchPreview.length === 0) return
    setConfirmBatch(true)
  }

  const doBatchCreate = async () => {
    if (!selectedProgram || batchPreview.length === 0) return
    setSaving(true)
    setConfirmBatch(false)
    setBatchModalOpen(false)
    try {
      const created: AttendanceSession[] = []
      for (const date of batchPreview) {
        const s = await attendanceService.createAttendanceSession({
          program_id: selectedProgram.id,
          session_date: date,
          session_type: batchForm.session_type,
        })
        created.push(s)
      }
      setSessions(prev => [...prev, ...created].sort((a, b) => b.session_date.localeCompare(a.session_date)))
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length
  const absentCount  = records.filter(r => r.status === 'absent').length
  const lateCount    = records.filter(r => r.status === 'late').length

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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Sessions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">الجلسات ({sessions.length})</h3>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={openBatch} title="إنشاء جلسات متعددة">
                      <CalendarDays className="w-3 h-3" />
                    </Button>
                    <Button size="sm" onClick={openCreateSession} title="إنشاء جلسة واحدة">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      className={`rounded-lg transition-colors text-sm ${selectedSession?.id === s.id ? 'bg-[#0f2040] text-white' : 'hover:bg-gray-50'}`}
                    >
                      <div onClick={() => selectSession(s)} className="p-2 cursor-pointer">
                        <p className="font-medium text-xs">{s.session_date}</p>
                        <p className={`text-xs ${selectedSession?.id === s.id ? 'text-white/70' : 'text-gray-400'}`}>{s.session_type}</p>
                      </div>
                      <div className={`flex gap-1 px-2 pb-1.5 border-t ${selectedSession?.id === s.id ? 'border-white/20' : 'border-gray-100'}`}>
                        <button
                          onClick={e => { e.stopPropagation(); openEditSession(s) }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${selectedSession?.id === s.id ? 'hover:bg-white/20 text-white/80' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                          <Edit className="w-3 h-3" /> تعديل
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteSession(s) }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${selectedSession?.id === s.id ? 'hover:bg-red-500/30 text-red-300' : 'hover:bg-red-50 text-red-400'}`}
                        >
                          <Trash2 className="w-3 h-3" /> حذف
                        </button>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-400 mb-2">لا توجد جلسات</p>
                      <Button size="sm" variant="outline" onClick={openBatch}>
                        <CalendarDays className="w-3 h-3" /> إنشاء دفعة
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Players grid */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                {!selectedSession ? (
                  <div className="text-center py-8 text-gray-400 text-sm">اختر جلسة من القائمة</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm">{selectedSession.session_date} - {selectedSession.session_type}</h3>
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-600">✓ {presentCount} حضر {lateCount > 0 && `(${lateCount} متأخر)`}</span>
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
                                    className={clsx('px-2 py-1 rounded text-xs font-medium transition-colors', status === s ? STATUS_COLORS[s] : 'bg-gray-100 text-gray-400 hover:bg-gray-200')}
                                  >
                                    {STATUS_LABELS[s]}
                                    {s === 'late' && <span className="text-gray-400 mr-0.5">(=حضور)</span>}
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

      {/* Single session modal */}
      <Modal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} title={editingSession ? 'تعديل الجلسة' : 'جلسة حضور جديدة'}>
        <div className="space-y-4">
          <Input label="التاريخ" type="date" value={sessionForm.session_date} onChange={e => setSessionForm(f => ({ ...f, session_date: e.target.value }))} />
          <Input label="نوع الجلسة" value={sessionForm.session_type} onChange={e => setSessionForm(f => ({ ...f, session_type: e.target.value }))} placeholder="تدريب، مباراة..." />
          <textarea className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]" rows={2} placeholder="ملاحظات..." value={sessionForm.notes} onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setSessionModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSessionModalSave} loading={saving}>{editingSession ? 'حفظ التعديلات' : 'إنشاء'}</Button>
          </div>
        </div>
      </Modal>

      {/* Batch sessions modal */}
      <Modal open={batchModalOpen} onClose={() => setBatchModalOpen(false)} title="إنشاء جلسات متعددة" size="lg">
        <div className="space-y-5">
          <p className="text-sm text-gray-500">حدد نطاق التواريخ وأيام الأسبوع لإنشاء جلسات تلقائياً</p>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="من تاريخ"
              type="date"
              value={batchForm.start_date}
              onChange={e => updateBatchField('start_date', e.target.value)}
            />
            <Input
              label="إلى تاريخ"
              type="date"
              value={batchForm.end_date}
              onChange={e => updateBatchField('end_date', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">أيام الأسبوع</label>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((day, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    batchForm.selected_days.includes(i)
                      ? 'bg-[#0f2040] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="نوع الجلسة"
            value={batchForm.session_type}
            onChange={e => setBatchForm(f => ({ ...f, session_type: e.target.value }))}
            placeholder="تدريب، مباراة..."
          />

          {/* Preview */}
          {batchPreview.length > 0 ? (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                سيتم إنشاء {batchPreview.length} جلسة:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {batchPreview.map(date => (
                  <span key={date} className="bg-white text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded">
                    {date}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-400">
              حدد التواريخ والأيام لمعاينة الجلسات
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setBatchModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleBatchCreate} disabled={batchPreview.length === 0} loading={saving}>
              <CalendarDays className="w-4 h-4" /> إنشاء {batchPreview.length > 0 ? `(${batchPreview.length})` : ''}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm: delete session */}
      <ConfirmModal
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, session: null })}
        onConfirm={doDeleteSession}
        title="حذف الجلسة"
        message={`هل أنت متأكد من حذف جلسة ${confirmDelete.session?.session_date}؟ سيتم حذف جميع سجلات الحضور المرتبطة.`}
        confirmLabel="حذف"
        variant="danger"
        loading={saving}
      />

      {/* Confirm: save edit */}
      <ConfirmModal
        open={confirmSaveEdit}
        onClose={() => setConfirmSaveEdit(false)}
        onConfirm={doUpdateSession}
        title="تأكيد التعديل"
        message="هل أنت متأكد من حفظ التغييرات على هذه الجلسة؟"
        confirmLabel="حفظ التعديلات"
        variant="warning"
        loading={saving}
      />

      {/* Confirm: batch create */}
      <ConfirmModal
        open={confirmBatch}
        onClose={() => setConfirmBatch(false)}
        onConfirm={doBatchCreate}
        title="تأكيد إنشاء الجلسات"
        message={`هل أنت متأكد من إنشاء ${batchPreview.length} جلسة حضور؟`}
        confirmLabel={`إنشاء ${batchPreview.length} جلسة`}
        variant="info"
        loading={saving}
      />
    </AppLayout>
  )
}
