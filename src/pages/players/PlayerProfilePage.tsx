import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AppLayout } from '../../components/layouts/AppLayout'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { playersService } from '../../services/playersService'
import { type Player } from '../../types'
import { ArrowRight, User, ClipboardList, Calendar, Scale, MessageSquare, Lightbulb, FileText } from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: User },
  { id: 'assessments', label: 'التقييمات', icon: ClipboardList },
  { id: 'attendance', label: 'الحضور', icon: Calendar },
  { id: 'body', label: 'قياسات الجسم', icon: Scale },
  { id: 'notes', label: 'ملاحظات المدرب', icon: MessageSquare },
  { id: 'recommendations', label: 'التوصيات', icon: Lightbulb },
  { id: 'reports', label: 'التقارير', icon: FileText },
]

export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const p = await playersService.getPlayer(id).catch(() => null)
      setPlayer(p)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <AppLayout title="ملف اللاعب"><LoadingSpinner /></AppLayout>
  if (!player) return <AppLayout title="ملف اللاعب"><p className="text-gray-500 text-center py-8">لاعب غير موجود</p></AppLayout>

  const age = player.date_of_birth
    ? Math.floor((Date.now() - new Date(player.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <AppLayout title={player.full_name}>
      <div className="space-y-5">
        {/* Back */}
        <Link to="/players" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowRight className="w-4 h-4" /> العودة إلى اللاعبين
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-l from-[#0a1628] to-[#1e3a6e] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#d4af37] rounded-2xl flex items-center justify-center text-[#0a1628] text-2xl font-bold shrink-0">
              {player.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{player.full_name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {player.position && <Badge variant="gold">{player.position}</Badge>}
                {player.jersey_number && <span className="text-white/70 text-sm">#{player.jersey_number}</span>}
                {age && <span className="text-white/70 text-sm">{age} سنة</span>}
                {player.nationality && <span className="text-white/70 text-sm">{player.nationality}</span>}
              </div>
            </div>
            <div className="mr-auto flex items-center gap-3">
              {player.height_cm && (
                <div className="text-center">
                  <p className="text-lg font-bold">{player.height_cm}</p>
                  <p className="text-xs text-white/50">الطول (سم)</p>
                </div>
              )}
              {player.weight_kg && (
                <div className="text-center">
                  <p className="text-lg font-bold">{player.weight_kg}</p>
                  <p className="text-xs text-white/50">الوزن (كجم)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#0f2040] text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">المعلومات الأساسية</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'الاسم الكامل', value: player.full_name },
                  { label: 'المركز', value: player.position || '—' },
                  { label: 'رقم القميص', value: player.jersey_number ? `#${player.jersey_number}` : '—' },
                  { label: 'الجنسية', value: player.nationality || '—' },
                  { label: 'تاريخ الميلاد', value: player.date_of_birth || '—' },
                  { label: 'العمر', value: age ? `${age} سنة` : '—' },
                  { label: 'الطول', value: player.height_cm ? `${player.height_cm} سم` : '—' },
                  { label: 'الوزن', value: player.weight_kg ? `${player.weight_kg} كجم` : '—' },
                  { label: 'الهاتف', value: player.phone || '—' },
                  { label: 'البريد الإلكتروني', value: player.email || '—' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className="text-sm font-medium text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
              {player.notes && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 mb-1">ملاحظات</p>
                  <p className="text-sm text-gray-700">{player.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assessments' && (
            <div className="text-center py-8 text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">اذهب إلى صفحة التقييمات لإدارة نتائج هذا اللاعب</p>
              <Link to="/assessments" className="mt-3 inline-block text-sm text-[#0f2040] font-medium hover:underline">
                الذهاب إلى التقييمات
              </Link>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">اذهب إلى صفحة الحضور لمتابعة حضور هذا اللاعب</p>
              <Link to="/attendance" className="mt-3 inline-block text-sm text-[#0f2040] font-medium hover:underline">
                الذهاب إلى الحضور
              </Link>
            </div>
          )}

          {activeTab === 'body' && (
            <div className="text-center py-8 text-gray-400">
              <Scale className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">اذهب إلى صفحة قياسات الجسم لمتابعة تطور هذا اللاعب</p>
              <Link to="/body-composition" className="mt-3 inline-block text-sm text-[#0f2040] font-medium hover:underline">
                الذهاب إلى قياسات الجسم
              </Link>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">ملاحظات المدرب ستظهر هنا بعد إضافتها من صفحة التقييمات</p>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="text-center py-8 text-gray-400">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">التوصيات ستظهر هنا</p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">اذهب إلى صفحة التقارير لإنشاء تقرير لهذا اللاعب</p>
              <Link to="/reports" className="mt-3 inline-block text-sm text-[#0f2040] font-medium hover:underline">
                الذهاب إلى التقارير
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
