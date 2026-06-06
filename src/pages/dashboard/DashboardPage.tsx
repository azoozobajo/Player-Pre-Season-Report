import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../../components/layouts/AppLayout'
import { StatCard } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { programsService } from '../../services/programsService'
import { playersService } from '../../services/playersService'
import { coachesService } from '../../services/coachesService'
import { indicatorsService } from '../../services/indicatorsService'
import { categorySeedService } from '../../services/categorySeedService'
import { type Player, type Program } from '../../types'
import { Users, FolderOpen, UserCog, BarChart3, ClipboardList, Plus, ArrowLeft } from 'lucide-react'

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    programs: 0, players: 0, coaches: 0, indicators: 0, sessions: 0,
  })
  const [recentPlayers, setRecentPlayers] = useState<Player[]>([])
  const [recentPrograms, setRecentPrograms] = useState<Program[]>([])

  useEffect(() => {
    const load = async () => {
      await categorySeedService.seedDefaultCategories()
      const [programs, players, coaches, indicators] = await Promise.all([
        programsService.getPrograms().catch(() => []),
        playersService.getPlayers().catch(() => []),
        coachesService.getCoaches().catch(() => []),
        indicatorsService.getIndicators().catch(() => []),
      ])
      setStats({ programs: programs.length, players: players.length, coaches: coaches.length, indicators: indicators.length, sessions: 0 })
      setRecentPlayers(players.slice(0, 5))
      setRecentPrograms(programs.slice(0, 4))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <AppLayout title="لوحة التحكم"><LoadingSpinner message="جار التحميل..." /></AppLayout>

  return (
    <AppLayout title="لوحة التحكم">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-l from-[#0a1628] to-[#1e3a6e] rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-1">مرحباً بك في نظام تقرير اللاعب ⚽</h2>
          <p className="text-white/70 text-sm">نظام متكامل لمتابعة تطور اللاعبين في البرنامج الإعدادي</p>
          <div className="flex gap-3 mt-4">
            <Link to="/programs" className="bg-[#d4af37] text-[#0a1628] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#e8c547] transition-colors inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> برنامج جديد
            </Link>
            <Link to="/players" className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/20 transition-colors inline-flex items-center gap-2">
              <Users className="w-4 h-4" /> اللاعبون
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="البرامج" value={stats.programs} icon={<FolderOpen className="w-5 h-5" />} color="#0f2040" />
          <StatCard title="اللاعبون" value={stats.players} icon={<Users className="w-5 h-5" />} color="#1e3a6e" />
          <StatCard title="المدربون" value={stats.coaches} icon={<UserCog className="w-5 h-5" />} color="#2a4f8f" />
          <StatCard title="المؤشرات" value={stats.indicators} icon={<BarChart3 className="w-5 h-5" />} color="#d4af37" />
          <StatCard title="الجلسات" value={stats.sessions} icon={<ClipboardList className="w-5 h-5" />} color="#00a86b" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Players */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">أحدث اللاعبين</h3>
              <Link to="/players" className="text-sm text-[#0f2040] hover:underline flex items-center gap-1">
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>
            {recentPlayers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">لا يوجد لاعبون بعد</p>
            ) : (
              <div className="space-y-3">
                {recentPlayers.map(player => (
                  <Link key={player.id} to={`/players/${player.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-[#0f2040] rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {player.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{player.full_name}</p>
                      <p className="text-xs text-gray-400">{player.position || 'لاعب'}</p>
                    </div>
                    {player.jersey_number && (
                      <span className="mr-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full font-mono">#{player.jersey_number}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Programs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">البرامج</h3>
              <Link to="/programs" className="text-sm text-[#0f2040] hover:underline flex items-center gap-1">
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>
            {recentPrograms.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-3">لا يوجد برامج بعد</p>
                <Link to="/programs" className="text-sm text-[#0f2040] font-medium hover:underline">
                  إنشاء برنامج جديد
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPrograms.map(program => (
                  <div key={program.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-9 h-9 bg-[#d4af37] rounded-lg flex items-center justify-center text-[#0a1628] text-sm font-bold">
                      📋
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{program.name}</p>
                      <p className="text-xs text-gray-400">{program.season || 'موسم'}</p>
                    </div>
                    <span className={`mr-auto text-xs px-2 py-0.5 rounded-full ${program.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {program.is_active ? 'نشط' : 'منتهي'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">روابط سريعة</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { to: '/assessments', icon: '📊', label: 'تقييم جديد' },
              { to: '/attendance', icon: '📅', label: 'الحضور' },
              { to: '/body-composition', icon: '⚖️', label: 'قياسات الجسم' },
              { to: '/comparison', icon: '📈', label: 'مقارنة اللاعبين' },
              { to: '/reports', icon: '📄', label: 'التقارير' },
              { to: '/indicators', icon: '🎯', label: 'المؤشرات' },
            ].map(item => (
              <Link key={item.to} to={item.to} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors text-center">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs text-gray-600 font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
