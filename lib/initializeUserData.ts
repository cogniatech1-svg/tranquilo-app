import type { StoredData, MonthRecord } from './types'
import { getEmptyPocketsStructure } from './dataMigration'
import { getCurrentMonth } from './utils'

/**
 * Create default month record with 8 pockets (all with budget: 0)
 * Users assign budgets as needed — no preset allocations
 * Used for preconfiguring new users
 */
function getDefaultMonthData(): MonthRecord {
  return {
    income: 0,
    savings: 0,
    expenses: [],
    extraIncomes: [],
    pockets: getEmptyPocketsStructure(),
    manualBudget: undefined,
  }
}

/**
 * Initialize user data with preconfigured values:
 * - 8 bolsillos (Recreación, Hogar, Transporte, etc.)
 * - 5,000,000 (5M) de ingresos mensuales
 * - Meses de abril y mayo 2026
 * - País: Colombia
 */
export function initializeUserData(monthlyIncome: number = 5000000): StoredData {
  const currentMonth = getCurrentMonth() // "2026-05" or similar
  const aprilMonth = '2026-04'
  const mayMonth = '2026-05'

  return {
    // Monthly history with April and May preconfigured
    monthlyHistory: {
      [aprilMonth]: getDefaultMonthData(),
      [mayMonth]: getDefaultMonthData(),
    },

    // Bolsillos (will be overridden by monthlyHistory, but included for consistency)
    pockets: getEmptyPocketsStructure(),

    // Monthly income preconfigured
    monthlyIncome,
    monthlySavings: 0,

    // Empty transactions
    expenses: [],
    extraIncomes: [],

    // Metadata
    conceptMap: {},
    learnedCategoryMap: {},
    countryCode: 'CO',
    isPrivacyMode: false,
    currentMonth: currentMonth,
  }
}

/**
 * Save initialized user data to localStorage
 * Called after user signup
 */
export function saveInitializedUserData(userId: string, monthlyIncome?: number): void {
  const STORAGE_KEY = 'tranquilo_v1'
  const storageKey = `${STORAGE_KEY}_${userId}`

  const initialData = initializeUserData(monthlyIncome)

  try {
    localStorage.setItem(storageKey, JSON.stringify(initialData))
    console.log('[initializeUserData] ✅ User data initialized and saved to localStorage')
  } catch (error) {
    console.error('[initializeUserData] Error saving initialized data:', error)
  }
}

/**
 * Mark that user has completed onboarding
 */
export function markOnboardingComplete(userId: string): void {
  const ONBOARDING_FLAG = 'hasOnboarded'
  try {
    localStorage.setItem(`${ONBOARDING_FLAG}_${userId}`, 'true')
    console.log('[initializeUserData] ✅ Onboarding marked as complete')
  } catch (error) {
    console.error('[initializeUserData] Error marking onboarding:', error)
  }
}
