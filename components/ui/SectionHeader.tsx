import type { ReactNode } from 'react'
import { DS } from '../../lib/config'

export function SectionHeader({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div
          className="w-1 h-4 rounded-full"
          style={{ background: DS.primaryGrad }}
        />
        <span className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">
          {children}
        </span>
      </div>
      {action && (
        <span className="text-xs font-semibold" style={{ color: DS.primary }}>
          {action}
        </span>
      )}
    </div>
  )
}
