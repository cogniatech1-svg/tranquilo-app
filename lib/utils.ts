import type {
  CalmState,
  Expense,
  ExtraIncome,
  ParsedTransaction,
  Pocket,
  MonthRecord,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// BUILT-IN KEYWORD → CATEGORY MAP
// Maps Spanish-language words to canonical category IDs.
// Custom pockets are matched by name fallback — see findCategory.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY KEYWORDS MAP (exact match)
// Maps individual keywords to category IDs for fast lookup
// ─────────────────────────────────────────────────────────────────────────────
const KEYWORD_CATEGORY: Record<string, string> = {
  // alimentación
  café: 'alimentacion',
  tinto: 'alimentacion',
  taza: 'alimentacion',
  almuerzo: 'alimentacion',
  desayuno: 'alimentacion',
  cena: 'alimentacion',
  pizza: 'alimentacion',
  hamburguesa: 'alimentacion',
  domicilio: 'alimentacion',
  mercado: 'alimentacion',
  supermercado: 'alimentacion',
  rappi: 'alimentacion',
  ifood: 'alimentacion',
  restaurante: 'alimentacion',
  comida: 'alimentacion',
  sushi: 'alimentacion',
  tacos: 'alimentacion',
  empanada: 'alimentacion',
  snack: 'alimentacion',
  dulces: 'alimentacion',
  helado: 'alimentacion',
  pandebono: 'alimentacion',
  arepas: 'alimentacion',
  panaderia: 'alimentacion',
  // recreación / ocio
  cine: 'recreacion',
  netflix: 'recreacion',
  spotify: 'recreacion',
  bar: 'recreacion',
  cerveza: 'recreacion',
  trago: 'recreacion',
  discoteca: 'recreacion',
  fiesta: 'recreacion',
  juego: 'recreacion',
  deporte: 'recreacion',
  gym: 'recreacion',
  libro: 'recreacion',
  concierto: 'recreacion',
  viaje: 'recreacion',
  hotel: 'recreacion',
  streaming: 'recreacion',
  youtube: 'recreacion',
  disney: 'recreacion',
  // hogar
  arriendo: 'hogar',
  renta: 'hogar',
  alquiler: 'hogar',
  servicios: 'hogar',
  internet: 'hogar',
  agua: 'hogar',
  luz: 'hogar',
  gas: 'hogar',
  limpieza: 'hogar',
  mueble: 'hogar',
  decoracion: 'hogar',
  electrodomestico: 'hogar',
  // transporte
  uber: 'transporte',
  taxi: 'transporte',
  bus: 'transporte',
  metro: 'transporte',
  tren: 'transporte',
  gasolina: 'transporte',
  parqueadero: 'transporte',
  pasaje: 'transporte',
  peaje: 'transporte',
  moto: 'transporte',
  didi: 'transporte',
  cabify: 'transporte',
  transmilenio: 'transporte',
  autobus: 'transporte',
  // salud
  medico: 'salud',
  doctor: 'salud',
  farmacia: 'salud',
  medicina: 'salud',
  consulta: 'salud',
  examen: 'salud',
  clinica: 'salud',
  hospital: 'salud',
  dentista: 'salud',
  terapia: 'salud',
  droga: 'salud',
  laboratorio: 'salud',
  optometria: 'salud',
  vacuna: 'salud',
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY KEYWORDS BY TYPE (fuzzy match support)
// For tolerating spelling variations: "almuuerzo" → "almuerzo" → "alimentacion"
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  alimentacion: [
    'comida',
    'almuerzo',
    'desayuno',
    'cena',
    'café',
    'cafe',
    'pizza',
    'hamburguesa',
    'restaurante',
    'mercado',
    'supermercado',
    'rappi',
    'ifood',
    'domicilio',
    'sushi',
    'tacos',
    'empanada',
    'snack',
    'dulces',
    'helado',
    'pandebono',
    'arepas',
    'panadería',
    'tinto',
    'almuerzo',
  ],
  transporte: [
    'uber',
    'taxi',
    'bus',
    'metro',
    'tren',
    'gasolina',
    'parqueadero',
    'pasaje',
    'peaje',
    'moto',
    'didi',
    'cabify',
    'transmilenio',
    'autobús',
    'transporte',
  ],
  recreacion: [
    'cine',
    'netflix',
    'spotify',
    'bar',
    'cerveza',
    'trago',
    'discoteca',
    'fiesta',
    'juego',
    'deporte',
    'gym',
    'libro',
    'concierto',
    'viaje',
    'hotel',
    'streaming',
    'youtube',
    'disney',
  ],
  hogar: [
    'arriendo',
    'renta',
    'alquiler',
    'servicios',
    'internet',
    'agua',
    'luz',
    'gas',
    'limpieza',
    'mueble',
    'decoración',
    'electrodoméstico',
    'casa',
  ],
  salud: [
    'médico',
    'medico',
    'doctor',
    'farmacia',
    'medicina',
    'consulta',
    'examen',
    'clínica',
    'clinica',
    'hospital',
    'dentista',
    'terapia',
    'droga',
    'laboratorio',
    'optometría',
    'vacuna',
    'salud',
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// INCOME KEYWORDS
// ─────────────────────────────────────────────────────────────────────────────
const INCOME_KEYWORDS = new Set([
  'salario',
  'sueldo',
  'pago',
  'cobro',
  'ingreso',
  'ingresos',
  'freelance',
  'bono',
  'bonificacion',
  'bonificación',
  'comision',
  'comisión',
  'venta',
  'vendi',
  'vendí',
  'transferencia',
  'deposito',
  'depósito',
  'reembolso',
  'devolucion',
  'devolución',
  'regalo',
  'honorario',
  'dividendo',
  'renta',
  'arriendo', // "arriendo" can be income when received
  'aguinaldo',
  'prima',
  'quincena',
  'nomina',
  'nómina',
])

// ─────────────────────────────────────────────────────────────────────────────
// ACTION VERB → CONCEPT MAP
// Maps Spanish action verbs to canonical concept names (for auto-categorization)
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_VERBS: Record<string, string> = {
  // Specific eating actions → concept
  almorcé: 'almuerzo',
  almorce: 'almuerzo',
  comí: 'comida',
  comi: 'comida',
  cené: 'cena',
  cene: 'cena',
  desayuné: 'desayuno',
  desayune: 'desayuno',
  tomé: 'café',
  tome: 'café',

  // Generic verbs (look for next word as concept)
  compré: '', // marker for "look ahead"
  compre: '',
  pagué: '',
  pague: '',
  viajé: '',
  viaje: '',
  fui: '',
  gasté: '',
  gaste: '',
}

// Verbs that should look for the next meaningful word as concept
const GENERIC_VERBS = new Set([
  'compre',
  'compré',
  'pague',
  'pagué',
  'viaje',
  'viajé',
  'fui',
  'gaste',
  'gasté',
])

/**
 * Check if a word partially matches a keyword (for spelling tolerance).
 * Returns true if the word shares significant substring with the keyword.
 * e.g. "almuuerzo" matches "almuerzo" (similarity > 70%)
 */
function fuzzyMatch(word: string, keyword: string, minSimilarity = 0.7): boolean {
  if (word === keyword) return true
  if (word.length < 4 || keyword.length < 4) return false

  // Check if word is substring of keyword or vice versa
  if (keyword.includes(word) || word.includes(keyword)) return true

  // Calculate character similarity (simple Levenshtein-like check)
  const common = Math.min(word.length, keyword.length)
  let matches = 0
  for (let i = 0; i < common; i++) {
    if (word[i] === keyword[i]) matches++
  }

  const similarity = matches / Math.max(word.length, keyword.length)
  return similarity >= minSimilarity
}

/**
 * Finds the best matching category for a given concept.
 * Priority:
 *   1. Learned category map (from user corrections) — exact match
 *   2. User history (conceptMap) — exact key
 *   3. Built-in keyword map — exact match
 *   4. Category keywords — exact match
 *   5. Category keywords — fuzzy/partial match (for spelling tolerance)
 *   6. Pocket name matching
 *   7. Return null if no match
 */
export function findCategory(
  concept: string,
  conceptMap: Record<string, string>,
  pockets: Pocket[],
  learnedCategoryMap?: Record<string, string>
): string | null {
  if (!concept || concept === 'Gasto') return null
  const pocketIds = new Set(pockets.map((p) => p.id))

  const check = (id: string | undefined): string | null => (id && pocketIds.has(id) ? id : null)

  const exactKey = normalizeKey(concept)
  const words = exactKey.split(/\s+/)

  // 0. Learned category map (highest priority for user-trained data)
  if (learnedCategoryMap) {
    const learned = check(learnedCategoryMap[exactKey])
    if (learned) return learned
    for (const word of words) {
      const fromLearned = check(learnedCategoryMap[word])
      if (fromLearned) return fromLearned
    }
  }

  // 1. Exact match against user history
  const exact = check(conceptMap[exactKey])
  if (exact) return exact

  // 2. Word-by-word exact match against history then built-in keyword map
  for (const word of words) {
    const fromHistory = check(conceptMap[word])
    if (fromHistory) return fromHistory
    const fromBuiltin = check(KEYWORD_CATEGORY[word])
    if (fromBuiltin) return fromBuiltin
  }

  // 3. Exact match in category keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const word of words) {
      if (keywords.includes(word)) {
        const categoryId = check(category) || (pocketIds.has(category) ? category : null)
        if (categoryId) return categoryId
      }
    }
  }

  // 4. Fuzzy match in category keywords (for spelling tolerance)
  // e.g. "almuuerzo" → "almuerzo" → "alimentacion"
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const word of words) {
      for (const keyword of keywords) {
        if (fuzzyMatch(word, keyword)) {
          const categoryId = check(category) || (pocketIds.has(category) ? category : null)
          if (categoryId) return categoryId
        }
      }
    }
  }

  // 5. Name-based fallback: keyword implies a category whose name matches a pocket
  for (const word of words) {
    const impliedCategory = KEYWORD_CATEGORY[word]
    if (!impliedCategory) continue
    const match = pockets.find((p) => {
      const n = normalizeKey(p.name)
      return n.includes(impliedCategory) || impliedCategory.includes(n)
    })
    if (match) return match.id
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE TRANSACTION
// Natural-language parser — no external APIs, runs synchronously.
// ─────────────────────────────────────────────────────────────────────────────
export function parseTransaction(
  text: string,
  conceptMap: Record<string, string>,
  pockets: Pocket[],
  learnedCategoryMap?: Record<string, string>
): ParsedTransaction {
  const amount = parseAmount(text)
  const normalized = normalizeKey(text)
  const words = normalized.split(/\s+/).filter((w) => w.length > 0)

  // Check for action verbs first
  let description: string | null = null
  let detectedVerb: string | null = null

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (ACTION_VERBS.hasOwnProperty(word)) {
      detectedVerb = word
      const concept = ACTION_VERBS[word]

      // If verb has specific concept, use it
      if (concept) {
        description = concept
        break
      }

      // If generic verb (compré, viajé, etc), look for next meaningful word
      if (GENERIC_VERBS.has(word)) {
        // Skip prepositions and numbers, find next real word
        for (let j = i + 1; j < words.length; j++) {
          const nextWord = words[j]
          // Skip common prepositions and numbers
          if (
            ['en', 'de', 'por', 'a', 'el', 'la', 'los', 'las', 'un', 'una'].includes(nextWord) ||
            /^\d/.test(nextWord)
          ) {
            continue
          }
          description = nextWord
          break
        }
        break
      }
    }
  }

  // If no action verb found, extract concept normally
  if (!description) {
    description = extractConcept(text)
  }

  const descriptionWords = normalizeKey(description).split(/\s+/)
  const type = descriptionWords.some((w) => INCOME_KEYWORDS.has(w)) ? 'income' : 'expense'

  // For action verbs, try to auto-assign category based on the detected action or concept
  let category: string | null = null
  if (type === 'expense') {
    // Try to find category based on the detected concept
    // Passes learnedCategoryMap for user-trained data
    category = findCategory(description, conceptMap, pockets, learnedCategoryMap)
  }

  return { type, amount, category, description }
}

