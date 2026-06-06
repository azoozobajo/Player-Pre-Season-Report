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
    <div className="min-h-screen bg-white flex" dir="rtl">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a1628] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Gold accent circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/8 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#d4af37]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        {/* Gold accent lines */}
        <div className="absolute top-1/4 left-0 w-1 h-32 bg-[#d4af37]/20 rounded-full" />
        <div className="absolute top-1/3 left-4 w-1 h-20 bg-[#d4af37]/15 rounded-full" />

        <div className="relative z-10 text-center">
          <img src="/penta-logo.jpeg" alt="Penta EPDP" className="w-48 h-36 object-contain mx-auto mb-8 opacity-90" />
          <h1 className="text-4xl font-black tracking-widest text-white mb-2">PENTA</h1>
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="h-px w-12 bg-[#d4af37]" />
            <span className="text-[#d4af37] font-bold tracking-[0.3em] text-sm">EPDP</span>
            <div className="h-px w-12 bg-[#d4af37]" />
          </div>
          <p className="text-white/40 text-xs tracking-widest uppercase">Elite Player Development Program</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/penta-logo.jpeg" alt="Penta EPDP" className="w-32 h-24 object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-black tracking-widest text-[#0a1628]">PENTA</h1>
            <p className="text-[#d4af37] text-xs tracking-widest mt-1">ELITE PLAYER DEVELOPMENT PROGRAM</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">مرحباً</h2>
            <p className="text-gray-400 text-sm mt-1">سجّل دخولك للمتابعة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute right-3 top-9 w-4 h-4 text-gray-300" />
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
              <Lock className="absolute right-3 top-9 w-4 h-4 text-gray-300" />
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

          <p className="text-center text-xs text-gray-300 mt-8 tracking-wider">PENTA EPDP © 2025</p>
        </div>
      </div>
    </div>
  )
}
