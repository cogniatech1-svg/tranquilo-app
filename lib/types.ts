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
  note: string    // empty string = no note
  date: string    // ISO date
  category?: IncomeCategory
}

export interface MonthRecord {
  expenses: Expense[]
  totalSpent: number
  budget: number
  income?: number    // saved since v2 — optional for backward compat
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