export function getCurrentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Normalize malformed month keys to "YYYY-MM" format
 * Examples:
 * - "05/04/2" → "2026-04"
 * - "27/04/2" → "2026-04"
 * - "2026-04" → "2026-04" (already correct)
 * - "04/2026" → "2026-04"
 */
export function normalizeMonthKey(m: string): string {
  // Already in correct format
  if (/^\d{4}-\d{2}$/.test(m)) return m

  // Handle "DD/MM/2" format (corrupted: day/month/partial-year)
  if (m.includes('/')) {
    const parts = m.split('/')
    if (parts.length === 3 && parts[2] === '2') {
      // parts[0] = day, parts[1] = month, parts[2] = '2'
      // Assume year is 2026
      const mo = parts[1]
      return `2026-${String(mo).padStart(2, '0')}`
    }
    if (parts.length === 2 && parts[1] === '2026') {
      // "MM/2026" format
      const mo = parts[0]
      return `2026-${String(mo).padStart(2, '0')}`
    }
  }

  // Fallback: return as-is
  return m
}

export function getDaysInMonth(m: string): number {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo, 0).getDate()
}

/**
 * Valida que un monto sea un número válido para operaciones financieras.
 * Rechaza: NaN, Infinity, negativos, no-números
 */
export function validateAmount(amount: number): boolean {
  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    isFinite(amount) &&
    amount >= 0 &&
    amount <= 999999999 // Máximo sensato para una app financiera personal
  )
}

