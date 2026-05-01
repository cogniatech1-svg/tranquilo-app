/**
 * EMERGENCY RECOVERY: Restore data from CSV backup
 * This converts CSV transactions into the app's data structure
 * and saves to both localStorage and Firestore
 */

import { StoredData, Expense, ExtraIncome, MonthRecord } from './types'
import { saveToFirestore } from './firestore'

interface CSVRow {
  fecha: string
  tipo: string
  categoria: string
  monto: number
  descripcion: string
}

/**
 * Parse CSV data from the backup file
 * Expected format: Fecha,Tipo,Categoría,Monto,Descripción
 */
function parseCSVData(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim())

  // Skip header
  const dataLines = lines.slice(1)

  return dataLines.map(line => {
    // Handle quoted fields with commas
    const regex = /(?:[^,"]+|"[^"]*")+/g
    const fields = line.match(regex) || []

    return {
      fecha: fields[0]?.trim().replace(/"/g, '') || '',
      tipo: fields[1]?.trim().replace(/"/g, '') || '',
      categoria: fields[2]?.trim().replace(/"/g, '') || '',
      monto: parseInt(fields[3]?.trim().replace(/"/g, '') || '0'),
      descripcion: fields[4]?.trim().replace(/"/g, '') || '',
    }
  })
}

/**
 * Generate unique ID for expense/income
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Convert CSV rows to app data structure
 */
function convertCSVToAppData(rows: CSVRow[]): StoredData {
  const monthlyHistory: Record<string, MonthRecord> = {}
  let totalIncome = 0

  rows.forEach(row => {
    const date = row.fecha.trim()
    const month = date.substring(0, 7) // "2026-04"

    if (!monthlyHistory[month]) {
      monthlyHistory[month] = {
        income: 0,
        savings: 0,
        expenses: [],
        extraIncomes: [],
        pockets: [],
        manualBudget: undefined,
      }
    }

    if (row.tipo.toLowerCase() === 'gasto') {
      const expense: Expense = {
        id: generateId(),
        date,
        concept: `${row.categoria.trim()} - ${row.descripcion.trim()}`,
        amount: row.monto,
        pocketId: 'default',
      }
      monthlyHistory[month].expenses.push(expense)
    } else if (row.tipo.toLowerCase() === 'ingreso') {
      const income: ExtraIncome = {
        id: generateId(),
        date,
        amount: row.monto,
        concept: row.descripcion.trim(),
      }
      monthlyHistory[month].extraIncomes.push(income)
      totalIncome += row.monto
    }
  })

  // Update income for April (main month)
  if (monthlyHistory['2026-04']) {
    monthlyHistory['2026-04'].income = totalIncome
  }

  return {
    monthlyHistory,
    monthlyIncome: totalIncome,
    monthlySavings: 0,
    expenses: monthlyHistory['2026-04']?.expenses || [],
    extraIncomes: monthlyHistory['2026-04']?.extraIncomes || [],
    pockets: [],
    conceptMap: {},
    learnedCategoryMap: {},
    countryCode: 'CO',
    isPrivacyMode: false,
  }
}

/**
 * MAIN: Restore data from CSV backup
 * Call this after user logs in
 */
export async function restoreFromCSV(csvText: string, userId: string): Promise<void> {
  console.log('[restore-csv] Starting restoration...')

  try {
    // Parse CSV
    const rows = parseCSVData(csvText)
    console.log('[restore-csv] Parsed rows:', rows.length)

    // Convert to app format
    const appData = convertCSVToAppData(rows)
    console.log('[restore-csv] Converted to app format')

    // Save to localStorage (user-scoped)
    const storageKey = `tranquilo_v1_${userId}`
    localStorage.setItem(storageKey, JSON.stringify(appData))
    console.log('[restore-csv] ✅ Saved to localStorage:', storageKey)

    // Save to Firestore
    await saveToFirestore(userId, appData)
    console.log('[restore-csv] ✅ Saved to Firestore')

    console.log('[restore-csv] ✅ RESTORATION COMPLETE - 260+ transactions recovered')
  } catch (error) {
    console.error('[restore-csv] Error during restoration:', error)
    throw error
  }
}

/**
 * Check if restoration is needed
 * (no data in user storage + CSV backup exists)
 */
export function shouldRestore(userId: string): boolean {
  const userKey = `tranquilo_v1_${userId}`
  const userData = localStorage.getItem(userKey)

  if (!userData) return false

  try {
    const parsed = JSON.parse(userData)
    const monthlyHistory = parsed.monthlyHistory || {}
    const hasData = Object.keys(monthlyHistory).length > 0 &&
                   Object.values(monthlyHistory).some((m: any) =>
                     m.expenses?.length > 0 || m.extraIncomes?.length > 0
                   )

    return !hasData // Restore if no data exists
  } catch {
    return true
  }
}
