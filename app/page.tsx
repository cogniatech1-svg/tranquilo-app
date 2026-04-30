'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

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
import { subscribeToAuthState, logOut as firebaseLogOut } from '../lib/auth'

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'tranquilo_v1'
const ONBOARDING_FLAG = 'hasOnboarded'
// Bandera de restauración única: una vez puesta, el bloque de restauración
// de abril 2026 nunca vuelve a ejecutarse. Así los gastos nuevos del usuario
// nunca son sobreescritos por datos hardcodeados.
const APRIL_RESTORED_FLAG = 'april2026_v1_restored'

// ── Datos históricos de abril 2026 (restauración única) ───────────────────────
const APRIL_2026_RECORD: MonthRecord = {
  income: 8752707,
  savings: 0,
  manualBudget: undefined,
  extraIncomes: [
    { id: 'ei1', amount: 4700000, concept: 'Ingreso adicional', date: '2026-04-24', category: 'extra' },
    { id: 'ei2', amount: 2649463, concept: 'Ingreso adicional', date: '2026-04-14', category: 'extra' },
  ],
  pockets: [
    { id: 'capacitaciones',    name: 'Capacitaciones',    budget: 2649463 },
    { id: 'extras',            name: 'Extras',            budget: 5393000 },
    { id: 'recreacion',        name: 'Recreación',        budget: 800000  },
    { id: 'hogar',             name: 'Hogar',             budget: 600000  },
    { id: 'donaciones',        name: 'Donaciones',        budget: 800000  },
    { id: 'servicios',         name: 'Servicios',         budget: 600000  },
    { id: 'transporte',        name: 'Transporte',        budget: 300000  },
    { id: 'cuota_apartamento', name: 'Cuota apartamento', budget: 707000  },
  ],
  expenses: [
    { id: '1',   amount: 3000,    concept: 'moto',                          pocketId: 'transporte',        date: '2026-04-27' },
    { id: '2',   amount: 3000,    concept: 'moto',                          pocketId: 'transporte',        date: '2026-04-27' },
    { id: '3',   amount: 6000,    concept: 'pan',                           pocketId: 'hogar',             date: '2026-04-26' },
    { id: '4',   amount: 35600,   concept: 'helados',                       pocketId: 'recreacion',        date: '2026-04-26' },
    { id: '5',   amount: 3000,    concept: 'moto',                          pocketId: 'transporte',        date: '2026-04-26' },
    { id: '6',   amount: 15000,   concept: 'almuerzo',                      pocketId: 'extras',            date: '2026-04-26' },
    { id: '7',   amount: 35600,   concept: 'crepes',                        pocketId: 'recreacion',        date: '2026-04-26' },
    { id: '8',   amount: 4000,    concept: 'buseta',                        pocketId: 'transporte',        date: '2026-04-26' },
    { id: '9',   amount: 64000,   concept: 'arreglo',                       pocketId: 'extras',            date: '2026-04-25' },
    { id: '10',  amount: 4000,    concept: 'transcaribe',                   pocketId: 'transporte',        date: '2026-04-25' },
    { id: '11',  amount: 78700,   concept: 'pizza',                         pocketId: 'recreacion',        date: '2026-04-25' },
    { id: '12',  amount: 14530,   concept: 'Ara',                           pocketId: 'hogar',             date: '2026-04-24' },
    { id: '13',  amount: 3000,    concept: 'Moto',                          pocketId: 'transporte',        date: '2026-04-24' },
    { id: '14',  amount: 4700000, concept: 'Cadenas',                       pocketId: 'extras',            date: '2026-04-24' },
    { id: '15',  amount: 18000,   concept: 'Taxi',                          pocketId: 'transporte',        date: '2026-04-23' },
    { id: '16',  amount: 32709,   concept: 'Naranjas',                      pocketId: 'extras',            date: '2026-04-23' },
    { id: '17',  amount: 5010,    concept: 'Azúcar',                        pocketId: 'hogar',             date: '2026-04-23' },
    { id: '18',  amount: 50000,   concept: 'transcaribe',                   pocketId: 'transporte',        date: '2026-04-22' },
    { id: '19',  amount: 3000,    concept: 'moto',                          pocketId: 'transporte',        date: '2026-04-22' },
    { id: '20',  amount: 41700,   concept: 'luz finca',                     pocketId: 'servicios',         date: '2026-04-21' },
    { id: '21',  amount: 5700,    concept: 'conos',                         pocketId: 'recreacion',        date: '2026-04-21' },
    { id: '22',  amount: 40000,   concept: 'Favio',                         pocketId: 'donaciones',        date: '2026-04-20' },
    { id: '23',  amount: 111780,  concept: 'Luz apartamento',               pocketId: 'hogar',             date: '2026-04-20' },
    { id: '24',  amount: 101448,  concept: 'mercado',                       pocketId: 'hogar',             date: '2026-04-20' },
    { id: '25',  amount: 20900,   concept: 'Chatgpt',                       pocketId: 'servicios',         date: '2026-04-20' },
    { id: '26',  amount: 65800,   concept: 'El Corral',                     pocketId: 'recreacion',        date: '2026-04-20' },
    { id: '27',  amount: 5600,    concept: 'Pasto taxi museo carnaval',     pocketId: 'capacitaciones',    date: '2026-04-19' },
    { id: '28',  amount: 7000,    concept: 'Pasto taxi',                    pocketId: 'capacitaciones',    date: '2026-04-19' },
    { id: '29',  amount: 12000,   concept: 'Pasto desayuno',                pocketId: 'capacitaciones',    date: '2026-04-19' },
    { id: '30',  amount: 38700,   concept: 'Pasto taxis aeropuerto',        pocketId: 'capacitaciones',    date: '2026-04-19' },
    { id: '31',  amount: 35000,   concept: 'Pasto almuerzo aeropuerto',     pocketId: 'capacitaciones',    date: '2026-04-19' },
    { id: '32',  amount: 12500,   concept: 'Pasto capuchino',               pocketId: 'capacitaciones',    date: '2026-04-19' },
    { id: '33',  amount: 25000,   concept: 'Cena',                          pocketId: 'extras',            date: '2026-04-19' },
    { id: '34',  amount: 14000,   concept: 'Taxi',                          pocketId: 'transporte',        date: '2026-04-19' },
    { id: '35',  amount: 16400,   concept: 'Pasto desayuno',                pocketId: 'capacitaciones',    date: '2026-04-18' },
    { id: '36',  amount: 62000,   concept: 'La cocha, almuerzo,',           pocketId: 'capacitaciones',    date: '2026-04-18' },
    { id: '37',  amount: 80000,   concept: 'La cocha, transporte',          pocketId: 'capacitaciones',    date: '2026-04-18' },
    { id: '38',  amount: 100000,  concept: 'La cocha paseo en lancha',      pocketId: 'capacitaciones',    date: '2026-04-18' },
    { id: '39',  amount: 71400,   concept: 'La Cocha, souvenir madre',      pocketId: 'capacitaciones',    date: '2026-04-18' },
    { id: '40',  amount: 33000,   concept: 'La Cocha souvenirs',            pocketId: 'capacitaciones',    date: '2026-04-18' },
    { id: '41',  amount: 20000,   concept: 'Pasto merienda',                pocketId: 'capacitaciones',    date: '2026-04-18' },
    { id: '42',  amount: 45000,   concept: 'peluquería',                    pocketId: 'servicios',         date: '2026-04-18' },
    { id: '43',  amount: 6900,    concept: 'Pasto taxi terminal',           pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '44',  amount: 15000,   concept: 'Pasto Ipiales bus',             pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '45',  amount: 6000,    concept: 'Ipiales desayuno',              pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '46',  amount: 4000,    concept: 'Ipiales bus Rumichaca y regreso', pocketId: 'capacitaciones', date: '2026-04-17' },
    { id: '47',  amount: 115706,  concept: 'pasto souvenirs',               pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '48',  amount: 10000,   concept: 'Ipiales merienda',              pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '49',  amount: 10000,   concept: 'Ipiales cementerio',            pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '50',  amount: 7000,    concept: 'Tulcán ida y regreso Rumichaca', pocketId: 'capacitaciones',   date: '2026-04-17' },
    { id: '51',  amount: 6000,    concept: 'Transporte Ipiales las Lajas',  pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '52',  amount: 5700,    concept: 'Las Lajas, merienda',           pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '53',  amount: 34000,   concept: 'Las Lajas, teleférico',         pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '54',  amount: 9000,    concept: 'Ipiales cena',                  pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '55',  amount: 16000,   concept: 'Ipiales pasto bus',             pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '56',  amount: 9600,    concept: 'Pasto taxi',                    pocketId: 'capacitaciones',    date: '2026-04-17' },
    { id: '57',  amount: 9000,    concept: 'Pasto taxi',                    pocketId: 'capacitaciones',    date: '2026-04-16' },
    { id: '58',  amount: 21900,   concept: 'Pasto desayuno almuerzo',       pocketId: 'capacitaciones',    date: '2026-04-16' },
    { id: '59',  amount: 115000,  concept: 'Pasto souvenirs',               pocketId: 'capacitaciones',    date: '2026-04-16' },
    { id: '60',  amount: 3000,    concept: 'Pasto pan',                     pocketId: 'capacitaciones',    date: '2026-04-16' },
    { id: '61',  amount: 5000,    concept: 'Pasto casa museo',              pocketId: 'capacitaciones',    date: '2026-04-16' },
    { id: '62',  amount: 8000,    concept: 'Pasto taxi',                    pocketId: 'capacitaciones',    date: '2026-04-16' },
    { id: '63',  amount: 14500,   concept: 'Pasto merienda',                pocketId: 'capacitaciones',    date: '2026-04-16' },
    { id: '64',  amount: 651777,  concept: 'Crédito apto',                  pocketId: 'cuota_apartamento', date: '2026-04-16' },
    { id: '65',  amount: 127723,  concept: 'Agua',                          pocketId: 'hogar',             date: '2026-04-16' },
    { id: '66',  amount: 20104,   concept: 'Gas',                           pocketId: 'hogar',             date: '2026-04-16' },
    { id: '67',  amount: 8500,    concept: 'Pasto taxi',                    pocketId: 'capacitaciones',    date: '2026-04-15' },
    { id: '68',  amount: 4000,    concept: 'Pasto merienda',                pocketId: 'capacitaciones',    date: '2026-04-15' },
    { id: '69',  amount: 17100,   concept: 'Pasto almuerzo',                pocketId: 'capacitaciones',    date: '2026-04-15' },
    { id: '70',  amount: 9000,    concept: 'Pasto taxi',                    pocketId: 'capacitaciones',    date: '2026-04-15' },
    { id: '71',  amount: 25900,   concept: 'Crema dental',                  pocketId: 'extras',            date: '2026-04-15' },
    { id: '72',  amount: 27000,   concept: 'Pasto cena',                    pocketId: 'capacitaciones',    date: '2026-04-15' },
    { id: '73',  amount: 12000,   concept: 'Taxi Cartagena',                pocketId: 'capacitaciones',    date: '2026-04-14' },
    { id: '74',  amount: 22000,   concept: 'Pasto taxi',                    pocketId: 'capacitaciones',    date: '2026-04-14' },
    { id: '75',  amount: 7000,    concept: 'Pasto merienda',                pocketId: 'capacitaciones',    date: '2026-04-14' },
    { id: '76',  amount: 14100,   concept: 'Pasto Mr Bono',                 pocketId: 'capacitaciones',    date: '2026-04-14' },
    { id: '77',  amount: 40000,   concept: 'Ledis',                         pocketId: 'hogar',             date: '2026-04-13' },
    { id: '78',  amount: 25000,   concept: 'Ledis',                         pocketId: 'hogar',             date: '2026-04-13' },
    { id: '79',  amount: 140000,  concept: 'Ricardo',                       pocketId: 'donaciones',        date: '2026-04-12' },
    { id: '80',  amount: 44086,   concept: 'Ara',                           pocketId: 'hogar',             date: '2026-04-12' },
    { id: '81',  amount: 2000,    concept: 'Pan',                           pocketId: 'hogar',             date: '2026-04-12' },
    { id: '82',  amount: 345000,  concept: 'Pasto Airbnb',                  pocketId: 'capacitaciones',    date: '2026-04-12' },
    { id: '83',  amount: 18490,   concept: 'Jumbo',                         pocketId: 'hogar',             date: '2026-04-11' },
    { id: '84',  amount: 11000,   concept: 'Buseta',                        pocketId: 'transporte',        date: '2026-04-10' },
    { id: '85',  amount: 600,     concept: 'Banano',                        pocketId: 'recreacion',        date: '2026-04-10' },
    { id: '86',  amount: 23000,   concept: 'Gaseosas',                      pocketId: 'recreacion',        date: '2026-04-10' },
    { id: '87',  amount: 100000,  concept: 'Audífonos',                     pocketId: 'extras',            date: '2026-04-10' },
    { id: '88',  amount: 140400,  concept: 'Cumpleaños Dan',                pocketId: 'recreacion',        date: '2026-04-10' },
    { id: '89',  amount: 32000,   concept: 'Almuerzos',                     pocketId: 'recreacion',        date: '2026-04-10' },
    { id: '90',  amount: 50000,   concept: 'Transcaribe',                   pocketId: 'transporte',        date: '2026-04-09' },
    { id: '91',  amount: 18490,   concept: 'Jumbo',                         pocketId: 'hogar',             date: '2026-04-09' },
    { id: '92',  amount: 18600,   concept: 'Mr Bono',                       pocketId: 'recreacion',        date: '2026-04-09' },
    { id: '93',  amount: 18600,   concept: 'Jugos',                         pocketId: 'recreacion',        date: '2026-04-09' },
    { id: '94',  amount: 30800,   concept: 'Café instantáneo',              pocketId: 'recreacion',        date: '2026-04-08' },
    { id: '95',  amount: 74000,   concept: 'Taxi',                          pocketId: 'transporte',        date: '2026-04-07' },
    { id: '96',  amount: 50000,   concept: 'Ledis',                         pocketId: 'hogar',             date: '2026-04-07' },
    { id: '97',  amount: 140000,  concept: 'Il Forno',                      pocketId: 'recreacion',        date: '2026-04-07' },
    { id: '98',  amount: 40000,   concept: 'El Depósito Café',              pocketId: 'recreacion',        date: '2026-04-07' },
    { id: '99',  amount: 975710,  concept: 'Pasto Vuelo',                   pocketId: 'capacitaciones',    date: '2026-04-07' },
    { id: '100', amount: 48195,   concept: 'Colsanitas',                    pocketId: 'servicios',         date: '2026-04-06' },
    { id: '101', amount: 73650,   concept: 'Celular',                       pocketId: 'servicios',         date: '2026-04-06' },
    { id: '102', amount: 51244,   concept: 'Internet',                      pocketId: 'hogar',             date: '2026-04-06' },
    { id: '103', amount: 44800,   concept: 'Hamburguesa',                   pocketId: 'recreacion',        date: '2026-04-06' },
    { id: '104', amount: 800,     concept: 'Botella de agua',               pocketId: 'recreacion',        date: '2026-04-06' },
    { id: '105', amount: 52000,   concept: 'Eucaristía',                    pocketId: 'donaciones',        date: '2026-04-05' },
    { id: '106', amount: 10000,   concept: 'El Depósito Café',              pocketId: 'recreacion',        date: '2026-04-05' },
    { id: '107', amount: 74296,   concept: 'Mila',                          pocketId: 'recreacion',        date: '2026-04-05' },
    { id: '108', amount: 9000,    concept: 'Cerveza',                       pocketId: 'recreacion',        date: '2026-04-05' },
    { id: '109', amount: 35000,   concept: 'Ledis',                         pocketId: 'hogar',             date: '2026-04-04' },
    { id: '110', amount: 3000,    concept: 'Pan',                           pocketId: 'hogar',             date: '2026-04-04' },
    { id: '111', amount: 17300,   concept: 'Tostao',                        pocketId: 'recreacion',        date: '2026-04-04' },
    { id: '112', amount: 140000,  concept: 'Ricardo',                       pocketId: 'donaciones',        date: '2026-04-03' },
    { id: '113', amount: 28706,   concept: 'Jumbo',                         pocketId: 'hogar',             date: '2026-04-03' },
    { id: '114', amount: 19800,   concept: 'Crepes',                        pocketId: 'recreacion',        date: '2026-04-03' },
    { id: '115', amount: 400000,  concept: 'madre',                         pocketId: 'donaciones',        date: '2026-04-02' },
    { id: '116', amount: 14943,   concept: 'Ara',                           pocketId: 'hogar',             date: '2026-04-02' },
    { id: '117', amount: 25990,   concept: 'Jumbo salsa',                   pocketId: 'recreacion',        date: '2026-04-02' },
    { id: '118', amount: 3900,    concept: 'Mr Bono',                       pocketId: 'recreacion',        date: '2026-04-02' },
    { id: '119', amount: 15665,   concept: 'Carne',                         pocketId: 'hogar',             date: '2026-04-01' },
    { id: '120', amount: 506635,  concept: 'Lavavajillas',                  pocketId: 'extras',            date: '2026-04-01' },
    { id: '121', amount: 21785,   concept: 'Almohadas',                     pocketId: 'extras',            date: '2026-04-01' },
    { id: '122', amount: 107967,  concept: 'Ollas',                         pocketId: 'recreacion',        date: '2026-04-01' },
  ],
}

