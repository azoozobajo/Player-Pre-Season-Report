import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Lock, Mail, AlertCircle } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await login(email, password)
    setLoading(false)
    if (authError) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4" dir="rtl">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#1e3a6e]/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#d4af37] rounded-2xl mb-4 text-4xl">
            ⚽
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">نظام تقرير اللاعب</h1>
          <p className="text-white/50 text-sm">البرنامج الإعدادي</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">تسجيل الدخول</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute right-3 top-9 w-4 h-4 text-gray-400" />
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="pr-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute right-3 top-9 w-4 h-4 text-gray-400" />
              <Input
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
                required
              />
            </div>

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              دخول
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
