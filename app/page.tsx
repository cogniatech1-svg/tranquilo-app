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

  // ── HELPER: Validación REAL de coherencia financiera ────────────────────
  const validateFinancialCoherence = (record: any): { valid: boolean; reason?: string } => {
    const income = record.income ?? 0
    const savings = record.savings ?? 0
    const expenses = record.expenses ?? []
    const pockets = record.pockets ?? []

    // Calcular valores derivados
    const budget = income - savings
    const assigned = pockets.reduce((sum: number, p: any) => sum + (p.budget ?? 0), 0)
    const spent = expenses.reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0)

    // Validar reglas
    if (income > 0 && savings > income) {
      return { valid: false, reason: `savings (${savings}) > income (${income})` }
    }
    if (assigned > budget) {
      return { valid: false, reason: `assigned (${assigned}) > budget (${budget})` }
    }
    if (spent > budget) {
      return { valid: false, reason: `spent (${spent}) > budget (${budget})` }
    }

    // Log de validación exitosa
    console.log('✓ VALIDACIÓN OK:', { income, savings, budget, assigned, spent })
    return { valid: true }
  }

  // ── Load from localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    try {
      const hasOnboarded = localStorage.getItem(ONBOARDING_FLAG) === 'true'
      const raw = localStorage.getItem(STORAGE_KEY)

      if (raw) {
        const data = JSON.parse(raw) as StoredData
        const country = (data.countryCode as CountryCode) ?? 'CO'

        // ── VALIDACIÓN COMPLETA: coherencia financiera real ──
        if (data.monthlyHistory && Object.keys(data.monthlyHistory).length > 0) {
          // Validar CADA mes
          for (const [month, record] of Object.entries(data.monthlyHistory)) {
            const rec = record as any
            const validation = validateFinancialCoherence(rec)

            if (!validation.valid) {
              console.warn(`🚨 RESET POR INCONSISTENCIA EN ${month}:`, validation.reason)
              console.warn('DETALLES:', {
                income: rec.income ?? 0,
                savings: rec.savings ?? 0,
                budget: (rec.income ?? 0) - (rec.savings ?? 0),
                assigned: (rec.pockets ?? []).reduce((s: number, p: any) => s + (p.budget ?? 0), 0),
                spent: (rec.expenses ?? []).reduce((s: number, e: any) => s + (e.amount ?? 0), 0),
              })
              localStorage.removeItem(STORAGE_KEY)
              localStorage.removeItem(ONBOARDING_FLAG)
              setHydrated(true)
              return
            }
          }

          // Datos válidos: cargar monthlyHistory
          const history: Record<string, MonthRecord> = {}
          for (const [month, record] of Object.entries(data.monthlyHistory)) {
            const rec = record as any
            history[month] = {
              income: rec.income ?? 0,
              savings: rec.savings ?? 0,
              expenses: rec.expenses ?? [],
              extraIncomes: rec.extraIncomes ?? [],
              pockets: rec.pockets ?? DEFAULT_POCKETS,
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
    }),
    [expenses, extraIncomes, pockets, income, savings, activeMonth],
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
