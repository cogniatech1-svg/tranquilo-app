'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

import { AddExpenseSheet } from '../components/AddExpenseSheet'
import { BottomNavigation } from '../components/BottomNavigation'

import { DashboardScreen }     from '../screens/DashboardScreen'
import { TransactionsScreen }  from '../screens/TransactionsScreen'
import { BudgetScreen }        from '../screens/BudgetScreen'
import { calculateFinancialSnapshot } from '../lib/financialEngine'
import { InsightsScreen }      from '../screens/InsightsScreen'
import { ProfileScreen }       from '../screens/ProfileScreen'
import { OnboardingScreen }    from '../screens/OnboardingScreen'
import { LoginScreen }         from '../screens/LoginScreen'
import { RecoveryScreen }      from '../screens/RecoveryScreen'

import { COUNTRIES, DS } from '../lib/config'
import type { CountryCode, CountryConfig } from '../lib/config'
import type { Expense, ExtraIncome, ExpensePayload, Pocket, StoredData, TabId, MonthRecord } from '../lib/types'
import {
  getCurrentMonth,
  normalizePockets,
  normalizeKey,
  extractConcept,
  parseAmount,
  getDefaultMonthRecord,
} from '../lib/utils'
import { loadFromFirestore, saveToFirestore, subscribeToFirestore } from '../lib/firestore'
import { subscribeToAuthState, logOut as firebaseLogOut, migrateLocalDataToUser } from '../lib/auth'
import { normalizePocketNames } from '../lib/migrations'
import { DEFAULT_POCKETS } from '../lib/constants'

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
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  // Track if component is mounted to avoid state updates on unmounted components
  const isMountedRef = useRef(true)

  const [hydrated,      setHydrated]      = useState(false)
  const [userId,        setUserId]        = useState<string | null>(null)
  const [isGuest,       setIsGuest]       = useState(false)
  const [authLoading,   setAuthLoading]   = useState(true)
  const [screen,        setScreen]        = useState<'login' | 'recovery' | 'onboarding' | 'main'>('login')
  const [activeTab,     setActiveTab]     = useState<TabId>('inicio')

  const [countryCode,   setCountryCode]   = useState<CountryCode>('CO')
  // ── ÚNICA FUENTE DE VERDAD: monthlyHistory ────────────────────────────────
  // Contiene TODOS los datos financieros por mes
  // Estructura: monthlyHistory[month] = { income, savings, expenses, extraIncomes, pockets }
  const [monthlyHistory, setMonthlyHistory] = useState<Record<string, MonthRecord>>({})

  const [conceptMap,    setConceptMap]    = useState<Record<string, string>>({})
  const [currentMonth,  setCurrentMonth]  = useState<string>(getCurrentMonth)

  const [activeMonth,          setActiveMonth]           = useState<string>(getCurrentMonth)
  const [isPrivacyMode,        setIsPrivacyMode]         = useState(false)
  const [learnedCategoryMap,   setLearnedCategoryMap]    = useState<Record<string, string>>({})

  const [sheetOpen,        setSheetOpen]        = useState(false)
  const [editingExpense,   setEditingExpense]   = useState<Expense | null>(null)
  const [editingIncome,    setEditingIncome]    = useState<ExtraIncome | null>(null)
  const [defaultSheetType, setDefaultSheetType] = useState<'income' | 'expense' | null>(null)

  const config: CountryConfig = COUNTRIES[countryCode]

  // ── HANDLE AUTH: Separate async logic from Firebase callback ────────────────
  // This function is async but Firebase callback stays synchronous
  const handleAuth = useCallback(async (user: any) => {
    // Guard: only update state if component is still mounted
    if (!isMountedRef.current) return

    console.log('[AUTH] Auth state changed:', user ? `✅ Logged in as ${user.email} (uid: ${user.uid})` : '❌ Not logged in')

    if (user) {
      console.log('[AUTH] Setting userId:', user.uid)

      // ✅ MIGRATION: This is the CORRECT moment to migrate
      // Firebase has resolved the user UID, now migrate legacy data
      await migrateLocalDataToUser(user.uid)

      // Guard: check if still mounted after async operation
      if (!isMountedRef.current) return

      // Update state with userId and clear loading flag
      setUserId(user.uid)
      setAuthLoading(false)

      // Check if user has data OR if they need recovery
      const userKey = `${STORAGE_KEY}_${user.uid}`
      const userData = localStorage.getItem(userKey)
      let hasData = false

      if (userData) {
        try {
          const parsed = JSON.parse(userData)
          const months = Object.keys(parsed.monthlyHistory || {})
          hasData = months.length > 0
        } catch {
          // Invalid JSON
        }
      }

      // User is authenticated - check if they've completed onboarding
      const hasOnboarded = localStorage.getItem(`${ONBOARDING_FLAG}_${user.uid}`) === 'true'

      // If no data, show recovery screen (for CSV restoration)
      if (!hasData && !hasOnboarded) {
        console.log('[auth] No data detected, showing recovery screen')
        setScreen('recovery')
      } else if (hasOnboarded) {
        setScreen('main')
      } else {
        setScreen('onboarding')
      }
    } else {
      // User is not authenticated
      setUserId(null)
      setAuthLoading(false)
      setScreen('login')
    }
  }, [])

  // ── AUTH STATE LISTENER ────────────────────────────────────────────────────
  // Subscribe to Firebase auth state changes - callback is synchronous
  // All async logic is in handleAuth function
  useEffect(() => {
    isMountedRef.current = true

    const unsubscribe = subscribeToAuthState((user) => {
      console.log('[subscribeToAuthState] Callback received user:', user ? `${user.email} (${user.uid})` : 'null')
      // Synchronous callback: just call handleAuth, don't await
      // This keeps the callback signature clean for Firebase
      handleAuth(user)
    })

    return () => {
      isMountedRef.current = false
      unsubscribe()
    }
  }, [handleAuth])

  // ── HELPER: Obtener datos del mes activo (SIEMPRE usa este helper) ──────────
  const getActiveMonthData = useCallback(() => {
    return monthlyHistory[activeMonth] ?? getDefaultMonthRecord()
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

    const initializeApp = async () => {
      // ⚠️ CRITICAL: Guard against undefined userId
      if (!currentUserId && !isGuest) {
        console.warn('[initializeApp] Exiting early: currentUserId not available yet')
        return
      }

      try {
        const storageKey = isGuest
          ? STORAGE_KEY
          : `${STORAGE_KEY}_${currentUserId}`;

        console.log('[initializeApp] 🚀 Starting initialization')
        console.log('[initializeApp] isGuest:', isGuest, '| userId:', currentUserId, '| storageKey:', storageKey)

        let raw = localStorage.getItem(storageKey);
        console.log('[initializeApp] localStorage has data:', !!raw, '| size:', raw?.length ?? 0, 'bytes')

        const aprilRestoredKey = isGuest ? APRIL_RESTORED_FLAG : `${APRIL_RESTORED_FLAG}_${currentUserId!}`
        const aprilRestored = localStorage.getItem(aprilRestoredKey) === 'true'

        // Parsear datos existentes (o partir de objeto vacío)
        let data: StoredData = {}
        if (raw) {
          try { data = JSON.parse(raw) as StoredData } catch { /* JSON inválido */ }
        }

        // ── CARGA DE ESTADO REACT ──────────────────────────────────────────────
        // Re-leer la bandera DESPUÉS de posible restauración
        const hasOnboarded = localStorage.getItem(`${ONBOARDING_FLAG}${isGuest ? '' : `_${currentUserId}`}`) === 'true'
        const country      = (data.countryCode as CountryCode) ?? 'CO'

        console.log('[initializeApp] State loading:', {
          hasOnboarded,
          monthsLoaded: data.monthlyHistory ? Object.keys(data.monthlyHistory) : [],
          expensesInApril: data.monthlyHistory?.['2026-04']?.expenses?.length ?? 0,
        })

        setCountryCode(country)
        setConceptMap(data.conceptMap ?? {})
        setLearnedCategoryMap(data.learnedCategoryMap ?? {})
        if (data.isPrivacyMode) setIsPrivacyMode(true)

        if (data.monthlyHistory && Object.keys(data.monthlyHistory).length > 0) {
          // Normalizar pocketNames (decodificar encoding issues y capitalizar)
          const normalizedData = normalizePocketNames(data)

          const history: Record<string, MonthRecord> = {}
          for (const [month, record] of Object.entries(normalizedData.monthlyHistory)) {
            const rec = record as any
            history[month] = {
              income:       rec.income       ?? 0,
              savings:      rec.savings      ?? 0,
              expenses:     rec.expenses     ?? [],
              extraIncomes: rec.extraIncomes ?? [],
              pockets:      rec.pockets      ?? DEFAULT_POCKETS,
              manualBudget: rec.manualBudget,
            }
          }
          console.log('[initializeApp] Setting monthlyHistory with', Object.keys(history).length, 'months')
          setMonthlyHistory(history)

          // Si hay datos, ir al primer mes disponible (puede estar en formato DD/MM/Y o YYYY-MM)
          const availableMonths = Object.keys(history)
          if (availableMonths.length > 0) {
            // Preferir abril si existe (en cualquier formato)
            let targetMonth = availableMonths.find(m => m.includes('04/2') || m === '2026-04')
            // Si no hay abril, usar el primer mes
            if (!targetMonth) {
              targetMonth = availableMonths[0]
            }
            console.log('[initializeApp] Setting activeMonth to:', targetMonth)
            setActiveMonth(targetMonth)
            setCurrentMonth(targetMonth)
          }

          if (hasOnboarded) setScreen('main')
        } else {
          if (hasOnboarded) setScreen('main')
        }

        // ── CARGAR DE FIRESTORE EN BACKGROUND (sin bloquear UI) ────────────────
        // SOLO si NO es guest mode
        // Merge con localStorage si hay datos en Firestore
        // PHASE 2: Pass userId to loadFromFirestore
        if (!isGuest && currentUserId) {
          console.log('[initializeApp] 📱 Loading from Firestore for userId:', currentUserId)
          try {
            const firestoreData = await loadFromFirestore(currentUserId)
            console.log('[initializeApp] Firestore response:', firestoreData ? '✅ Got data' : '❌ No data', {
              hasMonthlyHistory: !!firestoreData?.monthlyHistory,
              months: firestoreData?.monthlyHistory ? Object.keys(firestoreData.monthlyHistory).length : 0,
            })

            if (firestoreData && firestoreData.monthlyHistory && Object.keys(firestoreData.monthlyHistory).length > 0) {
              console.log('✅ Firestore data loaded and merged with localStorage')
              // Actualizar React state con datos de Firestore
              const firestoreHistory: Record<string, MonthRecord> = {}
              for (const [month, record] of Object.entries(firestoreData.monthlyHistory)) {
                const rec = record as any
                firestoreHistory[month] = {
                  income:       rec.income       ?? 0,
                  savings:      rec.savings      ?? 0,
                  expenses:     rec.expenses     ?? [],
                  extraIncomes: rec.extraIncomes ?? [],
                  pockets:      rec.pockets      ?? DEFAULT_POCKETS,
                  manualBudget: rec.manualBudget,
                }
              }
              console.log('[initializeApp] ✅ Updating React state with Firestore data:', Object.keys(firestoreHistory).length, 'months')
              setMonthlyHistory(firestoreHistory)
              if (firestoreData.conceptMap) setConceptMap(firestoreData.conceptMap)
              if (firestoreData.learnedCategoryMap) setLearnedCategoryMap(firestoreData.learnedCategoryMap)
              if (firestoreData.countryCode) setCountryCode(firestoreData.countryCode as CountryCode)
              if (firestoreData.currentMonth) setCurrentMonth(firestoreData.currentMonth)
              if (firestoreData.isPrivacyMode !== undefined) setIsPrivacyMode(firestoreData.isPrivacyMode)
            } else {
              console.log('[initializeApp] ℹ️ Firestore has no data or is empty')
            }
          } catch (error) {
            console.error('❌ Error loading from Firestore:', error)
            // Esto es OK - localStorage es el fallback
          }
        } else {
          console.log('[initializeApp] ℹ️ Skipping Firestore (isGuest:', isGuest, ', userId:', currentUserId, ')')
        }
      } catch (e) {
        // ignorar JSON malformado
        console.warn('[initializeApp] Error during initialization:', e)
      }
      console.log('[initializeApp] Hydration complete, currentUserId:', currentUserId)
      setHydrated(true)
    }

    console.log('[LoadEffect] Deciding whether to call initializeApp:', {
      currentUserId: !!currentUserId,
      isGuest,
      willInitialize: !!currentUserId || isGuest
    })

    if (currentUserId || isGuest) {
      initializeApp()
    } else {
      console.log('[LoadEffect] No userId and not guest, waiting for Firebase...')
      setHydrated(true)
    }
  }, [userId, isGuest])

  // ── Persist to localStorage + Firestore ───────────────────────────────────
  // FIREBASE DUAL STORAGE:
  // 1. Save to localStorage IMMEDIATELY (synchronous, always works)
  // 2. Save to Firestore in background (async, non-blocking) - SKIP if guest mode
  // PHASE 2: Only save if user is authenticated
  // DEBOUNCE: Only save after 2 seconds without changes (prevents Firestore saturation)
  useEffect(() => {
    if (!hydrated || !userId) return

    console.log('[AUTO-SAVE] Dependencies changed, restarting debounce timer')

    // Capture userId to ensure type safety in async operations
    const currentUserId = userId

    // Set up debounce timer - wait 2 seconds before saving
    const timer = setTimeout(async () => {
      console.log('[AUTO-SAVE] 🔔 2-second debounce fired, executing save')
      const activeData = getActiveMonthData()
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

      if (isGuest) {
        // Guest mode: only save to localStorage, not Firestore
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
        } catch (error) {
          console.error('Error saving to localStorage:', error)
        }
      } else {
        // Authenticated mode: save to both localStorage and Firestore
        // saveToFirestore handles both localStorage and Firestore:
        // - Saves to localStorage first (synchronously)
        // - Then saves to Firestore (async, non-blocking)
        // PHASE 2: Pass userId to saveToFirestore
        saveToFirestore(currentUserId, dataToSave).catch((error) => {
          console.error('Error in saveToFirestore:', error)
          // Data is safe in localStorage even if Firestore fails
        })
      }
    }, 2000)

    // Clean up timer on unmount or when dependencies change
    return () => clearTimeout(timer)
  }, [hydrated, userId, isGuest, monthlyHistory, conceptMap, learnedCategoryMap, currentMonth, countryCode, isPrivacyMode, getActiveMonthData])

  // ── Real-time sync from Firestore ──────────────────────────────────────────
  // Subscribe to Firestore updates and merge with local state
  // PHASE 2: Only subscribe if user is authenticated (NOT guest mode)
  useEffect(() => {
    console.log('[FS-SYNC] Checking subscription conditions:', { hydrated, userId, isGuest })
    if (!hydrated || !userId || isGuest) {
      console.log('[FS-SYNC] ℹ️ Skipping subscription (hydrated:', hydrated, ', userId:', userId, ', isGuest:', isGuest, ')')
      return
    }

    // Capture userId to ensure type safety in subscription
    const currentUserId = userId

    let unsubscribe: (() => void) | null = null

    try {
      console.log('[FS-SYNC] 🔄 Setting up real-time subscription for userId:', currentUserId)
      // PHASE 2: Pass userId to subscribeToFirestore
      unsubscribe = subscribeToFirestore(currentUserId, (firestoreData: StoredData) => {
        console.log('[FS-SYNC] 📨 Firestore update received:', {
          hasData: !!firestoreData,
          monthsCount: firestoreData?.monthlyHistory ? Object.keys(firestoreData.monthlyHistory).length : 0,
        })
        // Firestore data was merged with localStorage in subscribeToFirestore
        // Update React state with the merged data
        if (firestoreData.monthlyHistory) {
          const history: Record<string, MonthRecord> = {}
          for (const [month, record] of Object.entries(firestoreData.monthlyHistory)) {
            const rec = record as any
            history[month] = {
              income:       rec.income       ?? 0,
              savings:      rec.savings      ?? 0,
              expenses:     rec.expenses     ?? [],
              extraIncomes: rec.extraIncomes ?? [],
              pockets:      rec.pockets      ?? DEFAULT_POCKETS,
              manualBudget: rec.manualBudget,
            }
          }
          setMonthlyHistory(history)
        }
        if (firestoreData.conceptMap) setConceptMap(firestoreData.conceptMap)
        if (firestoreData.learnedCategoryMap) setLearnedCategoryMap(firestoreData.learnedCategoryMap)
        if (firestoreData.countryCode) setCountryCode(firestoreData.countryCode as CountryCode)
        if (firestoreData.currentMonth) setCurrentMonth(firestoreData.currentMonth)
        if (firestoreData.isPrivacyMode !== undefined) setIsPrivacyMode(firestoreData.isPrivacyMode)
      })
    } catch (error) {
      console.warn('Could not subscribe to Firestore (offline?):', error)
      // This is OK - app continues to work with localStorage
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [hydrated, userId, isGuest])


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
    const acc: Record<string, number> = Object.fromEntries(pockets.map(p => [p.id, 0]))
    for (const e of expenses) if (e.pocketId in acc) acc[e.pocketId] += e.amount
    return acc
  }, [expenses, pockets])

  const extraIncomeTotal = useMemo(
    () => extraIncomes.reduce((s: number, e: ExtraIncome) => s + e.amount, 0),
    [extraIncomes],
  )

  // totalIncome = income (base) + extraIncomes (adicionales)
  const totalIncome = income + extraIncomeTotal

  // ════════════════════════════════════════════════════════════════════════════
  // FINANCIALENGINE: Calcula snapshot a partir de monthlyHistory[activeMonth]
  // ════════════════════════════════════════════════════════════════════════════
  const snapshot = useMemo(
    () => calculateFinancialSnapshot({
      expenses,
      extraIncomes,
      pockets,
      monthlyIncome: income,
      monthlySavings: savings,
      currentMonth: activeMonth,
      manualBudget,
    }),
    [expenses, extraIncomes, pockets, income, savings, activeMonth, manualBudget],
  )

  // ── Sheet handlers ─────────────────────────────────────────────────────────
  const openAddSheet        = useCallback(() => { setEditingExpense(null); setEditingIncome(null); setDefaultSheetType(null); setSheetOpen(true) }, [])
  const openEditSheet       = useCallback((e: Expense) => { setEditingExpense(e); setEditingIncome(null); setDefaultSheetType(null); setSheetOpen(true) }, [])
  const openEditIncomeSheet = useCallback((i: ExtraIncome) => { setEditingIncome(i); setEditingExpense(null); setDefaultSheetType('income'); setSheetOpen(true) }, [])
  const closeSheet          = useCallback(() => { setSheetOpen(false); setEditingExpense(null); setEditingIncome(null); setDefaultSheetType(null) }, [])

  // ── Data handlers ──────────────────────────────────────────────────────────
  const handleSaveExpense = useCallback((payload: ExpensePayload) => {
    const { id, ...rest } = payload

    setMonthlyHistory(prev => {
      const monthData = prev[activeMonth] ?? getDefaultMonthRecord()
      const newExpenses = id
        ? monthData.expenses.map(e => e.id === id ? { ...e, ...rest } : e)
        : [...monthData.expenses, { id: Date.now().toString(), ...rest }]

      return {
        ...prev,
        [activeMonth]: {
          ...monthData,
          expenses: newExpenses,
        },
      }
    })

    const key = normalizeKey(rest.concept)
    if (key && key !== 'gasto') {
      setConceptMap(prev => ({ ...prev, [key]: rest.pocketId }))
    }
  }, [activeMonth])

  const handleDeleteExpense = useCallback((id: string) => {
    setMonthlyHistory(prev => {
      const monthData = prev[activeMonth] ?? getDefaultMonthRecord()
      return {
        ...prev,
        [activeMonth]: {
          ...monthData,
          expenses: monthData.expenses.filter(e => e.id !== id),
        },
      }
    })
  }, [activeMonth])

  const handleSwitchExpenseToIncome = useCallback((expenseId: string, amount: number, note: string, date: string) => {
    setMonthlyHistory(prev => {
      const monthData = prev[activeMonth] ?? getDefaultMonthRecord()
      return {
        ...prev,
        [activeMonth]: {
          ...monthData,
          expenses: monthData.expenses.filter(e => e.id !== expenseId),
          extraIncomes: [...monthData.extraIncomes, {
            id: Date.now().toString(),
            amount,
            concept: note,
            date,
            category: 'extra' as const,
          }],
        },
      }
    })
  }, [activeMonth])

  const handleEditPocket = useCallback((id: string, name: string, budget: number, icon?: string) => {
    const monthData = getActiveMonthData()
    const budget_available = snapshot.budget

    // VALIDACIÓN: sum(pockets) <= presupuesto
    const otherPockets = monthData.pockets.filter(p => p.id !== id)
    const sumWithoutThis = otherPockets.reduce((s, p) => s + p.budget, 0)
    const totalIfEdited = sumWithoutThis + budget

    if (totalIfEdited > budget_available) {
      alert(`❌ No puedes asignar más de lo disponible.\n\nPresupuesto: $${budget_available}\nAsignado (sin este bolsillo): $${sumWithoutThis}\nIntentando asignar: $${budget}\nTotal resultaría en: $${totalIfEdited}`)
      return false
    }

    setMonthlyHistory(prev => ({
      ...prev,
      [activeMonth]: {
        ...monthData,
        pockets: monthData.pockets.map(p => p.id === id ? { ...p, name, budget, icon } : p),
      },
    }))
    return true
  }, [activeMonth, getActiveMonthData, snapshot.budget])

  const handleDeletePocket = useCallback((id: string) => {
    const monthData = getActiveMonthData()
    setMonthlyHistory(prev => ({
      ...prev,
      [activeMonth]: {
        ...monthData,
        pockets: monthData.pockets.filter(p => p.id !== id),
        expenses: monthData.expenses.filter(e => e.pocketId !== id),
      },
    }))
  }, [activeMonth, getActiveMonthData])

  const handleAddPocket = useCallback((name: string, budget: number, icon?: string) => {
    console.log("[ADD POCKET] called", { name, budget, activeMonth })
    const budget_available = snapshot.budget

    setMonthlyHistory(prev => {
      console.log("[ADD POCKET] prev state", prev)
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
      console.log("[ADD POCKET] new pockets", [
        ...monthData.pockets,
        { id: "test", name, budget, icon }
      ])
      return {
        ...prev,
        [activeMonth]: {
          ...monthData,
          pockets: [...monthData.pockets, { id: Date.now().toString(), name, budget, icon }],
        },
      }
    })
    console.log("[ADD POCKET] setMonthlyHistory executed")
  }, [activeMonth, snapshot.budget])

  const handleAddExtraIncome = useCallback((amount: number, note: string) => {
    const monthData = getActiveMonthData()
    setMonthlyHistory(prev => ({
      ...prev,
      [activeMonth]: {
        ...monthData,
        extraIncomes: [...monthData.extraIncomes, {
          id: Date.now().toString(),
          amount,
          concept: note,
          date: new Date().toISOString(),
          category: 'extra' as const,
        }],
      },
    }))
  }, [activeMonth, getActiveMonthData])

  const handleDeleteExtraIncome = useCallback((id: string) => {
    const monthData = getActiveMonthData()
    setMonthlyHistory(prev => ({
      ...prev,
      [activeMonth]: {
        ...monthData,
        extraIncomes: monthData.extraIncomes.filter(e => e.id !== id),
      },
    }))
  }, [activeMonth, getActiveMonthData])

  const handleUpdateExtraIncome = useCallback((id: string, amount: number, note: string, date: string) => {
    const monthData = getActiveMonthData()
    setMonthlyHistory(prev => ({
      ...prev,
      [activeMonth]: {
        ...monthData,
        extraIncomes: monthData.extraIncomes.map(e => e.id === id ? { ...e, amount, concept: note, date } : e),
      },
    }))
  }, [activeMonth, getActiveMonthData])

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

  const handleSetIncome = useCallback((newIncome: number) => {
    const monthData = getActiveMonthData()
    setMonthlyHistory(prev => ({
      ...prev,
      [activeMonth]: {
        ...monthData,
        income: newIncome,
      },
    }))
  }, [activeMonth, getActiveMonthData])

  const handleSetSavings = useCallback((newSavings: number) => {
    const monthData = getActiveMonthData()
    setMonthlyHistory(prev => ({
      ...prev,
      [activeMonth]: {
        ...monthData,
        savings: newSavings,
      },
    }))
  }, [activeMonth, getActiveMonthData])

  const handleSetManualBudget = useCallback((newBudget: number) => {
    const monthData = getActiveMonthData()
    setMonthlyHistory(prev => ({
      ...prev,
      [activeMonth]: {
        ...monthData,
        manualBudget: newBudget > 0 ? newBudget : undefined,
      },
    }))
  }, [activeMonth, getActiveMonthData])

  const handleTogglePrivacy = useCallback(() => {
    setIsPrivacyMode(prev => !prev)
  }, [])

  const handleLogOut = useCallback(async () => {
    try {
      await firebaseLogOut()
      // Auth state listener will handle clearing state and showing login screen
    } catch (error) {
      console.error('Error logging out:', error)
      alert('Error logging out. Please try again.')
    }
  }, [])

  const handleGuestMode = useCallback(() => {
    // Check if component is still mounted before updating state
    if (!isMountedRef.current) return

    // Enable guest mode: use localStorage without Firestore sync
    setIsGuest(true)
    setUserId('guest')
    setAuthLoading(false)

    // Check if user has onboarded before
    const hasOnboarded = localStorage.getItem(ONBOARDING_FLAG) === 'true'
    if (hasOnboarded) {
      setScreen('main')
    } else {
      setScreen('onboarding')
    }
    setHydrated(true)
  }, [])

  const handleOnboardingComplete = useCallback((code: CountryCode, budget: number, incomeValue: number) => {
    if (!userId) return
    // Mark onboarding as complete for this user
    localStorage.setItem(`${ONBOARDING_FLAG}_${userId}`, 'true')

    setCountryCode(code)

    const thisMonth = getCurrentMonth()
    setCurrentMonth(thisMonth)
    setActiveMonth(thisMonth)

    // Calcular savings desde budget: savings = income - budget
    let savings = 0
    if (incomeValue > 0 && budget > 0) {
      savings = Math.max(0, incomeValue - budget)
    }

    // Crear registro inicial para el mes
    setMonthlyHistory({
      [thisMonth]: {
        income: incomeValue,
        savings,
        expenses: [],
        extraIncomes: [],
        pockets: DEFAULT_POCKETS,
      },
    })

    setScreen('main')
  }, [userId])

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

  // ── Show login screen if not authenticated ────────────────────────────────
  if (screen === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          // Auth state listener will handle setting screen to 'onboarding' or 'main'
        }}
        onGuestMode={handleGuestMode}
      />
    )
  }

  // ── Wait for hydration ─────────────────────────────────────────────────────
  if (!hydrated) return (
    <div style={{
      background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-10%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-5%',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(103,232,249,.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
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
      }}>
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
      <div style={{
        width: '100%',
        maxWidth: '380px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Header skeleton */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          {/* Avatar + Name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              animation: 'pulse 2s infinite',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                height: '16px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '8px',
                marginBottom: '8px',
                animation: 'pulse 2s infinite',
              }} />
              <div style={{
                height: '12px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '6px',
                width: '70%',
                animation: 'pulse 2s infinite',
              }} />
            </div>
          </div>

          {/* Badge skeleton */}
          <div style={{
            height: '28px',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '12px',
            width: '140px',
            marginBottom: '16px',
            animation: 'pulse 2s infinite',
          }} />

          {/* Health indicator skeleton */}
          <div style={{
            height: '40px',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '12px',
            marginBottom: '16px',
            animation: 'pulse 2s infinite',
          }} />

          {/* 4 Metrics skeleton */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
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
            <div style={{
              height: '12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              width: '100px',
              marginBottom: '12px',
              animation: 'pulse 2s infinite',
            }} />

            {/* Card skeleton */}
            <div style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{
                height: '14px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '6px',
                width: '60%',
                animation: 'pulse 2s infinite',
              }} />
              <div style={{
                height: '12px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '6px',
                animation: 'pulse 2s infinite',
              }} />
              <div style={{
                height: '12px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '6px',
                width: '80%',
                animation: 'pulse 2s infinite',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Loading text */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '12px',
        textAlign: 'center',
      }}>
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

  // ── Onboarding ────────────────────────────────────────────────────────────
  if (screen === 'onboarding') {
    return (
      <OnboardingScreen
        config={config}
        onComplete={handleOnboardingComplete}
      />
    )
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
            onChangeMonth={setActiveMonth}
            onAdd={openAddSheet}
            isPrivacyMode={isPrivacyMode}
            onTogglePrivacy={handleTogglePrivacy}
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
            onChangeMonth={setActiveMonth}
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
            onChangeMonth={setActiveMonth}
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
    </div>
  )
}
// Trigger Vercel redeploy