export function parseAmount(text: string): number {
  const t = text.replace(/\$/g, '').trim()

  // ── Slang colombiano: "30 lucas" = ×1.000, "1 palo" / "2 palos" = ×1.000.000 ──
  // Checked first so they're not consumed by the generic number fallback
  const lucasFormat = t.match(/(\d+(?:[.,]\d+)?)\s*lucas\b/i)
  if (lucasFormat) {
    const base = parseFloat(lucasFormat[1].replace(',', '.'))
    const result = Math.round(base * 1000)
    return validateAmount(result) ? result : 0
  }

  const paloFormat = t.match(/(\d+(?:[.,]\d+)?)\s*palos?\b/i)
  if (paloFormat) {
    const base = parseFloat(paloFormat[1].replace(',', '.'))
    const result = Math.round(base * 1000000)
    return validateAmount(result) ? result : 0
  }

  // ── "6 mil" / "25 mil" (thousands) — checked BEFORE millions ─────────────────
  // CRITICAL: must run before mFormat. The original mFormat (/m(?:illones?)?/) captured
  // the "m" in "mil", turning "25 mil" into 25.000.000 (1000× too large).
  // Word boundary \b ensures "millones" is NOT matched here (after "mil" comes "l").
  const milFormat = t.match(/(\d+(?:[.,]\d+)?)\s*mil(?:es)?\b/i)
  if (milFormat) {
    const base = parseFloat(milFormat[1].replace(',', '.'))
    const result = Math.round(base * 1000)
    return validateAmount(result) ? result : 0
  }

  // ── "2 millones" / "1 millón" / "6m" (millions) ──────────────────────────────
  // Explicit alternation + word boundary prevents matching the "m" in "mil".
  // Also handles "millón" (with accent) which the original regex missed.
  const mFormat = t.match(/(\d+(?:[.,]\d+)?)\s*(?:mill[oó]n(?:es)?|m)\b/i)
  if (mFormat) {
    const base = parseFloat(mFormat[1].replace(',', '.'))
    const result = Math.round(base * 1000000)
    return validateAmount(result) ? result : 0
  }

  // ── "15k" / "15 k" (thousands shorthand) ─────────────────────────────────────
  const kFormat = t.match(/(\d+(?:[.,]\d+)?)\s*k\b/i)
  if (kFormat) {
    const base = parseFloat(kFormat[1].replace(',', '.'))
    const result = Math.round(base * 1000)
    return validateAmount(result) ? result : 0
  }

  // ── "15.000" (European thousands separator) ───────────────────────────────────
  const col = t.match(/\d{1,3}(?:\.\d{3})+/)
  if (col) {
    const result = parseInt(col[0].replace(/\./g, ''), 10)
    return validateAmount(result) ? result : 0
  }

  // ── "15,000" (US thousands separator) ────────────────────────────────────────
  const com = t.match(/\d{1,3}(?:,\d{3})+/)
  if (com) {
    const result = parseInt(com[0].replace(/,/g, ''), 10)
    return validateAmount(result) ? result : 0
  }

  // ── Plain numbers "15000" ─────────────────────────────────────────────────────
  const plain = t.match(/\d+/g)
  if (!plain) return 0
  const result = Math.max(...plain.map((n) => parseInt(n, 10)))
  return validateAmount(result) ? result : 0
}

