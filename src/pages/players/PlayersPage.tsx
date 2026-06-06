import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { playersService } from '../../services/playersService'
import { type Player } from '../../types'
import { Plus, Search, Edit, Trash2, Users, Eye, Camera, AlertTriangle } from 'lucide-react'

// Compress image to JPEG base64 (max 300×300, quality 0.82)
function compressImage(file: File, maxPx = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}

const POSITIONS = ['حارس مرمى', 'مدافع', 'لاعب وسط', 'مهاجم']

const emptyForm = {
  full_name: '', date_of_birth: '', nationality: '', position: '',
  jersey_number: '', height_cm: '', weight_kg: '',
  phone: '', email: '', notes: '', is_active: true,
}

export function PlayersPage() {
  const [players, setPlayers]         = useState<Player[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [form, setForm]               = useState(emptyForm)
  const [saving, setSaving]           = useState(false)
  const [dupWarning, setDupWarning]   = useState<Player | null>(null)  // duplicate name warning

  // Photo state — photoData holds final base64 (or existing URL), photoPreview for display
  const [, setPhotoFile]                = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoData, setPhotoData]       = useState<string>('')   // base64 ready to save
  const [photoLoading, setPhotoLoading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; player: Player | null }>({ open: false, player: null })

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

  // ── Modal open helpers ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingPlayer(null)
    setForm(emptyForm)
    setPhotoFile(null)
    setPhotoPreview('')
    setPhotoData('')
    setDupWarning(null)
    setModalOpen(true)
  }

  const openEdit = (p: Player) => {
    setEditingPlayer(p)
    setForm({
      full_name: p.full_name, date_of_birth: p.date_of_birth || '',
      nationality: p.nationality || '', position: p.position || '',
      jersey_number: String(p.jersey_number || ''), height_cm: String(p.height_cm || ''),
      weight_kg: String(p.weight_kg || ''), phone: p.phone || '',
      email: p.email || '', notes: p.notes || '', is_active: p.is_active,
    })
    setPhotoFile(null)
    setPhotoPreview(p.photo_url || '')
    setPhotoData(p.photo_url || '')   // keep existing photo unless changed
    setDupWarning(null)
    setModalOpen(true)
  }

  // ── Duplicate name check ───────────────────────────────────────────────────
  const checkDuplicate = (name: string) => {
    if (!name.trim()) { setDupWarning(null); return }
    const existing = players.find(p =>
      p.full_name.trim().toLowerCase() === name.trim().toLowerCase() &&
      p.id !== editingPlayer?.id
    )
    setDupWarning(existing || null)
  }

  // ── Photo picker ───────────────────────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setPhotoFile(file)
    setPhotoLoading(true)
    try {
      const base64 = await compressImage(file)
      setPhotoPreview(base64)
      setPhotoData(base64)
    } catch { /* ignore */ }
    setPhotoLoading(false)
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview('')
    setPhotoData('')
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  // ── Save player ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.full_name.trim()) return
    setSaving(true)
    try {
      const playerData: Partial<Player> = {
        full_name:      form.full_name,
        date_of_birth:  form.date_of_birth || undefined,
        nationality:    form.nationality   || undefined,
        position:       form.position      || undefined,
        jersey_number:  form.jersey_number ? parseInt(form.jersey_number)  : undefined,
        height_cm:      form.height_cm     ? parseFloat(form.height_cm)    : undefined,
        weight_kg:      form.weight_kg     ? parseFloat(form.weight_kg)    : undefined,
        phone:          form.phone         || undefined,
        email:          form.email         || undefined,
        notes:          form.notes         || undefined,
        is_active:      form.is_active,
        // Save the compressed base64 image directly — no external storage needed
        photo_url:      photoData || undefined,
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

  // ── Delete player ──────────────────────────────────────────────────────────
  const doDelete = async () => {
    if (!confirmDelete.player) return
    await playersService.deletePlayer(confirmDelete.player.id).catch(console.error)
    setConfirmDelete({ open: false, player: null })
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
                        {/* Avatar: photo or initial */}
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-gray-100">
                          {player.photo_url
                            ? <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" />
                            : (
                              <div className="w-full h-full bg-[#0f2040] flex items-center justify-center text-white text-sm font-bold">
                                {player.full_name.charAt(0)}
                              </div>
                            )
                          }
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
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ open: true, player })}>
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

      {/* ── Player Modal ───────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingPlayer ? 'تعديل بيانات اللاعب' : 'إضافة لاعب جديد'} size="lg">
        <div className="space-y-5">

          {/* Photo upload + name row */}
          <div className="flex gap-5 items-start">

            {/* Photo area */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-[#0f2040] transition-colors relative group bg-gray-50"
              >
                {photoLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="w-6 h-6 border-2 border-[#0f2040] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : photoPreview ? (
                  <>
                    <img src={photoPreview} alt="معاينة" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <Camera className="w-7 h-7 text-gray-300" />
                    <span className="text-xs text-gray-400 text-center px-1">أضف صورة</span>
                  </div>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              {photoPreview && (
                <button
                  onClick={removePhoto}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  إزالة الصورة
                </button>
              )}
              <p className="text-xs text-gray-400 text-center">اضغط لاختيار صورة</p>
            </div>

            {/* Name + duplicate warning */}
            <div className="flex-1 space-y-3">
              <div>
                <Input
                  label="الاسم الكامل *"
                  value={form.full_name}
                  onChange={e => { setForm(f => ({ ...f, full_name: e.target.value })); checkDuplicate(e.target.value) }}
                  placeholder="اسم اللاعب"
                />
                {dupWarning && (
                  <div className="mt-1.5 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-yellow-800">
                        لاعب بهذا الاسم موجود بالفعل
                      </p>
                      <p className="text-xs text-yellow-600">
                        "{dupWarning.full_name}" — {dupWarning.position || 'بدون مركز'}
                        {dupWarning.jersey_number ? ` — #${dupWarning.jersey_number}` : ''}
                      </p>
                      <p className="text-xs text-yellow-600 mt-0.5">
                        هل تقصد هذا اللاعب؟ يمكنك إضافته مباشرة للبرنامج من صفحة البرامج.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="المركز" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
                  <option value="">اختر المركز</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
                <Input label="رقم القميص" type="number" value={form.jersey_number} onChange={e => setForm(f => ({ ...f, jersey_number: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Rest of the form */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="تاريخ الميلاد" type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            <Input label="الجنسية" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="سعودي، مصري..." />
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
            <Button onClick={handleSave} loading={saving || photoLoading} disabled={!form.full_name.trim() || photoLoading}>
              {photoLoading ? 'جار معالجة الصورة...' : editingPlayer ? 'حفظ التعديلات' : 'إضافة اللاعب'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <ConfirmModal
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, player: null })}
        onConfirm={doDelete}
        title="حذف اللاعب"
        message={`هل أنت متأكد من حذف "${confirmDelete.player?.full_name}"؟ سيتم حذف جميع بياناته من جميع البرامج ولا يمكن التراجع.`}
        confirmLabel="حذف"
        variant="danger"
      />
    </AppLayout>
  )
}
