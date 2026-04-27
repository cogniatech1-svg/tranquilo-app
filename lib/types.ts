/**
 * ARQUITECTURA DE DATOS
 * ════════════════════════════════════════════════════════════════════
 *
 * StoredData: datos CRUDOS almacenados en localStorage
 * ↓
 * financialEngine.ts: PROCESA y CALCULA todos los valores
 * ↓
 * FinancialSnapshot: ÚNICO ORIGEN DE VERDAD para UI
 * ↓
 * Todas las pantallas (Dashboard, BudgetScreen, InsightsScreen)
 *
 * IMPORTANTE:
 * • StoredData y sus tipos (Expense, ExtraIncome, Pocket) son DATOS CRUDOS
 * • Nunca calcules sobre ellos directamente
 * • SIEMPRE usa snapshot para valores financieros
 *
 * Ver: lib/financialEngine.ts para la regla global
 */

import type { CountryCode } from './config'

export type TabId = 'inicio' | 'movimientos' | 'presupuesto' | 'insights' | 'perfil'
export type CalmState = 'tranquilo' | 'ajustado' | 'riesgo' | 'neutral'

export interface Pocket {
  id: string
  name: string
  budget: number
  icon?: string   // custom emoji chosen by user
}

export interface Expense {
  id: string
  concept: string
  amount: number
  pocketId: string
  date: string
}

export type ExpensePayload = Omit<Expense, 'id'> & { id?: string }

export type IncomeCategory = 'salary' | 'extra' | 'other'

export interface ExtraIncome {
  id: string
  amount: number
  concept: string    // descripción del ingreso (ej: "Venta", "Bono", "Regalo")
  date: string       // ISO date
  category?: IncomeCategory
}

/**
 * MonthRecord: ÚNICA FUENTE DE VERDAD para cada mes
 *
 * EDITABLE (usuario puede cambiar):
 *   - income: ingresos base del mes
 *   - savings: ahorro definido por usuario
 *   - pockets: presupuestos por categoría
 *   - expenses: gastos registrados
 *   - extraIncomes: ingresos adicionales
 *
 * CALCULADO (financialEngine calcula):
 *   - budget = income - savings
 *   - totalIncome = income + sum(extraIncomes)
 *   - totalExpenses = sum(expenses)
 *   - remaining = budget - totalExpenses
 *   - etc.
 *
 * NO GUARDAR: totalSpent, budget, ni valores derivados
 * Siempre recalcular via calculateFinancialSnapshot
 */
export interface MonthRecord {
  // EDITABLE: datos de entrada
  income: number
  savings: number
  expenses: Expense[]
  extraIncomes: ExtraIncome[]
  pockets: Pocket[]
}

export interface ParsedTransaction {
  type: 'income' | 'expense'
  amount: number
  category: string | null   // pocket ID, null if unknown
  description: string
}

export interface StoredData {
  expenses?: Expense[]
  extraIncomes?: ExtraIncome[]
  pockets?: Pocket[]
  monthlyBudget?: number
  monthlyIncome?: number
  monthlySavings?: number   // User-defined or calculated savings
  budget?: number
  conceptMap?: Record<string, string>
  learnedCategoryMap?: Record<string, string>   // word → category mapping (learned from user corrections)
  currentMonth?: string
  monthlyHistory?: Record<string, MonthRecord>
  countryCode?: CountryCode
  isPrivacyMode?: boolean
}
