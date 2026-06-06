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
    <div className="min-h-screen bg-white flex" dir="rtl">
      <Sidebar />
      <div className="flex-1 mr-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-[#d4af37] rounded-full" />
            <h1 className="text-base font-semibold text-gray-800">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
              <div className="w-6 h-6 bg-[#0a1628] rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="hidden sm:block text-xs">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs">خروج</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  )
}
