'use client'

interface Props {
  activeMonth: string
  currentMonth: string
  onChange: (month: string) => void
}

function getPrevMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`
}

function getNextMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
}

export function formatMonthName(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${names[mo - 1]} ${y}`
}

// Limit navigation to 12 months back
function getMinMonth(currentMonth: string): string {
  const [y, mo] = currentMonth.split('-').map(Number)
  const minMo = mo - 12
  if (minMo <= 0) return `${y - 1}-${String(12 + minMo).padStart(2, '0')}`
  return `${y}-${String(minMo).padStart(2, '0')}`
}

export function MonthNavigator({ activeMonth, currentMonth, onChange }: Props) {
  const isPast      = activeMonth !== currentMonth
  const canGoBack   = activeMonth > getMinMonth(currentMonth)
  const canGoFwd    = activeMonth < currentMonth

  return (
    <div className="flex flex-col items-center gap-1 mb-2">
      <div className="flex items-center gap-3">
        {/* Prev */}
        <button
          onClick={() => onChange(getPrevMonth(activeMonth))}
          disabled={!canGoBack}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all
            ${canGoBack
              ? 'bg-white/20 text-white hover:bg-white/30 active:scale-95'
              : 'text-white/20 cursor-not-allowed'}`}
          aria-label="Mes anterior"
        >
          ‹
        </button>

        {/* Month label */}
        <button
          onClick={() => isPast && onChange(currentMonth)}
          className="flex items-center gap-2 px-3 py-1 rounded-full transition-all"
          style={isPast ? { background: 'rgba(148,163,184,0.25)' } : {}}
          title={isPast ? 'Volver al mes actual' : undefined}
        >
          <span className="text-sm font-bold text-white tracking-wide">
            {formatMonthName(activeMonth)}
          </span>
          {isPast && (
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              pasado
            </span>
          )}
        </button>

        {/* Next */}
        <button
          onClick={() => onChange(getNextMonth(activeMonth))}
          disabled={!canGoFwd}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all
            ${canGoFwd
              ? 'bg-white/20 text-white hover:bg-white/30 active:scale-95'
              : 'text-white/20 cursor-not-allowed'}`}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      {/* Past month banner */}
      {isPast && (
        <div
          className="text-[11px] text-slate-300 font-medium px-3 py-1 rounded-full"
          style={{ background: 'rgba(148,163,184,0.15)' }}
        >
          Modo edición mes pasado · toca el mes para volver a hoy
        </div>
      )}
    </div>
  )
}
