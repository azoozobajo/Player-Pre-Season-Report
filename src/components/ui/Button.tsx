import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          'bg-[#0f2040] text-white hover:bg-[#162b55] focus:ring-[#0f2040]': variant === 'primary',
          'bg-[#d4af37] text-[#0a1628] hover:bg-[#e8c547] focus:ring-[#d4af37]': variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
          'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300': variant === 'ghost',
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-300': variant === 'outline',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
          'opacity-60 cursor-not-allowed': disabled || loading,
        },
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
