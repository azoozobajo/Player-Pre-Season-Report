import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ProgramsPage } from './pages/programs/ProgramsPage'
import { PlayersPage } from './pages/players/PlayersPage'
import { PlayerProfilePage } from './pages/players/PlayerProfilePage'
import { CoachesPage } from './pages/coaches/CoachesPage'
import { IndicatorsPage } from './pages/indicators/IndicatorsPage'
import { AssessmentsPage } from './pages/assessments/AssessmentsPage'
import { AttendancePage } from './pages/attendance/AttendancePage'
import { BodyCompositionPage } from './pages/bodyComposition/BodyCompositionPage'
import { ComparisonPage } from './pages/comparison/ComparisonPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { SettingsPage } from './pages/settings/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0f2040] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">جار التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/programs" element={<ProtectedRoute><ProgramsPage /></ProtectedRoute>} />
      <Route path="/players" element={<ProtectedRoute><PlayersPage /></ProtectedRoute>} />
      <Route path="/players/:id" element={<ProtectedRoute><PlayerProfilePage /></ProtectedRoute>} />
      <Route path="/coaches" element={<ProtectedRoute><CoachesPage /></ProtectedRoute>} />
      <Route path="/indicators" element={<ProtectedRoute><IndicatorsPage /></ProtectedRoute>} />
      <Route path="/assessments" element={<ProtectedRoute><AssessmentsPage /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
      <Route path="/body-composition" element={<ProtectedRoute><BodyCompositionPage /></ProtectedRoute>} />
      <Route path="/comparison" element={<ProtectedRoute><ComparisonPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
