import { DS } from '../lib/config'

interface Props {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, accent = false }: Props) {
  if (accent) {
    return (
      <div
        className="rounded-2xl p-4 flex flex-col gap-0.5"
        style={{
          background: DS.primaryGrad,
          boxShadow: '0 4px 16px rgba(15,118,110,.25)',
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/60">
          {label}
        </span>
        <span className="text-[15px] font-bold text-white tabular-nums leading-tight">
          {value}
        </span>
        {sub && <span className="text-[10px] text-white/50 tabular-nums">{sub}</span>}
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-2xl p-4 flex flex-col gap-0.5 border border-slate-100"
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.04)' }}
    >
      <span className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">
        {label}
      </span>
      <span className="text-[15px] font-bold text-slate-900 tabular-nums leading-tight">
        {value}
      </span>
      {sub && <span className="text-[10px] text-slate-400 tabular-nums">{sub}</span>}
    </div>
  )
}
