import { StoredData, MonthRecord } from './types'
import { DEFAULT_POCKETS } from './constants'

/**
 * Decodificar encoding issues UTF-8 y otras variaciones
 */
export function decodeEncodingIssues(text: string): string {
  return text
    // Bytes UTF-8 mal formados: e3 b3 (ã³) → ó
    .replace(/ã³/g, 'ó')
    // UTF-8 double-encoded (Ã + accent)
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‰/g, 'É')
    .replace(/Â/g, '')
    // Alternative encodings
    .replace(/ã­/g, 'í')
    // Remove any remaining control characters or odd bytes
    .replace(/[\u00C3]([a-z])/g, (match, letter) => {
      const map: Record<string, string> = {
        a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', n: 'ñ'
      }
      return map[letter] || match
    })
}

/**
 * Capitalizar cada palabra
 */
export function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Normalizar pocketIds: decodificar y capitalizar nombres
 */
export function normalizePocketNames(data: StoredData): StoredData {
  // Normalizar pockets globales
  if (data.pockets) {
    data.pockets = data.pockets.map(p => ({
      ...p,
      name: capitalizeWords(decodeEncodingIssues(p.name))
    }))
  }

  // Normalizar pockets en cada mes de monthlyHistory
  const normalizedHistory: Record<string, MonthRecord> = {}
  for (const [month, record] of Object.entries(data.monthlyHistory || {})) {
    normalizedHistory[month] = {
      ...record,
      pockets: (record.pockets || []).map(p => ({
        ...p,
        name: capitalizeWords(decodeEncodingIssues(p.name))
      }))
    }
  }

  return {
    ...data,
    pockets: data.pockets,
    monthlyHistory: normalizedHistory
  }
}

/**
 * Extract YYYY-MM from date string
 * Handles multiple formats:
 * - DD/MM/YYYY (CSV import format)
 * - YYYY-MM-DD (ISO format)
 * - Any format with T prefix
 */
function getMonthFromDate(dateStr: string): string {
  if (!dateStr) return '2026-04' // fallback

  // Try DD/MM/YYYY format first (CSV format)
  if (dateStr.includes('/')) {
    const parts = dateStr.split('T')[0].split('/')
    if (parts.length === 3) {
      const day = parts[0]
      const month = parts[1]
      const year = parts[2]
      // Handle both "2026" and "26" year formats
      const fullYear = year.length === 2 ? `20${year}` : year
      return `${fullYear}-${month}`
    }
  }

  // Try YYYY-MM-DD format (ISO)
  if (dateStr.includes('-')) {
    return dateStr.slice(0, 7) // "YYYY-MM"
  }

  // Fallback
  return '2026-04'
}

/**
 * Pure function to migrate flat expenses structure to monthlyHistory
 *
 * - Always rebuilds monthlyHistory from expenses if they exist
 * - Extracts unique pocketIds from expenses and builds pockets dynamically
 * - NO side effects: no localStorage access, no React state mutation
 * - Safe for both server and client
 */
export function migrateToMonthlyHistory(data: StoredData): StoredData {
  // If no expenses to migrate, return as is
  if (!data.expenses || data.expenses.length === 0) {
    return data
  }

  // Get ALL unique pocketIds from the complete dataset
  const allPocketIds = [...new Set(data.expenses.map(e => e.pocketId).filter(Boolean))]

  // Build global pockets from data.pockets if they exist, otherwise create from IDs
  const pocketMap: Record<string, { name: string; budget: number; icon: string }> = {}
  for (const p of (data.pockets ?? [])) {
    pocketMap[p.id] = p
  }

  const globalPockets = allPocketIds.map(id =>
    pocketMap[id] || { id, name: id, budget: 0, icon: '💰' }
  )

  // Always rebuild monthlyHistory from expenses
  const monthlyHistory: Record<string, MonthRecord> = {}

  // Group expenses by month
  for (const expense of data.expenses) {
    const month = getMonthFromDate(expense.date) // "YYYY-MM" with correct parsing

    // Initialize month record if needed
    if (!monthlyHistory[month]) {
      monthlyHistory[month] = {
        income: data.monthlyIncome ?? 0,
        savings: data.monthlySavings ?? 0,
        expenses: [],
        extraIncomes: [],
        pockets: globalPockets.length ? globalPockets : DEFAULT_POCKETS,
      }
    }

    // Deduplication: check if exact duplicate exists
    const exists = monthlyHistory[month].expenses.some(e =>
      e.date === expense.date &&
      e.amount === expense.amount &&
      e.concept === expense.concept
    )

    // Only add if not a duplicate
    if (!exists) {
      monthlyHistory[month].expenses.push(expense)
    }
  }

  // Return new data object with monthlyHistory, without expenses field
  const { expenses, ...rest } = data
  return {
    ...rest,
    monthlyHistory,
  }
}
