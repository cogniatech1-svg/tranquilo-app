import type { MonthRecord, Pocket } from './types'
import { getDefaultMonthRecord } from './utils'

/**
 * Bolsillos que debe heredar un mes nuevo: copia exacta (nombres, íconos y
 * presupuestos) del mes anterior más cercano QUE TENGA bolsillos. Se salta los
 * meses sin bolsillos para que un mes vacío creado por error no rompa la cadena.
 * Funciona igual al cruzar de año (YYYY-MM se ordena cronológicamente).
 */
export function inheritPockets(month: string, history: Record<string, MonthRecord>): Pocket[] {
  const previous = Object.keys(history)
    .filter((m) => m < month && (history[m]?.pockets?.length ?? 0) > 0)
    .sort()
    .pop()
  return previous ? (history[previous].pockets ?? []) : []
}

/**
 * Registro del mes pedido. Si no existe, lo crea vacío pero con los bolsillos
 * heredados. Único punto de creación de meses: evita que un mes nuevo nazca sin
 * bolsillos cuando su primer movimiento no viene de navegar al mes.
 */
export function getOrCreateMonth(history: Record<string, MonthRecord>, month: string): MonthRecord {
  const existing = history[month]
  if (existing) return existing
  return { ...getDefaultMonthRecord(), pockets: inheritPockets(month, history) }
}