export function extractConcept(text: string): string {
  // Common Spanish stopwords to remove (articles, prepositions, action verbs, pronouns)
  const stopwords = new Set([
    'me',
    'gasté',
    'gaste',
    'compré',
    'compre',
    'pagué',
    'pague',
    'en',
    'de',
    'por',
    'a',
    'el',
    'la',
    'los',
    'las',
    'un',
    'una',
    'unos',
    'unas',
    'y',
    'o',
    'pero',
    'porque',
    'para',
    'con',
    'sin',
    'más',
    'menos',
    'muy',
    'todo',
    'nada',
    'algo',
    'alguien',
    'es',
    'son',
    'fue',
    'fueron',
    'soy',
    'eres',
    'somos',
    'sois',
  ])

  // Remove amounts in all supported formats so only the concept words remain.
  // Order mirrors parseAmount priority to avoid partial matches.
  const cleaned = text
    .replace(/\$?\d+(?:[.,]\d+)?\s*lucas\b/gi, '') // "30 lucas"
    .replace(/\$?\d+(?:[.,]\d+)?\s*palos?\b/gi, '') // "1 palo", "2 palos"
    .replace(/\$?\d+(?:[.,]\d+)?\s*mil(?:es)?\b/gi, '') // "25 mil", "800 mil"
    .replace(/\$?\d+(?:[.,]\d+)?\s*(?:mill[oó]n(?:es)?|m)\b/gi, '') // "2 millones", "1 millón", "6m"
    .replace(/\$?\d+(?:[.,]\d+)?\s*k\b/gi, '') // "15k"
    .replace(/\$?\d{1,3}(?:[.,]\d{3})+/g, '') // "15.000", "15,000"
    .replace(/\$?\d+/g, '') // plain numbers
    .toLowerCase()
    .trim()

  // Split into words and filter out stopwords
  const words = cleaned.split(/\s+/).filter((word) => word.length > 0 && !stopwords.has(word))

  // Return first meaningful word or 'Gasto' if nothing left
  return words.length > 0 ? words[0] : 'Gasto'
}

