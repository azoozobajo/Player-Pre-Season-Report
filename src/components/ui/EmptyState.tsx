import { type ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-gray-300 mb-4">
        {icon || <Inbox className="w-12 h-12" />}
      </div>
      <h3 className="text-base font-semibold text-gray-600 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-4 max-w-sm">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
