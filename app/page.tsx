'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

import { AddExpenseSheet } from '../components/AddExpenseSheet'
import { BottomNavigation } from '../components/BottomNavigation'
import { OfflineIndicator } from '../components/OfflineIndicator'

import { DashboardScreen } from '../screens/DashboardScreen'
import { TransactionsScreen } from '../screens/TransactionsScreen'
import { BudgetScreen } from '../screens/BudgetScreen'
import { calculateFinancialSnapshot } from '../lib/financialEngine'
import { calculateCarryOver } from '../lib/carryOver'
import { InsightsScreen } from '../screens/InsightsScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { WelcomeScreen } from '../screens/WelcomeScreen'

import { COUNTRIES, DS } from '../lib/config'
import type { CountryCode, CountryConfig } from '../lib/config'
import type {
  Expense,
  ExtraIncome,
  ExpensePayload,
  Pocket,
  StoredData,
  TabId,
  MonthRecord,
} from '../lib/types'
import {
  getCurrentMonth,
  normalizePockets,
  normalizeKey,
  extractConcept,
  parseAmount,
  getDefaultMonthRecord,
  normalizeMonthKey,
} from '../lib/utils'
import { onAuthStateChanged, logOut, generateGuestUserId, requireUserId } from '../lib/auth'
import type { AuthUser } from '../lib/auth'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  repairStoredData,
  repairMonthRecord,
  LEGACY_FALLBACK_POCKETS,
  getEmptyPocketsStructure,
  UNASSIGNED_POCKET_ID,
  generateStarterPockets,
} from '../lib/dataMigration'
import { parseStoredData } from '../lib/parseData'
import { normalizePocketNames, capitalizeWords } from '../lib/migrations'
import {
  saveUserData,
  loadUserData,
  saveProfileData,
  validateDataPersistence,
  migrateGuestDataToAuthenticatedUser,
} from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'tranquilo_v1'
const ONBOARDING_FLAG = 'hasOnboarded'
// Bandera de restauración única: una vez puesta, el bloque de restauración
// de abril 2026 nunca vuelve a ejecutarse. Así los gastos nuevos del usuario
// nunca son sobreescritos por datos hardcodeados.
const APRIL_RESTORED_FLAG = 'april2026_v1_restored'

// Helper function to convert any error type to a readable message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (error && typeof error === 'object') {
    // Handle Supabase errors and similar objects
    const obj = error as Record<string, unknown>
    if (obj.message && typeof obj.message === 'string') {
      return obj.message
    }
    if (obj.error && typeof obj.error === 'string') {
      return obj.error
    }
    if (obj.hint && typeof obj.hint === 'string') {
      return obj.hint
    }
    try {
      return JSON.stringify(obj).substring(0, 200)
    } catch {
      return 'Error desconocido'
    }
  }
  return String(error) || 'Error desconocido'
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Obtener ID de usuario garantizado (nunca null)
// ─────────────────────────────────────────────────────────────────────────────
// Esta función centraliza la lógica de obtener un ID válido.
// Garantiza que siempre hay un ID (auth o guest), sin circulando `string | null`.
function getValidUserId(userId: string | null, guestUserId: string | null): string | null {
  if (userId) return userId
  if (guestUserId) return guestUserId

  // Fallback: intentar recuperar del localStorage
  const storedGuest = localStorage.getItem('guest_id')
  if (storedGuest) return storedGuest

  // No hay ID disponible
  return null
}

