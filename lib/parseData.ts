/**
 * parseStoredData — Tranquilo
 * ════════════════════════════════════════════════════════════════════
 *
 * Punto de entrada único para datos crudos provenientes de:
 *   • localStorage (JSON.parse de la key tranquilo_v1_<userId>)
 *   • Supabase loadUserData() (datos ensamblados desde múltiples tablas)
 *
 * Responsabilidades de esta capa:
 *   1. Validación de tipos y estructura  (Zod — schemas.ts)
 *   2. Warning trazable si hay campos inválidos (path completo + tipo recibido)
 *   3. Fallback inmediato a repairStoredData() si la validación falla
 *   4. NUNCA lanza excepciones — hydration no puede crashear por datos malos
 *
 * Lo que esta capa NO hace (es responsabilidad de repairStoredData):
 *   • Completar pockets faltantes (8 pockets requeridos)
 *   • Deduplicar gastos idénticos
 *   • Corregir formatos de fecha (DD/MM/YYYY → YYYY-MM-DD)
 *   • Normalizar pocket IDs
 *
 * Flujo completo con ambas capas:
 *
 *   raw (localStorage / Supabase)
 *     ↓ parseStoredData()      ← tipos: number/string/null/NaN, estructura
 *     ↓ repairStoredData()     ← dominio: pockets, fechas, dedup, normalización
 *     ↓ React state / financial engine
 */

import type { StoredData } from './types'
import { StoredDataSchema } from './schemas'
import { repairStoredData } from './dataMigration'
import { logger } from './logger'

/**
 * Valida y parsea datos crudos de localStorage o Supabase.
 *
 * - Éxito: devuelve datos validados por Zod (tipos garantizados)
 * - Fallo: loguea issues con trazabilidad de path, devuelve repairStoredData(raw)
 *
 * Nota: repairStoredData() también corre DESPUÉS en page.tsx (línea ~604)
 * para la reparación de dominio. Esta función solo actúa como primera barrera.
 *
 * @param raw  Objeto sin tipar de JSON.parse o del ensamblado de Supabase
 * @returns    StoredData válido — nunca null, nunca throws
 */
export function parseStoredData(raw: unknown): StoredData {
  const result = StoredDataSchema.safeParse(raw)

  if (result.success) {
    return result.data as StoredData
  }

  // ── Warning trazable: path completo + mensaje con tipo recibido ─────────────
  //
  // Cada issue incluye:
  //   path    — ubicación exacta (ej: "monthlyHistory.2026-01.income")
  //   mensaje — descripción legible (ej: "Invalid input: expected number, received null")
  //
  // Los primeros 10 problemas se loguean; el resto se indica con un contador.
  const issues = result.error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '(raíz)',
    mensaje: issue.message,
  }))

  logger.warn(
    `[parseStoredData] ⚠️ ${issues.length} problema(s) en datos almacenados — aplicando repair:`,
    issues.slice(0, 10)
  )

  if (issues.length > 10) {
    logger.warn(
      `[parseStoredData] ... y ${issues.length - 10} problema(s) adicional(es) (truncados)`
    )
  }

  // ── Fallback a repair de dominio ─────────────────────────────────────────────
  //
  // repairStoredData maneja todos los casos que Zod rechaza:
  //   • null / string en campos numéricos → 0
  //   • Arrays faltantes → []
  //   • Pockets con IDs no normalizados → normaliza IDs existentes
  //   • Fechas en formato incorrecto → convierte a YYYY-MM-DD
  //   • Gastos duplicados → deduplica
  return repairStoredData(raw)
}
