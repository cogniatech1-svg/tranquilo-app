import type { Expense, ExtraIncome, MonthRecord } from './types'
import { DEFAULT_POCKETS } from './dataMigration'
import { parseAmount } from './utils'

interface CSVRow {
  fecha: string
  tipo: string
  categoria: string
  pocketId: string
  monto: string
  descripcion: string
}

/**
 * Parse CSV content and extract expenses + extra incomes
 * Expected format: Fecha, Tipo, Categoría, pocketId, Monto, Descripción
 */
export function parseCSV(csvContent: string): {
  expenses: Expense[]
  extraIncomes: ExtraIncome[]
} {
  const lines = csvContent.split('\n').filter((line) => line.trim())
  const expenses: Expense[] = []
  const extraIncomes: ExtraIncome[] = []

  // Skip header (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]

    // Parse CSV line (handle quoted fields)
    const fields = parseCSVLine(line)
    if (fields.length < 6) continue

    const [fecha, tipo, categoria, pocketId, monto, descripcion] = fields

    const amount = parseAmount(monto)
    if (amount <= 0) continue

    if (tipo.toLowerCase() === 'gasto') {
      expenses.push({
        id: crypto.randomUUID(),
        date: fecha,
        amount,
        concept: descripcion || categoria,
        pocketId: pocketId || 'extras',
      })
    } else if (tipo.toLowerCase() === 'ingreso') {
      extraIncomes.push({
        id: crypto.randomUUID(),
        date: fecha,
        amount,
        concept: descripcion || categoria,
        category: 'extra' as const,
      })
    }
  }

  // Deduplicate by (date, amount, concept)
  const uniqueExpenses = deduplicateExpenses(expenses)
  const uniqueIncomes = deduplicateIncomes(extraIncomes)

  return {
    expenses: uniqueExpenses,
    extraIncomes: uniqueIncomes,
  }
}

/**
 * Parse a single CSV line, handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim().replace(/^"|"$/g, ''))
  return result
}

/**
 * Deduplicate expenses by (date, amount, concept)
 */
function deduplicateExpenses(expenses: Expense[]): Expense[] {
  const seen = new Set<string>()
  const result: Expense[] = []

  for (const exp of expenses) {
    const key = `${exp.date}|${exp.amount}|${(exp.concept || '').toLowerCase()}`

    if (!seen.has(key)) {
      seen.add(key)
      result.push(exp)
    }
  }

  return result
}

/**
 * Deduplicate extra incomes by (date, amount, concept)
 */
function deduplicateIncomes(incomes: ExtraIncome[]): ExtraIncome[] {
  const seen = new Set<string>()
  const result: ExtraIncome[] = []

  for (const inc of incomes) {
    const key = `${inc.date}|${inc.amount}|${(inc.concept || '').toLowerCase()}`

    if (!seen.has(key)) {
      seen.add(key)
      result.push(inc)
    }
  }

  return result
}

/**
 * Build month record from CSV data
 * Loads expenses + incomes into April (historical data)
 */
export function buildMonthRecordFromCSV(csvData: {
  expenses: Expense[]
  extraIncomes: ExtraIncome[]
}): MonthRecord {
  return {
    income: 0, // Will be set separately
    savings: 0,
    expenses: csvData.expenses,
    extraIncomes: csvData.extraIncomes,
    pockets: DEFAULT_POCKETS,
    manualBudget: undefined,
  }
}
