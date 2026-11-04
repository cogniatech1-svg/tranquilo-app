import type { MonthRecord } from './types'

export interface YearlyPocketTotal {
  name: string
  total: number
  /** Porcentaje (0-100) del gasto total del año. */
  share: number
}

export interface YearlyMonthSummary {
  month: string // YYYY-MM
  income: number
  expenses: number
  invested: number
}

export interface YearlyBalance {
  year: number
  income: number
  expenses: number
  invested: number
  /** income - expenses - invested (misma regla que el balance acumulado). */
  net: number
  monthsWithData: number
  averageMonthlyExpenses: number
  topExpenseMonth: { month: string; expenses: number } | null
  byPocket: YearlyPocketTotal[]
  months: YearlyMonthSummary[]
}

const UNCATEGORIZED = 'Sin categoría'

/** Suma pagos de inversión por mes (YYYY-MM). */
export function sumPaymentsByMonth(
  payments: { date: string; amount: number }[]
): Record<string, number> {
  const acc: Record<string, number> = {}
  for (const p of payments) {
    const key = p.date.slice(0, 7)
    acc[key] = (acc[key] ?? 0) + p.amount
  }
  return acc
}

const yearOf = (monthKey: string) => parseInt(monthKey.slice(0, 4), 10)

function monthTotals(record: MonthRecord | undefined, invested: number) {
  const extra = (record?.extraIncomes ?? []).reduce((s, e) => s + e.amount, 0)
  const expenses = (record?.expenses ?? []).reduce((s, e) => s + e.amount, 0)
  return { income: (record?.income ?? 0) + extra, expenses, invested }
}

/** Años con algún dato (ingresos, gastos o inversiones), del más reciente al más antiguo. */
export function listYearsWithData(
  history: Record<string, MonthRecord>,
  paidByMonth: Record<string, number> = {}
): number[] {
  const years = new Set<number>()
  for (const key of new Set([...Object.keys(history), ...Object.keys(paidByMonth)])) {
    const t = monthTotals(history[key], paidByMonth[key] ?? 0)
    if (t.income > 0 || t.expenses > 0 || t.invested > 0) {
      const y = yearOf(key)
      if (!Number.isNaN(y)) years.add(y)
    }
  }
  return Array.from(years).sort((a, b) => b - a)
}

/**
 * Balance de un año: ingresos, gastos, inversiones y gasto por bolsillo.
 * Solo lectura sobre monthlyHistory; no toca el motor financiero.
 * Devuelve null si el año no tiene ningún dato.
 */
export function buildYearlyBalance(
  year: number,
  history: Record<string, MonthRecord>,
  paidByMonth: Record<string, number> = {}
): YearlyBalance | null {
  const keys = Array.from(new Set([...Object.keys(history), ...Object.keys(paidByMonth)]))
    .filter((k) => yearOf(k) === year)
    .sort()

  const months: YearlyMonthSummary[] = []
  const pocketTotals = new Map<string, { name: string; total: number }>()

  for (const key of keys) {
    const record = history[key]
    const t = monthTotals(record, paidByMonth[key] ?? 0)
    if (t.income === 0 && t.expenses === 0 && t.invested === 0) continue
    months.push({ month: key, ...t })

    const names = new Map((record?.pockets ?? []).map((p) => [p.id, p.name.trim()]))
    for (const e of record?.expenses ?? []) {
      const name = names.get(e.pocketId) || UNCATEGORIZED
      const group = name.toLowerCase()
      const current = pocketTotals.get(group)
      pocketTotals.set(group, {
        name: current?.name ?? name,
        total: (current?.total ?? 0) + e.amount,
      })
    }
  }

  if (months.length === 0) return null

  const income = months.reduce((s, m) => s + m.income, 0)
  const expenses = months.reduce((s, m) => s + m.expenses, 0)
  const invested = months.reduce((s, m) => s + m.invested, 0)
  const top = months.reduce((best, m) => (m.expenses > best.expenses ? m : best), months[0])

  return {
    year,
    income,
    expenses,
    invested,
    net: income - expenses - invested,
    monthsWithData: months.length,
    averageMonthlyExpenses: Math.round(expenses / months.length),
    topExpenseMonth: top.expenses > 0 ? { month: top.month, expenses: top.expenses } : null,
    byPocket: Array.from(pocketTotals.values())
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((p) => ({
        name: p.name,
        total: p.total,
        share: expenses > 0 ? Math.round((p.total / expenses) * 100) : 0,
      })),
    months,
  }
}
