import type { CountryConfig } from '../lib/config'
import { formatMoney } from '../lib/config'
import type { CalmState } from '../lib/types'

const ARC_COLORS: Record<CalmState, { start: string; end: string }> = {
  // Bright cyan contrasts sharply against the dark navy background
  tranquilo: { start: '#14B8A6', end: '#67E8F9' },
  ajustado:  { start: '#FBBF24', end: '#FDE68A' },
  riesgo:    { start: '#F87171', end: '#FECACA' },
  neutral:   { start: '#14B8A6', end: '#67E8F9' },
}

interface Props {
  calendarProgress: number
  totalSpent: number
  monthlyBudget: number
  calmState: CalmState
  config: CountryConfig
}

export function CircularProgress({
  calendarProgress,
  totalSpent,
  monthlyBudget,
  calmState,
  config,
}: Props) {
  const R = 90
  const C = 2 * Math.PI * R
  const offset = C * (1 - Math.min(calendarProgress, 1))
  const { start, end } = ARC_COLORS[calmState]
  const available = Math.max(0, monthlyBudget - totalSpent)

  return (
    <div className="relative w-[240px] h-[240px] mx-auto">
      <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="arcGrad" x1="10" y1="110" x2="210" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={start} />
            <stop offset="100%" stopColor={end}   />
          </linearGradient>
          <filter id="arcGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* outer decorative ring */}
        <circle cx={110} cy={110} r={106} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={1.5} />
        {/* track — slightly brighter so it reads against the dark hero */}
        <circle cx={110} cy={110} r={R} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={16} />
        {/* arc */}
        <circle
          cx={110} cy={110} r={R}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth={16}
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter="url(#arcGlow)"
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-0.5">
        <span className="text-[9px] font-bold uppercase tracking-[.16em] text-white/60 mb-1">
          Gastado
        </span>
        <span className="text-[1.75rem] font-bold text-white tabular-nums leading-none">
          {formatMoney(totalSpent, config)}
        </span>
        {monthlyBudget > 0 ? (
          <>
            <span className="text-[11px] text-white/60 tabular-nums mt-1">
              de {formatMoney(monthlyBudget, config)}
            </span>
            <span className="text-sm font-bold tabular-nums mt-2" style={{ color: '#67E8F9' }}>
              {formatMoney(available, config)} Disponible
            </span>
          </>
        ) : (
          <span className="text-xs text-white/40 mt-1">sin presupuesto</span>
        )}
      </div>
    </div>
  )
}
