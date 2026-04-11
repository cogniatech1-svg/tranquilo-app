import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.04)' }}
    >
      {children}
    </div>
  )
}
