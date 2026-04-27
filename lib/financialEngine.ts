import type { Expense, ExtraIncome, Pocket } from './types'

export interface FinancialSnapshot {
  totalIncome: number
  totalExpenses: number
  savings: number
  budget: number
  assigned: number
  remaining: number
  dailyAvailable: number
  expectedSpend: number
  status: 'green' | 'yellow' | 'red'
  day: number
  daysInMonth: number
  savingsRate: number
}

interface FinancialEngineInput {
  expenses: Expense[]
  extraIncomes: ExtraIncome[]
  pockets: Pocket[]
  monthlyIncome: number
  monthlySavings: number
  currentMonth: string
}

/**
 * CENTRALIZADO: Única fuente de verdad para todos los cálculos financieros
 *
 * Recibe datos crudos y retorna un snapshot completo del estado financiero.
 * Ningún otro archivo debe hacer estos cálculos.
 */
export function calculateFinancialSnapshot(input: FinancialEngineInput): FinancialSnapshot {
  const {
    expenses,
    extraIncomes,
    pockets,
    monthlyIncome,
    monthlySavings,
    currentMonth,
  } = input

  // ────────────────────────────────────────────────────────────────
  // 1. TOTAL INCOME: suma de TODOS los extra incomes
  // ────────────────────────────────────────────────────────────────
  const totalIncome = monthlyIncome + extraIncomes.reduce((sum, inc) => sum + inc.amount, 0)

  // ────────────────────────────────────────────────────────────────
  // 2. TOTAL EXPENSES: suma de todos los gastos
  // ────────────────────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  // ────────────────────────────────────────────────────────────────
  // 3. SAVINGS: ahorro mensual definido por usuario
  // ────────────────────────────────────────────────────────────────
  const savings = Math.max(0, monthlySavings)

  // ────────────────────────────────────────────────────────────────
  // 4. BUDGET: presupuesto a gastar = ingreso - ahorro
  // ────────────────────────────────────────────────────────────────
  const budget = Math.max(0, totalIncome - savings)

  // ────────────────────────────────────────────────────────────────
  // 5. ASSIGNED: dinero asignado a pockets (presupuestos por categoría)
  // ────────────────────────────────────────────────────────────────
  const assigned = pockets.reduce((sum, pocket) => sum + pocket.budget, 0)

  // ────────────────────────────────────────────────────────────────
  // 6. REMAINING: dinero disponible en el presupuesto
  //    = budget - totalExpenses
  // ────────────────────────────────────────────────────────────────
  const remaining = budget - totalExpenses

  // ────────────────────────────────────────────────────────────────
  // 7. DAY & DAYS IN MONTH: para cálculos proporcionales
  // ────────────────────────────────────────────────────────────────
  const today = new Date()
  const day = today.getDate()
  const [year, month] = currentMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  // ────────────────────────────────────────────────────────────────
  // 8. EXPECTED SPEND: cuánto deberías haber gastado proporcionalmente
  //    = (día actual / días del mes) * budget
  // ────────────────────────────────────────────────────────────────
  const expectedSpend = daysInMonth > 0 ? (day / daysInMonth) * budget : 0

  // ────────────────────────────────────────────────────────────────
  // 9. DAILY AVAILABLE: cuánto puedes gastar hoy
  //    = remaining / días restantes (si hay días restantes)
  // ────────────────────────────────────────────────────────────────
  const daysLeft = Math.max(1, daysInMonth - day)
  const dailyAvailable = Math.max(0, remaining / daysLeft)

  // ────────────────────────────────────────────────────────────────
  // 10. SAVINGS RATE: porcentaje de ingresos que se ahorra
  // ────────────────────────────────────────────────────────────────
  const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0

  // ────────────────────────────────────────────────────────────────
  // 11. STATUS: determinar estado según gasto vs presupuesto
  // ────────────────────────────────────────────────────────────────
  let status: 'green' | 'yellow' | 'red'

  if (totalExpenses > budget) {
    // Rojo: se pasó del presupuesto
    status = 'red'
  } else if (totalExpenses > expectedSpend) {
    // Amarillo: gastando más de lo esperado pero dentro del presupuesto
    status = 'yellow'
  } else {
    // Verde: dentro de lo esperado
    status = 'green'
  }

  return {
    totalIncome,
    totalExpenses,
    savings,
    budget,
    assigned,
    remaining,
    dailyAvailable,
    expectedSpend,
    status,
    day,
    daysInMonth,
    savingsRate,
  }
}

/**
 * Helper: obtener color basado en status
 */
export function getStatusColor(status: 'green' | 'yellow' | 'red'): string {
  switch (status) {
    case 'green':
      return '#10B981'
    case 'yellow':
      return '#F59E0B'
    case 'red':
      return '#EF4444'
  }
}

/**
 * Helper: obtener emoji basado en status
 */
export function getStatusEmoji(status: 'green' | 'yellow' | 'red'): string {
  switch (status) {
    case 'green':
      return '🟢'
    case 'yellow':
      return '🟡'
    case 'red':
      return '🔴'
  }
}

/**
 * Helper: obtener mensaje basado en status
 */
export function getStatusMessage(status: 'green' | 'yellow' | 'red'): string {
  switch (status) {
    case 'green':
      return 'Vas dentro del presupuesto'
    case 'yellow':
      return 'Vas un poco por encima'
    case 'red':
      return 'Te quedaste sin presupuesto'
  }
}
