/**
 * Schemas de validación runtime — Tranquilo
 * ════════════════════════════════════════════════════════════════════
 *
 * Propósito:
 *   Validar estructura y tipos de datos críticos ANTES de que entren
 *   al financial engine o al estado principal de la app.
 *
 * PRINCIPIOS:
 *   • Solo safeParse — nunca .parse() directo (sin throws en hydration)
 *   • financialNumber: z.number() estricto + .default(0)
 *       - undefined/ausente → 0 silencioso  (retrocompatibilidad, campo faltante en datos viejos)
 *       - null / string / NaN → falla Zod → warning trazable → fallback repairStoredData
 *   • Nota Zod v4: z.number() rechaza NaN nativamente ("received NaN")
 *   • Los tipos de types.ts NO se reemplazan; Zod es puramente aditivo
 *   • Zod = capa de tipos/estructura | repairStoredData = capa de dominio
 *
 * COBERTURA (Phase 1):
 *   ✅ PocketSchema
 *   ✅ ExpenseSchema
 *   ✅ ExtraIncomeSchema
 *   ✅ MonthRecordSchema
 *   ✅ StoredDataSchema
 *   ⬜ UserProfile          (solo UI, no afecta cálculos financieros)
 *   ⬜ Schemas por tabla    (Supabase rows individuales — Phase 3)
 */

import { z } from 'zod'

// ── Financial number ──────────────────────────────────────────────────────────
//
// Comportamientos intencionales (verificados con Zod v4):
//   undefined    → 0        sin warning  (campo ausente en datos viejos = esperado)
//   null         → error    con warning  (corrupción real, visible en logs)
//   "50000"      → error    con warning  (tipo incorrecto, visible en logs)
//   NaN          → error    con warning  (Zod v4 rechaza NaN nativo: "received NaN")
//   0 / 50000    → ok ✅
//
// El fallback a 0 en caso de corrupción lo aplica repairStoredData(), no Zod.
const financialNumber = z.number().default(0)

// ── PocketSchema ──────────────────────────────────────────────────────────────

export const PocketSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  budget: financialNumber,
  icon: z.string().optional(),
})

// ── ExpenseSchema ─────────────────────────────────────────────────────────────

export const ExpenseSchema = z.object({
  id: z.string(),
  concept: z.string().default('Sin nombre'),
  amount: financialNumber,
  pocketId: z.string().default('extras'),
  date: z.string().default(''),
})

// ── ExtraIncomeSchema ─────────────────────────────────────────────────────────

export const ExtraIncomeSchema = z.object({
  id: z.string(),
  amount: financialNumber,
  concept: z.string().default(''),
  date: z.string().default(''),
  category: z.enum(['salary', 'extra', 'other']).optional(),
})

// ── MonthRecordSchema ─────────────────────────────────────────────────────────

export const MonthRecordSchema = z.object({
  income: financialNumber,
  savings: financialNumber,
  expenses: z.array(ExpenseSchema).default([]),
  extraIncomes: z.array(ExtraIncomeSchema).default([]),
  pockets: z.array(PocketSchema).default([]),
  manualBudget: z.number().optional(),
})

// ── StoredDataSchema ──────────────────────────────────────────────────────────
//
// Todos los campos opcionales para retrocompatibilidad con versiones anteriores.
// Los campos con .default() garantizan arrays/objetos vacíos en lugar de undefined.
// Los campos opcionales sin .default() simplemente se omiten si están ausentes.

export const StoredDataSchema = z.object({
  monthlyHistory: z.record(z.string(), MonthRecordSchema).default({}),
  pockets: z.array(PocketSchema).default([]),
  expenses: z.array(ExpenseSchema).default([]),
  extraIncomes: z.array(ExtraIncomeSchema).default([]),
  monthlyIncome: z.number().optional(),
  monthlySavings: z.number().optional(),
  monthlyBudget: z.number().optional(),
  budget: z.number().optional(),
  conceptMap: z.record(z.string(), z.string()).default({}),
  learnedCategoryMap: z.record(z.string(), z.string()).default({}),
  currentMonth: z.string().optional(),
  countryCode: z.string().optional(),
  isPrivacyMode: z.boolean().default(false),
  profile: z
    .object({
      nombre: z.string().default(''),
      email: z.string().default(''),
      telefono: z.string().default(''),
      pais: z.string().default(''),
      avatarUrl: z.string().default(''),
    })
    .optional(),
})

// ── Inferred types (uso interno — NO reemplazan types.ts) ────────────────────
export type ParsedStoredData = z.infer<typeof StoredDataSchema>
export type ParsedMonthRecord = z.infer<typeof MonthRecordSchema>
export type ParsedPocket = z.infer<typeof PocketSchema>
export type ParsedExpense = z.infer<typeof ExpenseSchema>