export function normalizeKey(s: string): string {
  return s.toLowerCase().trim()
}

export function normalizePockets(
  ps: { id: string; name: string; budget: number }[]
): { id: string; name: string; budget: number }[] {
  const DEFAULTS: Record<string, number> = {
    recreacion: 100_000,
    hogar: 800_000,
    alimentacion: 600_000,
  }
  return ps.map((p) => ({ ...p, budget: p.budget || DEFAULTS[p.id] || 0 }))
}

export function getCalmState(
  totalSpent: number,
  monthlyBudget: number,
  calendarRate: number
): CalmState {
  if (monthlyBudget <= 0 || calendarRate <= 0) return 'neutral'
  const spentPct = totalSpent / monthlyBudget // % of budget consumed
  if (spentPct <= calendarRate + 0.1) return 'tranquilo'
  if (spentPct <= calendarRate + 0.25) return 'ajustado'
  return 'riesgo'
}

/** Returns how many percentage points spending exceeds the time-based target, or 0 if on track. */
export function getSpendingOveragePct(
  totalSpent: number,
  monthlyBudget: number,
  calendarRate: number
): number {
  if (monthlyBudget <= 0 || calendarRate <= 0) return 0
  const spentPct = totalSpent / monthlyBudget
  return Math.max(0, Math.round((spentPct - calendarRate) * 100))
}

