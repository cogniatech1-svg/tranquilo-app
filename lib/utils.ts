import type { CalmState, Expense, ParsedTransaction, Pocket } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// BUILT-IN KEYWORD → CATEGORY MAP
// Maps Spanish-language words to canonical category IDs.
// Custom pockets are matched by name fallback — see findCategory.
// ─────────────────────────────────────────────────────────────────────────────
const KEYWORD_CATEGORY: Record<string, string> = {
  // alimentación
  café: 'alimentacion',     tinto: 'alimentacion',    taza: 'alimentacion',
  almuerzo: 'alimentacion', desayuno: 'alimentacion', cena: 'alimentacion',
  pizza: 'alimentacion',    hamburguesa: 'alimentacion', domicilio: 'alimentacion',
  mercado: 'alimentacion',  supermercado: 'alimentacion', rappi: 'alimentacion',
  ifood: 'alimentacion',    restaurante: 'alimentacion', comida: 'alimentacion',
  sushi: 'alimentacion',    tacos: 'alimentacion',    empanada: 'alimentacion',
  snack: 'alimentacion',    dulces: 'alimentacion',   helado: 'alimentacion',
  pandebono: 'alimentacion', arepas: 'alimentacion',  panaderia: 'alimentacion',
  // recreación / ocio
  cine: 'recreacion',       netflix: 'recreacion',    spotify: 'recreacion',
  bar: 'recreacion',        cerveza: 'recreacion',    trago: 'recreacion',
  discoteca: 'recreacion',  fiesta: 'recreacion',     juego: 'recreacion',
  deporte: 'recreacion',    gym: 'recreacion',        libro: 'recreacion',
  concierto: 'recreacion',  viaje: 'recreacion',      hotel: 'recreacion',
  streaming: 'recreacion',  youtube: 'recreacion',    disney: 'recreacion',
  // hogar
  arriendo: 'hogar',        renta: 'hogar',           alquiler: 'hogar',
  servicios: 'hogar',       internet: 'hogar',        agua: 'hogar',
  luz: 'hogar',             gas: 'hogar',             limpieza: 'hogar',
  mueble: 'hogar',          decoracion: 'hogar',      electrodomestico: 'hogar',
  // transporte
  uber: 'transporte',       taxi: 'transporte',       bus: 'transporte',
  metro: 'transporte',      tren: 'transporte',       gasolina: 'transporte',
  parqueadero: 'transporte', pasaje: 'transporte',    peaje: 'transporte',
  moto: 'transporte',       didi: 'transporte',       cabify: 'transporte',
  transmilenio: 'transporte', autobus: 'transporte',
  // salud
  medico: 'salud',          doctor: 'salud',          farmacia: 'salud',
  medicina: 'salud',        consulta: 'salud',        examen: 'salud',
  clinica: 'salud',         hospital: 'salud',        dentista: 'salud',
  terapia: 'salud',         droga: 'salud',           laboratorio: 'salud',
  optometria: 'salud',      vacuna: 'salud',
}

// ─────────────────────────────────────────────────────────────────────────────
// INCOME KEYWORDS
// ─────────────────────────────────────────────────────────────────────────────
const INCOME_KEYWORDS = new Set([
  'salario', 'sueldo', 'pago', 'cobro', 'ingreso', 'ingresos',
  'freelance', 'bono', 'bonificacion', 'bonificación', 'comision', 'comisión',
  'venta', 'vendi', 'vendí', 'transferencia', 'deposito', 'depósito',
  'reembolso', 'devolucion', 'devolución', 'regalo', 'honorario',
  'dividendo', 'renta', 'arriendo',   // "arriendo" can be income when received
  'aguinaldo', 'prima', 'quincena', 'nomina', 'nómina',
])

/**
 * Finds the best matching pocket ID for a given concept.
 * Priority:
 *   1. User history (conceptMap) — exact key
 *   2. User history — word-by-word
 *   3. Built-in keyword map — if pocket with that ID exists
 *   4. Pocket name matching — fuzzy match against category name
 */
