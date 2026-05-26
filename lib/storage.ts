/**
 * Storage centralizado — Tranquilo
 * ════════════════════════════════════════════════════════════════════
 *
 * Única fuente de verdad para keys de localStorage y accesos básicos.
 *
 * CONTENIDO:
 *   STORAGE_KEYS   — constantes de todas las keys usadas en la app
 *   dataKey()      — builder: `tranquilo_v1_<userId>`
 *   onboardingKey()— builder: `hasOnboarded_<userId>`
 *   aprilRestoredKey() — builder: `april2026_v1_restored_<userId>`
 *   storageGet()   — wrapper SSR-safe de localStorage.getItem
 *   storageSet()   — wrapper SSR-safe de localStorage.setItem
 *   storageRemove()— wrapper SSR-safe de localStorage.removeItem
 *   storageKeys()  — wrapper SSR-safe de Object.keys(localStorage)
 *
 * REGLAS:
 *   • Los wrappers son seguros en SSR (devuelven null/void si no hay window).
 *   • Los wrappers son seguros en modo incógnito / storage lleno (try/catch silencioso).
 *   • Los builders de keys son funciones puras — no acceden a localStorage.
 *   • Esta capa NO cambia ningún comportamiento existente; solo centraliza strings.
 *
 * MIGRACIÓN INCREMENTAL:
 *   ✅ lib/auth.ts
 *   ✅ app/auth/callback/page.tsx
 *   ⬜ app/page.tsx (pendiente — autosave/hydration)
 *   ⬜ screens/ProfileScreen.tsx
 *   ⬜ screens/DashboardScreen.tsx
 *   ⬜ lib/restore-from-csv.ts
 */

// ── Key constants ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  /**
   * Prefijo de datos financieros (siempre user-scoped).
   * Key real: `tranquilo_v1_<userId>`
   * Usar dataKey(userId) para construirla.
   */
  DATA_PREFIX: 'tranquilo_v1',

  /**
   * UUID del usuario invitado (guest).
   * Valor: string UUID v4
   */
  GUEST_ID: 'guest_id',

  /**
   * Prefijo del flag de onboarding completado (user-scoped).
   * Key real: `hasOnboarded_<userId>`
   * Usar onboardingKey(userId) para construirla.
   */
  ONBOARDING_PREFIX: 'hasOnboarded',

  /**
   * Prefijo del guard de restauración de abril 2026 (user-scoped).
   * Key real: `april2026_v1_restored_<userId>`
   * Usar aprilRestoredKey(userId) para construirla.
   */
  APRIL_RESTORED_PREFIX: 'april2026_v1_restored',

  /**
   * Perfil del usuario (nombre, email, país, etc.).
   * ⚠️ No está scoped a userId — se comparte en el dispositivo.
   * Valor: JSON UserProfile
   */
  PROFILE: 'tranquilo_profile',

  /**
   * Guard de Android pending intent.
   * Se pone al cerrar sesión explícitamente; se borra al iniciar OAuth.
   * Valor: '1' o ausente
   */
  EXPLICITLY_SIGNED_OUT: 'explicitly_signed_out',

  /**
   * Bandera de OAuth en progreso (Google Sign-In).
   * Sobrevive la redirección a Google; el callback la consume.
   * Valor: '1' o ausente
   */
  SIGNING_IN_WITH_GOOGLE: 'signing_in_with_google',
} as const

// ── Key builders ──────────────────────────────────────────────────────────────

/** Construye la key de datos financieros para un usuario: `tranquilo_v1_<userId>` */
export function dataKey(userId: string): string {
  return `${STORAGE_KEYS.DATA_PREFIX}_${userId}`
}

/** Construye la key de onboarding para un usuario: `hasOnboarded_<userId>` */
export function onboardingKey(userId: string): string {
  return `${STORAGE_KEYS.ONBOARDING_PREFIX}_${userId}`
}

/** Construye la key del guard de restauración: `april2026_v1_restored_<userId>` */
export function aprilRestoredKey(userId: string): string {
  return `${STORAGE_KEYS.APRIL_RESTORED_PREFIX}_${userId}`
}

// ── SSR guard ─────────────────────────────────────────────────────────────────

function canUseStorage(): boolean {
  return typeof window !== 'undefined'
}

// ── Safe wrappers ─────────────────────────────────────────────────────────────

/**
 * Lee un valor de localStorage.
 * Devuelve null en SSR o si la key no existe.
 */
export function storageGet(key: string): string | null {
  if (!canUseStorage()) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Escribe un string en localStorage.
 * No-op en SSR. Silencia errores de modo incógnito / cuota excedida.
 */
export function storageSet(key: string, value: string): void {
  if (!canUseStorage()) return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Silent fail: private mode, storage full, or other browser restriction
  }
}

/**
 * Elimina una key de localStorage.
 * No-op en SSR.
 */
export function storageRemove(key: string): void {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // Silent fail
  }
}

/**
 * Devuelve todas las keys de localStorage que cumplen el predicado opcional.
 * Devuelve [] en SSR.
 */
export function storageKeys(filter?: (key: string) => boolean): string[] {
  if (!canUseStorage()) return []
  try {
    const allKeys = Object.keys(localStorage)
    return filter ? allKeys.filter(filter) : allKeys
  } catch {
    return []
  }
}
