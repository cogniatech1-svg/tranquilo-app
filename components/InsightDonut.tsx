interface Segment {
  name: string
  value: number
  color: string
}

interface Props {
  segments: Segment[]
}

export function InsightDonut({ segments }: Props) {
  const total = segments.reduce((s, sg) => s + sg.value, 0)
  if (total === 0) return null

  const R = 50
  const C = 2 * Math.PI * R
  let cumPct = 0

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[120px] h-[120px] shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          {segments.map((sg, i) => {
            const pct = sg.value / total
            const dash = pct * C
            const off = C * (1 - cumPct) - C
            cumPct += pct
            return (
              <circle
                key={i}
                cx={60} cy={60} r={R}
                fill="none"
                stroke={sg.color}
                strokeWidth={15}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={off}
                strokeLinecap="butt"
              />
            )
          })}
          <circle cx={60} cy={60} r={34} fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-bold text-slate-800">{segments.length}</span>
          <span className="text-[8px] font-bold uppercase tracking-wide text-slate-400">categ.</span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5">
        {segments.slice(0, 5).map((sg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sg.color }} />
            <span className="text-xs text-slate-600 truncate flex-1 font-medium">{sg.name}</span>
            <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: sg.color }}>
              {Math.round((sg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
