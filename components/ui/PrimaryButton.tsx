import type { ReactNode } from 'react'
import { DS } from '../../lib/config'

export function PrimaryButton({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-semibold text-white rounded-2xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${className}`}
      style={{
        background: DS.primaryGrad,
        boxShadow: '0 4px 16px rgba(13,98,89,.35)',
      }}
    >
      {children}
    </button>
  )
}