const DEFAULT_POCKETS: Pocket[] = [
  { id: 'recreacion',   name: 'Recreación',   budget: 100_000 },
  { id: 'hogar',        name: 'Hogar',        budget: 800_000 },
  { id: 'alimentacion', name: 'Alimentación', budget: 600_000 },
]

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [hydrated,      setHydrated]      = useState(false)
  const [userId,        setUserId]        = useState<string | null>(null)
  const [isGuest,       setIsGuest]       = useState(false)
  const [authLoading,   setAuthLoading]   = useState(true)
  const [screen,        setScreen]        = useState<'login' | 'onboarding' | 'main'>('login')
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

  // ── AUTH STATE LISTENER ────────────────────────────────────────────────────
  // Subscribe to Firebase auth state changes
  // This runs once on mount and keeps track of the current user
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      if (user) {
        setUserId(user.uid)
        setAuthLoading(false)
        // User is authenticated - check if they've completed onboarding
        const hasOnboarded = localStorage.getItem(`${ONBOARDING_FLAG}_${user.uid}`) === 'true'
        if (hasOnboarded) {
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
    })

    return () => unsubscribe()
  }, [])

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
    const initializeApp = async () => {
      try {
        const storageKey = isGuest ? STORAGE_KEY : `${STORAGE_KEY}_${userId}`
        const raw           = localStorage.getItem(storageKey)
        const aprilRestoredKey = isGuest ? APRIL_RESTORED_FLAG : `${APRIL_RESTORED_FLAG}_${userId}`
        const aprilRestored = localStorage.getItem(aprilRestoredKey) === 'true'

        // Parsear datos existentes (o partir de objeto vacío)
        let data: StoredData = {}
        if (raw) {
          try { data = JSON.parse(raw) as StoredData } catch { /* JSON inválido */ }
        }

        // ── RESTAURACIÓN INMEDIATA DE ABRIL 2026 ──────────────────────────────
        // Se ejecuta en la misma pasada del efecto, antes de cargar el estado.
        // Así garantizamos que el histórico siempre tiene los 122 gastos.
        if (!aprilRestored) {
          const aprilExpenses = data.monthlyHistory?.['2026-04']?.expenses?.length ?? 0
          if (aprilExpenses === 0) {
            if (!data.monthlyHistory) data.monthlyHistory = {}
            data.monthlyHistory['2026-04'] = APRIL_2026_RECORD
            // Escribir a localStorage de inmediato (sin esperar a React state)
            localStorage.setItem(storageKey, JSON.stringify(data))
            localStorage.setItem(`${ONBOARDING_FLAG}${isGuest ? '' : `_${userId}`}`, 'true')
          }
          localStorage.setItem(aprilRestoredKey, 'true')
        }

        // ── CARGA DE ESTADO REACT ──────────────────────────────────────────────
        // Re-leer la bandera DESPUÉS de posible restauración
        const hasOnboarded = localStorage.getItem(`${ONBOARDING_FLAG}${isGuest ? '' : `_${userId}`}`) === 'true'
        const country      = (data.countryCode as CountryCode) ?? 'CO'

        setCountryCode(country)
        setConceptMap(data.conceptMap ?? {})
        setLearnedCategoryMap(data.learnedCategoryMap ?? {})
        if (data.isPrivacyMode) setIsPrivacyMode(true)

        if (data.monthlyHistory && Object.keys(data.monthlyHistory).length > 0) {
          const history: Record<string, MonthRecord> = {}
          for (const [month, record] of Object.entries(data.monthlyHistory)) {
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

          // Si acabamos de restaurar abril → ir directo a ese mes
          if (!aprilRestored && history['2026-04']) {
            setActiveMonth('2026-04')
            setCurrentMonth('2026-04')
          }

          if (hasOnboarded) setScreen('main')
        } else {
          if (hasOnboarded) setScreen('main')
        }

        // ── CARGAR DE FIRESTORE EN BACKGROUND (sin bloquear UI) ────────────────
        // SOLO si NO es guest mode
        // Merge con localStorage si hay datos en Firestore
        // PHASE 2: Pass userId to loadFromFirestore
        if (!isGuest && userId) {
          try {
            const firestoreData = await loadFromFirestore(userId)
            if (firestoreData && firestoreData.monthlyHistory) {
              console.log('Firestore data loaded and merged with localStorage')
              // Los datos fueron mergados en loadFromFirestore y guardados a localStorage
              // Aquí solo notificamos que ocurrió la sincronización
            }
          } catch (error) {
            console.warn('Could not load from Firestore (offline?), continuing with localStorage:', error)
            // Esto es OK - localStorage es el fallback
          }
        }
      } catch {
        // ignorar JSON malformado
      }
      setHydrated(true)
    }

    if (userId) {
      initializeApp()
    } else {
      setHydrated(true)
    }
  }, [userId, isGuest])

  // ── Persist to localStorage + Firestore ───────────────────────────────────
  // FIREBASE DUAL STORAGE:
  // 1. Save to localStorage IMMEDIATELY (synchronous, always works)
  // 2. Save to Firestore in background (async, non-blocking) - SKIP if guest mode
  // PHASE 2: Only save if user is authenticated
  useEffect(() => {
    if (!hydrated || !userId) return
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
      saveToFirestore(userId, dataToSave).catch((error) => {
        console.error('Error in saveToFirestore:', error)
        // Data is safe in localStorage even if Firestore fails
      })
    }
  }, [hydrated, userId, isGuest, monthlyHistory, conceptMap, learnedCategoryMap, currentMonth, countryCode, isPrivacyMode, getActiveMonthData])

  // ── Real-time sync from Firestore ──────────────────────────────────────────
  // Subscribe to Firestore updates and merge with local state
  // PHASE 2: Only subscribe if user is authenticated (NOT guest mode)
  useEffect(() => {
    if (!hydrated || !userId || isGuest) return

    let unsubscribe: (() => void) | null = null

    try {
      // PHASE 2: Pass userId to subscribeToFirestore
      // userId is guaranteed to be non-null here due to the check above
      unsubscribe = subscribeToFirestore(userId as string, (firestoreData: StoredData) => {
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
    const monthData = getActiveMonthData()
    const budget_available = snapshot.budget

    // VALIDACIÓN: sum(pockets) <= presupuesto
    const currentTotal = monthData.pockets.reduce((s, p) => s + p.budget, 0)
    const totalIfAdded = currentTotal + budget

    if (totalIfAdded > budget_available) {
      alert(`❌ No puedes asignar más de lo disponible.\n\nPresupuesto: $${budget_available}\nActualmente asignado: $${currentTotal}\nIntentando agregar: $${budget}\nTotal resultaría en: $${totalIfAdded}`)
      return false
    }

    setMonthlyHistory(prev => ({
      ...prev,
      [activeMonth]: {
        ...monthData,
        pockets: [...monthData.pockets, { id: Date.now().toString(), name, budget, icon }],
      },
    }))
    return true
  }, [activeMonth, getActiveMonthData, snapshot.budget])

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
