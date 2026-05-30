import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { playersService } from '../../services/playersService'
import { type Player } from '../../types'
import { Plus, Search, Edit, Trash2, Users, Eye } from 'lucide-react'

const POSITIONS = ['حارس مرمى', 'مدافع', 'لاعب وسط', 'مهاجم']
const emptyPlayer = { full_name: '', date_of_birth: '', nationality: '', position: '', jersey_number: '', height_cm: '', weight_kg: '', phone: '', email: '', notes: '', is_active: true }

export function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [form, setForm] = useState(emptyPlayer)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadPlayers() }, [])

  const loadPlayers = async () => {
    setLoading(true)
    const data = await playersService.getPlayers().catch(() => [])
    setPlayers(data)
    setLoading(false)
  }

  const filtered = players.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.position || '').includes(search) ||
    (p.nationality || '').includes(search)
  )

  const openCreate = () => { setEditingPlayer(null); setForm(emptyPlayer); setModalOpen(true) }
  const openEdit = (p: Player) => {
    setEditingPlayer(p)
    setForm({
      full_name: p.full_name, date_of_birth: p.date_of_birth || '', nationality: p.nationality || '',
      position: p.position || '', jersey_number: String(p.jersey_number || ''), height_cm: String(p.height_cm || ''),
      weight_kg: String(p.weight_kg || ''), phone: p.phone || '', email: p.email || '', notes: p.notes || '', is_active: p.is_active,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const playerData = {
        ...form,
        jersey_number: form.jersey_number ? parseInt(form.jersey_number) : undefined,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
      }
      if (editingPlayer) {
        await playersService.updatePlayer(editingPlayer.id, playerData)
      } else {
        await playersService.createPlayer(playerData as Omit<Player, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      }
      setModalOpen(false)
      await loadPlayers()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا اللاعب؟')) return
    await playersService.deletePlayer(id).catch(console.error)
    await loadPlayers()
  }

  return (
    <AppLayout title="اللاعبون">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">إدارة اللاعبين ({players.length})</h2>
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4" /> لاعب جديد
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، المركز، الجنسية..."
            className="w-full pr-10 pl-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
          />
        </div>

        {loading ? (
          <LoadingSpinner message="جار تحميل اللاعبين..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="لا يوجد لاعبون"
            description={search ? 'لا توجد نتائج للبحث' : 'قم بإضافة أول لاعب'}
            icon={<Users className="w-12 h-12" />}
            action={!search ? <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4" /> إضافة لاعب</Button> : undefined}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">اللاعب</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden md:table-cell">المركز</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden lg:table-cell">الجنسية</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden lg:table-cell">الطول/الوزن</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(player => (
                  <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#0f2040] rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {player.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{player.full_name}</p>
                          {player.jersey_number && <p className="text-xs text-gray-400">#{player.jersey_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{player.position || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{player.nationality || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">
                        {player.height_cm ? `${player.height_cm}سم` : '—'} / {player.weight_kg ? `${player.weight_kg}كجم` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={player.is_active ? 'success' : 'default'}>
                        {player.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/players/${player.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(player)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(player.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingPlayer ? 'تعديل اللاعب' : 'لاعب جديد'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="الاسم الكامل *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="اسم اللاعب" />
            </div>
            <Input label="تاريخ الميلاد" type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            <Input label="الجنسية" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="سعودي، مصري..." />
            <Select label="المركز" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
              <option value="">اختر المركز</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Input label="رقم القميص" type="number" value={form.jersey_number} onChange={e => setForm(f => ({ ...f, jersey_number: e.target.value }))} />
            <Input label="الطول (سم)" type="number" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
            <Input label="الوزن (كجم)" type="number" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
            <Input label="الهاتف" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
            rows={2}
            placeholder="ملاحظات..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            لاعب نشط
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.full_name}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
