import type { StoredData, MonthRecord, Pocket } from './types'

/**
 * DEFAULT_POCKETS: All 8 budget categories
 * Used for onboarding and data repair with initial budget distribution
 */
export const DEFAULT_POCKETS: Pocket[] = [
  { id: 'recreacion', name: 'Recreación', budget: 100000, icon: '🎮' },
  { id: 'hogar', name: 'Hogar', budget: 800000, icon: '🏠' },
  { id: 'transporte', name: 'Transporte', budget: 300000, icon: '🚗' },
  { id: 'servicios', name: 'Servicios', budget: 200000, icon: '💡' },
  { id: 'extras', name: 'Extras', budget: 150000, icon: '🛍️' },
  { id: 'donaciones', name: 'Donaciones', budget: 100000, icon: '❤️' },
  { id: 'capacitaciones', name: 'Capacitaciones', budget: 400000, icon: '📚' },
  { id: 'cuota-apartamento', name: 'Cuota Apartamento', budget: 650000, icon: '🏢' },
]

/**
 * Get default pockets structure WITHOUT budget assignments (for new months)
 */
export function getEmptyPocketsStructure(): Pocket[] {
  return DEFAULT_POCKETS.map((p) => ({ ...p, budget: 0 }))
}

/**
 * Ensure all 8 pockets exist in a month record
 * If pockets are missing, add them with default budgets
 */
/**
 * Normalize pocket ID: lowercase, remove accents, replace spaces with hyphens
 * Exported for use in CSV import and data repair
 */
