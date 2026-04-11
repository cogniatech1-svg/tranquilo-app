interface ProgressBarProps {
  ratio: number
  thick?: boolean
  color?: string   // single hex color; defaults to calm-state teal
}

function resolveColor(ratio: number, override?: string): string {
  if (override) return override
  if (ratio >= 0.9) return '#EF4444'
  if (ratio >= 0.7) return '#F59E0B'
  return '#14B8A6'
}

export function ProgressBar({ ratio, thick = false, color }: ProgressBarProps) {
  const pct = `${Math.min(ratio, 1) * 100}%`
  const h = thick ? 'h-2.5' : 'h-1.5'
  const fill = resolveColor(ratio, color)

  return (
    <div className={`w-full bg-slate-100 rounded-full ${h} overflow-hidden`}>
      <div
        className={`${h} rounded-full transition-all duration-700 ease-out`}
        style={{ width: pct, backgroundColor: fill }}
      />
    </div>
  )
}
