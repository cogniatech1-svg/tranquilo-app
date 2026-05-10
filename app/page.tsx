'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

import { AddExpenseSheet } from '../components/AddExpenseSheet'
import { BottomNavigation } from '../components/BottomNavigation'
import { OfflineIndicator } from '../components/OfflineIndicator'

import { DashboardScreen } from '../screens/DashboardScreen'
import { TransactionsScreen } from '../screens/TransactionsScreen'
import { BudgetScreen } from '../screens/BudgetScreen'
import { calculateFinancialSnapshot } from '../lib/financialEngine'
import { InsightsScreen } from '../screens/InsightsScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { RecoveryScreen } from '../screens/RecoveryScreen'

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
import { repairStoredData, DEFAULT_POCKETS, getEmptyPocketsStructure } from '../lib/dataMigration'
import { normalizePocketNames, capitalizeWords } from '../lib/migrations'
import { saveUserData, loadUserData, subscribeToUserData, saveProfileData } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'tranquilo_v1'
const ONBOARDING_FLAG = 'hasOnboarded'
// Bandera de restauración única: una vez puesta, el bloque de restauración
// de abril 2026 nunca vuelve a ejecutarse. Así los gastos nuevos del usuario
// nunca son sobreescritos por datos hardcodeados.
const APRIL_RESTORED_FLAG = 'april2026_v1_restored'

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
  // Guards against stale async initializeApp runs overwriting fresh state.
  const loadRunIdRef = useRef(0)

  const [hydrated, setHydrated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [screen, setScreen] = useState<'login' | 'recovery' | 'onboarding' | 'main'>('login')
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

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingIncome, setEditingIncome] = useState<ExtraIncome | null>(null)
  const [defaultSheetType, setDefaultSheetType] = useState<'income' | 'expense' | null>(null)

  const config: CountryConfig = COUNTRIES[countryCode]

  // ── HANDLE AUTH: Update state when auth changes ────────────────────────────
  const handleAuth = useCallback((event: AuthChangeEvent, user: AuthUser | null) => {
    // Guard: only update state if component is still mounted
    if (!isMountedRef.current) return

    console.log(
      `[AUTH] Auth event=${event}:`,
      user ? `✅ Logged in as ${user.email} (uid: ${user.uid})` : '❌ Not logged in'
    )

    // Store authenticated user state if present
    if (user) {
      setUserId(user.uid)
      setUserEmail(user.email)
    } else {
      setUserId(null)
      setUserEmail(null)

      // Generate guest ID for unauthenticated users
      let guest = localStorage.getItem('guest_id')
      const isValidUUID =
        guest && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guest)

      if (!guest || !isValidUUID) {
        guest = generateGuestUserId()
        localStorage.setItem('guest_id', guest)
      }
      setGuestUserId(guest)
    }

    setAuthLoading(false)

    // Single source of truth for auth-driven navigation.
    setScreen((prev) => {
      switch (event) {
        case 'SIGNED_OUT':
          return 'login'
        case 'SIGNED_IN': {
          if (!user) return 'login'
          const hasOnboarded = localStorage.getItem(`${ONBOARDING_FLAG}_${user.uid}`) === 'true'
          return hasOnboarded ? 'main' : 'onboarding'
        }
        case 'TOKEN_REFRESHED':
        case 'INITIAL_SESSION':
          // Non-destructive events must not force redirects.
          return prev
        default:
          return prev
      }
    })
  }, [])

  // ── AUTH STATE LISTENER ────────────────────────────────────────────────────
  // Subscribe to Supabase auth state changes
  useEffect(() => {
    isMountedRef.current = true

    const unsubscribe = onAuthStateChanged((event, user) => {
      console.log(
        `[onAuthStateChanged] event=${event}, user=`,
        user ? `${user.email} (${user.uid})` : 'null'
      )
      handleAuth(event, user)
    })

    return () => {
      isMountedRef.current = false
      unsubscribe()
    }
  }, [handleAuth])

  // ── HELPER: Obtener datos del mes activo (SIEMPRE usa este helper) ──────────
  const getActiveMonthData = useCallback(() => {
    if (monthlyHistory[activeMonth]) {
      return monthlyHistory[activeMonth]
    }

    // Si el mes no existe, heredar estructura de pockets del mes anterior
    // pero SIN presupuestos asignados (budget = 0)
    const availableMonths = Object.keys(monthlyHistory).sort()
    const previousMonth = availableMonths.reverse().find((m) => m < activeMonth)

    const previousData = previousMonth ? monthlyHistory[previousMonth] : null
    const defaultRecord = getDefaultMonthRecord()

    // Si hay mes anterior, heredar la estructura de pockets (nombres, íconos)
    // pero sin presupuestos asignados. Si no hay mes anterior, usar estructura vacía.
    const prevPockets = previousData?.pockets
    const pocketsToUse =
      prevPockets && prevPockets.length > 0
        ? prevPockets.map((p) => ({ ...p, budget: 0 }))
        : getEmptyPocketsStructure()

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
        const storageKey = currentUserId
          ? `${STORAGE_KEY}_${currentUserId}`
          : `${STORAGE_KEY}_${guestUserId}`

        // ── LOAD FROM SUPABASE (fuente de verdad) ─────────────────────────────
        let data: StoredData = {}
        const loadUserId = currentUserId || guestUserId
        if (loadUserId) {
          const supabaseData = await loadUserData(loadUserId)
          if (supabaseData) {
            data = supabaseData
            console.log('[initializeApp] ✅ Loaded from Supabase')
          } else {
            console.log('[initializeApp] ℹ️ No data in Supabase (new user)')
          }
        }

        // ── FALLBACK: Load from localStorage ────────────────────────────────
        // Use localStorage when Supabase has no monthly history.
        // NOTE: loadUserData() returns a StoredData object even for new users
        // (with empty monthlyHistory: {}), so Object.keys(data).length is NEVER 0
        // after a successful Supabase fetch. We must check monthlyHistory specifically.
        const hasSupabaseHistory =
          data.monthlyHistory && Object.keys(data.monthlyHistory).length > 0
        if (!hasSupabaseHistory) {
          const raw = localStorage.getItem(storageKey)
          if (raw) {
            try {
              data = JSON.parse(raw) as StoredData
              console.log('[initializeApp] ✅ Loaded from localStorage (Supabase had no history)')
            } catch {
              /* JSON inválido */
            }
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
        if (data.profile) setProfileData(data.profile)

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
              pockets: rec.pockets && rec.pockets.length > 0 ? rec.pockets : DEFAULT_POCKETS,
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

          // Si hay datos, preferir abril CON gastos, si no usar mes actual
          const availableMonths = Object.keys(history)
          if (availableMonths.length > 0) {
            // Preferir abril CON gastos
            let targetMonth = availableMonths.find(
              (m) => m === '2026-04' && history[m].expenses?.length > 0
            )
            // Si no hay abril con gastos, usar el mes actual
            if (!targetMonth) {
              targetMonth = getCurrentMonth()
            }
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
    }

    console.log('[LoadEffect] Deciding whether to call initializeApp:', {
      currentUserId: !!currentUserId,
      guestUserId: !!guestUserId,
      willInitialize: !!currentUserId || !!guestUserId,
    })

    if (currentUserId || guestUserId) {
      // Only initialize once. Subsequent auth state changes (token refresh)
      // should NOT reload data from Supabase, which would overwrite unsaved local changes.
      if (!dataLoadedRef.current) {
        initializeApp()
      } else {
        console.log('[LoadEffect] Skipping reload — data already loaded, preserving local state')
        setHydrated(true)
      }
    } else {
      setHydrated(true)
    }
  }, [userId, guestUserId])

  // ── Persist to localStorage + Supabase ───────────────────────────────────
  // SUPABASE DUAL STORAGE:
  // 1. Save to localStorage IMMEDIATELY (synchronous, always works)
  // 2. Save to Supabase in background (async, non-blocking) - works for authenticated and guest users
  // DEBOUNCE: Only save after 2 seconds without changes (prevents Supabase saturation)
  useEffect(() => {
    if (!hydrated || (!userId && !guestUserId)) return

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
      const dataToSave: StoredData = {
        // Datos del mes actual (para backward compatibility)
        monthlyIncome: activeData.income,
        monthlySavings: activeData.savings,
        expenses: activeData.expenses,
        extraIncomes: activeData.extraIncomes,
        pockets: activeData.pockets,
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
        console.log(`[AUTO-SAVE] ✅ Saved to localStorage for userId: ${saveUserId}`)
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }

      // Save to Supabase (primary storage for authenticated and guest users)
      if (saveUserId) {
        try {
          console.log(`[AUTO-SAVE] Saving to Supabase for userId: ${saveUserId}`)
          await saveUserData(saveUserId, dataToSave)
          console.log(`[AUTO-SAVE] ✅ Saved to Supabase successfully`)
        } catch (error) {
          console.error('[AUTO-SAVE] ❌ Error saving to Supabase:', error)
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
  ])

  // ── Guardar inmediatamente cuando el usuario sale de la app ───────────────
  // En mobile: cuando presiona Home, cambia de app, o bloquea la pantalla
  // Evita perder datos si la app se cierra antes del debounce de 2 segundos
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && dataLoadedRef.current) {
        const saveUserId = userId || guestUserId
        if (!saveUserId) return

        const onboardingDone = localStorage.getItem(`${ONBOARDING_FLAG}_${saveUserId}`) === 'true'
        if (!onboardingDone || Object.keys(monthlyHistory).length === 0) return

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
        }

        const storageKey = `${STORAGE_KEY}_${saveUserId}`
        try {
          localStorage.setItem(storageKey, JSON.stringify(dataToSave))
        } catch {
          /* ignore */
        }

        try {
          console.log('[VISIBILITY] App ocultada, guardando en Supabase inmediatamente...')
          await saveUserData(saveUserId, dataToSave)
          console.log('[VISIBILITY] ✅ Guardado exitoso antes de salir')
        } catch (e) {
          console.error('[VISIBILITY] ❌ Error guardando al salir:', e)
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
  ])

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
      const dataToSave: StoredData = {
        monthlyIncome: activeData.income,
        monthlySavings: activeData.savings,
        expenses: activeData.expenses,
        extraIncomes: activeData.extraIncomes,
        pockets: activeData.pockets,
        monthlyHistory: updatedHistory,
        conceptMap,
        learnedCategoryMap,
        currentMonth,
        countryCode,
        isPrivacyMode,
      }

      const storageKey = `${STORAGE_KEY}_${saveUserId}`
      localStorage.setItem(storageKey, JSON.stringify(dataToSave))

      try {
        await saveUserData(saveUserId, dataToSave)
        console.log('[SAVE-NOW] ✅ Guardado inmediato exitoso para userId:', saveUserId)
      } catch (e) {
        console.error('[SAVE-NOW] ❌ Error en guardado inmediato:', e)
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

  const extraIncomeTotal = useMemo(
    () => extraIncomes.reduce((s: number, e: ExtraIncome) => s + e.amount, 0),
    [extraIncomes]
  )

  // totalIncome = income (base) + extraIncomes (adicionales)
  const totalIncome = income + extraIncomeTotal

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
      }),
    [expenses, extraIncomes, pockets, income, savings, activeMonth, manualBudget]
  )

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
      const budget_available = snapshot.budget

      // VALIDACIÓN: sum(pockets) <= presupuesto
      const otherPockets = monthData.pockets.filter((p) => p.id !== id)
      const sumWithoutThis = otherPockets.reduce((s, p) => s + p.budget, 0)
      const totalIfEdited = sumWithoutThis + budget

      if (totalIfEdited > budget_available) {
        alert(
          `❌ No puedes asignar más de lo disponible.\n\nPresupuesto: $${budget_available}\nAsignado (sin este bolsillo): $${sumWithoutThis}\nIntentando asignar: $${budget}\nTotal resultaría en: $${totalIfEdited}`
        )
        return false
      }

      setMonthlyHistory((prev) => ({
        ...prev,
        [activeMonth]: {
          ...monthData,
          pockets: monthData.pockets.map((p) =>
            p.id === id ? { ...p, name: capitalizeWords(name), budget, icon } : p
          ),
        },
      }))
      return true
    },
    [activeMonth, getActiveMonthData, snapshot.budget]
  )

  const handleDeletePocket = useCallback(
    (id: string) => {
      const monthData = getActiveMonthData()
      setMonthlyHistory((prev) => ({
        ...prev,
        [activeMonth]: {
          ...monthData,
          pockets: monthData.pockets.filter((p) => p.id !== id),
          expenses: monthData.expenses.filter((e) => e.pocketId !== id),
        },
      }))
    },
    [activeMonth, getActiveMonthData]
  )

  const handleAddPocket = useCallback(
    (name: string, budget: number, icon?: string) => {
      const budget_available = snapshot.budget

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

        // 2. VALIDACIÓN: sum(pockets) <= presupuesto
        const currentTotal = monthData.pockets.reduce((s, p) => s + p.budget, 0)
        const totalIfAdded = currentTotal + budget

        // TEMP: deshabilitar validación de presupuesto para permitir crear bolsillos
        // if (totalIfAdded > budget_available) {
        //   return prev
        // }

        // 3. Agregar nuevo pocket a monthlyHistory[activeMonth].pockets
        console.log('[ADD POCKET] new pockets', [
          ...monthData.pockets,
          { id: 'test', name, budget, icon },
        ])
        return {
          ...prev,
          [activeMonth]: {
            ...monthData,
            pockets: [
              ...monthData.pockets,
              { id: createEntityId(), name: capitalizeWords(name), budget, icon },
            ],
          },
        }
      })
    },
    [activeMonth, snapshot.budget]
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

  // ── CAMBIO DE MES: copiar bolsillos del mes anterior si no existen ──────────
  const handleChangeMonth = useCallback(
    (newMonth: string) => {
      setActiveMonth(newMonth)

      // Si el nuevo mes ya existe en monthlyHistory, no hacer nada
      if (monthlyHistory[newMonth]) {
        return
      }

      // Si no existe, encontrar el mes anterior/más cercano con bolsillos
      const sortedMonths = Object.keys(monthlyHistory).sort().reverse()
      const previousMonth = sortedMonths.find((m) => m < newMonth)

      if (previousMonth && monthlyHistory[previousMonth]) {
        // Copiar los bolsillos del mes anterior al nuevo mes (pero con presupuesto = 0)
        const previousPockets = monthlyHistory[previousMonth].pockets ?? []

        setMonthlyHistory((prev) => ({
          ...prev,
          [newMonth]: {
            income: 0,
            savings: 0,
            expenses: [],
            extraIncomes: [],
            pockets:
              previousPockets.length > 0
                ? previousPockets.map((p) => ({ ...p, budget: 0 })) // Copiar nombre e ícono, pero presupuesto = 0
                : DEFAULT_POCKETS.map((p) => ({ ...p, budget: 0 })),
          },
        }))

        console.log(
          `[handleChangeMonth] Creado ${newMonth} con bolsillos del ${previousMonth} (presupuestos = 0)`
        )
      } else {
        // Si no hay mes anterior, usar bolsillos por defecto con presupuesto = 0
        setMonthlyHistory((prev) => ({
          ...prev,
          [newMonth]: {
            income: 0,
            savings: 0,
            expenses: [],
            extraIncomes: [],
            pockets: DEFAULT_POCKETS.map((p) => ({ ...p, budget: 0 })),
          },
        }))

        console.log(
          `[handleChangeMonth] Creado ${newMonth} con bolsillos por defecto (presupuestos = 0)`
        )
      }
    },
    [monthlyHistory]
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
      setProfileData(newProfile)
      const saveUserId = userId || guestUserId
      if (!saveUserId) return
      // Solo guarda profile_data — no toca gastos ni movimientos
      try {
        await saveProfileData(saveUserId, newProfile)
      } catch (e) {
        console.error('[PROFILE] Error saving profile to Supabase:', e)
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
    async (code: CountryCode, budget: number, incomeValue: number, aprilData?: MonthRecord) => {
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

      // Build monthlyHistory with April (from CSV if provided) and current month
      const history: Record<string, MonthRecord> = {}

      // Add April with CSV data if provided, otherwise empty
      if (aprilData) {
        history['2026-04'] = {
          income: 0, // April is historical, no income tracking
          savings: 0,
          expenses: aprilData.expenses,
          extraIncomes: aprilData.extraIncomes,
          pockets: aprilData.pockets,
          manualBudget: undefined,
        }
      }

      // Add current month
      history[thisMonth] = {
        income: incomeValue,
        savings,
        expenses: [],
        extraIncomes: [],
        pockets: DEFAULT_POCKETS,
        manualBudget: undefined,
      }

      setMonthlyHistory(history)
      // Mark data as loaded so auto-save will work and avoid race conditions
      dataLoadedRef.current = true

      // Build and save complete user data to Supabase
      const initialData: StoredData = {
        monthlyHistory: history,
        pockets: DEFAULT_POCKETS,
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

      // Prefer April if it has data, otherwise current month
      const targetMonth = aprilData && aprilData.expenses.length > 0 ? '2026-04' : thisMonth
      setActiveMonth(targetMonth)

      setScreen('main')
    },
    [userId, guestUserId]
  )

  // ── Show recovery screen for data restoration ──────────────────────────────
  if (screen === 'recovery' && userId) {
    return (
      <RecoveryScreen
        userId={userId}
        onRestored={() => {
          // After restoration, show onboarding or main
          const hasOnboarded = localStorage.getItem(`hasOnboarded_${userId}`) === 'true'
          setScreen(hasOnboarded ? 'main' : 'onboarding')
        }}
      />
    )
  }

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
    return (
      <LoginScreen
        authenticatedEmail={userEmail || undefined}
        onLoginSuccess={() => {}}
        onGuestMode={handleGuestMode}
        onLogOut={() => {}}
      />
    )
  }

  // ── Onboarding ────────────────────────────────────────────────────────────
  if (screen === 'onboarding') {
    return <OnboardingScreen config={config} onComplete={handleOnboardingComplete} />
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: DS.bg }}>
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
