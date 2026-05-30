import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layouts/AppLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { settingsService } from '../../services/settingsService'
import { Settings, Save, CheckCircle } from 'lucide-react'

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

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    const s = await settingsService.getSettings().catch(() => null)
    if (s) {
      setForm({
        organization_name: s.organization_name || '',
        report_title: s.report_title || 'تقرير تطور اللاعب في البرنامج الإعدادي',
        primary_color: s.primary_color || '#0a1628',
        accent_color: s.accent_color || '#d4af37',
        report_footer: s.report_footer || '',
      })
    }
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

  if (loading) return <AppLayout title="الإعدادات"><LoadingSpinner /></AppLayout>

  return (
    <AppLayout title="الإعدادات">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">إعدادات التطبيق</h2>
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              تم الحفظ بنجاح
            </div>
          )}
        </div>

        {/* Organization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[#0f2040]" />
            <h3 className="font-semibold text-gray-900">معلومات المنظمة</h3>
          </div>
          <div className="space-y-4">
            <Input
              label="اسم النادي / المنظمة"
              value={form.organization_name}
              onChange={e => setForm(f => ({ ...f, organization_name: e.target.value }))}
              placeholder="مثال: نادي النصر"
            />
          </div>
        </div>

        {/* Report Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">إعدادات التقارير</h3>
          <div className="space-y-4">
            <Input
              label="عنوان التقرير الرئيسي"
              value={form.report_title}
              onChange={e => setForm(f => ({ ...f, report_title: e.target.value }))}
            />
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
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                />
                <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="font-mono" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">اللون الثانوي</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                />
                <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="font-mono" />
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} loading={saving} size="lg">
          <Save className="w-4 h-4" /> حفظ الإعدادات
        </Button>
      </div>
    </AppLayout>
  )
}
