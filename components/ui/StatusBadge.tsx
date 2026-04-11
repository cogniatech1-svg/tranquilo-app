import type { CalmState } from '../../lib/types'

const CONFIG = {
  tranquilo: { dot: '#22C55E', label: 'Vas bien',                       bg: '#F0FDF4', text: '#15803D' },
  ajustado:  { dot: '#F59E0B', label: 'Vas un poco por encima',         bg: '#FFFBEB', text: '#92400E' },
  riesgo:    { dot: '#EF4444', label: 'Estás gastando demasiado rápido', bg: '#FEF2F2', text: '#B91C1C' },
  neutral:   { dot: '#22C55E', label: 'Vas bien',                       bg: '#F0FDF4', text: '#15803D' },
}

export function StatusBadge({
  state,
  variant = 'default',
}: {
  state: CalmState
  variant?: 'default' | 'hero' | 'inline'
}) {
  const { dot, label, bg, text } = CONFIG[state]

  if (variant === 'hero') {
    return (
      <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wide border border-white/25">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
        {label}
      </span>
    )
  }

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
        <span className="text-xs font-semibold" style={{ color: text }}>{label}</span>
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full"
      style={{ backgroundColor: bg, color: text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
      {label}
    </span>
  )
}
