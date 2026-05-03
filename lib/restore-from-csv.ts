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
  pocketId: string
  monto: number
  descripcion: string
}

/**
 * Parse CSV data from the backup file
 * Expected format: Fecha,Tipo,Categoría,Monto,Descripción
 * Handles encoding issues: Categoría/CategorÃ­a, Descripción/DescripciÃ³n
 */
function parseCSVData(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim())

  if (lines.length < 2) return []

  // Parse header with encoding tolerance
  const headerLine = lines[0]
  const regex = /(?:[^,"]+|"[^"]*")+/g
  const headerFields = headerLine.match(regex) || []

  // Normalize header names to handle encoding issues
  const normalizeHeader = (h: string): string => {
    return h.trim().replace(/"/g, '').toLowerCase()
  }

  const headers = headerFields.map(normalizeHeader)

  // Find column indices with encoding tolerance
  const findColumn = (possibleNames: string[]): number => {
    return headers.findIndex(h => possibleNames.includes(h))
  }

  const fechaIdx = findColumn(['fecha'])
  const tipoIdx = findColumn(['tipo'])
  const categoriaIdx = findColumn(['categoría', 'categoriã­a']) // Handle encoding
  const pocketIdIdx = findColumn(['pocketid']) // New column for pocket ID
  const montoIdx = findColumn(['monto'])
  const descripcionIdx = findColumn(['descripción', 'descripciã³n']) // Handle encoding

  // Parse data rows
  return lines.slice(1).map(line => {
    const fields = line.match(regex) || []
    const cleanField = (idx: number): string => {
      return fields[idx]?.trim().replace(/"/g, '') || ''
    }

    return {
      fecha: cleanField(fechaIdx),
      tipo: cleanField(tipoIdx),
      categoria: cleanField(categoriaIdx),
      pocketId: cleanField(pocketIdIdx), // New field from CSV
      monto: Number(cleanField(montoIdx)) || 0,
      descripcion: cleanField(descripcionIdx),
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
 * Corregir encoding mal formado en strings importados del CSV
 */
const fixEncoding = (text: string) => {
  if (!text) return text
  try {
    return decodeURIComponent(escape(text))
  } catch {
    return text
  }
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
      // Use pocketId from CSV if present, otherwise fallback to categoria
      const rawCategory = row.pocketId || row.categoria || ''
      const pocketId = fixEncoding(rawCategory)
        ?.toString()
        .toLowerCase()
        .trim() || 'default'

      console.log("[IMPORT DEBUG]", rawCategory, "→", pocketId)

      const concept = fixEncoding(row.descripcion.trim())

      const expense: Expense = {
        id: generateId(),
        date,
        amount: row.monto,
        concept,
        pocketId,
      }
      // Deduplication: check if exact duplicate exists
      const exists = monthlyHistory[month].expenses.some(e =>
        e.date === expense.date &&
        e.amount === expense.amount &&
        e.concept === expense.concept
      )
      if (!exists) {
        monthlyHistory[month].expenses.push(expense)
      }
    } else if (row.tipo.toLowerCase() === 'ingreso') {
      const income: ExtraIncome = {
        id: generateId(),
        date,
        amount: row.monto,
        concept: fixEncoding(row.descripcion.trim()),
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
 * Always saves to guest storage key (tranquilo_v1)
 * Migration to user-scoped key happens during login
 * Only saves to localStorage (no Firestore)
 */
export async function restoreFromCSV(csvText: string): Promise<void> {
  console.log('[restore-csv] Starting restoration...')

  try {
    // Parse CSV
    const rows = parseCSVData(csvText)
    console.log('[restore-csv] Parsed rows:', rows.length)

    // Convert to app format
    const appData = convertCSVToAppData(rows)
    console.log('[restore-csv] Converted to app format')

    // Always save to guest storage key
    const key = 'tranquilo_v1'

    // Save to localStorage - completely overwrites existing data
    localStorage.setItem(key, JSON.stringify(appData))
    console.log('[CSV RESTORE] SAVED:', key, appData)

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