export function groupByDate(
  expenses: Expense[],
  locale = 'es-CO'
): Array<{ label: string; items: Expense[] }> {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const map: Record<string, Expense[]> = {}
  for (const e of [...expenses].sort((a, b) => b.date.localeCompare(a.date))) {
    const key = e.date.slice(0, 10)
    ;(map[key] ??= []).push(e)
  }

  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      const d = new Date(key + 'T12:00:00')
      let label: string
      if (d.toDateString() === today.toDateString()) label = 'Hoy'
      else if (d.toDateString() === yesterday.toDateString()) label = 'Ayer'
      else
        label = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
      return { label, items }
    })
}

/**
 * getDefaultMonthRecord: crea un registro vacío para un mes
 *
 * IMPORTANTE: NO incluye campos derivados (budget, totalSpent, etc.)
 * El financialEngine calcula esos valores a partir de los datos aquí
 */
export function getDefaultMonthRecord(): MonthRecord {
  return {
    income: 0,
    savings: 0,
    expenses: [],
    extraIncomes: [],
    pockets: [],
  }
}

/**
 * RESTAURACIÓN SEGURA DE DATOS FINANCIEROS
 *
 * Valida coherencia financiera y ajusta sin perder datos:
 * - income >= savings
 * - assigned <= budget (donde budget = income - savings)
 * - spent <= budget
 *
 * Si hay inconsistencias, ajusta valores mostrando advertencias.
 */
export interface RestoreValidationReport {
  valid: boolean
  warnings: string[]
  adjustments: {
    incomeAdjusted?: boolean
    savingsAdjusted?: boolean
    pocketsAdjusted?: boolean
    expensesReduced?: boolean
  }
  normalized: MonthRecord
}

