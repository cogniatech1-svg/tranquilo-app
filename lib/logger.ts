/**
 * Logger centralizado — Tranquilo
 * ════════════════════════════════════════════════════════════════════
 *
 * NIVELES:
 *   logger.debug()  Solo en desarrollo. Para trazas de estado, hydration,
 *                   save progress, auth events. Silenciado en producción.
 *   logger.warn()   Siempre visible. Eventos no-bloqueantes o estados
 *                   inesperados que no son errores críticos.
 *   logger.error()  Siempre visible. Fallos reales que impactan datos
 *                   o funcionalidad del usuario.
 *
 * CONTROL DE ENTORNO:
 *   - NODE_ENV === 'production' → debug silenciado
 *   - NEXT_PUBLIC_DEBUG=1       → fuerza debug visible en cualquier entorno
 *     (útil para diagnosticar issues en staging/producción puntualmente)
 *
 * MIGRACIÓN INCREMENTAL:
 *   1. import { logger } from '@/lib/logger'
 *   2. console.log(...)   → logger.debug(...)
 *      console.warn(...)  → logger.warn(...)   si es evento operacional real
 *                         → logger.debug(...)  si es traza diagnóstica
 *      console.error(...) → logger.error(...)
 *
 * ESTADO DE MIGRACIÓN:
 *   ✅ lib/financialEngine.ts
 *   ✅ lib/auth.ts
 *   ⬜ lib/supabase.ts
 *   ⬜ app/page.tsx
 *   ⬜ screens/ProfileScreen.tsx
 *   ⬜ otros archivos
 */

const isProd = process.env.NODE_ENV === 'production'
const forceDebug = process.env.NEXT_PUBLIC_DEBUG === '1'
const debugEnabled = !isProd || forceDebug

export const logger = {
  /**
   * Trazas de desarrollo: hydration, save progress, auth state, load steps.
   * Silenciado en producción a menos que NEXT_PUBLIC_DEBUG=1.
   */
  debug: (...args: unknown[]): void => {
    if (debugEnabled) console.log(...args)
  },

  /**
   * Advertencias operacionales: eventos no-bloqueantes, estados inesperados.
   * Siempre visible en todos los entornos.
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args)
  },

  /**
   * Errores reales que impactan funcionalidad o datos del usuario.
   * Siempre visible en todos los entornos.
   */
  error: (...args: unknown[]): void => {
    console.error(...args)
  },
}
