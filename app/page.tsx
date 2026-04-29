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

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'tranquilo_v1'
const ONBOARDING_FLAG = 'hasOnboarded'

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
  const [screen,        setScreen]        = useState<'onboarding' | 'main'>('onboarding')
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

  // ── HELPER: Obtener datos del mes activo (SIEMPRE usa este helper) ──────────
  const getActiveMonthData = useCallback(() => {
    return monthlyHistory[activeMonth] ?? getDefaultMonthRecord()
  }, [monthlyHistory, activeMonth])

  // ── RESET: Limpiar datos corruptos y forzar onboarding ────────────────────
  const resetData = useCallback(() => {
    console.warn('Data reset due to inconsistent financial state')
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ONBOARDING_FLAG)
    setMonthlyHistory({})
    setConceptMap({})
    setLearnedCategoryMap({})
    setCountryCode('CO')
    setActiveMonth(getCurrentMonth())
    setCurrentMonth(getCurrentMonth())
    setScreen('onboarding')
  }, [])

  // ── Load from localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    try {
      const hasOnboarded = localStorage.getItem(ONBOARDING_FLAG) === 'true'
      const raw = localStorage.getItem(STORAGE_KEY)

      if (raw) {
        const data = JSON.parse(raw) as StoredData
        const country = (data.countryCode as CountryCode) ?? 'CO'

        if (data.monthlyHistory && Object.keys(data.monthlyHistory).length > 0) {
          const history: Record<string, MonthRecord> = {}
          for (const [month, record] of Object.entries(data.monthlyHistory)) {
            const rec = record as any
            history[month] = {
              income: rec.income ?? 0,
              savings: rec.savings ?? 0,
              expenses: rec.expenses ?? [],
              extraIncomes: rec.extraIncomes ?? [],
              pockets: rec.pockets ?? DEFAULT_POCKETS,
              manualBudget: rec.manualBudget,
            }
          }

          setCountryCode(country)
          setConceptMap(data.conceptMap ?? {})
          setLearnedCategoryMap(data.learnedCategoryMap ?? {})
          setMonthlyHistory(history)
          if (data.isPrivacyMode) setIsPrivacyMode(true)
          if (hasOnboarded) setScreen('main')
        } else {
          // Sin monthlyHistory: datos vacíos, comenzar desde cero
          const thisMonth = getCurrentMonth()
          setCountryCode(country)
          setMonthlyHistory({ [thisMonth]: getDefaultMonthRecord() })
          setCurrentMonth(thisMonth)
          setConceptMap(data.conceptMap ?? {})
          setLearnedCategoryMap(data.learnedCategoryMap ?? {})
          if (data.isPrivacyMode) setIsPrivacyMode(true)
          if (hasOnboarded) setScreen('main')
        }
      } else {
        // ── Sin localStorage: restaurar datos de abril 2026 ───────────────────
        // Esto solo ocurre en instalaciones completamente nuevas o si localStorage
        // fue borrado externamente. Los datos se guardarán inmediatamente después.
        setMonthlyHistory({
          "2026-04": {
            income: 8752707,
            savings: 0,
            manualBudget: undefined,
            extraIncomes: [
              { id: "ei1", amount: 4700000, concept: "Ingreso adicional", date: "2026-04-24", category: "extra" as const },
              { id: "ei2", amount: 2649463, concept: "Ingreso adicional", date: "2026-04-14", category: "extra" as const }
            ],
            pockets: [
              { id: 'capacitaciones', name: 'Capacitaciones', budget: 2649463 },
              { id: 'extras', name: 'Extras', budget: 5393000 },
              { id: 'recreacion', name: 'Recreación', budget: 800000 },
              { id: 'hogar', name: 'Hogar', budget: 600000 },
              { id: 'donaciones', name: 'Donaciones', budget: 800000 },
              { id: 'servicios', name: 'Servicios', budget: 600000 },
              { id: 'transporte', name: 'Transporte', budget: 300000 },
              { id: 'cuota_apartamento', name: 'Cuota apartamento', budget: 707000 }
            ],
            expenses: [
              { id: "1", amount: 3000, concept: "moto", pocketId: "transporte", date: "2026-04-27" },
              { id: "2", amount: 3000, concept: "moto", pocketId: "transporte", date: "2026-04-27" },
              { id: "3", amount: 6000, concept: "pan", pocketId: "hogar", date: "2026-04-26" },
              { id: "4", amount: 35600, concept: "helados", pocketId: "recreacion", date: "2026-04-26" },
              { id: "5", amount: 3000, concept: "moto", pocketId: "transporte", date: "2026-04-26" },
              { id: "6", amount: 15000, concept: "almuerzo", pocketId: "extras", date: "2026-04-26" },
              { id: "7", amount: 35600, concept: "crepes", pocketId: "recreacion", date: "2026-04-26" },
              { id: "8", amount: 4000, concept: "buseta", pocketId: "transporte", date: "2026-04-26" },
              { id: "9", amount: 64000, concept: "arreglo", pocketId: "extras", date: "2026-04-25" },
              { id: "10", amount: 4000, concept: "transcaribe", pocketId: "transporte", date: "2026-04-25" },
              { id: "11", amount: 78700, concept: "pizza", pocketId: "recreacion", date: "2026-04-25" },
              { id: "12", amount: 14530, concept: "Ara", pocketId: "hogar", date: "2026-04-24" },
              { id: "13", amount: 3000, concept: "Moto", pocketId: "transporte", date: "2026-04-24" },
              { id: "14", amount: 4700000, concept: "Cadenas", pocketId: "extras", date: "2026-04-24" },
              { id: "15", amount: 18000, concept: "Taxi", pocketId: "transporte", date: "2026-04-23" },
              { id: "16", amount: 32709, concept: "Naranjas", pocketId: "extras", date: "2026-04-23" },
              { id: "17", amount: 5010, concept: "Azúcar", pocketId: "hogar", date: "2026-04-23" },
              { id: "18", amount: 50000, concept: "transcaribe", pocketId: "transporte", date: "2026-04-22" },
              { id: "19", amount: 3000, concept: "moto", pocketId: "transporte", date: "2026-04-22" },
              { id: "20", amount: 41700, concept: "luz finca", pocketId: "servicios", date: "2026-04-21" },
              { id: "21", amount: 5700, concept: "conos", pocketId: "recreacion", date: "2026-04-21" },
              { id: "22", amount: 40000, concept: "Favio", pocketId: "donaciones", date: "2026-04-20" },
              { id: "23", amount: 111780, concept: "Luz apartamento", pocketId: "hogar", date: "2026-04-20" },
              { id: "24", amount: 101448, concept: "mercado", pocketId: "hogar", date: "2026-04-20" },
              { id: "25", amount: 20900, concept: "Chatgpt", pocketId: "servicios", date: "2026-04-20" },
              { id: "26", amount: 65800, concept: "El Corral", pocketId: "recreacion", date: "2026-04-20" },
              { id: "27", amount: 5600, concept: "Pasto taxi museo carnaval", pocketId: "capacitaciones", date: "2026-04-19" },
              { id: "28", amount: 7000, concept: "Pasto taxi", pocketId: "capacitaciones", date: "2026-04-19" },
              { id: "29", amount: 12000, concept: "Pasto desayuno", pocketId: "capacitaciones", date: "2026-04-19" },
              { id: "30", amount: 38700, concept: "Pasto taxis aeropuerto", pocketId: "capacitaciones", date: "2026-04-19" },
              { id: "31", amount: 35000, concept: "Pasto almuerzo aeropuerto", pocketId: "capacitaciones", date: "2026-04-19" },
              { id: "32", amount: 12500, concept: "Pasto capuchino", pocketId: "capacitaciones", date: "2026-04-19" },
              { id: "33", amount: 25000, concept: "Cena", pocketId: "extras", date: "2026-04-19" },
              { id: "34", amount: 14000, concept: "Taxi", pocketId: "transporte", date: "2026-04-19" },
              { id: "35", amount: 16400, concept: "Pasto desayuno", pocketId: "capacitaciones", date: "2026-04-18" },
              { id: "36", amount: 62000, concept: "La cocha, almuerzo,", pocketId: "capacitaciones", date: "2026-04-18" },
              { id: "37", amount: 80000, concept: "La cocha, transporte", pocketId: "capacitaciones", date: "2026-04-18" },
              { id: "38", amount: 100000, concept: "La cocha paseo en lancha", pocketId: "capacitaciones", date: "2026-04-18" },
              { id: "39", amount: 71400, concept: "La Cocha, souvenir madre", pocketId: "capacitaciones", date: "2026-04-18" },
              { id: "40", amount: 33000, concept: "La Cocha souvenirs", pocketId: "capacitaciones", date: "2026-04-18" },
              { id: "41", amount: 20000, concept: "Pasto merienda", pocketId: "capacitaciones", date: "2026-04-18" },
              { id: "42", amount: 45000, concept: "peluquería", pocketId: "servicios", date: "2026-04-18" },
              { id: "43", amount: 6900, concept: "Pasto taxi terminal", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "44", amount: 15000, concept: "Pasto Ipiales bus", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "45", amount: 6000, concept: "Ipiales desayuno", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "46", amount: 4000, concept: "Ipiales bus Rumichaca y regreso", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "47", amount: 115706, concept: "pasto souvenirs", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "48", amount: 10000, concept: "Ipiales merienda", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "49", amount: 10000, concept: "Ipiales cementerio", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "50", amount: 7000, concept: "Tulcán ida y regreso Rumichaca", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "51", amount: 6000, concept: "Transporte Ipiales las Lajas", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "52", amount: 5700, concept: "Las Lajas, merienda", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "53", amount: 34000, concept: "Las Lajas, teleférico", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "54", amount: 9000, concept: "Ipiales cena", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "55", amount: 16000, concept: "Ipiales pasto bus", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "56", amount: 9600, concept: "Pasto taxi", pocketId: "capacitaciones", date: "2026-04-17" },
              { id: "57", amount: 9000, concept: "Pasto taxi", pocketId: "capacitaciones", date: "2026-04-16" },
              { id: "58", amount: 21900, concept: "Pasto desayuno almuerzo", pocketId: "capacitaciones", date: "2026-04-16" },
              { id: "59", amount: 115000, concept: "Pasto souvenirs", pocketId: "capacitaciones", date: "2026-04-16" },
              { id: "60", amount: 3000, concept: "Pasto pan", pocketId: "capacitaciones", date: "2026-04-16" },
              { id: "61", amount: 5000, concept: "Pasto casa museo", pocketId: "capacitaciones", date: "2026-04-16" },
              { id: "62", amount: 8000, concept: "Pasto taxi", pocketId: "capacitaciones", date: "2026-04-16" },
              { id: "63", amount: 14500, concept: "Pasto merienda", pocketId: "capacitaciones", date: "2026-04-16" },
              { id: "64", amount: 651777, concept: "Crédito apto", pocketId: "cuota_apartamento", date: "2026-04-16" },
              { id: "65", amount: 127723, concept: "Agua", pocketId: "hogar", date: "2026-04-16" },
              { id: "66", amount: 20104, concept: "Gas", pocketId: "hogar", date: "2026-04-16" },
              { id: "67", amount: 8500, concept: "Pasto taxi", pocketId: "capacitaciones", date: "2026-04-15" },
              { id: "68", amount: 4000, concept: "Pasto merienda", pocketId: "capacitaciones", date: "2026-04-15" },
              { id: "69", amount: 17100, concept: "Pasto almuerzo", pocketId: "capacitaciones", date: "2026-04-15" },
              { id: "70", amount: 9000, concept: "Pasto taxi", pocketId: "capacitaciones", date: "2026-04-15" },
              { id: "71", amount: 25900, concept: "Crema dental", pocketId: "extras", date: "2026-04-15" },
              { id: "72", amount: 27000, concept: "Pasto cena", pocketId: "capacitaciones", date: "2026-04-15" },
              { id: "73", amount: 12000, concept: "Taxi Cartagena", pocketId: "capacitaciones", date: "2026-04-14" },
              { id: "74", amount: 22000, concept: "Pasto taxi", pocketId: "capacitaciones", date: "2026-04-14" },
              { id: "75", amount: 7000, concept: "Pasto merienda", pocketId: "capacitaciones", date: "2026-04-14" },
              { id: "76", amount: 14100, concept: "Pasto Mr Bono", pocketId: "capacitaciones", date: "2026-04-14" },
              { id: "77", amount: 40000, concept: "Ledis", pocketId: "hogar", date: "2026-04-13" },
              { id: "78", amount: 25000, concept: "Ledis", pocketId: "hogar", date: "2026-04-13" },
              { id: "79", amount: 140000, concept: "Ricardo", pocketId: "donaciones", date: "2026-04-12" },
              { id: "80", amount: 44086, concept: "Ara", pocketId: "hogar", date: "2026-04-12" },
              { id: "81", amount: 2000, concept: "Pan", pocketId: "hogar", date: "2026-04-12" },
              { id: "82", amount: 345000, concept: "Pasto Airbnb", pocketId: "capacitaciones", date: "2026-04-12" },
              { id: "83", amount: 18490, concept: "Jumbo", pocketId: "hogar", date: "2026-04-11" },
              { id: "84", amount: 11000, concept: "Buseta", pocketId: "transporte", date: "2026-04-10" },
              { id: "85", amount: 600, concept: "Banano", pocketId: "recreacion", date: "2026-04-10" },
              { id: "86", amount: 23000, concept: "Gaseosas", pocketId: "recreacion", date: "2026-04-10" },
              { id: "87", amount: 100000, concept: "Audífonos", pocketId: "extras", date: "2026-04-10" },
              { id: "88", amount: 140400, concept: "Cumpleaños Dan", pocketId: "recreacion", date: "2026-04-10" },
              { id: "89", amount: 32000, concept: "Almuerzos", pocketId: "recreacion", date: "2026-04-10" },
              { id: "90", amount: 50000, concept: "Transcaribe", pocketId: "transporte", date: "2026-04-09" },
              { id: "91", amount: 18490, concept: "Jumbo", pocketId: "hogar", date: "2026-04-09" },
              { id: "92", amount: 18600, concept: "Mr Bono", pocketId: "recreacion", date: "2026-04-09" },
              { id: "93", amount: 18600, concept: "Jugos", pocketId: "recreacion", date: "2026-04-09" },
              { id: "94", amount: 30800, concept: "Café instantáneo", pocketId: "recreacion", date: "2026-04-08" },
              { id: "95", amount: 74000, concept: "Taxi", pocketId: "transporte", date: "2026-04-07" },
              { id: "96", amount: 50000, concept: "Ledis", pocketId: "hogar", date: "2026-04-07" },
              { id: "97", amount: 140000, concept: "Il Forno", pocketId: "recreacion", date: "2026-04-07" },
              { id: "98", amount: 40000, concept: "El Depósito Café", pocketId: "recreacion", date: "2026-04-07" },
              { id: "99", amount: 975710, concept: "Pasto Vuelo", pocketId: "capacitaciones", date: "2026-04-07" },
              { id: "100", amount: 48195, concept: "Colsanitas", pocketId: "servicios", date: "2026-04-06" },
              { id: "101", amount: 73650, concept: "Celular", pocketId: "servicios", date: "2026-04-06" },
              { id: "102", amount: 51244, concept: "Internet", pocketId: "hogar", date: "2026-04-06" },
              { id: "103", amount: 44800, concept: "Hamburguesa", pocketId: "recreacion", date: "2026-04-06" },
              { id: "104", amount: 800, concept: "Botella de agua", pocketId: "recreacion", date: "2026-04-06" },
              { id: "105", amount: 52000, concept: "Eucaristía", pocketId: "donaciones", date: "2026-04-05" },
              { id: "106", amount: 10000, concept: "El Depósito Café", pocketId: "recreacion", date: "2026-04-05" },
              { id: "107", amount: 74296, concept: "Mila", pocketId: "recreacion", date: "2026-04-05" },
              { id: "108", amount: 9000, concept: "Cerveza", pocketId: "recreacion", date: "2026-04-05" },
              { id: "109", amount: 35000, concept: "Ledis", pocketId: "hogar", date: "2026-04-04" },
              { id: "110", amount: 3000, concept: "Pan", pocketId: "hogar", date: "2026-04-04" },
              { id: "111", amount: 17300, concept: "Tostao", pocketId: "recreacion", date: "2026-04-04" },
              { id: "112", amount: 140000, concept: "Ricardo", pocketId: "donaciones", date: "2026-04-03" },
              { id: "113", amount: 28706, concept: "Jumbo", pocketId: "hogar", date: "2026-04-03" },
              { id: "114", amount: 19800, concept: "Crepes", pocketId: "recreacion", date: "2026-04-03" },
              { id: "115", amount: 400000, concept: "madre", pocketId: "donaciones", date: "2026-04-02" },
              { id: "116", amount: 14943, concept: "Ara", pocketId: "hogar", date: "2026-04-02" },
              { id: "117", amount: 25990, concept: "Jumbo salsa", pocketId: "recreacion", date: "2026-04-02" },
              { id: "118", amount: 3900, concept: "Mr Bono", pocketId: "recreacion", date: "2026-04-02" },
              { id: "119", amount: 15665, concept: "Carne", pocketId: "hogar", date: "2026-04-01" },
              { id: "120", amount: 506635, concept: "Lavavajillas", pocketId: "extras", date: "2026-04-01" },
              { id: "121", amount: 21785, concept: "Almohadas", pocketId: "extras", date: "2026-04-01" },
              { id: "122", amount: 107967, concept: "Ollas", pocketId: "recreacion", date: "2026-04-01" }
            ],
          }
        })
        setScreen('main')
        setActiveMonth('2026-04')
        setCurrentMonth('2026-04')
        localStorage.setItem(ONBOARDING_FLAG, 'true')
        console.log('✅ RESTAURACIÓN INICIAL - ABRIL 2026 (sin localStorage previo)')
      }
    } catch {
      // ignore malformed JSON
    }
    setHydrated(true)
  }, [])

  // ── Persist to localStorage ────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    const activeData = getActiveMonthData()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
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
      }),
    )
  }, [hydrated, monthlyHistory, conceptMap, learnedCategoryMap, currentMonth, countryCode, isPrivacyMode, getActiveMonthData])


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
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ONBOARDING_FLAG)
    setConceptMap({})
    setLearnedCategoryMap({})
    const thisMonth = getCurrentMonth()
    setCurrentMonth(thisMonth)
    setActiveMonth(thisMonth)
    setMonthlyHistory({
      [thisMonth]: getDefaultMonthRecord(),
    })
    setScreen('onboarding')
  }, [])

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

  const handleOnboardingComplete = useCallback((code: CountryCode, budget: number, incomeValue: number) => {
    // Mark onboarding as complete
    localStorage.setItem(ONBOARDING_FLAG, 'true')

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
  }, [])

  // ── Wait for hydration ─────────────────────────────────────────────────────
  if (!hydrated) return null

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
