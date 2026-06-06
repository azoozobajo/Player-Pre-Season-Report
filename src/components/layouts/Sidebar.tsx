import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCog,
  BarChart3,
  ClipboardList,
  Calendar,
  Scale,
  TrendingUp,
  FileText,
  Settings,
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: '/programs', icon: FolderOpen, label: 'البرامج' },
  { to: '/players', icon: Users, label: 'اللاعبون' },
  { to: '/coaches', icon: UserCog, label: 'المدربون' },
  { to: '/indicators', icon: BarChart3, label: 'المؤشرات' },
  { to: '/assessments', icon: ClipboardList, label: 'التقييمات' },
  { to: '/attendance', icon: Calendar, label: 'الحضور' },
  { to: '/body-composition', icon: Scale, label: 'قياسات الجسم' },
  { to: '/comparison', icon: TrendingUp, label: 'المقارنة' },
  { to: '/reports', icon: FileText, label: 'التقارير' },
  { to: '/settings', icon: Settings, label: 'الإعدادات' },
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-[#0a1628] text-white flex flex-col h-full fixed right-0 top-0 bottom-0 z-20">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#d4af37] rounded-xl flex items-center justify-center font-bold text-[#0a1628] text-lg">
            ⚽
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">نظام تقرير</h1>
            <p className="text-xs text-white/50">البرنامج الإعدادي</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-[#d4af37] text-[#0a1628] font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/30 text-center">v1.0.0</p>
      </div>
    </aside>
  )
}