export function normalizePocketId(id: string): string {
  return id
    .toLowerCase()
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensurePocketsComplete(record: any): any {
  const existingPockets = record.pockets ?? []

  // Create a map of normalized ID -> pocket from existing pockets
  const pocketMap = new Map<string, Pocket>()
  for (const p of existingPockets) {
    const normalizedId = normalizePocketId(p.id)
    if (!pocketMap.has(normalizedId)) {
      // Normalize the pocket ID to ensure consistency
      pocketMap.set(normalizedId, { ...p, id: normalizedId })
    }
  }

  // Add missing pockets from DEFAULT_POCKETS (but with budget: 0, not default budget)
  for (const defaultPocket of DEFAULT_POCKETS) {
    if (!pocketMap.has(defaultPocket.id)) {
      pocketMap.set(defaultPocket.id, { ...defaultPocket, budget: 0 })
    }
  }

  // Convert map back to array and ensure order matches DEFAULT_POCKETS
  const finalPockets = DEFAULT_POCKETS.map((dp) => {
    const found = pocketMap.get(dp.id)
    return found ? found : dp
  })

  const originalCount = existingPockets.length
  const finalCount = finalPockets.length
  if (originalCount !== finalCount) {
    console.log('[dataMigration] 📝 ensurePocketsComplete:', {
      originalCount,
      finalCount,
      originalPocketNames: existingPockets.map((p: Pocket) => p.name),
      finalPocketNames: finalPockets.map((p: Pocket) => p.name),
      addedPockets: finalPockets.filter(
        (fp) => !existingPockets.some((ep: Pocket) => normalizePocketId(ep.id) === fp.id)
      ).length,
    })
  }

  record.pockets = finalPockets
  return record
}

/**
 * Check if an expense has a generic/invalid name pattern
 * Examples: "Expense 1", "Expense 2", "expense-1", etc.
 */
function hasGenericExpenseName(concept: string): boolean {
  if (!concept) return true
  const lower = concept.toLowerCase().trim()

  // Pattern 1: "expense X"
  if (/^expense\s+\d+$/.test(lower)) return true

  // Pattern 2: "expense-X"
  if (/^expense-\d+$/.test(lower)) return true

  // Pattern 3: just a number
  if (/^\d+$/.test(lower)) return true

  // Pattern 4: empty or whitespace only
  if (!lower) return true

  return false
}

/**
 * Fix date format: convert DD/MM/YYYY (from old exports/imports) to YYYY-MM-DD (ISO)
 * Idempotent: dates already in ISO format pass through unchanged.
 * Example: "29/04/2026T00:00:00" → "2026-04-29T00:00:00"
 */
function fixDateFormat(date: string): string {
  if (!date) return date
  // Match DD/MM/YYYY at start (with optional time suffix)
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/)
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}${match[4]}`
  }
  return date
}

/**
 * Repair corrupted expense data
 * If expenses have generic names, we can't fix them individually,
 * but we can at least ensure the structure is correct
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function repairExpenses(expenses: any[]): any[] {
  if (!Array.isArray(expenses)) return []

  let hadGenericNames = false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repaired = expenses.map((exp: any) => {
    if (!exp || typeof exp !== 'object') {
      console.warn('[dataMigration] Invalid expense object:', exp)
      return exp
    }

    // Check for generic name
    if (hasGenericExpenseName(exp.concept)) {
      hadGenericNames = true
      console.warn('[dataMigration] Found generic expense name:', exp.concept)
    }

    // Ensure expense has required fields, fix date format, normalize pocketId
    return {
      id: exp.id ?? crypto.randomUUID(),
      date: fixDateFormat(exp.date ?? ''),
      amount: typeof exp.amount === 'number' ? exp.amount : 0,
      concept: exp.concept ?? 'Sin nombre',
      pocketId: normalizePocketId(exp.pocketId ?? 'extras'),
    }
  })

  if (hadGenericNames) {
    console.warn(`[dataMigration] ⚠️ Found ${repaired.length} expenses with generic names`)
  }

  return repaired
}

/**
 * Validate and repair a month record
 * Ensures it has all required fields and all 8 pockets
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function repairMonthRecord(record: any, monthKey?: string): MonthRecord {
  if (!record || typeof record !== 'object') {
    record = {}
  }

  const pocketsBeforeRepair = (record.pockets ?? []).length
  const pocketsBeforeNames = (record.pockets ?? []).map((p: Pocket) => p.name)

  // Ensure all 8 pockets exist
  ensurePocketsComplete(record)

  const pocketsAfterEnsure = record.pockets.length
  const pocketsAfterEnsureNames = record.pockets.map((p: Pocket) => p.name)

  const repairedExpenses = repairExpenses(record.expenses ?? [])
  const deduplicatedExpenses = deduplicateExpenses(repairedExpenses)

  // Log if pockets changed during repair
  if (pocketsBeforeRepair !== pocketsAfterEnsure) {
    console.log(
      `[dataMigration] 🔍 Pockets changed during repair for ${monthKey || 'unknown month'}:`,
      {
        beforeRepair: pocketsBeforeRepair,
        afterEnsure: pocketsAfterEnsure,
        beforeNames: pocketsBeforeNames,
        afterNames: pocketsAfterEnsureNames,
      }
    )
  }

  // CRITICAL: Check if we're about to revert to DEFAULT_POCKETS
  let finalPockets = record.pockets
  if (!(Array.isArray(record.pockets) && record.pockets.length > 0)) {
    console.error(
      `[dataMigration] ⚠️ REVERTING TO DEFAULT_POCKETS for ${monthKey || 'unknown'}! record.pockets is:`,
      record.pockets
    )
    finalPockets = DEFAULT_POCKETS
  }

  return {
    income: typeof record.income === 'number' ? record.income : 0,
    savings: typeof record.savings === 'number' ? record.savings : 0,
    expenses: deduplicatedExpenses,
    extraIncomes: Array.isArray(record.extraIncomes)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        record.extraIncomes.map((i: any) => ({ ...i, date: fixDateFormat(i.date ?? '') }))
      : [],
    pockets: finalPockets,
    manualBudget: record.manualBudget,
  }
}

/**
 * Deduplicate expenses by (date, amount, concept)
 * Removes exact duplicates while preserving first occurrence
 * Normalizes concept to handle spacing and case differences
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deduplicateExpenses(expenses: any[]): any[] {
  if (!Array.isArray(expenses) || expenses.length === 0) return expenses

  const seen = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deduplicated: any[] = []

  for (const exp of expenses) {
    // Normalize concept: trim, lowercase, remove extra spaces
    const normalizedConcept = (exp.concept || '').trim().toLowerCase().replace(/\s+/g, ' ')

    // Create a unique key from date + amount + normalized concept
    const key = `${exp.date}|${exp.amount}|${normalizedConcept}`

    if (!seen.has(key)) {
      seen.add(key)
      deduplicated.push(exp)
    }
  }

  if (deduplicated.length < expenses.length) {
  }

  return deduplicated
}

/**
 * DATA REPAIR
 *
 * Fixes common data corruption issues:
 * 1. Missing pockets (only 4 of 8 showing)
 * 2. Generic expense names ("Expense 1" instead of real names)
 * 3. Invalid data structures
 * 4. Missing required fields
 * 5. DUPLICATE EXPENSES (same date + amount + concept)
 *
 * Called automatically during data initialization
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function repairStoredData(data: any): StoredData {
  if (!data || typeof data !== 'object') {
    console.warn('[dataMigration] No data to repair, returning empty structure')
    return {
      monthlyHistory: {},
      expenses: [],
      extraIncomes: [],
      pockets: DEFAULT_POCKETS,
    }
  }

  // Repair monthlyHistory
  const repairedHistory: Record<string, MonthRecord> = {}
  console.log('[dataMigration] 🔍 repairStoredData() starting:', {
    monthCount: data.monthlyHistory ? Object.keys(data.monthlyHistory).length : 0,
    months: data.monthlyHistory ? Object.keys(data.monthlyHistory) : [],
  })

  if (data.monthlyHistory && typeof data.monthlyHistory === 'object') {
    for (const [month, record] of Object.entries(data.monthlyHistory)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalPockets = (record as any).pockets?.length ?? 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalPocketNames = (record as any).pockets?.map((p: Pocket) => p.name) ?? []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repairedHistory[month] = repairMonthRecord(record as any, month)

      // Check if month was repaired
      const repairedPocketCount = repairedHistory[month].pockets.length
      const repairedPocketNames = repairedHistory[month].pockets.map((p: Pocket) => p.name)

      if (originalPockets !== repairedPocketCount) {
        console.log(`[dataMigration] 🔍 Pockets changed for month ${month}:`, {
          originalCount: originalPockets,
          repairedCount: repairedPocketCount,
          originalNames: originalPocketNames,
          repairedNames: repairedPocketNames,
        })
      }
    }
  }

  console.log(
    '[dataMigration] ✅ repairStoredData() completed with',
    Object.keys(repairedHistory).length,
    'months'
  )

  return {
    monthlyHistory: repairedHistory,
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    extraIncomes: Array.isArray(data.extraIncomes) ? data.extraIncomes : [],
    pockets:
      data.pockets && Array.isArray(data.pockets) && data.pockets.length > 0
        ? data.pockets
        : DEFAULT_POCKETS,
    conceptMap: data.conceptMap ?? {},
    learnedCategoryMap: data.learnedCategoryMap ?? {},
    currentMonth: data.currentMonth ?? undefined,
    countryCode: data.countryCode ?? 'CO',
    isPrivacyMode: data.isPrivacyMode ?? false,
    monthlyIncome: typeof data.monthlyIncome === 'number' ? data.monthlyIncome : undefined,
    monthlySavings: typeof data.monthlySavings === 'number' ? data.monthlySavings : undefined,
  }
}
