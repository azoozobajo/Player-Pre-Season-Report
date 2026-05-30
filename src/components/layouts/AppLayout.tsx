import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { LogOut, User } from 'lucide-react'

interface AppLayoutProps {
  children: ReactNode
  title?: string
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-100 flex" dir="rtl">
      <Sidebar />
      <div className="flex-1 mr-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-base font-semibold text-gray-800">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-8 h-8 bg-[#0f2040] rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:block">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
