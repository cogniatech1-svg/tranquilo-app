'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import { AddExpenseSheet } from '../components/AddExpenseSheet'
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
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlySavings, setMonthlySavings] = useState(0)
  const [pockets,       setPockets]       = useState<Pocket[]>(DEFAULT_POCKETS)
  const [expenses,      setExpenses]      = useState<Expense[]>([])
  const [extraIncomes,  setExtraIncomes]  = useState<ExtraIncome[]>([])
  const [conceptMap,    setConceptMap]    = useState<Record<string, string>>({})
  const [currentMonth,  setCurrentMonth]  = useState<string>(getCurrentMonth)
  const [monthlyHistory, setMonthlyHistory] = useState<
    Record<string, { expenses: Expense[]; totalSpent: number; budget: number; income?: number }>
  >({})

  const [activeMonth,          setActiveMonth]           = useState<string>(getCurrentMonth)
  const [isPrivacyMode,        setIsPrivacyMode]         = useState(false)
  const [learnedCategoryMap,   setLearnedCategoryMap]    = useState<Record<string, string>>({})

  const [sheetOpen,        setSheetOpen]        = useState(false)
  const [editingExpense,   setEditingExpense]   = useState<Expense | null>(null)
  const [editingIncome,    setEditingIncome]    = useState<ExtraIncome | null>(null)
  const [defaultSheetType, setDefaultSheetType] = useState<'income' | 'expense' | null>(null)

  const config: CountryConfig = COUNTRIES[countryCode]

  // ── Derived state ──────────────────────────────────────────────────────────
  // presupuesto = ingresos - ahorro (SIEMPRE)
  const monthlyBudget = useMemo(
    () => Math.max(0, monthlyIncome - monthlySavings),
    [monthlyIncome, monthlySavings]
  )

  // ── Load from localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    try {
      // Check if user has completed onboarding
      const hasOnboarded = localStorage.getItem(ONBOARDING_FLAG) === 'true'

      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as StoredData
        const thisMonth  = getCurrentMonth()
        // For backwards compatibility, read old budget but don't use it
        // New arch: presupuesto = ingresos - ahorro (calculated, not stored)
        const income     = data.monthlyIncome ?? 0
        const normalised = normalizePockets(data.pockets?.length ? data.pockets : DEFAULT_POCKETS)
        const history    = data.monthlyHistory ?? {}
        const country    = (data.countryCode as CountryCode) ?? 'CO'

        setCountryCode(country)

        // Calculate suggested savings if not set
        const savings = data.monthlySavings ?? (income > 0 ? Math.round(income * 0.20) : 0)

        if (data.currentMonth && data.currentMonth !== thisMonth) {
          // New month — archive previous, reset monthly data
          if ((data.expenses?.length ?? 0) > 0) {
            const totalSpent = (data.expenses ?? []).reduce((s, e) => s + e.amount, 0)
            history[data.currentMonth] = {
              expenses: data.expenses ?? [],
              totalSpent,
              budget: Math.max(0, income - savings),  // Calculated budget for history
              income,
            }
          }
          setCurrentMonth(thisMonth)
          setPockets(normalised)
          setMonthlyIncome(income)
          setMonthlySavings(savings)
          setConceptMap(data.conceptMap ?? {})
          setLearnedCategoryMap(data.learnedCategoryMap ?? {})
          setExpenses([])
          setExtraIncomes([])           // extras are monthly — reset on new month
          setMonthlyHistory(history)
          if (hasOnboarded) setScreen('main')
        } else {
          setCurrentMonth(data.currentMonth ?? thisMonth)
          setPockets(normalised)
          setMonthlyIncome(income)
          setMonthlySavings(savings)
          setExpenses(data.expenses ?? [])
          setExtraIncomes(data.extraIncomes ?? [])
          setConceptMap(data.conceptMap ?? {})
          setLearnedCategoryMap(data.learnedCategoryMap ?? {})
          setMonthlyHistory(history)
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        expenses,
        extraIncomes,
        pockets,
        monthlyIncome,
        monthlySavings,
        conceptMap,
        learnedCategoryMap,
        currentMonth,
        monthlyHistory,
        countryCode,
        isPrivacyMode,
      }),
    )
  }, [hydrated, expenses, extraIncomes, pockets, monthlyIncome, monthlySavings, conceptMap, learnedCategoryMap, currentMonth, monthlyHistory, countryCode, isPrivacyMode])

  // ── Save extraIncomes to monthlyHistory when changing months ────────────────
  // Cuando el usuario navega entre meses, guardar los extraIncomes actuales en el histórico
  const [prevActiveMonth, setPrevActiveMonth] = useState<string>(getCurrentMonth)
  useEffect(() => {
    if (!hydrated || !prevActiveMonth) return

    // Si cambias DE un mes a otro, guarda los extraIncomes del mes anterior
    if (prevActiveMonth !== activeMonth) {
      setMonthlyHistory(prev => ({
        ...prev,
        [prevActiveMonth]: {
          ...(prev[prevActiveMonth] || {}),
          extraIncomes: extraIncomes, // Guardar los extraIncomes del mes que estabas viendo
        },
      }))
    }

    setPrevActiveMonth(activeMonth)
  }, [hydrated, activeMonth, extraIncomes])

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

  // IMPORTANTE: Cargar extraIncomes del mes actual o del histórico
  const activeExtraIncomes = isViewingPast
    ? (monthlyHistory[activeMonth]?.extraIncomes ?? [])
    : extraIncomes

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
    () => activeExtraIncomes.reduce((s, e) => s + e.amount, 0),
    [activeExtraIncomes],
  )

  // CORRECCIÓN: SIEMPRE sumar extraIncomes (incluso en meses pasados)
  const totalIncome = activeMonthIncome + extraIncomeTotal

  // ── Sheet handlers ─────────────────────────────────────────────────────────
  const openAddSheet        = useCallback(() => { setEditingExpense(null); setEditingIncome(null); setDefaultSheetType(null); setSheetOpen(true) }, [])
  const openEditSheet       = useCallback((e: Expense) => { setEditingExpense(e); setEditingIncome(null); setDefaultSheetType(null); setSheetOpen(true) }, [])
  const openEditIncomeSheet = useCallback((i: ExtraIncome) => { setEditingIncome(i); setEditingExpense(null); setDefaultSheetType('income'); setSheetOpen(true) }, [])
  const closeSheet          = useCallback(() => { setSheetOpen(false); setEditingExpense(null); setEditingIncome(null); setDefaultSheetType(null) }, [])

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

  const handleSwitchExpenseToIncome = useCallback((expenseId: string, amount: number, note: string, date: string) => {
    if (isViewingPast) {
      setMonthlyHistory(prev => {
        const rec = prev[activeMonth]
        if (!rec) return prev
        const newExpenses = rec.expenses.filter(e => e.id !== expenseId)
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
      setExpenses(prev => prev.filter(e => e.id !== expenseId))
    }
    setExtraIncomes(prev => [...prev, {
      id: Date.now().toString(),
      amount,
      note,
      date,
      category: 'extra' as const,
    }])
  }, [isViewingPast, activeMonth])

  const handleEditPocket = useCallback((id: string, name: string, budget: number, icon?: string) => {
    // VALIDACIÓN: sum(pockets) <= monthlyBudget
    const otherPockets = pockets.filter(p => p.id !== id)
    const sumWithoutThis = otherPockets.reduce((s, p) => s + p.budget, 0)
    const totalIfEdited = sumWithoutThis + budget

    if (totalIfEdited > monthlyBudget) {
      alert(`❌ No puedes asignar más de lo disponible.\n\nPresupuesto: $${monthlyBudget}\nAsignado (sin este bolsillo): $${sumWithoutThis}\nIntentando asignar: $${budget}\nTotal resultaría en: $${totalIfEdited}`)
      return false
    }

    setPockets(prev => prev.map(p => p.id === id ? { ...p, name, budget, icon } : p))
    return true
  }, [pockets, monthlyBudget])

  const handleDeletePocket = useCallback((id: string) => {
    setPockets(prev => prev.filter(p => p.id !== id))
    setExpenses(prev => prev.filter(e => e.pocketId !== id))
  }, [])

  const handleAddPocket = useCallback((name: string, budget: number, icon?: string) => {
    // VALIDACIÓN: sum(pockets) <= monthlyBudget
    const currentTotal = pockets.reduce((s, p) => s + p.budget, 0)
    const totalIfAdded = currentTotal + budget

    if (totalIfAdded > monthlyBudget) {
      alert(`❌ No puedes asignar más de lo disponible.\n\nPresupuesto: $${monthlyBudget}\nActualmente asignado: $${currentTotal}\nIntentando agregar: $${budget}\nTotal resultaría en: $${totalIfAdded}`)
      return false
    }

    setPockets(prev => [...prev, { id: Date.now().toString(), name, budget, icon }])
    return true
  }, [pockets, monthlyBudget])

  const handleAddExtraIncome = useCallback((amount: number, note: string) => {
    setExtraIncomes(prev => [...prev, {
      id: Date.now().toString(),
      amount,
      note,
      date: new Date().toISOString(),
      category: 'extra' as const,
    }])
  }, [])

  const handleDeleteExtraIncome = useCallback((id: string) => {
    setExtraIncomes(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleUpdateExtraIncome = useCallback((id: string, amount: number, note: string, date: string) => {
    setExtraIncomes(prev => prev.map(e => e.id === id ? { ...e, amount, note, date } : e))
  }, [])

  const handleClearData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ONBOARDING_FLAG)
    setExpenses([])
    setExtraIncomes([])
    setPockets(DEFAULT_POCKETS)
    setMonthlyIncome(0)
    setMonthlySavings(0)
    setConceptMap({})
    setLearnedCategoryMap({})
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

  const handleTogglePrivacy = useCallback(() => {
    setIsPrivacyMode(prev => !prev)
  }, [])

  const handleOnboardingComplete = useCallback((code: CountryCode, budget: number, income: number) => {
    // Mark onboarding as complete
    localStorage.setItem(ONBOARDING_FLAG, 'true')

    setCountryCode(code)
    // Note: budget is no longer stored separately
    // presupuesto = ingresos - ahorro (calculated dynamically)
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
            extraIncomes={activeExtraIncomes}
            currentMonth={activeMonth}
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
            expenses={activeExpenses}
            extraIncomes={activeExtraIncomes}
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
            monthlyBudget={activeMonthBudget}
            monthlyIncome={monthlyIncome}
            monthlySavings={monthlySavings}
            pockets={pockets}
            spentByPocket={spentByPocket}
            totalSpent={totalSpent}
            config={config}
            activeMonth={activeMonth}
            realCurrentMonth={currentMonth}
            onChangeMonth={setActiveMonth}
            onSetIncome={setMonthlyIncome}
            onSetSavings={setMonthlySavings}
            onEditPocket={handleEditPocket}
            onDeletePocket={handleDeletePocket}
            onAddPocket={handleAddPocket}
            isViewingPast={isViewingPast}
            isPrivacyMode={isPrivacyMode}
          />
        )}
        {activeTab === 'insights' && (
          <InsightsScreen
            expenses={activeExpenses}
            pockets={pockets}
            spentByPocket={spentByPocket}
            monthlyBudget={activeMonthBudget}
            monthlyIncome={totalIncome}
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
