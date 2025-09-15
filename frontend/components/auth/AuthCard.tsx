import React from 'react'
import { cn } from '@/lib/utils/cn'

type AuthCardProps = {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error'
  className?: string
  children?: React.ReactNode
  actions?: React.ReactNode
}

export default function AuthCard({ title, description, variant = 'default', className, children, actions }: AuthCardProps) {
  const border = variant === 'error' ? 'border-red-200' : 'border-neutral-200'
  const heading = variant === 'error' ? 'text-red-700' : 'text-neutral-900'
  const desc = variant === 'error' ? 'text-red-700' : 'text-neutral-600'

  return (
    <div className={cn('rounded-2xl border bg-white p-6 sm:p-8 shadow-sm', border, className)}>
      <h1 className={cn('text-2xl sm:text-3xl font-semibold tracking-tight mb-2', heading)}>{title}</h1>
      {description && <p className={cn('leading-relaxed', desc)}>{description}</p>}
      {children}
      {actions && <div className="mt-6">{actions}</div>}
    </div>
  )
}

