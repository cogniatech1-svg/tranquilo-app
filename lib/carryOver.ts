import type { MonthRecord } from './types'

/**
 * Calculate the accumulated carry-over balance entering a given month.
 *
 * Formula (per prior month m):
 *   net(m) = income(m) + sum(extraIncomes(m)) - sum(expenses(m))
 *   carryOver(M) = Σ net(m) for all m < M, in chronological order
 *
 * Design:
 * - Calculated, never stored → always consistent with actual data
 * - record.savings is intentionally excluded: it is a budget-allocation
 *   intent, not a real cash withdrawal from the account
 * - Gap months (not present in history) contribute 0 → surplus persists
 * - Negative carryOver = accumulated deficit (spending exceeded income)
 * - Explicit sort(a, b => a.localeCompare(b)) guarantees chronological
 *   order regardless of Object.keys insertion order
 *
 * @param targetMonth  YYYY-MM string for the month being entered
 * @param monthlyHistory  all available month records
 * @returns carry-over amount (positive = surplus, negative = deficit)
 */
export function calculateCarryOver(
  targetMonth: string,
  monthlyHistory: Record<string, MonthRecord>
): number {
  // Explicit chronological sort — never rely on Object.keys insertion order
  const priorMonths = Object.keys(monthlyHistory)
    .filter((m) => m < targetMonth)
    .sort((a, b) => a.localeCompare(b)) // YYYY-MM: lexicographic = chronological

  let carryOver = 0

  for (const month of priorMonths) {
    const record = monthlyHistory[month]
    if (!record) continue

    const income = record.income ?? 0
    const extraIncome = (record.extraIncomes ?? []).reduce((sum, e) => sum + e.amount, 0)
    const expenses = (record.expenses ?? []).reduce((sum, e) => sum + e.amount, 0)

    carryOver += income + extraIncome - expenses
  }

  return carryOver
}

/**
 * Returns true if the given month is strictly after today's month.
 * Used to flag carry-over as a projection rather than a confirmed value.
 *
 * @param month  YYYY-MM string
 */
export function isMonthInFuture(month: string): boolean {
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  return month > currentMonth
}