export function validateAndNormalizeMonth(
  income: number,
  savings: number,
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  pockets: Pocket[]
): RestoreValidationReport {
  const warnings: string[] = []
  const adjustments = {
    incomeAdjusted: false,
    savingsAdjusted: false,
    pocketsAdjusted: false,
    expensesReduced: false,
  }

  // Paso 1: Validar income >= 0
  const normIncome = Math.max(0, income)
  if (normIncome !== income) {
    warnings.push(`⚠️  Income fue negativo (${income}), ajustado a ${normIncome}`)
    adjustments.incomeAdjusted = true
  }

  // Paso 2: Validar savings >= 0 y savings <= income
  let normSavings = Math.max(0, savings)
  if (normSavings > normIncome) {
    const oldSavings = normSavings
    normSavings = Math.round(normIncome * 0.2) // Default 20% del ingreso
    warnings.push(
      `⚠️  Savings (${oldSavings}) > Income (${normIncome}). Ajustado a ${normSavings} (20% del ingreso)`
    )
    adjustments.savingsAdjusted = true
  } else if (normSavings !== savings && savings > 0) {
    warnings.push(`⚠️  Savings ajustado de ${savings} a ${normSavings}`)
    adjustments.savingsAdjusted = true
  }

  const budget = normIncome - normSavings

  // Paso 3: Validar pockets
  const assignedTotal = pockets.reduce((sum, p) => sum + (p.budget ?? 0), 0)
  let normPockets = pockets

  if (assignedTotal > budget) {
    // Reducir presupuestos proporcionalmente
    const ratio = budget / assignedTotal
    normPockets = pockets.map((p) => ({
      ...p,
      budget: Math.round(p.budget * ratio),
    }))
    const newAssigned = normPockets.reduce((sum, p) => sum + p.budget, 0)
    warnings.push(
      `⚠️  Presupuestos asignados (${assignedTotal}) excedían budget (${budget}). Reducidos proporcionalmente a ${newAssigned}`
    )
    adjustments.pocketsAdjusted = true
  }

  // Paso 4: Validar expenses
  const spentTotal = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const normExpenses = expenses

  if (spentTotal > budget) {
    // No eliminar gastos, pero advertencia clara
    warnings.push(
      `⚠️  Gastos totales (${spentTotal}) exceden budget (${budget}). Diferencia: ${spentTotal - budget}`
    )
    warnings.push(
      `    → Los datos se cargarán como están, pero la validación los detectará en carga posterior`
    )
    // No reducimos gastos automáticamente, el usuario debe decidir
  }

  return {
    valid: warnings.length === 0,
    warnings,
    adjustments,
    normalized: {
      income: normIncome,
      savings: normSavings,
      expenses: normExpenses,
      extraIncomes: extraIncomes ?? [],
      pockets: normPockets,
    },
  }
}

/**
 * Genera código React para restaurar datos desde backup
 *
 * Uso en app.tsx:
 * const restoration = restoreFromBackup(income, savings, expenses, extraIncomes, pockets, month)
 */
export function restoreFromBackup(
  income: number,
  savings: number,
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  pockets: Pocket[],
  month: string = getCurrentMonth()
): {
  report: RestoreValidationReport
  code: string
  summary: string
} {
  const report = validateAndNormalizeMonth(income, savings, expenses, extraIncomes, pockets)

  const dataStr = JSON.stringify(
    {
      [month]: report.normalized,
    },
    null,
    2
  )

  const code = `
// ═══════════════════════════════════════════════════════════════
// RESTAURACIÓN DE DATOS - Copiar este código en DevTools
// ═══════════════════════════════════════════════════════════════
setMonthlyHistory(prev => ({
  ...prev,
  ${dataStr.slice(2, -2)}
}))

`.trim()

  const summary = `
RESTAURACIÓN DE DATOS - ${month}

Estado: ${report.valid ? '✅ VÁLIDO' : '⚠️  CON AJUSTES'}

Valores finales:
  Ingresos: $${report.normalized.income.toLocaleString()}
  Ahorro: $${report.normalized.savings.toLocaleString()}
  Presupuesto: $${(report.normalized.income - report.normalized.savings).toLocaleString()}
  Presupuestos asignados: $${report.normalized.pockets.reduce((s, p) => s + p.budget, 0).toLocaleString()}
  Gastos registrados: $${report.normalized.expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}

${report.warnings.length > 0 ? `Advertencias:\n${report.warnings.map((w) => `  ${w}`).join('\n')}` : 'Sin advertencias'}

${
  report.adjustments.incomeAdjusted ||
  report.adjustments.savingsAdjusted ||
  report.adjustments.pocketsAdjusted
    ? `
Ajustes realizados:
${report.adjustments.incomeAdjusted ? '  ✓ Income normalizado\n' : ''}${report.adjustments.savingsAdjusted ? '  ✓ Savings normalizado\n' : ''}${report.adjustments.pocketsAdjusted ? '  ✓ Presupuestos rebalanceados\n' : ''}${report.adjustments.expensesReduced ? '  ✓ Gastos ajustados\n' : ''}`
    : ''
}
`.trim()

  return { report, code, summary }
}
