import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { settingsService } from '../../services/settingsService'
import { demoDataService } from '../../services/demoDataService'
import { supabase } from '../../lib/supabase'
import { Settings, Save, CheckCircle, FlaskConical, ChevronRight, Trash2 } from 'lucide-react'

export function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    organization_name: '',
    report_title: 'تقرير تطور اللاعب في البرنامج الإعدادي',
    primary_color: '#0a1628',
    accent_color: '#d4af37',
    report_footer: 'تم إنشاء هذا التقرير بواسطة نظام إدارة البرنامج الإعدادي',
  })

  // Demo data state
  const [demoSeeding, setDemoSeeding]     = useState(false)
  const [demoProgress, setDemoProgress]   = useState<string[]>([])
  const [demoDone, setDemoDone]           = useState(false)
  const [confirmDemo, setConfirmDemo]     = useState(false)
  const [alreadySeeded, setAlreadySeeded] = useState(false)

  // Cleanup state
  const [confirmCleanup, setConfirmCleanup] = useState(false)
  const [confirmCleanup2, setConfirmCleanup2] = useState(false)  // double confirmation
  const [cleaning, setCleaning]             = useState(false)
  const [cleanDone, setCleanDone]           = useState(false)

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    const [s, seeded] = await Promise.all([
      settingsService.getSettings().catch(() => null),
      demoDataService.isAlreadySeeded().catch(() => false),
    ])
    if (s) {
      setForm({
        organization_name: s.organization_name || '',
        report_title: s.report_title || 'تقرير تطور اللاعب في البرنامج الإعدادي',
        primary_color: s.primary_color || '#0a1628',
        accent_color: s.accent_color || '#d4af37',
        report_footer: s.report_footer || '',
      })
    }
    setAlreadySeeded(seeded)
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsService.saveSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleSeedDemo = async () => {
    setDemoSeeding(true)
    setDemoProgress([])
    setDemoDone(false)
    try {
      await demoDataService.seedAll((msg) => {
        setDemoProgress(prev => [...prev, msg])
      })
      setDemoDone(true)
      setAlreadySeeded(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      setDemoProgress(prev => [...prev, `❌ خطأ: ${msg}`])
    }
    setDemoSeeding(false)
  }

  const handleCleanup = async () => {
    setCleaning(true)
    setConfirmCleanup2(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Delete programs (cascades to: program_groups, program_players,
      // assessment_sessions → assessment_results, attendance_sessions → attendance_records,
      // coach_notes, recommendations, body_composition_records)
      await supabase.from('programs').delete().eq('user_id', user.id)

      // Delete players (cascades to any remaining player-linked rows)
      await supabase.from('players').delete().eq('user_id', user.id)

      // Delete indicators
      await supabase.from('indicators').delete().eq('user_id', user.id)

      setCleanDone(true)
      setAlreadySeeded(false)
    } catch (e) { console.error(e) }
    setCleaning(false)
  }

  if (loading) return <AppLayout title="الإعدادات"><LoadingSpinner /></AppLayout>

  return (
    <AppLayout title="الإعدادات">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">إعدادات التطبيق</h2>
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" /> تم الحفظ بنجاح
            </div>
          )}
        </div>

        {/* Organization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[#0f2040]" />
            <h3 className="font-semibold text-gray-900">معلومات المنظمة</h3>
          </div>
          <Input
            label="اسم النادي / المنظمة"
            value={form.organization_name}
            onChange={e => setForm(f => ({ ...f, organization_name: e.target.value }))}
            placeholder="مثال: نادي النصر"
          />
        </div>

        {/* Report Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">إعدادات التقارير</h3>
          <div className="space-y-4">
            <Input label="عنوان التقرير الرئيسي" value={form.report_title} onChange={e => setForm(f => ({ ...f, report_title: e.target.value }))} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">نص التذييل</label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2040]"
                rows={3}
                value={form.report_footer}
                onChange={e => setForm(f => ({ ...f, report_footer: e.target.value }))}
                placeholder="نص يظهر في أسفل التقرير..."
              />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">الألوان</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">اللون الرئيسي</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
                <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="font-mono" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">اللون الثانوي</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
                <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="font-mono" />
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} loading={saving} size="lg">
          <Save className="w-4 h-4" /> حفظ الإعدادات
        </Button>

        {/* Demo Data */}
        <div className="bg-gradient-to-l from-[#0a1628] to-[#1a3560] rounded-xl p-5 text-white">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-[#d4af37] rounded-xl flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-[#0a1628]" />
            </div>
            <div>
              <h3 className="font-bold text-white">بيانات تجريبية</h3>
              <p className="text-sm text-white/70 mt-1">
                أنشئ بيانات واقعية جاهزة لتجربة النظام: برنامج إعدادي كامل لمدة شهر (مايو 2026)،
                15 لاعباً، 15 مؤشراً، 4 جلسات تقييم، و18 جلسة حضور بنتائج واقعية تُظهر التطور خلال البرنامج.
              </p>
            </div>
          </div>

          {alreadySeeded && !demoDone ? (
            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-200">⚠️ تم إنشاء بيانات تجريبية مسبقاً. يمكنك إضافة دفعة جديدة أو الذهاب للتقارير للاطلاع عليها.</p>
            </div>
          ) : null}

          {/* Progress log */}
          {demoProgress.length > 0 && (
            <div className="bg-black/30 rounded-lg p-3 mb-4 space-y-1 max-h-40 overflow-y-auto">
              {demoProgress.map((msg, i) => (
                <p key={i} className="text-xs text-white/80 font-mono">{msg}</p>
              ))}
              {demoDone && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-semibold">اكتملت البيانات التجريبية!</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setConfirmDemo(true)}
              loading={demoSeeding}
              disabled={demoSeeding}
              className="bg-[#d4af37] hover:bg-[#c9a227] text-[#0a1628] font-bold"
            >
              <FlaskConical className="w-4 h-4" />
              {demoSeeding ? 'جاري الإنشاء...' : 'إنشاء البيانات التجريبية'}
            </Button>
            {demoDone && (
              <a href="/reports" className="flex items-center gap-1 text-sm text-[#d4af37] hover:text-yellow-300 underline">
                اذهب للتقارير <ChevronRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Cleanup Section ─────────────────────────────────────────── */}
      <div className="border border-red-200 rounded-xl p-5 bg-red-50">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-red-800">تنظيف البيانات</h3>
            <p className="text-sm text-red-600 mt-1">
              حذف جميع البرامج واللاعبين والمؤشرات وكل ما يرتبط بها (جلسات التقييم، الحضور، الملاحظات، التوصيات).
              <br />
              <strong>تبقى:</strong> إعداداتك العامة، أقسام المؤشرات، وحسابات المدربين.
            </p>
          </div>
        </div>

        {cleanDone ? (
          <div className="flex items-center gap-2 text-green-700 bg-green-100 rounded-lg px-4 py-2.5">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">تم تنظيف البيانات بنجاح. النظام جاهز للاستخدام من جديد.</span>
          </div>
        ) : (
          <Button
            onClick={() => setConfirmCleanup(true)}
            loading={cleaning}
            disabled={cleaning}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4" />
            {cleaning ? 'جاري الحذف...' : 'تنظيف البيانات'}
          </Button>
        )}
      </div>

      {/* Confirm demo */}
      <ConfirmModal
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        onConfirm={() => { setConfirmDemo(false); handleSeedDemo() }}
        title="إنشاء البيانات التجريبية"
        message="سيتم إنشاء برنامج كامل مع 15 لاعباً و15 مؤشراً و4 جلسات تقييم و18 جلسة حضور. قد يستغرق ذلك دقيقة. هل أنت متأكد؟"
        confirmLabel="إنشاء البيانات"
        variant="info"
      />

      {/* Confirm cleanup — step 1 */}
      <ConfirmModal
        open={confirmCleanup}
        onClose={() => setConfirmCleanup(false)}
        onConfirm={() => { setConfirmCleanup(false); setConfirmCleanup2(true) }}
        title="تنظيف البيانات"
        message="سيتم حذف جميع البرامج واللاعبين والمؤشرات وكل ما يرتبط بها بشكل نهائي. هل أنت متأكد أنك تريد المتابعة؟"
        confirmLabel="نعم، متابعة"
        cancelLabel="إلغاء"
        variant="danger"
      />

      {/* Confirm cleanup — step 2 (double confirmation) */}
      <ConfirmModal
        open={confirmCleanup2}
        onClose={() => setConfirmCleanup2(false)}
        onConfirm={handleCleanup}
        title="تأكيد نهائي — لا رجعة"
        message="هذا الإجراء لا يمكن التراجع عنه. ستُحذف جميع بيانات البرامج واللاعبين نهائياً. هل أنت متأكد تماماً؟"
        confirmLabel="نعم، احذف كل شيء"
        cancelLabel="إلغاء"
        variant="danger"
        loading={cleaning}
      />
    </AppLayout>
  )
}