export function findCategory(
  concept: string,
  conceptMap: Record<string, string>,
  pockets: Pocket[],
): string | null {
  if (!concept || concept === 'Gasto') return null
  const pocketIds = new Set(pockets.map(p => p.id))

  const check = (id: string | undefined): string | null =>
    id && pocketIds.has(id) ? id : null

  const exactKey = normalizeKey(concept)
  const words    = exactKey.split(/\s+/)

  // 1. Exact match against user history
  const exact = check(conceptMap[exactKey])
  if (exact) return exact

  // 2. Word-by-word against history then built-in map (strict: pocket ID must exist)
  for (const word of words) {
    const fromHistory = check(conceptMap[word])
    if (fromHistory) return fromHistory
    const fromBuiltin = check(KEYWORD_CATEGORY[word])
    if (fromBuiltin) return fromBuiltin
  }

  // 3. Name-based fallback: keyword implies a category whose name matches a pocket
  //    e.g. word "uber" → category "transporte" → pocket named "Transporte"
  for (const word of words) {
    const impliedCategory = KEYWORD_CATEGORY[word]
    if (!impliedCategory) continue
    const match = pockets.find(p => {
      const n = normalizeKey(p.name)
      return n.includes(impliedCategory) || impliedCategory.includes(n)
    })
    if (match) return match.id
  }

  // 4. Concept word directly matches a pocket name
  for (const word of words) {
    if (word.length < 4) continue
    const match = pockets.find(p => {
      const n = normalizeKey(p.name)
      return n.includes(word) || word.includes(n)
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
): ParsedTransaction {
  const amount      = parseAmount(text)
  const description = extractConcept(text)
  const words       = normalizeKey(description).split(/\s+/)
  const type        = words.some(w => INCOME_KEYWORDS.has(w)) ? 'income' : 'expense'
  const category    = type === 'expense'
    ? findCategory(description, conceptMap, pockets)
    : null

  return { type, amount, category, description }
}

export function getCurrentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getDaysInMonth(m: string): number {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo, 0).getDate()
}

export function parseAmount(text: string): number {
  const t = text.replace(/\$/g, '')
  const col = t.match(/\d{1,3}(?:\.\d{3})+/)
  if (col) return parseInt(col[0].replace(/\./g, ''), 10)
  const com = t.match(/\d{1,3}(?:,\d{3})+/)
  if (com) return parseInt(com[0].replace(/,/g, ''), 10)
  const plain = t.match(/\d+/g)
  if (!plain) return 0
  return Math.max(...plain.map(n => parseInt(n, 10)))
}

export function extractConcept(text: string): string {
  return text
    .replace(/\$?\d{1,3}(?:[.,]\d{3})+/g, '')
    .replace(/\$?\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Gasto'
}

export function normalizeKey(s: string): string {
  return s.toLowerCase().trim()
}

export function normalizePockets(ps: { id: string; name: string; budget: number }[]): { id: string; name: string; budget: number }[] {
  const DEFAULTS: Record<string, number> = {
    recreacion: 100_000, hogar: 800_000, alimentacion: 600_000,
  }
  return ps.map(p => ({ ...p, budget: p.budget || DEFAULTS[p.id] || 0 }))
}

export function getCalmState(
  totalSpent: number,
  monthlyBudget: number,
  calendarRate: number,
): CalmState {
  if (monthlyBudget <= 0 || calendarRate <= 0) return 'neutral'
  const spentPct = totalSpent / monthlyBudget   // % of budget consumed
  if (spentPct <= calendarRate + 0.10) return 'tranquilo'
  if (spentPct <= calendarRate + 0.25) return 'ajustado'
  return 'riesgo'
}

/** Returns how many percentage points spending exceeds the time-based target, or 0 if on track. */
export function getSpendingOveragePct(
  totalSpent: number,
  monthlyBudget: number,
  calendarRate: number,
): number {
  if (monthlyBudget <= 0 || calendarRate <= 0) return 0
  const spentPct = totalSpent / monthlyBudget
  return Math.max(0, Math.round((spentPct - calendarRate) * 100))
}

export function groupByDate(
  expenses: Expense[],
  locale = 'es-CO',
): Array<{ label: string; items: Expense[] }> {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const map: Record<string, Expense[]> = {}
  for (const e of [...expenses].sort((a, b) => b.date.localeCompare(a.date))) {
    const key = e.date.slice(0, 10);
    (map[key] ??= []).push(e)
  }

  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      const d = new Date(key + 'T12:00:00')
      let label: string
      if (d.toDateString() === today.toDateString()) label = 'Hoy'
      else if (d.toDateString() === yesterday.toDateString()) label = 'Ayer'
      else label = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
      return { label, items }
    })
}