function createEntityId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  // Track if component is mounted to avoid state updates on unmounted components
  const isMountedRef = useRef(true)
  // Track if data has been loaded from Supabase/localStorage successfully.
  // Used to prevent auto-save from overwriting good data with empty data during initial load.
  const dataLoadedRef = useRef(false)
  // Tracks which user ID data was last loaded for (to detect real auth changes vs token refreshes).
  const loadedForUserRef = useRef<string | null>(null)
  // Guards against stale async initializeApp runs overwriting fresh state.
  const loadRunIdRef = useRef(0)
  // Tracks which userId has already had the post-auth save triggered (prevents double-fire).
  const authSavedForUserRef = useRef<string | null>(null)
  // Mutex: prevents concurrent Supabase saves (upsert+delete-stale is not safe under concurrency)
  const saveInProgressRef = useRef(false)

  // ── MULTI-TAB HARDENING ───────────────────────────────────────────────────────
  // Timestamp when tab last went hidden (for stale detection on refocus)
  const hiddenAtRef = useRef<number | null>(null)
  // Mirror of lastSyncTime state: readable in async event handlers without stale closures
  const lastSyncTimeRef = useRef<number | null>(null)
  // Set by refocus reload when new data is merged; first save reads+clears it to skip
  // delete-stale once (protects rows merged from another tab/device)
  const postReloadSaveRef = useRef(false)

  const [hydrated, setHydrated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [screen, setScreen] = useState<'login' | 'onboarding' | 'main'>('login')
  const [profileData, setProfileData] = useState<import('../lib/types').UserProfile | undefined>(
    undefined
  )
  const [activeTab, setActiveTab] = useState<TabId>('inicio')

  const [countryCode, setCountryCode] = useState<CountryCode>('CO')
  // ── ÚNICA FUENTE DE VERDAD: monthlyHistory ────────────────────────────────
  // Contiene TODOS los datos financieros por mes
  // Estructura: monthlyHistory[month] = { income, savings, expenses, extraIncomes, pockets }
  const [monthlyHistory, setMonthlyHistory] = useState<Record<string, MonthRecord>>({})

  const [conceptMap, setConceptMap] = useState<Record<string, string>>({})
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth)

  const [activeMonth, setActiveMonth] = useState<string>(getCurrentMonth)
  const [isPrivacyMode, setIsPrivacyMode] = useState(false)
  const [learnedCategoryMap, setLearnedCategoryMap] = useState<Record<string, string>>({})
  // Force Vercel rebuild - cache invalidation marker v2

  // ── SYNC ERROR TRACKING ────────────────────────────────────────────────────
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingIncome, setEditingIncome] = useState<ExtraIncome | null>(null)
  const [defaultSheetType, setDefaultSheetType] = useState<'income' | 'expense' | null>(null)

  const config: CountryConfig = COUNTRIES[countryCode]

  // ── markSynced: atomically updates sync state + ref ──────────────────────
  // Use instead of bare setLastSyncTime(Date.now()) so that event handlers
  // (which hold stale closures) can also read the freshest sync timestamp.
  const markSynced = useCallback(() => {
    const now = Date.now()
    setLastSyncTime(now)
    lastSyncTimeRef.current = now
  }, []) // setLastSyncTime is a stable React setter — no deps needed

  // ── HANDLE AUTH: Update state when auth changes ────────────────────────────
  const handleAuth = useCallback(
    async (event: AuthChangeEvent, user: AuthUser | null) => {
      // Guard: only update state if component is still mounted
      if (!isMountedRef.current) {
        console.warn('[AUTH] 🚫 Component not mounted, ignoring auth event')
        return
      }

      console.log(`[AUTH] ═══════════════════════════════════════════════════════════`)
      console.log(
        `[AUTH] 🔔 Auth event=${event}:`,
        user ? `✅ Logged in as ${user.email} (uid: ${user.uid})` : '❌ Not logged in'
      )
      console.log(`[AUTH] ═══════════════════════════════════════════════════════════`)

      // CRITICAL FIX: For INITIAL_SESSION, Supabase may not pass the user object
      // So we need to fetch the current session explicitly
      let currentUser = user
      if (event === 'INITIAL_SESSION' && !user) {
        console.log(`[AUTH] ⚠️ INITIAL_SESSION fired without user, fetching current session...`)
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session?.user) {
            currentUser = {
              uid: session.user.id,
              email: session.user.email || '',
            }
            console.log(
              `[AUTH] ✅ Found user in session: ${currentUser.email} (${currentUser.uid})`
            )
          } else {
            console.log(`[AUTH] ❌ No user found in session`)
          }
        } catch (error) {
          console.error(`[AUTH] ❌ Error fetching session:`, error)
        }
      }

      // Store authenticated user state if present
      if (currentUser) {
        console.log(`[AUTH] 🟢 Setting authenticated userId: ${currentUser.uid}`)
        setUserId(currentUser.uid)
        setUserEmail(currentUser.email)
      } else {
        console.log(`[AUTH] 🔴 Clearing userId (user logged out)`)
        setUserId(null)
        setUserEmail(null)

        // Generate guest ID for unauthenticated users
        let guest = localStorage.getItem('guest_id')
        const isValidUUID =
          guest && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guest)

        if (!guest || !isValidUUID) {
          // Before generating a new guest ID, try to recover an existing one from stored data.
          // This handles the case where guest_id was lost (cookie clear, incognito) but
          // the tranquilo_v1_<id> data key is still present in localStorage.
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          const dataKeyPrefix = `${STORAGE_KEY}_`
          const recoveredIds: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith(dataKeyPrefix)) {
              const candidateId = key.slice(dataKeyPrefix.length)
              if (uuidPattern.test(candidateId)) {
                recoveredIds.push(candidateId)
              }
            }
          }
          if (recoveredIds.length === 1) {
            guest = recoveredIds[0]
            console.log(`[AUTH] 🟠 Recovered existing guestUserId from data key: ${guest}`)
            localStorage.setItem('guest_id', guest)
          } else {
            guest = generateGuestUserId()
            console.log(`[AUTH] 🟠 Generated new guestUserId: ${guest}`)
            localStorage.setItem('guest_id', guest)
          }
        }
        setGuestUserId(guest)
      }

      setAuthLoading(false)

      // Single source of truth for auth-driven navigation.
      setScreen((prev) => {
        console.log(`[AUTH] 🔷 Screen transition logic: event=${event}, current screen=${prev}`)
        switch (event) {
          case 'SIGNED_OUT': {
            console.log(`[AUTH] → Navigating to login (user signed out)`)
            return 'login'
          }
          case 'SIGNED_IN': {
            if (!currentUser) {
              console.log(`[AUTH] ⚠️ SIGNED_IN event but no user object, returning to login`)
              return 'login'
            }

            console.log(`[AUTH] ✅ User authenticated: ${currentUser.email} (${currentUser.uid})`)

            // NEW: Migrate guest data to authenticated user if guest mode was active
            if (guestUserId && guestUserId !== currentUser.uid) {
              console.log(
                `[Auth] 🔄 INICIANDO migración: invitado (${guestUserId}) → autenticado (${currentUser.uid})...`
              )
              setIsAuthenticating(true)

              migrateGuestDataToAuthenticatedUser(guestUserId, currentUser.uid)
                .then(async (result) => {
                  if (result.success) {
                    console.log(
                      `[Auth] ✅ Migración Supabase completa: ${result.itemsMigrated} items migrados`
                    )

                    // CRITICAL: After Supabase migration, ensure ALL data is saved with the new authenticated userId
                    // This includes pockets which may have been in guest localStorage
                    console.log(
                      `[Auth] 🔄 FASE 2: Guardando datos completos con nuevo userId autenticado...`
                    )

                    // Load current data to verify migration success
                    try {
                      const migratedData = await loadUserData(currentUser.uid)
                      if (migratedData) {
                        console.log(`[Auth] ✅ Datos verificados de Supabase post-migración:`, {
                          monthsCount: migratedData.monthlyHistory
                            ? Object.keys(migratedData.monthlyHistory).length
                            : 0,
                          hasProfile: !!migratedData.profile,
                        })
                      }
                    } catch (verifyError) {
                      console.warn(
                        `[Auth] ⚠️ No se pudo verificar datos post-migración (no bloqueante):`,
                        verifyError
                      )
                    }

                    setGuestUserId(null)
                  } else {
                    console.warn(`[Auth] ⚠️ Migración falló: ${result.error}`)
                  }
                })
                .catch((error) => {
                  console.error('[Auth] ❌ Error inesperado en migración:', error)
                })
                .finally(() => {
                  setIsAuthenticating(false)
                })
            }

            const hasOnboarded =
              localStorage.getItem(`${ONBOARDING_FLAG}_${currentUser.uid}`) === 'true'
            const nextScreen = hasOnboarded ? 'main' : 'onboarding'
            console.log(
              `[AUTH] → Navigating to ${nextScreen} (user has onboarded: ${hasOnboarded})`
            )
            return nextScreen
          }
          case 'INITIAL_SESSION': {
            console.log(`[AUTH] 📋 INITIAL_SESSION event`)
            // Si ya hay sesión activa, navegar directamente sin mostrar login
            if (currentUser) {
              const hasOnboarded =
                localStorage.getItem(`${ONBOARDING_FLAG}_${currentUser.uid}`) === 'true'
              const nextScreen = hasOnboarded ? 'main' : 'onboarding'
              console.log(
                `[AUTH] → Navigating to ${nextScreen} (existing session, currentUser=${currentUser.email})`
              )
              return nextScreen
            }
            console.log(`[AUTH] → Keeping current screen (no active session)`)
            return prev
          }
          case 'TOKEN_REFRESHED': {
            console.log(`[AUTH] 🔄 TOKEN_REFRESHED (no screen change needed)`)
            // Token refresh ocurre durante sesión activa — no re-navegar
            return prev
          }
          default: {
            console.log(`[AUTH] ⚠️ Unknown auth event: ${event}`)
            return prev
          }
        }
      })
    },
    [guestUserId]
  )

  // ── AUTH STATE LISTENER ────────────────────────────────────────────────────
  // Subscribe to Supabase auth state changes
  useEffect(() => {
    isMountedRef.current = true
    console.log('[AUTH-LISTENER] 🎯 Registering Supabase auth state listener...')

    const unsubscribe = onAuthStateChanged((event, user) => {
      console.log(
        `[onAuthStateChanged] 🔔 Listener fired: event=${event}, user=${user ? `${user.email} (${user.uid})` : 'null'}`
      )
      handleAuth(event, user)
    })

    console.log('[AUTH-LISTENER] ✅ Listener registered successfully')

    return () => {
      isMountedRef.current = false
      console.log('[AUTH-LISTENER] 🛑 Unsubscribing from auth state changes')
      unsubscribe()
    }
  }, [handleAuth])

  // ── HELPER: Obtener datos del mes activo (SIEMPRE usa este helper) ──────────
  const getActiveMonthData = useCallback(() => {
    if (monthlyHistory[activeMonth]) {
      return monthlyHistory[activeMonth]
    }

    // Si el mes no existe, heredar estructura de pockets del mes anterior
    // incluyendo presupuestos (budget) — el usuario puede ajustarlos si cambian
    const availableMonths = Object.keys(monthlyHistory).sort()
    const previousMonth = availableMonths.reverse().find((m) => m < activeMonth)

    const previousData = previousMonth ? monthlyHistory[previousMonth] : null
    const defaultRecord = getDefaultMonthRecord()

    // Si hay mes anterior, heredar pockets completos (nombres, íconos y presupuestos).
    // Esto evita que un mes nuevo con budget=0 sobreescriba los presupuestos globales en Supabase.
    // Si no hay mes anterior, usar estructura vacía.
    const prevPockets = previousData?.pockets
    const pocketsToUse =
      prevPockets && prevPockets.length > 0 ? prevPockets : getEmptyPocketsStructure()

    return {
      ...defaultRecord,
      pockets: pocketsToUse,
    }
  }, [monthlyHistory, activeMonth])

  // ── RESET: Limpiar datos corruptos y forzar onboarding ────────────────────
  const resetData = useCallback(() => {
    if (!userId) return
    console.warn('Data reset due to inconsistent financial state')
    const userStorageKey = `${STORAGE_KEY}_${userId}`
    localStorage.removeItem(userStorageKey)
    localStorage.removeItem(`${ONBOARDING_FLAG}_${userId}`)
    setMonthlyHistory({})
    setConceptMap({})
    setLearnedCategoryMap({})
    setCountryCode('CO')
    setActiveMonth(getCurrentMonth())
    setCurrentMonth(getCurrentMonth())
    setScreen('onboarding')
  }, [userId])

  // ── Load from localStorage + Firestore ────────────────────────────────────
  // IMPORTANTE: la restauración de abril 2026 ocurre AQUÍ, de forma síncrona,
  // escribiendo directo a localStorage ANTES de actualizar el estado React.
  // Así no hay condiciones de carrera entre useEffects separados.
  //
  // FIREBASE DUAL STORAGE:
  // 1. Load localStorage first (offline-first, always available)
  // 2. Load from Firestore in background (merge strategy)
  useEffect(() => {
    // Capture userId to maintain type narrowing across async boundary
    const currentUserId: string | null = userId

    const runId = ++loadRunIdRef.current
    const initializeApp = async () => {
      // ⚠️ CRITICAL: Guard against undefined userId and guestUserId
      if (!currentUserId && !guestUserId) {
        console.warn(
          '[initializeApp] Exiting early: currentUserId and guestUserId not available yet'
        )
        return
      }

      try {
        console.log('═══════════════════════════════════════════════════════════')
        console.log('[initializeApp] 🔷 INICIANDO CARGA DE DATOS')
        console.log('═══════════════════════════════════════════════════════════')
        console.log('[initializeApp] userId autenticado:', currentUserId)
        console.log('[initializeApp] guestUserId:', guestUserId)

        // ── LOAD FROM SUPABASE (fuente de verdad) ─────────────────────────────
        let data: StoredData = {}
        const loadUserId = currentUserId || guestUserId
        if (loadUserId) {
          console.log('[initializeApp] 🔷 Cargando de Supabase con loadUserId:', loadUserId)
          const supabaseData = await loadUserData(loadUserId)
          if (supabaseData) {
            data = supabaseData
            console.log('[initializeApp] ✅ Datos cargados de Supabase:', {
              monthsCount: data.monthlyHistory ? Object.keys(data.monthlyHistory).length : 0,
              hasProfile: !!data.profile,
              monthlyIncome: data.monthlyIncome,
            })
          } else {
            console.log('[initializeApp] ⚠️ Sin datos en Supabase (usuario nuevo?)')
          }
        }

        // ── FALLBACK: Load from localStorage with smart key selection ────────
        // FIX: When user authenticates, search BOTH currentUserId and guestUserId keys
        // This prevents data loss during guest→authenticated transition
        const hasSupabaseHistory =
          data.monthlyHistory && Object.keys(data.monthlyHistory).length > 0

        let localStorageData: StoredData | null = null
        let usedStorageKey: string | null = null

        // Try currentUserId key first (if authenticated)
        if (currentUserId) {
          const authStorageKey = `${STORAGE_KEY}_${currentUserId}`
          const raw = localStorage.getItem(authStorageKey)
          if (raw) {
            try {
              localStorageData = parseStoredData(JSON.parse(raw))
              usedStorageKey = authStorageKey
              console.log('[initializeApp] ✅ localStorage encontrado bajo ID autenticado:', {
                key: authStorageKey,
                monthsCount: localStorageData.monthlyHistory
                  ? Object.keys(localStorageData.monthlyHistory).length
                  : 0,
              })
            } catch {
              console.log('[initializeApp] ❌ Error parsing localStorage para ID autenticado')
            }
          }
        }

        // If not found under currentUserId, try guestUserId key (handles auth transition)
        if (!localStorageData && guestUserId) {
          const guestStorageKey = `${STORAGE_KEY}_${guestUserId}`
          const raw = localStorage.getItem(guestStorageKey)
          if (raw) {
            try {
              localStorageData = parseStoredData(JSON.parse(raw))
              usedStorageKey = guestStorageKey
              console.log('[initializeApp] ✅ localStorage encontrado bajo ID invitado:', {
                key: guestStorageKey,
                monthsCount: localStorageData.monthlyHistory
                  ? Object.keys(localStorageData.monthlyHistory).length
                  : 0,
              })
            } catch {
              console.log('[initializeApp] ❌ Error parsing localStorage para ID invitado')
            }
          }
        }

        // If data was found under guestUserId but user is now authenticated,
        // migrate it to the authenticated key in localStorage
        if (
          localStorageData &&
          currentUserId &&
          usedStorageKey === `${STORAGE_KEY}_${guestUserId}`
        ) {
          const authStorageKey = `${STORAGE_KEY}_${currentUserId}`
          console.log('[initializeApp] 🔄 Migrando localStorage: invitado → autenticado')
          localStorage.setItem(authStorageKey, JSON.stringify(localStorageData))
          console.log('[initializeApp] ✅ localStorage migrado a ID autenticado')
        }

        // If no Supabase history, use localStorage entirely
        if (!hasSupabaseHistory) {
          if (localStorageData) {
            console.log(
              '[initializeApp] 🔷 Sin datos en Supabase, usando localStorage completamente'
            )
            data = localStorageData
          } else {
            console.log('[initializeApp] ❌ Sin datos en localStorage tampoco')
            // Debug: check what keys exist to diagnose key mismatch issue
            const allKeys = Object.keys(localStorage).filter((k) => k.startsWith('tranquilo_v1'))
            console.log('[initializeApp] 🔍 DEBUG: Available tranquilo_v1 keys:', allKeys)
            console.log('[initializeApp] 🔍 DEBUG: IDs a buscar:', {
              auth: currentUserId ? `${STORAGE_KEY}_${currentUserId}` : 'N/A',
              guest: guestUserId ? `${STORAGE_KEY}_${guestUserId}` : 'N/A',
            })
          }
        } else if (localStorageData && data.monthlyHistory) {
          // MERGE: Supabase history + localStorage history ambos presentes.
          console.log('[initializeApp] 🔷 Supabase + localStorage ambos presentes, merging...')

          if (localStorageData.monthlyHistory) {
            for (const [month, lsMonthData] of Object.entries(localStorageData.monthlyHistory)) {
              if (!data.monthlyHistory[month]) {
                // Mes ausente en Supabase: incorporar desde localStorage
                data.monthlyHistory[month] = lsMonthData
                console.log(`[initializeApp] ✅ Mes ${month} agregado desde localStorage`)
              } else if (lsMonthData.pockets && lsMonthData.pockets.length > 0) {
                // FIX: Siempre preferir pockets per-month de localStorage sobre la tabla
                // global pockets de Supabase. monthly_records no tiene columna pockets_data,
                // por lo que todos los meses en Supabase heredan la misma tabla global
                // (que puede estar stale si el último save fue desde otro mes). localStorage
                // almacena pockets por mes y refleja el estado exacto de este dispositivo.
                data.monthlyHistory[month].pockets = lsMonthData.pockets
              }
            }
            console.log(
              '[initializeApp] ✅ Merge completado — pockets per-month de localStorage aplicados'
            )
          }
        }

        const aprilRestoredKey = currentUserId
          ? `${APRIL_RESTORED_FLAG}_${currentUserId}`
          : `${APRIL_RESTORED_FLAG}_${guestUserId}`
        const aprilRestored = localStorage.getItem(aprilRestoredKey) === 'true'

        // ── REPARAR DATOS CORRUPTOS (PHASE 2) ────────────────────────────────
        // Asegura que todos los 9 bolsillos estén presentes
        // Detecta y reporta gastos con nombres genéricos ("Expense 1", etc)
        data = repairStoredData(data)

        // ── CARGA DE ESTADO REACT ──────────────────────────────────────────────
        // Re-leer la bandera DESPUÉS de posible restauración
        const onboardingKey = currentUserId
          ? `${ONBOARDING_FLAG}_${currentUserId}`
          : `${ONBOARDING_FLAG}_${guestUserId}`
        const hasOnboarded = localStorage.getItem(onboardingKey) === 'true'
        const country = (data.countryCode as CountryCode) ?? 'CO'

        console.log('[initializeApp] State loading:', {
          hasOnboarded,
          monthsLoaded: data.monthlyHistory ? Object.keys(data.monthlyHistory) : [],
          expensesInApril: data.monthlyHistory?.['2026-04']?.expenses?.length ?? 0,
        })

        setCountryCode(country)
        setConceptMap(data.conceptMap ?? {})
        setLearnedCategoryMap(data.learnedCategoryMap ?? {})
        if (data.isPrivacyMode) setIsPrivacyMode(true)

        // ── RESTAURAR PERFIL: Prioridad Supabase > localStorage ──────────
        if (data.profile) {
          console.log('[initializeApp] ✅ Perfil cargado de Supabase:', {
            nombre: data.profile.nombre,
            email: data.profile.email,
            telefono: data.profile.telefono,
            pais: data.profile.pais,
          })
          setProfileData(data.profile)
          // Guardar en localStorage para fallback offline
          localStorage.setItem('tranquilo_profile', JSON.stringify(data.profile))
        } else {
          // Si no hay en Supabase, intentar restaurar desde localStorage
          const savedProfile = localStorage.getItem('tranquilo_profile')
          if (savedProfile) {
            try {
              const profile = JSON.parse(savedProfile)
              console.log('[initializeApp] ✅ Perfil restaurado de localStorage')
              setProfileData(profile)
            } catch {
              console.log('[initializeApp] ⚠️ localStorage profile corrupto')
            }
          } else {
            console.log('[initializeApp] ⚠️ Sin perfil guardado')
          }
        }

        if (data.monthlyHistory && Object.keys(data.monthlyHistory).length > 0) {
          // Ignore stale load runs or late loads after data is already initialized.
          if (loadRunIdRef.current !== runId || dataLoadedRef.current) {
            console.warn('[initializeApp] Skipping stale load to avoid state overwrite')
            setHydrated(true)
            return
          }
          // Normalizar pocketNames (decodificar encoding issues y capitalizar)
          const normalizedData = normalizePocketNames(data)

          // Normalizar keys de meses a formato YYYY-MM
          const history: Record<string, MonthRecord> = {}
          for (const [month, record] of Object.entries(normalizedData.monthlyHistory!)) {
            const normalizedMonth = normalizeMonthKey(month)
            const rec = record as MonthRecord
            history[normalizedMonth] = {
              income: rec.income ?? 0,
              savings: rec.savings ?? 0,
              expenses: rec.expenses ?? [],
              extraIncomes: rec.extraIncomes ?? [],
              pockets:
                rec.pockets && rec.pockets.length > 0 ? rec.pockets : LEGACY_FALLBACK_POCKETS,
              manualBudget: rec.manualBudget,
            }
          }
          console.log(
            '[initializeApp] Setting monthlyHistory with',
            Object.keys(history).length,
            'months'
          )
          setMonthlyHistory(history)
          // Mark data as loaded (we have actual data from Supabase/localStorage)
          dataLoadedRef.current = true

          // Always display the current month by default
          const availableMonths = Object.keys(history)
          if (availableMonths.length > 0) {
            const targetMonth = getCurrentMonth()
            setActiveMonth(targetMonth)
            // NOTE: currentMonth should ALWAYS be the actual current month (today), not activeMonth!
            // activeMonth is what the user is viewing, currentMonth is what "today" is
          }

          if (hasOnboarded) setScreen('main')
        } else {
          if (hasOnboarded) setScreen('main')
        }

        // ✅ SUPABASE SYNC: Data loading and auto-save implemented above
      } catch (e) {
        // ignorar JSON malformado
        console.warn('[initializeApp] Error during initialization:', e)
      }
      setHydrated(true)
      // Establish sync baseline so refocus stale-check compares against initial load time
      lastSyncTimeRef.current = Date.now()
    }

    console.log('[LoadEffect] Deciding whether to call initializeApp:', {
      currentUserId: !!currentUserId,
      guestUserId: !!guestUserId,
      willInitialize: !!currentUserId || !!guestUserId,
    })

    if (currentUserId || guestUserId) {
      // If the effective user changed (real auth change, not token refresh), allow a fresh load.
      const effectiveId = currentUserId || guestUserId
      if (effectiveId !== loadedForUserRef.current) {
        dataLoadedRef.current = false
        // Volver al skeleton: el snapshot en pantalla pertenece al usuario anterior,
        // no al que está cargando ahora. hydrated=true solo debe ocurrir cuando
        // el pipeline completo (load→merge→repair→setMonthlyHistory) terminó para
        // el usuario ACTUAL. Sin este reset, Run 1 (OLD_GUEST) puede poner
        // hydrated=true con datos del usuario equivocado antes de que Run 2 (uid real)
        // haya completado su carga.
        setHydrated(false)
      }

      // Only initialize once per user identity. Token refreshes keep the same userId
      // so loadedForUserRef stays the same and we skip the reload correctly.
      if (!dataLoadedRef.current) {
        loadedForUserRef.current = effectiveId
        initializeApp()
      } else {
        console.log(
          '[LoadEffect] Skipping reload — data already loaded for this user, preserving local state'
        )
        setHydrated(true)
      }
    } else {
      setHydrated(true)
    }
  }, [userId, guestUserId])

  // ── GUEST→AUTH MIGRATION: Ensure all data syncs with new authenticated userId ──
  // When a guest user authenticates, ensure a COMPLETE save happens with the new userId
  // This guarantees pockets and all other data migrates from localStorage to Supabase
  useEffect(() => {
    if (!hydrated || !userId || !monthlyHistory || Object.keys(monthlyHistory).length === 0) {
      return
    }

    // Only trigger once per userId — tracked via ref so it's not tied to render cycles.
    if (userId === authSavedForUserRef.current) return

    // Guard: no migrar si el usuario no ha completado onboarding.
    // Si onboarding no terminó, monthlyHistory puede contener datos stale de una sesión
    // anterior (guest previo) — no hay nada válido que migrar a Supabase todavía.
    // handleOnboardingComplete se encarga del save inicial cuando el usuario sí onboardea.
    const onboardingDone = localStorage.getItem(`${ONBOARDING_FLAG}_${userId}`) === 'true'
    if (!onboardingDone) {
      console.log('[AUTH-SAVE] Skipping: usuario no ha completado onboarding, nada que migrar')
      return
    }

    if (userId) {
      // Defer if another save is already running — avoids concurrent saveUserData() calls that
      // could race on the delete-stale pass and silently remove recently-saved data.
      // The ref is intentionally NOT set here: the effect will retry on the next dep change
      // (e.g. user interaction) once the in-progress save completes and releases the mutex.
      if (saveInProgressRef.current) {
        console.log('[AUTH-SAVE] ⏭️ Save in progress, deferring to next dep change...')
        return
      }

      // Mark before the async call to prevent double-trigger within the same render cycle.
      authSavedForUserRef.current = userId
      saveInProgressRef.current = true
      console.log('[AUTH-SAVE] 🔄 Nuevo usuario autenticado detectado, haciendo save completo...')
      const activeData = monthlyHistory[activeMonth] ?? getDefaultMonthRecord()
      const dataToSave: StoredData = {
        monthlyIncome: activeData.income,
        monthlySavings: activeData.savings,
        expenses: activeData.expenses,
        extraIncomes: activeData.extraIncomes,
        pockets: activeData.pockets,
        monthlyHistory,
        conceptMap,
        learnedCategoryMap,
        currentMonth,
        countryCode,
        isPrivacyMode,
        profile: profileData,
      }

      saveUserData(userId, dataToSave)
        .then(() => {
          console.log('[AUTH-SAVE] ✅ Save completo post-autenticación exitoso')
          setSyncError(null)
          markSynced()
        })
        .catch((error) => {
          const errorMsg = getErrorMessage(error)
          console.error('[AUTH-SAVE] ❌ Error en save post-autenticación:', error)
          setSyncError(`Error sincronizando datos de migración: ${errorMsg}`)
        })
        .finally(() => {
          saveInProgressRef.current = false
        })
    }
  }, [
    userId,
    hydrated,
    monthlyHistory,
    activeMonth,
    conceptMap,
    learnedCategoryMap,
    currentMonth,
    countryCode,
    isPrivacyMode,
    profileData,
    markSynced,
  ])

  // ── Persist to localStorage + Supabase ───────────────────────────────────
  // SUPABASE DUAL STORAGE:
  // 1. Save to localStorage IMMEDIATELY (synchronous, always works)
  // 2. Save to Supabase in background (async, non-blocking) - works for authenticated and guest users
  // DEBOUNCE: Only save after 2 seconds without changes (prevents Supabase saturation)
  useEffect(() => {
    if (!hydrated || (!userId && !guestUserId)) return

    // Guard: Don't save during guest→auth migration (prevents race condition with userId switch)
    if (isAuthenticating) {
      console.log('[AUTO-SAVE] Skipping: authentication in progress (guest→auth migration)')
      return
    }

    // CRITICAL: Don't save if onboarding hasn't finished (prevents wiping good data
    // with empty state during initial load or auth state changes)
    const currentSaveUserId = userId || guestUserId
    if (!currentSaveUserId) return
    const onboardingDone =
      localStorage.getItem(`${ONBOARDING_FLAG}_${currentSaveUserId}`) === 'true'

    // Skip save entirely if user hasn't onboarded yet (prevents empty rows in Supabase)
    if (!onboardingDone) {
      console.log('[AUTO-SAVE] Skipping: user has not onboarded yet')
      return
    }

    // If user has onboarded but monthlyHistory is empty, this means the load failed
    // or hasn't finished — don't overwrite Supabase with empty data
    if (Object.keys(monthlyHistory).length === 0) {
      console.warn(
        '[AUTO-SAVE] Skipping save: monthlyHistory empty after onboarding (race condition)'
      )
      return
    }

    // Final guard: only save if data has been loaded (or set by onboarding completion)
    if (!dataLoadedRef.current) {
      console.warn('[AUTO-SAVE] Skipping save: data not yet loaded')
      return
    }

    // Capture userId to ensure type safety in async operations
    const currentUserId = userId

    // Set up debounce timer - wait 2 seconds before saving
    const timer = setTimeout(async () => {
      const activeData = getActiveMonthData()
      console.log(
        `[AUTO-SAVE] Saving data for month ${activeMonth}. ManualBudget:`,
        activeData.manualBudget
      )
      // Use current month's pockets for the global Supabase pockets table (not active/viewed month).
      // See saveNow for full explanation.
      const currentMonthDataForSave = monthlyHistory[currentMonth] ?? activeData
      const dataToSave: StoredData = {
        // Datos del mes actual (para backward compatibility)
        monthlyIncome: activeData.income,
        monthlySavings: activeData.savings,
        expenses: activeData.expenses,
        extraIncomes: activeData.extraIncomes,
        pockets: currentMonthDataForSave.pockets,
        // ÚNICA FUENTE DE VERDAD
        monthlyHistory,
        // Metadatos
        conceptMap,
        learnedCategoryMap,
        currentMonth,
        countryCode,
        isPrivacyMode,
      }

      console.log(`[AUTO-SAVE] Full monthlyHistory[${activeMonth}]:`, monthlyHistory[activeMonth])

      // Save to localStorage (offline cache)
      const saveUserId = currentUserId || guestUserId
      const storageKey = `${STORAGE_KEY}_${saveUserId}`
      try {
        localStorage.setItem(storageKey, JSON.stringify(dataToSave))
        console.log(`[AUTO-SAVE] ✅ localStorage guardado para userId: ${saveUserId}`)
      } catch (error) {
        console.error('[AUTO-SAVE] ❌ Error guardando localStorage:', error)
      }

      // Save to Supabase (primary storage for authenticated and guest users)
      if (saveUserId) {
        if (saveInProgressRef.current) {
          console.log('[AUTO-SAVE] Skipping Supabase save: another save already in progress')
          return
        }
        saveInProgressRef.current = true
        const skipDeleteStale = postReloadSaveRef.current
        if (skipDeleteStale) {
          postReloadSaveRef.current = false
          console.log('[AUTO-SAVE] 🛡️ postReloadSaveRef activo: skipDeleteStale=true')
        }
        setIsSyncing(true)
        try {
          console.log(`[AUTO-SAVE] 🔷 Guardando a Supabase para userId: ${saveUserId}`, {
            monthlyHistoryMonths: Object.keys(dataToSave.monthlyHistory || {}).length,
            monthlyIncome: dataToSave.monthlyIncome,
          })
          await saveUserData(saveUserId, dataToSave, { skipDeleteStale })
          console.log(`[AUTO-SAVE] ✅ Supabase guardado exitosamente`)

          setSyncError(null)
          markSynced()
        } catch (error) {
          const errorMsg = getErrorMessage(error)
          console.error('[AUTO-SAVE] ❌ Error guardando a Supabase:', error)
          setSyncError(`Error de sincronización: ${errorMsg}`)
        } finally {
          saveInProgressRef.current = false
          setIsSyncing(false)
        }
      }
    }, 2000)

    // Clean up timer on unmount or when dependencies change
    return () => clearTimeout(timer)
  }, [
    hydrated,
    userId,
    guestUserId,
    monthlyHistory,
    conceptMap,
    learnedCategoryMap,
    currentMonth,
    countryCode,
    isPrivacyMode,
    activeMonth,
    isAuthenticating,
    markSynced,
  ])

  // ── Guardar inmediatamente cuando el usuario sale de la app ───────────────
  // En mobile: cuando presiona Home, cambia de app, o bloquea la pantalla
  // Evita perder datos si la app se cierra antes del debounce de 2 segundos
  // Fase A: también detecta snapshot stale cuando la tab vuelve a ser visible.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // ── HIDDEN: registrar timestamp + save inmediato ──────────────────────
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()

        if (!dataLoadedRef.current) return

        const saveUserId = userId || guestUserId
        if (!saveUserId) return

        const onboardingDone = localStorage.getItem(`${ONBOARDING_FLAG}_${saveUserId}`) === 'true'
        if (!onboardingDone || Object.keys(monthlyHistory).length === 0) return

        const activeData = monthlyHistory[activeMonth] ?? getDefaultMonthRecord()
        // Use current month's pockets for the global Supabase pockets table. See saveNow for explanation.
        const currentMonthDataOnHide = monthlyHistory[currentMonth] ?? activeData
        const dataToSave: StoredData = {
          monthlyIncome: activeData.income,
          monthlySavings: activeData.savings,
          expenses: activeData.expenses,
          extraIncomes: activeData.extraIncomes,
          pockets: currentMonthDataOnHide.pockets,
          monthlyHistory,
          conceptMap,
          learnedCategoryMap,
          currentMonth,
          countryCode,
          isPrivacyMode,
        }

        const storageKey = `${STORAGE_KEY}_${saveUserId}`
        try {
          localStorage.setItem(storageKey, JSON.stringify(dataToSave))
          console.log('[VISIBILITY] ✅ localStorage guardado antes de cerrar')
        } catch (storageError) {
          console.warn('[VISIBILITY] ⚠️ Error guardando a localStorage:', storageError)
          // Continue to Supabase even if localStorage fails
        }

        if (saveInProgressRef.current) {
          console.log('[VISIBILITY] Skipping Supabase save: another save already in progress')
          return
        }
        saveInProgressRef.current = true
        const skipDeleteStale = postReloadSaveRef.current
        if (skipDeleteStale) {
          postReloadSaveRef.current = false
          console.log('[VISIBILITY] 🛡️ postReloadSaveRef activo: skipDeleteStale=true')
        }
        try {
          console.log('[VISIBILITY] 🔷 App ocultada, guardando en Supabase inmediatamente...', {
            userId: saveUserId,
            monthlyHistoryMonths: Object.keys(monthlyHistory).length,
          })
          await saveUserData(saveUserId, dataToSave, { skipDeleteStale })
          console.log('[VISIBILITY] ✅ Guardado exitoso antes de salir de la app')

          setSyncError(null)
          markSynced()
        } catch (e) {
          const errorMsg = getErrorMessage(e)
          console.error('[VISIBILITY] ❌ Error guardando al salir:', e)
          setSyncError(`Error crítico al salir: ${errorMsg}`)
        } finally {
          saveInProgressRef.current = false
        }

        // ── VISIBLE: detección de snapshot stale (Fase A) ─────────────────
      } else if (document.visibilityState === 'visible') {
        const STALE_THRESHOLD_MS = 30_000
        const hiddenAt = hiddenAtRef.current
        hiddenAtRef.current = null

        // No aplicar si: datos no cargados, tab no estuvo oculta el tiempo suficiente,
        // o el usuario tiene una sheet de edición abierta (evita interrumpir la entrada)
        if (
          !dataLoadedRef.current ||
          hiddenAt === null ||
          Date.now() - hiddenAt < STALE_THRESHOLD_MS ||
          sheetOpen
        ) {
          return
        }

        const refocusUserId = userId || guestUserId
        if (!refocusUserId) return

        console.log('[VISIBILITY-REFOCUS] 🔍 Tab visible tras >30s hidden, verificando datos...')

        try {
          // Consulta ligera: solo updated_at, no datos completos
          const { data: remoteRecords, error } = await supabase
            .from('monthly_records')
            .select('month, updated_at')
            .eq('user_id', refocusUserId)

          if (error || !remoteRecords) {
            console.warn(
              '[VISIBILITY-REFOCUS] ⚠️ Query falló, manteniendo datos locales:',
              error?.message
            )
            return
          }

          const myLastSync = lastSyncTimeRef.current
          const hasNewer = remoteRecords.some(
            (r) => myLastSync === null || new Date(r.updated_at).getTime() > myLastSync
          )

          if (!hasNewer) {
            console.log('[VISIBILITY-REFOCUS] ✅ Datos locales frescos, no es necesario recargar')
            return
          }

          console.log('[VISIBILITY-REFOCUS] 🔄 Hay datos más nuevos en Supabase, recargando...')
          const remoteData = await loadUserData(refocusUserId)

          if (!remoteData) {
            console.warn(
              '[VISIBILITY-REFOCUS] ⚠️ loadUserData devolvió null, manteniendo datos locales'
            )
            return
          }

          // Merge aditivo: añadir expenses/incomes del remote que no están en local.
          // Nunca se eliminan datos locales (protege cambios no guardados durante hidden).
          const merged: Record<string, MonthRecord> = { ...monthlyHistory }
          let didAddNewData = false

          for (const [month, remoteMonth] of Object.entries(remoteData.monthlyHistory ?? {})) {
            const localMonth = merged[month]
            if (!localMonth) {
              // Mes completamente nuevo en remote — incorporar
              merged[month] = remoteMonth
              didAddNewData = true
              continue
            }
            const localExpenseIds = new Set(localMonth.expenses.map((e) => e.id))
            const newExpenses = remoteMonth.expenses.filter((e) => !localExpenseIds.has(e.id))
            const localIncomeIds = new Set((localMonth.extraIncomes ?? []).map((i) => i.id))
            const newIncomes = (remoteMonth.extraIncomes ?? []).filter(
              (i) => !localIncomeIds.has(i.id)
            )

            if (newExpenses.length > 0 || newIncomes.length > 0) {
              merged[month] = {
                ...localMonth,
                expenses:
                  newExpenses.length > 0
                    ? [...localMonth.expenses, ...newExpenses]
                    : localMonth.expenses,
                extraIncomes:
                  newIncomes.length > 0
                    ? [...(localMonth.extraIncomes ?? []), ...newIncomes]
                    : (localMonth.extraIncomes ?? []),
              }
              didAddNewData = true
            }
          }

          if (didAddNewData) {
            setMonthlyHistory(merged)
            postReloadSaveRef.current = true
            console.log(
              '[VISIBILITY-REFOCUS] ✅ Nuevos datos fusionados, postReloadSaveRef activado'
            )
          } else {
            console.log('[VISIBILITY-REFOCUS] ✅ Sin datos nuevos tras merge aditivo')
          }

          markSynced()
        } catch (e) {
          console.warn('[VISIBILITY-REFOCUS] ⚠️ Error durante refocus check:', e)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [
    userId,
    guestUserId,
    monthlyHistory,
    conceptMap,
    learnedCategoryMap,
    currentMonth,
    countryCode,
    isPrivacyMode,
    activeMonth,
    sheetOpen,
    markSynced,
  ])

  // ── Safety net: re-fetch current month if empty after hydration ────────────
  // Guards against timing issues where initializeApp loads Supabase data but the
  // current month ends up with 0 expenses in state (e.g. stale localStorage cache
  // that overwrites Supabase data, or race conditions during token refresh).
  // This effect is cheap: it only queries Supabase when expenses are missing, and
  // the query returns immediately if Supabase also has 0 expenses.
  useEffect(() => {
    if (!hydrated) return
    // Guard: don't fire before initializeApp has loaded real data.
    // Without this, the safety-net triggers when hydrated=true but monthlyHistory is still empty
    // (auth resolves → hydrated=true briefly → safety-net queries Supabase → sets global pockets
    // for current month → overwrites per-month pockets with stale global ones → flicker).
    if (!dataLoadedRef.current) return
    const saveUserId = userId || guestUserId
    if (!saveUserId) return

    const currentRecord = monthlyHistory[currentMonth]
    const hasExpenses = (currentRecord?.expenses?.length ?? 0) > 0
    if (hasExpenses) return // Data is already present — nothing to do

    console.log(
      `[SAFETY-NET] ${currentMonth} has no expenses after hydration. Checking Supabase...`
    )

    Promise.all([
      supabase
        .from('monthly_records')
        .select('*')
        .eq('user_id', saveUserId)
        .eq('month', currentMonth)
        .single(),
      supabase.from('expenses').select('*').eq('user_id', saveUserId).eq('month', currentMonth),
    ])
      .then(([{ data: mr, error: mrErr }, { data: exps }]) => {
        if (mrErr || !mr) return // No monthly record for this month
        const expenses = (exps || []).map((e) => ({
          id: e.id,
          date: e.date,
          amount: e.amount,
          concept: e.concept,
          pocketId: e.pocket_id,
        }))
        if (expenses.length === 0) {
          console.log(`[SAFETY-NET] Supabase confirmed: no expenses for ${currentMonth}`)
          return
        }
        console.log(`[SAFETY-NET] ✅ Loaded ${expenses.length} expenses for ${currentMonth}`)
        setMonthlyHistory((prev) => ({
          ...prev,
          [currentMonth]: {
            income: mr.income ?? 0,
            savings: mr.savings ?? 0,
            expenses,
            extraIncomes: prev[currentMonth]?.extraIncomes ?? [],
            pockets:
              prev[currentMonth]?.pockets && prev[currentMonth].pockets.length > 0
                ? prev[currentMonth].pockets
                : LEGACY_FALLBACK_POCKETS,
            manualBudget: mr.manual_budget ?? undefined,
          },
        }))
      })
      .catch((err) => {
        console.warn('[SAFETY-NET] Error fetching current month from Supabase:', err)
      })
  }, [hydrated, currentMonth, userId, guestUserId, monthlyHistory])

  // ── Guardar en Supabase inmediatamente (para acciones críticas) ──────────
  const saveNow = useCallback(
    async (updatedHistory: Record<string, MonthRecord>) => {
      // requireUserId() GARANTIZA un string válido (auth, guest existente, o nuevo guest)
      // Esto resuelve race conditions donde userId/guestUserId aún no están en el estado React
      const saveUserId = await requireUserId()

      // Solo el guard de dataLoadedRef sigue siendo relevante (evita guardar antes de cargar)
      if (!dataLoadedRef.current) {
        console.warn('[SAVE-NOW] Skipping: data not yet loaded')
        return
      }

      const activeData = updatedHistory[activeMonth] ?? getDefaultMonthRecord()
      // Use the CURRENT MONTH's pockets for the legacy global 'pockets' field in Supabase.
      // The Supabase 'pockets' table is global (no per-month column), so it must reflect
      // today's configuration. Using activeData.pockets (the viewed month) would contaminate
      // Supabase's global pockets with historical month data, causing other months to
      // temporarily inherit wrong budgets on fresh load.
      const currentMonthData = updatedHistory[currentMonth] ?? activeData
      const dataToSave: StoredData = {
        monthlyIncome: activeData.income,
        monthlySavings: activeData.savings,
        expenses: activeData.expenses,
        extraIncomes: activeData.extraIncomes,
        pockets: currentMonthData.pockets,
        monthlyHistory: updatedHistory,
        conceptMap,
        learnedCategoryMap,
        currentMonth,
        countryCode,
        isPrivacyMode,
      }

      const storageKey = `${STORAGE_KEY}_${saveUserId}`

      // Save to localStorage (critical for offline support)
      try {
        localStorage.setItem(storageKey, JSON.stringify(dataToSave))
        console.log('[SAVE-NOW] ✅ localStorage guardado')
      } catch (storageError) {
        console.error('[SAVE-NOW] ❌ Error guardando a localStorage:', storageError)
        // Continue to Supabase even if localStorage fails
      }

      if (saveInProgressRef.current) {
        console.log('[SAVE-NOW] Skipping Supabase save: another save already in progress')
        return
      }
      saveInProgressRef.current = true
      const skipDeleteStale = postReloadSaveRef.current
      if (skipDeleteStale) {
        postReloadSaveRef.current = false
        console.log('[SAVE-NOW] 🛡️ postReloadSaveRef activo: skipDeleteStale=true')
      }
      try {
        await saveUserData(saveUserId, dataToSave, { skipDeleteStale })
        console.log('[SAVE-NOW] ✅ Guardado inmediato exitoso para userId:', saveUserId)
      } catch (e) {
        console.error('[SAVE-NOW] ❌ Error en guardado inmediato:', e)
      } finally {
        saveInProgressRef.current = false
      }
    },
    [
      userId,
      guestUserId,
      activeMonth,
      conceptMap,
      learnedCategoryMap,
      currentMonth,
      countryCode,
      isPrivacyMode,
    ]
  )

  // ── Derived state ─────────────────────────────────────────────────────────
  const isViewingPast = activeMonth !== currentMonth

  // ── Acceso a datos: SIEMPRE desde monthlyHistory[activeMonth] ──────────────
  const monthData = useMemo(() => getActiveMonthData(), [getActiveMonthData])

  const income = monthData.income
  const savings = monthData.savings
  const expenses = monthData.expenses
  const extraIncomes = monthData.extraIncomes
  const pockets = monthData.pockets
  const manualBudget = monthData.manualBudget

  const spentByPocket = useMemo(() => {
    const acc: Record<string, number> = Object.fromEntries(pockets.map((p) => [p.id, 0]))
    for (const e of expenses) if (e.pocketId in acc) acc[e.pocketId] += e.amount
    return acc
  }, [expenses, pockets])

  // Conteo real de gastos por pocket (para el modal de confirmación de borrado)
  const expenseCountByPocket = useMemo(() => {
    const acc: Record<string, number> = Object.fromEntries(pockets.map((p) => [p.id, 0]))
    for (const e of expenses) if (e.pocketId in acc) acc[e.pocketId]++
    return acc
  }, [expenses, pockets])

  const extraIncomeTotal = useMemo(
    () => extraIncomes.reduce((s: number, e: ExtraIncome) => s + e.amount, 0),
    [extraIncomes]
  )

  // totalIncome = income (base) + extraIncomes (adicionales)
  const totalIncome = income + extraIncomeTotal

  // ── Carry-over: balance acumulado de meses anteriores (Phase 1) ───────────
  // Calculated, never stored. Pure function of monthlyHistory + activeMonth.
  const carryOver = useMemo(
    () => calculateCarryOver(activeMonth, monthlyHistory),
    [activeMonth, monthlyHistory]
  )

  // ════════════════════════════════════════════════════════════════════════════
  // FINANCIALENGINE: Calcula snapshot a partir de monthlyHistory[activeMonth]
  // ════════════════════════════════════════════════════════════════════════════
  const snapshot = useMemo(
    () =>
      calculateFinancialSnapshot({
        expenses,
        extraIncomes,
        pockets,
        monthlyIncome: income,
        monthlySavings: savings,
        currentMonth: activeMonth,
        manualBudget,
        carryOver,
      }),
    [expenses, extraIncomes, pockets, income, savings, activeMonth, manualBudget, carryOver]
  )

  // ── Cumulative Savings Calculation ─────────────────────────────────────────
  const cumulativeSavings = useMemo(() => {
    const totalByYear: Record<number, number> = {}
    let grandTotal = 0

    Object.entries(monthlyHistory).forEach(([monthKey, month]) => {
      const year = parseInt(monthKey.split('-')[0])
      const totalExpenses = month.expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0
      const extraIncomeTotal = month.extraIncomes?.reduce((sum, e) => sum + e.amount, 0) ?? 0
      const totalIncome = (month.income ?? 0) + extraIncomeTotal
      const budget = month.manualBudget ?? month.pockets?.reduce((sum, p) => sum + p.budget, 0) ?? 0
      const overspent = Math.max(0, totalExpenses - budget)
      const monthSavings = Math.max(0, totalIncome - budget - overspent)

      totalByYear[year] = (totalByYear[year] ?? 0) + monthSavings
      grandTotal += monthSavings
    })

    const result = { totalByYear, total: grandTotal }
    console.log('[cumulativeSavings] 📊 Calculated:', {
      monthCount: Object.keys(monthlyHistory).length,
      totalByYear,
      grandTotal,
      result,
    })
    return result
  }, [monthlyHistory])

  // ── Sheet handlers ─────────────────────────────────────────────────────────
  const openAddSheet = useCallback(() => {
    setEditingExpense(null)
    setEditingIncome(null)
    setDefaultSheetType(null)
    setSheetOpen(true)
  }, [])
  const openEditSheet = useCallback((e: Expense) => {
    setEditingExpense(e)
    setEditingIncome(null)
    setDefaultSheetType(null)
    setSheetOpen(true)
  }, [])
  const openEditIncomeSheet = useCallback((i: ExtraIncome) => {
    setEditingIncome(i)
    setEditingExpense(null)
    setDefaultSheetType('income')
    setSheetOpen(true)
  }, [])
  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    setEditingExpense(null)
    setEditingIncome(null)
    setDefaultSheetType(null)
  }, [])

  // ── Data handlers ──────────────────────────────────────────────────────────
  const handleSaveExpense = useCallback(
    (payload: ExpensePayload) => {
      const { id, ...rest } = payload

      setMonthlyHistory((prev) => {
        const monthData = prev[activeMonth] ?? getDefaultMonthRecord()
        const newExpenses = id
          ? monthData.expenses.map((e) => (e.id === id ? { ...e, ...rest } : e))
          : [...monthData.expenses, { id: createEntityId(), ...rest }]

        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            expenses: newExpenses,
          },
        }
        console.log('[EXPENSE] 🔷 Nuevo gasto guardado:', {
          userId: userId || guestUserId,
          concept: rest.concept,
          amount: rest.amount,
          month: activeMonth,
        })
        saveNow(updated)
        return updated
      })

      const key = normalizeKey(rest.concept)
      if (key && key !== 'gasto') {
        setConceptMap((prev) => ({ ...prev, [key]: rest.pocketId }))
      }
    },
    [activeMonth, saveNow]
  )

  const handleDeleteExpense = useCallback(
    (id: string) => {
      setMonthlyHistory((prev) => {
        const monthData = prev[activeMonth] ?? getDefaultMonthRecord()
        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            expenses: monthData.expenses.filter((e) => e.id !== id),
          },
        }
        saveNow(updated)
        return updated
      })
    },
    [activeMonth, saveNow]
  )

  const handleSwitchExpenseToIncome = useCallback(
    (expenseId: string, amount: number, note: string, date: string) => {
      setMonthlyHistory((prev) => {
        const monthData = prev[activeMonth] ?? getDefaultMonthRecord()
        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            expenses: monthData.expenses.filter((e) => e.id !== expenseId),
            extraIncomes: [
              ...monthData.extraIncomes,
              {
                id: createEntityId(),
                amount,
                concept: note,
                date,
                category: 'extra' as const,
              },
            ],
          },
        }
        saveNow(updated)
        return updated
      })
    },
    [activeMonth, saveNow]
  )

  const handleEditPocket = useCallback(
    (id: string, name: string, budget: number, icon?: string) => {
      const monthData = getActiveMonthData()

      // Sin validación: el usuario decide cómo asignar su presupuesto
      // El financial engine mostrará visualmente si es sostenible (status, savings, etc)
      setMonthlyHistory((prev) => {
        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            pockets: monthData.pockets.map((p) =>
              p.id === id ? { ...p, name: capitalizeWords(name), budget, icon } : p
            ),
          },
        }
        saveNow(updated)
        return updated
      })
      return true
    },
    [activeMonth, getActiveMonthData, saveNow]
  )

  const handleDeletePocket = useCallback(
    (id: string) => {
      const monthData = getActiveMonthData()
      setMonthlyHistory((prev) => {
        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            pockets: monthData.pockets.filter((p) => p.id !== id),
            // Reasignar a 'unassigned' en lugar de eliminar — los gastos siguen
            // contando en totalExpenses pero pierden su categoría visualmente.
            expenses: monthData.expenses.map((e) =>
              e.pocketId === id ? { ...e, pocketId: UNASSIGNED_POCKET_ID } : e
            ),
          },
        }
        saveNow(updated)
        return updated
      })
    },
    [activeMonth, getActiveMonthData, saveNow]
  )

  const handleAddPocket = useCallback(
    (name: string, budget: number, icon?: string) => {
      setMonthlyHistory((prev) => {
        // 1. Asegurar que el mes actual existe en monthlyHistory
        if (!prev[activeMonth]) {
          prev = {
            ...prev,
            [activeMonth]: {
              income: 0,
              savings: 0,
              expenses: [],
              extraIncomes: [],
              pockets: [],
              manualBudget: undefined,
            },
          }
        }

        const monthData = prev[activeMonth]

        // Sin validación: el usuario decide cómo asignar su presupuesto
        // El financial engine mostrará visualmente si es sostenible
        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            pockets: [
              ...monthData.pockets,
              { id: createEntityId(), name: capitalizeWords(name), budget, icon },
            ],
          },
        }
        saveNow(updated)
        return updated
      })
    },
    [activeMonth, saveNow]
  )

  const handleAddExtraIncome = useCallback(
    (amount: number, note: string) => {
      const monthData = getActiveMonthData()
      setMonthlyHistory((prev) => {
        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            extraIncomes: [
              ...monthData.extraIncomes,
              {
                id: createEntityId(),
                amount,
                concept: note,
                date: new Date().toISOString(),
                category: 'extra' as const,
              },
            ],
          },
        }
        saveNow(updated)
        return updated
      })
    },
    [activeMonth, getActiveMonthData, saveNow]
  )

  const handleDeleteExtraIncome = useCallback(
    (id: string) => {
      const monthData = getActiveMonthData()
      setMonthlyHistory((prev) => {
        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            extraIncomes: monthData.extraIncomes.filter((e) => e.id !== id),
          },
        }
        saveNow(updated)
        return updated
      })
    },
    [activeMonth, getActiveMonthData, saveNow]
  )

  const handleUpdateExtraIncome = useCallback(
    (id: string, amount: number, note: string, date: string) => {
      const monthData = getActiveMonthData()
      setMonthlyHistory((prev) => {
        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            extraIncomes: monthData.extraIncomes.map((e) =>
              e.id === id ? { ...e, amount, concept: note, date } : e
            ),
          },
        }
        saveNow(updated)
        return updated
      })
    },
    [activeMonth, getActiveMonthData, saveNow]
  )

  const handleClearData = useCallback(() => {
    if (!userId) return
    const userStorageKey = `${STORAGE_KEY}_${userId}`
    localStorage.removeItem(userStorageKey)
    localStorage.removeItem(`${ONBOARDING_FLAG}_${userId}`)
    setConceptMap({})
    setLearnedCategoryMap({})
    const thisMonth = getCurrentMonth()
    setCurrentMonth(thisMonth)
    setActiveMonth(thisMonth)
    setMonthlyHistory({
      [thisMonth]: getDefaultMonthRecord(),
    })
    setScreen('onboarding')
  }, [userId])

  const handleChangeCountry = useCallback((code: CountryCode) => {
    setCountryCode(code)
  }, [])

  // ── CAMBIO DE MES: cargar desde Supabase si el mes no está en memoria ────────
  // CRITICAL: Primero intentamos cargar desde Supabase para no perder gastos
  // históricos que no estén en el estado React (ej: datos importados externamente
  // o meses cargados en una sesión anterior que no se persistieron en localStorage).
  // Si NO usáramos Supabase primero, el auto-save borraría los gastos del mes al
  // guardar el mes vacío que crearíamos localmente.
  const handleChangeMonth = useCallback(
    (newMonth: string) => {
      setActiveMonth(newMonth)

      // Si el mes ya existe en memoria CON datos reales, no consultar Supabase.
      // Si existe pero está vacío (creado como placeholder), sí hay que consultar
      // porque puede haber gastos en Supabase que no se cargaron.
      const existingRecord = monthlyHistory[newMonth]
      const hasRealData =
        existingRecord &&
        (existingRecord.expenses.length > 0 ||
          existingRecord.extraIncomes.length > 0 ||
          existingRecord.income > 0 ||
          existingRecord.pockets?.some((p) => p.budget > 0))
      if (hasRealData) {
        return
      }

      const saveUserId = userId || guestUserId

      // Helper: crear mes vacío heredando bolsillos del mes anterior
      const createEmptyMonth = () => {
        const sortedMonths = Object.keys(monthlyHistory).sort().reverse()
        const previousMonth = sortedMonths.find((m) => m < newMonth)
        const previousPockets =
          previousMonth && monthlyHistory[previousMonth]
            ? (monthlyHistory[previousMonth].pockets ?? [])
            : []

        setMonthlyHistory((prev) => ({
          ...prev,
          [newMonth]: {
            income: 0,
            savings: 0,
            expenses: [],
            extraIncomes: [],
            // Heredar pockets completos (nombres, íconos y presupuestos) del mes anterior.
            // Esto mantiene la continuidad financiera: el usuario no pierde su configuración
            // al navegar a un mes nuevo sin datos en Supabase.
            pockets: previousPockets.length > 0 ? previousPockets : LEGACY_FALLBACK_POCKETS,
          },
        }))
        console.log(`[handleChangeMonth] Creado ${newMonth} vacío (sin datos en Supabase)`)
      }

      if (saveUserId) {
        // ── Resolver pockets para el mes navegado ──────────────────────────────────
        // NEVER use the global Supabase 'pockets' table here: that table is global
        // (no per-month column) and always reflects the LAST SAVED month's budgets.
        // Querying it for April when May was just saved would give April the wrong budgets.
        //
        // Priority:
        //   1. Per-month pockets from localStorage (exact per-month budgets).
        //   2. Previous-month inheritance (same logic as createEmptyMonth).
        //   3. LEGACY_FALLBACK_POCKETS as last resort.
        let lsMonthPockets: Pocket[] | null = null
        try {
          const lsRaw = localStorage.getItem(`${STORAGE_KEY}_${saveUserId}`)
          const lsData: StoredData | null = lsRaw ? JSON.parse(lsRaw) : null
          const pocketsFromLs = lsData?.monthlyHistory?.[newMonth]?.pockets
          if (Array.isArray(pocketsFromLs) && pocketsFromLs.length > 0) {
            lsMonthPockets = pocketsFromLs as Pocket[]
          }
        } catch {
          // Ignore localStorage parse errors — fall through to inheritance
        }

        // Previous-month inheritance fallback (same logic as createEmptyMonth)
        const inheritedPockets: Pocket[] = (() => {
          const sortedMonths = Object.keys(monthlyHistory).sort().reverse()
          const prevMonth = sortedMonths.find((m) => m < newMonth)
          return prevMonth && (monthlyHistory[prevMonth]?.pockets ?? []).length > 0
            ? (monthlyHistory[prevMonth].pockets ?? LEGACY_FALLBACK_POCKETS)
            : LEGACY_FALLBACK_POCKETS
        })()

        // Intentar cargar el mes desde Supabase ANTES de crear uno vacío.
        // Mientras se carga, el mes NO está en monthlyHistory → el auto-save no lo toca.
        Promise.all([
          supabase
            .from('monthly_records')
            .select('*')
            .eq('user_id', saveUserId)
            .eq('month', newMonth)
            .single(),
          supabase.from('expenses').select('*').eq('user_id', saveUserId).eq('month', newMonth),
        ])
          .then(([{ data: mr, error: mrErr }, { data: exps }]) => {
            if (mr && !mrErr) {
              // Mes encontrado en Supabase → cargarlo con gastos reales.
              // Pockets: pockets_data de Supabase (per-month) → localStorage → herencia → fallback.
              let dbPockets: Pocket[] | null = null
              if (mr.pockets_data) {
                try {
                  dbPockets = JSON.parse(mr.pockets_data)
                } catch {
                  // fall through
                }
              }
              const resolvedPockets: Pocket[] = dbPockets ?? lsMonthPockets ?? inheritedPockets

              const monthRecord: MonthRecord = {
                income: mr.income,
                savings: mr.savings,
                expenses: (exps || []).map((e) => ({
                  id: e.id,
                  date: e.date,
                  amount: e.amount,
                  concept: e.concept,
                  pocketId: e.pocket_id,
                })),
                extraIncomes: [],
                pockets: resolvedPockets,
                manualBudget: mr.manual_budget ?? undefined,
              }

              // Normalizar y reparar (pocket IDs, expense pocketIds, deduplicación)
              const repairedRecord = repairMonthRecord(monthRecord)
              console.log(
                `[handleChangeMonth] Cargado ${newMonth} desde Supabase: ${repairedRecord.expenses.length} gastos`
              )

              setMonthlyHistory((prev) => ({
                ...prev,
                [newMonth]: repairedRecord,
              }))
            } else {
              // No hay datos en Supabase para este mes → crear vacío
              createEmptyMonth()
            }
          })
          .catch((err) => {
            console.warn(
              '[handleChangeMonth] Error cargando desde Supabase, creando mes vacío:',
              err
            )
            createEmptyMonth()
          })

        // No crear mes vacío todavía — esperar respuesta de Supabase
        return
      }

      // Sin userId (modo sin conexión) → crear vacío directamente
      createEmptyMonth()
    },
    [monthlyHistory, userId, guestUserId]
  )

  const handleSetIncome = useCallback(
    (newIncome: number) => {
      const monthData = getActiveMonthData()
      setMonthlyHistory((prev) => ({
        ...prev,
        [activeMonth]: {
          ...monthData,
          income: newIncome,
        },
      }))
    },
    [activeMonth, getActiveMonthData]
  )

  const handleSetSavings = useCallback(
    (newSavings: number) => {
      const monthData = getActiveMonthData()
      setMonthlyHistory((prev) => ({
        ...prev,
        [activeMonth]: {
          ...monthData,
          savings: newSavings,
        },
      }))
    },
    [activeMonth, getActiveMonthData]
  )

  const handleSetManualBudget = useCallback(
    (newBudget: number) => {
      console.log(
        `[BUDGET] handleSetManualBudget called: month=${activeMonth}, newBudget=${newBudget}`
      )
      const monthData = getActiveMonthData()
      setMonthlyHistory((prev) => {
        const updated = {
          ...prev,
          [activeMonth]: {
            ...monthData,
            manualBudget: newBudget > 0 ? newBudget : undefined,
          },
        }
        console.log(`[BUDGET] monthlyHistory updated:`, updated[activeMonth])
        return updated
      })
    },
    [activeMonth, getActiveMonthData]
  )

  const handleTogglePrivacy = useCallback(() => {
    setIsPrivacyMode((prev) => !prev)
  }, [])

  const handleSaveProfile = useCallback(
    async (newProfile: import('../lib/types').UserProfile) => {
      console.log('[page.tsx] 🔵 handleSaveProfile called:', {
        nombre: newProfile.nombre,
        email: newProfile.email,
        userId: userId || guestUserId,
      })
      setProfileData(newProfile)
      const saveUserId = userId || guestUserId
      if (!saveUserId) {
        console.warn('[page.tsx] ⚠️ No userId/guestUserId available')
        return
      }
      // Solo guarda profile_data — no toca gastos ni movimientos
      try {
        console.log('[page.tsx] 🔵 Calling saveProfileData with userId:', saveUserId)
        await saveProfileData(saveUserId, newProfile)
        console.log('[page.tsx] ✅ Profile saved successfully')
      } catch (e) {
        console.error('[PROFILE] ❌ Error saving profile to Supabase:', e)
      }
    },
    [userId, guestUserId]
  )

  const handleLogOut = useCallback(async () => {
    try {
      await logOut()
      // Auth state listener will handle clearing state and showing login screen
    } catch (error) {
      console.error('Error logging out:', error)
      alert('Error logging out. Please try again.')
    }
  }, [])

  const handleGuestMode = useCallback(() => {
    // Check if component is still mounted before updating state
    if (!isMountedRef.current) return

    // Generate or retrieve guest UUID
    let guest = localStorage.getItem('guest_id')
    if (!guest) {
      guest = generateGuestUserId()
      localStorage.setItem('guest_id', guest)
    }

    // IMPORTANT: We must update all state synchronously here to avoid race conditions
    // where OnboardingScreen renders before guestUserId is set
    setGuestUserId(guest)

    // Check if user has onboarded before
    const onboardingKey = `${ONBOARDING_FLAG}_${guest}`
    const hasOnboarded = localStorage.getItem(onboardingKey) === 'true'

    if (hasOnboarded) {
      setScreen('main')
    } else {
      // IMPORTANT: Only show onboarding AFTER guestUserId is committed to state
      // But since setGuestUserId is async, we need to pass the guest ID to handlers
      // that depend on it. The guest ID is now in localStorage and can be retrieved.
      setScreen('onboarding')
    }

    setAuthLoading(false)
    setHydrated(true)
  }, [])

  const handleOnboardingComplete = useCallback(
    async (code: CountryCode, budget: number, incomeValue: number) => {
      // requireUserId() GARANTIZA un string válido (auth, guest existente, o nuevo guest)
      const currentUserId: string = await requireUserId()

      // Mark onboarding as complete for this user
      localStorage.setItem(`${ONBOARDING_FLAG}_${currentUserId}`, 'true')

      setCountryCode(code)

      const thisMonth = getCurrentMonth()
      setCurrentMonth(thisMonth)

      // Calcular savings desde budget: savings = income - budget
      let savings = 0
      if (incomeValue > 0 && budget > 0) {
        savings = Math.max(0, incomeValue - budget)
      }

      // Bolsillos de arranque: 50/30/20 cuando hay ingreso, LEGACY_FALLBACK_POCKETS si no.
      // TODO Paso 3: cuando income=0, usar STARTER_POCKETS (catálogo mínimo de onboarding)
      //              en lugar del catálogo técnico de reparación.
      const starterPockets = generateStarterPockets(incomeValue)
      const initialPockets = starterPockets.length > 0 ? starterPockets : LEGACY_FALLBACK_POCKETS

      // Build monthlyHistory with April (from CSV if provided) and current month
      const history: Record<string, MonthRecord> = {}

      // Add current month
      history[thisMonth] = {
        income: incomeValue,
        savings,
        expenses: [],
        extraIncomes: [],
        pockets: initialPockets,
        manualBudget: undefined,
      }

      setMonthlyHistory(history)
      // Mark data as loaded so auto-save will work and avoid race conditions
      dataLoadedRef.current = true

      // Build and save complete user data to Supabase
      const initialData: StoredData = {
        monthlyHistory: history,
        pockets: initialPockets,
        monthlyIncome: incomeValue,
        monthlySavings: savings,
        expenses: [],
        extraIncomes: [],
        conceptMap: {},
        learnedCategoryMap: {},
        countryCode: code,
        isPrivacyMode: false,
        currentMonth: thisMonth,
      }

      // Save to Supabase and localStorage
      saveUserData(currentUserId, initialData).catch((err) => {
        console.error('[onboarding] Error saving to Supabase:', err)
      })

      const storageKey = `${STORAGE_KEY}_${currentUserId}`
      localStorage.setItem(storageKey, JSON.stringify(initialData))

      // Always show current month after onboarding
      setActiveMonth(thisMonth)

      setScreen('main')
    },
    [userId, guestUserId]
  )

  // ── Wait for hydration ─────────────────────────────────────────────────────
  if (!hydrated || authLoading)
    return (
      <div
        style={{
          background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-30%',
            left: '-5%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(103,232,249,.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
            position: 'relative',
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          <img
            src="/logo-ui.png"
            alt="Tranquilo"
            style={{
              width: '60px',
              height: '60px',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Skeleton loaders */}
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Header skeleton */}
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            {/* Avatar + Name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  animation: 'pulse 2s infinite',
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: '16px',
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    animation: 'pulse 2s infinite',
                  }}
                />
                <div
                  style={{
                    height: '12px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    width: '70%',
                    animation: 'pulse 2s infinite',
                  }}
                />
              </div>
            </div>

            {/* Badge skeleton */}
            <div
              style={{
                height: '28px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '12px',
                width: '140px',
                marginBottom: '16px',
                animation: 'pulse 2s infinite',
              }}
            />

            {/* Health indicator skeleton */}
            <div
              style={{
                height: '40px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '12px',
                marginBottom: '16px',
                animation: 'pulse 2s infinite',
              }}
            />

            {/* 4 Metrics skeleton */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: '70px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    animation: `pulse 2s infinite`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Content skeleton */}
          {[1, 2, 3].map((section) => (
            <div key={section} style={{ marginBottom: '20px' }}>
              {/* Section header */}
              <div
                style={{
                  height: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  width: '100px',
                  marginBottom: '12px',
                  animation: 'pulse 2s infinite',
                }}
              />

              {/* Card skeleton */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    height: '14px',
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    width: '60%',
                    animation: 'pulse 2s infinite',
                  }}
                />
                <div
                  style={{
                    height: '12px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    animation: 'pulse 2s infinite',
                  }}
                />
                <div
                  style={{
                    height: '12px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    width: '80%',
                    animation: 'pulse 2s infinite',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Loading text */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          <p>Tranquilo</p>
          <p style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>Cargando...</p>
        </div>

        <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
      </div>
    )

  // ── Show login screen ────────────────────────────────────────────────────
  if (screen === 'login') {
    return <WelcomeScreen onLoginSuccess={() => {}} onGuestMode={handleGuestMode} />
  }

  // ── Onboarding ────────────────────────────────────────────────────────────
  if (screen === 'onboarding') {
    return <OnboardingScreen config={config} onComplete={handleOnboardingComplete} />
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: DS.bg }}>
      {/* Sync Error Banner */}
      {syncError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>❌ {syncError}</span>
          <button
            onClick={() => setSyncError(null)}
            className="text-white/80 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Syncing Indicator */}
      {isSyncing && (
        <div className="fixed bottom-20 right-4 z-40 bg-blue-500 text-white px-3 py-2 rounded-lg text-xs flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
          Sincronizando...
        </div>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && !syncError && (
        <div className="fixed bottom-20 left-4 z-40 text-xs text-slate-500">
          ✓ Sync: {new Date(lastSyncTime).toLocaleTimeString()}
        </div>
      )}

      <div className="max-w-md mx-auto pb-24 min-h-screen">
        {activeTab === 'inicio' && (
          <DashboardScreen
            snapshot={snapshot}
            expenses={expenses}
            pockets={pockets}
            spentByPocket={spentByPocket}
            config={config}
            activeMonth={activeMonth}
            realCurrentMonth={currentMonth}
            onChangeMonth={handleChangeMonth}
            onAdd={openAddSheet}
            isPrivacyMode={isPrivacyMode}
            onTogglePrivacy={handleTogglePrivacy}
            userId={userId || guestUserId}
            isAuthenticated={!!userId}
            onRequestLogin={() => setScreen('login')}
          />
        )}
        {activeTab === 'movimientos' && (
          <TransactionsScreen
            expenses={expenses}
            extraIncomes={extraIncomes}
            pockets={pockets}
            config={config}
            activeMonth={activeMonth}
            realCurrentMonth={currentMonth}
            onChangeMonth={handleChangeMonth}
            onAdd={openAddSheet}
            onEdit={openEditSheet}
            onDelete={handleDeleteExpense}
            onEditIncome={openEditIncomeSheet}
            onDeleteExtraIncome={handleDeleteExtraIncome}
            isPrivacyMode={isPrivacyMode}
          />
        )}
        {activeTab === 'presupuesto' && (
          <BudgetScreen
            snapshot={snapshot}
            pockets={pockets}
            spentByPocket={spentByPocket}
            expenseCountByPocket={expenseCountByPocket}
            config={config}
            activeMonth={activeMonth}
            realCurrentMonth={currentMonth}
            onChangeMonth={handleChangeMonth}
            onSetIncome={handleSetIncome}
            onSetSavings={handleSetSavings}
            onSetManualBudget={handleSetManualBudget}
            manualBudget={manualBudget}
            onEditPocket={handleEditPocket}
            onDeletePocket={handleDeletePocket}
            onAddPocket={handleAddPocket}
            isViewingPast={isViewingPast}
            isPrivacyMode={isPrivacyMode}
            cumulativeSavings={cumulativeSavings}
          />
        )}
        {activeTab === 'insights' && (
          <InsightsScreen
            snapshot={snapshot}
            expenses={expenses}
            pockets={pockets}
            spentByPocket={spentByPocket}
            monthlyHistory={monthlyHistory}
            config={config}
            isPrivacyMode={isPrivacyMode}
          />
        )}
        {activeTab === 'perfil' && (
          <ProfileScreen
            config={config}
            onClearData={handleClearData}
            isPrivacyMode={isPrivacyMode}
            onTogglePrivacy={handleTogglePrivacy}
            userEmail={userId ? 'User' : 'Guest'}
            onLogOut={handleLogOut}
            profileData={profileData}
            onSaveProfile={handleSaveProfile}
            userId={userId || guestUserId}
            isAuthenticated={!!userId}
            onRequestLogin={() => setScreen('login')}
          />
        )}
      </div>

      <BottomNavigation active={activeTab} onChange={setActiveTab} />

      <AddExpenseSheet
        isOpen={sheetOpen}
        editingExpense={editingExpense}
        editingIncome={editingIncome}
        pockets={pockets}
        conceptMap={conceptMap}
        learnedCategoryMap={learnedCategoryMap}
        setLearnedCategoryMap={setLearnedCategoryMap}
        config={config}
        defaultType={defaultSheetType ?? undefined}
        onSave={handleSaveExpense}
        onSaveIncome={handleAddExtraIncome}
        onUpdateIncome={handleUpdateExtraIncome}
        onSwitchToIncome={handleSwitchExpenseToIncome}
        onClose={closeSheet}
      />

      <OfflineIndicator />
    </div>
  )
}
// Trigger Vercel redeploy
