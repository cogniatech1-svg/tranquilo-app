'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import { AddExpenseSheet } from '../components/AddExpenseSheet'
import { AddExtraIncomeSheet } from '../components/AddExtraIncomeSheet'
import { BottomNavigation } from '../components/BottomNavigation'

import { DashboardScreen }     from '../screens/DashboardScreen'
import { TransactionsScreen }  from '../screens/TransactionsScreen'
import { BudgetScreen }        from '../screens/BudgetScreen'
import { InsightsScreen }      from '../screens/InsightsScreen'
import { ProfileScreen }       from '../screens/ProfileScreen'
import { OnboardingScreen }    from '../screens/OnboardingScreen'

import { COUNTRIES, DS } from '../lib/config'
import type { CountryCode, CountryConfig } from '../lib/config'
import type { Expense, ExtraIncome, ExpensePayload, Pocket, StoredData, TabId } from '../lib/types'
import {
  getCurrentMonth,
  normalizePockets,
  normalizeKey,
  extractConcept,
  parseAmount,
} from '../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'tranquilo_v1'

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
  const [monthlyBudget, setMonthlyBudget] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [pockets,       setPockets]       = useState<Pocket[]>(DEFAULT_POCKETS)
  const [expenses,      setExpenses]      = useState<Expense[]>([])
  const [extraIncomes,  setExtraIncomes]  = useState<ExtraIncome[]>([])
  const [conceptMap,    setConceptMap]    = useState<Record<string, string>>({})
  const [currentMonth,  setCurrentMonth]  = useState<string>(getCurrentMonth)
  const [monthlyHistory, setMonthlyHistory] = useState<
    Record<string, { expenses: Expense[]; totalSpent: number; budget: number; income?: number }>
  >({})

  const [activeMonth,          setActiveMonth]           = useState<string>(getCurrentMonth)

  const [sheetOpen,            setSheetOpen]            = useState(false)
  const [editingExpense,       setEditingExpense]        = useState<Expense | null>(null)
  const [extraIncomeSheetOpen, setExtraIncomeSheetOpen] = useState(false)

  const config: CountryConfig = COUNTRIES[countryCode]

  // ── Load from localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as StoredData
        const thisMonth  = getCurrentMonth()
        const budget     = data.monthlyBudget ?? data.budget ?? 0
        const income     = data.monthlyIncome ?? 0
        const normalised = normalizePockets(data.pockets?.length ? data.pockets : DEFAULT_POCKETS)
        const history    = data.monthlyHistory ?? {}
        const country    = (data.countryCode as CountryCode) ?? 'CO'

        setCountryCode(country)

        if (data.currentMonth && data.currentMonth !== thisMonth) {
          // New month — archive previous, reset monthly data
          if ((data.expenses?.length ?? 0) > 0) {
            const totalSpent = (data.expenses ?? []).reduce((s, e) => s + e.amount, 0)
            history[data.currentMonth] = {
              expenses: data.expenses ?? [],
              totalSpent,
              budget,
              income: data.monthlyIncome ?? 0,
            }
          }
          setCurrentMonth(thisMonth)
          setPockets(normalised)
          setMonthlyBudget(budget)
          setMonthlyIncome(income)
          setConceptMap(data.conceptMap ?? {})
          setExpenses([])
          setExtraIncomes([])           // extras are monthly — reset on new month
          setMonthlyHistory(history)
          setScreen('main')
        } else {
          setCurrentMonth(data.currentMonth ?? thisMonth)
          setPockets(normalised)
          setMonthlyBudget(budget)
          setMonthlyIncome(income)
          setExpenses(data.expenses ?? [])
          setExtraIncomes(data.extraIncomes ?? [])
          setConceptMap(data.conceptMap ?? {})
          setMonthlyHistory(history)
          if (income > 0 || budget > 0 || (data.expenses?.length ?? 0) > 0) setScreen('main')
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        expenses,
        extraIncomes,
        pockets,
        monthlyBudget,
        monthlyIncome,
        conceptMap,
        currentMonth,
        monthlyHistory,
        countryCode,
      }),
    )
  }, [hydrated, expenses, extraIncomes, pockets, monthlyBudget, monthlyIncome, conceptMap, currentMonth, monthlyHistory, countryCode])

  // ── Derived state ──────────────────────────────────────────────────────────
  const isViewingPast = activeMonth !== currentMonth

  // When viewing a past month, pull data from history; otherwise use live state
  const activeExpenses = useMemo(() =>
    isViewingPast
      ? (monthlyHistory[activeMonth]?.expenses ?? [])
      : expenses,
    [isViewingPast, activeMonth, monthlyHistory, expenses],
  )

  const activeMonthBudget = isViewingPast
    ? (monthlyHistory[activeMonth]?.budget ?? monthlyBudget)
    : monthlyBudget

  const activeMonthIncome = isViewingPast
    ? (monthlyHistory[activeMonth]?.income ?? monthlyIncome)
    : monthlyIncome

  const spentByPocket = useMemo(() => {
    const acc: Record<string, number> = Object.fromEntries(pockets.map(p => [p.id, 0]))
    for (const e of activeExpenses) if (e.pocketId in acc) acc[e.pocketId] += e.amount
    return acc
  }, [activeExpenses, pockets])

  const totalSpent = useMemo(
    () => activeExpenses.reduce((s, e) => s + e.amount, 0),
    [activeExpenses],
  )

  const extraIncomeTotal = useMemo(
    () => extraIncomes.reduce((s, e) => s + e.amount, 0),
    [extraIncomes],
  )

  const totalIncome = activeMonthIncome + (isViewingPast ? 0 : extraIncomeTotal)

  // ── Sheet handlers ─────────────────────────────────────────────────────────
  const openAddSheet  = useCallback(() => { setEditingExpense(null); setSheetOpen(true) }, [])
  const openEditSheet = useCallback((e: Expense) => { setEditingExpense(e); setSheetOpen(true) }, [])
  const closeSheet    = useCallback(() => { setSheetOpen(false); setEditingExpense(null) }, [])

  // ── Data handlers ──────────────────────────────────────────────────────────
  const handleSaveExpense = useCallback((payload: ExpensePayload) => {
    const { id, ...rest } = payload

    if (isViewingPast) {
      // Save into the historical record for activeMonth
      setMonthlyHistory(prev => {
        const rec = prev[activeMonth] ?? {
          expenses: [],
          totalSpent: 0,
          budget: activeMonthBudget,
          income: activeMonthIncome,
        }
        const newExpenses = id
          ? rec.expenses.map(e => e.id === id ? { ...e, ...rest } : e)
          : [...rec.expenses, { id: Date.now().toString(), ...rest }]
        return {
          ...prev,
          [activeMonth]: {
            ...rec,
            expenses: newExpenses,
            totalSpent: newExpenses.reduce((s, e) => s + e.amount, 0),
          },
        }
      })
    } else {
      if (id) {
        setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...rest } : e))
      } else {
        setExpenses(prev => [...prev, { id: Date.now().toString(), ...rest }])
      }
    }

    const key = normalizeKey(rest.concept)
    if (key && key !== 'gasto') {
      setConceptMap(prev => ({ ...prev, [key]: rest.pocketId }))
    }
  }, [isViewingPast, activeMonth, activeMonthBudget, activeMonthIncome])

  const handleDeleteExpense = useCallback((id: string) => {
    if (isViewingPast) {
      setMonthlyHistory(prev => {
        const rec = prev[activeMonth]
        if (!rec) return prev
        const newExpenses = rec.expenses.filter(e => e.id !== id)
        return {
          ...prev,
          [activeMonth]: {
            ...rec,
            expenses: newExpenses,
            totalSpent: newExpenses.reduce((s, e) => s + e.amount, 0),
          },
        }
      })
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id))
    }
  }, [isViewingPast, activeMonth])

  const handleEditPocket = useCallback((id: string, name: string, budget: number, icon?: string) => {
    setPockets(prev => prev.map(p => p.id === id ? { ...p, name, budget, icon } : p))
  }, [])

  const handleDeletePocket = useCallback((id: string) => {
    setPockets(prev => prev.filter(p => p.id !== id))
    setExpenses(prev => prev.filter(e => e.pocketId !== id))
  }, [])

  const handleAddPocket = useCallback((name: string, budget: number, icon?: string) => {
    setPockets(prev => [...prev, { id: Date.now().toString(), name, budget, icon }])
  }, [])

  const handleAddExtraIncome = useCallback((amount: number, note: string) => {
    setExtraIncomes(prev => [...prev, {
      id: Date.now().toString(),
      amount,
      note,
      date: new Date().toISOString(),
    }])
  }, [])

  const handleDeleteExtraIncome = useCallback((id: string) => {
    setExtraIncomes(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleClearData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setExpenses([])
    setExtraIncomes([])
    setPockets(DEFAULT_POCKETS)
    setMonthlyBudget(0)
    setMonthlyIncome(0)
    setConceptMap({})
    setCurrentMonth(getCurrentMonth())
    setMonthlyHistory({})
    setScreen('onboarding')
  }, [])

  const handleChangeCountry = useCallback((code: CountryCode) => {
    setCountryCode(code)
  }, [])

  const handleSetIncome = useCallback((income: number) => {
    setMonthlyIncome(income)
  }, [])

  const handleOnboardingComplete = useCallback((code: CountryCode, budget: number, income: number) => {
    setCountryCode(code)
    if (budget > 0) setMonthlyBudget(budget)
    if (income > 0) setMonthlyIncome(income)
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
            expenses={activeExpenses}
            pockets={pockets}
            monthlyBudget={activeMonthBudget}
            monthlyIncome={activeMonthIncome}
            extraIncomes={isViewingPast ? [] : extraIncomes}
            currentMonth={activeMonth}
            spentByPocket={spentByPocket}
            config={config}
            activeMonth={activeMonth}
            realCurrentMonth={currentMonth}
            onChangeMonth={setActiveMonth}
            onAdd={openAddSheet}
            onAddExtraIncome={() => setExtraIncomeSheetOpen(true)}
            onDeleteExtraIncome={handleDeleteExtraIncome}
          />
        )}
        {activeTab === 'movimientos' && (
          <TransactionsScreen
            expenses={activeExpenses}
            pockets={pockets}
            config={config}
            activeMonth={activeMonth}
            realCurrentMonth={currentMonth}
            onChangeMonth={setActiveMonth}
            onAdd={openAddSheet}
            onEdit={openEditSheet}
            onDelete={handleDeleteExpense}
          />
        )}
        {activeTab === 'presupuesto' && (
          <BudgetScreen
            monthlyBudget={activeMonthBudget}
            monthlyIncome={totalIncome}
            pockets={pockets}
            spentByPocket={spentByPocket}
            totalSpent={totalSpent}
            config={config}
            activeMonth={activeMonth}
            realCurrentMonth={currentMonth}
            onChangeMonth={setActiveMonth}
            onSetBudget={setMonthlyBudget}
            onEditPocket={handleEditPocket}
            onDeletePocket={handleDeletePocket}
            onAddPocket={handleAddPocket}
            isViewingPast={isViewingPast}
          />
        )}
        {activeTab === 'insights' && (
          <InsightsScreen
            expenses={expenses}
            pockets={pockets}
            spentByPocket={spentByPocket}
            monthlyBudget={monthlyBudget}
            monthlyIncome={totalIncome}
            monthlyHistory={monthlyHistory}
            config={config}
          />
        )}
        {activeTab === 'perfil' && (
          <ProfileScreen
            expenseCount={expenses.length}
            pocketCount={pockets.length}
            currentMonth={currentMonth}
            monthlyHistory={monthlyHistory}
            monthlyBudget={monthlyBudget}
            monthlyIncome={monthlyIncome}
            config={config}
            onClearData={handleClearData}
            onSetIncome={handleSetIncome}
          />
        )}
      </div>

      <BottomNavigation active={activeTab} onChange={setActiveTab} />

      <AddExpenseSheet
        isOpen={sheetOpen}
        editingExpense={editingExpense}
        pockets={pockets}
        conceptMap={conceptMap}
        config={config}
        onSave={handleSaveExpense}
        onSaveIncome={handleAddExtraIncome}
        onClose={closeSheet}
      />

      <AddExtraIncomeSheet
        isOpen={extraIncomeSheetOpen}
        config={config}
        onSave={handleAddExtraIncome}
        onClose={() => setExtraIncomeSheetOpen(false)}
      />
    </div>
  )
}
