import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { bodyCompositionService } from '../../services/bodyCompositionService'
import { type Program, type Player, type BodyCompositionRecord } from '../../types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Plus, Scale, Trash2 } from 'lucide-react'

const emptyForm = {
  measurement_date: new Date().toISOString().split('T')[0],
  weight_kg: '', height_cm: '', body_fat_percentage: '', muscle_mass_kg: '', bmi: '', waist_cm: '', chest_cm: '', notes: '',
}

export function BodyCompositionPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [records, setRecords] = useState<BodyCompositionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadPrograms() }, [])

  const loadPrograms = async () => {
    const data = await programsService.getPrograms().catch(() => [])
    setPrograms(data)
    setLoading(false)
  }

  const handleProgramChange = async (programId: string) => {
    setSelectedProgramId(programId)
    setSelectedPlayerId('')
    setRecords([])
    if (!programId) return
    const pp = await playersService.getProgramPlayers(programId).catch(() => [])
    setPlayers(pp.map(p => p.player).filter(Boolean) as Player[])
  }

  const handlePlayerChange = async (playerId: string) => {
    setSelectedPlayerId(playerId)
    setRecords([])
    if (!playerId || !selectedProgramId) return
    const data = await bodyCompositionService.getRecords(playerId, selectedProgramId).catch(() => [])
    setRecords(data)
  }

  const handleSave = async () => {
    if (!selectedPlayerId || !selectedProgramId) return
    setSaving(true)
    try {
      const rec = {
        player_id: selectedPlayerId,
        program_id: selectedProgramId,
        measurement_date: form.measurement_date,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
        body_fat_percentage: form.body_fat_percentage ? parseFloat(form.body_fat_percentage) : undefined,
        muscle_mass_kg: form.muscle_mass_kg ? parseFloat(form.muscle_mass_kg) : undefined,
        bmi: form.bmi ? parseFloat(form.bmi) : undefined,
        waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : undefined,
        chest_cm: form.chest_cm ? parseFloat(form.chest_cm) : undefined,
        notes: form.notes || undefined,
      }
      await bodyCompositionService.createRecord(rec as Omit<BodyCompositionRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      setModalOpen(false)
      await handlePlayerChange(selectedPlayerId)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا القياس؟')) return
    await bodyCompositionService.deleteRecord(id).catch(console.error)
    await handlePlayerChange(selectedPlayerId)
  }

  const chartData = records.map(r => ({
    date: r.measurement_date,
    'الوزن': r.weight_kg,
    'نسبة الدهون %': r.body_fat_percentage,
    'الكتلة العضلية': r.muscle_mass_kg,
  }))

  if (loading) return <AppLayout title="قياسات الجسم"><LoadingSpinner /></AppLayout>

  return (
    <AppLayout title="قياسات الجسم">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">متابعة قياسات الجسم</h2>
          {selectedPlayerId && (
            <Button size="sm" onClick={() => { setForm(emptyForm); setModalOpen(true) }}>
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
          <EmptyState title="اختر برنامجاً ولاعباً" description="لمتابعة قياسات الجسم" icon={<Scale className="w-10 h-10" />} />
        ) : records.length === 0 ? (
          <EmptyState
            title="لا توجد قياسات"
            description="أضف أول قياس لهذا اللاعب"
            icon={<Scale className="w-10 h-10" />}
            action={<Button size="sm" onClick={() => { setForm(emptyForm); setModalOpen(true) }}><Plus className="w-4 h-4" /> إضافة قياس</Button>}
          />
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-sm text-gray-800 mb-4">تطور القياسات</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="الوزن" stroke="#0f2040" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="نسبة الدهون %" stroke="#d4af37" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="الكتلة العضلية" stroke="#00a86b" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">التاريخ</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">الوزن</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">الطول</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">الدهون %</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">العضلات</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">BMI</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">{r.measurement_date}</td>
                      <td className="px-4 py-2 text-gray-700">{r.weight_kg ? `${r.weight_kg} كجم` : '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{r.height_cm ? `${r.height_cm} سم` : '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{r.body_fat_percentage ? `${r.body_fat_percentage}%` : '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{r.muscle_mass_kg ? `${r.muscle_mass_kg} كجم` : '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{r.bmi ? r.bmi.toFixed(1) : '—'}</td>
                      <td className="px-4 py-2">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="قياس جديد" size="lg">
        <div className="space-y-4">
          <Input label="تاريخ القياس" type="date" value={form.measurement_date} onChange={e => setForm(f => ({ ...f, measurement_date: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="الوزن (كجم)" type="number" step="0.1" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
            <Input label="الطول (سم)" type="number" step="0.1" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
            <Input label="BMI" type="number" step="0.01" value={form.bmi} onChange={e => setForm(f => ({ ...f, bmi: e.target.value }))} />
            <Input label="نسبة الدهون %" type="number" step="0.1" value={form.body_fat_percentage} onChange={e => setForm(f => ({ ...f, body_fat_percentage: e.target.value }))} />
            <Input label="الكتلة العضلية (كجم)" type="number" step="0.1" value={form.muscle_mass_kg} onChange={e => setForm(f => ({ ...f, muscle_mass_kg: e.target.value }))} />
            <Input label="محيط الخصر (سم)" type="number" step="0.1" value={form.waist_cm} onChange={e => setForm(f => ({ ...f, waist_cm: e.target.value }))} />
          </div>
          <Input label="محيط الصدر (سم)" type="number" step="0.1" value={form.chest_cm} onChange={e => setForm(f => ({ ...f, chest_cm: e.target.value }))} />
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
            rows={2}
            placeholder="ملاحظات..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
