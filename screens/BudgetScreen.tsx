'use client'

// Rebuild trigger
import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { PocketCard } from '../components/PocketCard'
import { Icon } from '../components/ui/Icon'
import { DS, maskMoney } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Pocket } from '../lib/types'
import type { FinancialSnapshot } from '../lib/financialEngine'
import { parseAmount } from '../lib/utils'
import { MonthNavigator } from '../components/MonthNavigator'
import { EmojiPicker } from '../components/EmojiPicker'
import { guessIconFromName } from '../lib/config'

interface Props {
  snapshot: FinancialSnapshot // ÚNICA FUENTE DE VERDAD
  pockets: Pocket[]
  spentByPocket: Record<string, number>
  config: CountryConfig
  activeMonth: string
  realCurrentMonth: string
  onChangeMonth: (m: string) => void
  isViewingPast: boolean
  onSetIncome: (v: number) => void
  onSetSavings: (v: number) => void
  onSetManualBudget: (v: number) => void
  onEditPocket: (id: string, name: string, budget: number) => void
  onDeletePocket: (id: string) => void
  onAddPocket: (name: string, budget: number, icon?: string) => void
  isPrivacyMode?: boolean
  manualBudget?: number // Para saber si hay presupuesto manual activo
  cumulativeSavings?: { totalByYear: Record<number, number>; total: number }
}

export function BudgetScreen({
  snapshot,
  pockets,
  spentByPocket,
  config,
  activeMonth,
  realCurrentMonth,
  onChangeMonth,
  isViewingPast,
  onSetIncome,
  onSetSavings,
  onSetManualBudget,
  manualBudget,
  onEditPocket,
  onDeletePocket,
  onAddPocket,
  isPrivacyMode = false,
  cumulativeSavings,
}: Props) {
  // EXTRAER DEL SNAPSHOT (ÚNICA FUENTE DE VERDAD)
  const {
    totalIncome,
    totalExpenses: totalSpent,
    budget: monthlyBudget,
    savings: monthlySavings,
    carryOver,
    totalAvailable,
  } = snapshot

  // El mes activo está en el futuro respecto al mes real actual
  const isViewingFuture = activeMonth > realCurrentMonth

  const mm = (n: number) => maskMoney(n, config, isPrivacyMode)
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')
  const [editingSavings, setEditingSavings] = useState(false)
  const [savingsInput, setSavingsInput] = useState('')
  const [savingsPercentage, setSavingsPercentage] = useState('')
  const [budgetEditMode, setBudgetEditMode] = useState<'savings' | 'budget'>('savings')
  const [addingPocket, setAddingPocket] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const autoIcon = guessIconFromName(newName)
  const selectedIcon = newIcon || autoIcon

  // DEBUG: Log cumulative savings
  if (cumulativeSavings) {
    console.log('[BudgetScreen] cumulativeSavings:', cumulativeSavings)
  }

  const saveIncome = () => {
    const v = parseAmount(incomeInput)
    if (v > 0) {
      onSetIncome(v)
      setEditingIncome(false)
      setIncomeInput('')
    }
  }

  const saveSavings = () => {
    if (budgetEditMode === 'budget' && savingsInput) {
      const newBudgetValue = parseAmount(savingsInput)
      if (newBudgetValue > totalIncome) {
        alert(
          `❌ El presupuesto no puede exceder tus ingresos.\n\nIngresos totales: ${mm(totalIncome)}\nIntentaste establecer: ${mm(newBudgetValue)}`
        )
        return
      }
      onSetManualBudget(newBudgetValue)
      setEditingSavings(false)
      setSavingsInput('')
      setSavingsPercentage('')
      setBudgetEditMode('savings')
    } else {
      let newSavingsValue = monthlySavings
      if (savingsInput) {
        newSavingsValue = parseAmount(savingsInput)
      } else if (savingsPercentage && totalIncome > 0) {
        const pct = parseAmount(savingsPercentage)
        newSavingsValue = Math.round(totalIncome * (pct / 100))
      }
      if (newSavingsValue >= 0 && newSavingsValue <= totalIncome) {
        onSetSavings(newSavingsValue)
        setEditingSavings(false)
        setSavingsInput('')
        setSavingsPercentage('')
        setBudgetEditMode('savings')
      }
    }
  }

  const savingsPercentageValue =
    totalIncome > 0 ? Math.round((monthlySavings / totalIncome) * 100) : 0

  const addPocket = () => {
    if (!newName.trim()) return

    const budgetAmount = parseAmount(newBudget)

    // Sin validación: el usuario decide cómo asignar su presupuesto
    // El financial engine mostrará visualmente si es sostenible (status, savings, etc)
    onAddPocket(newName.trim(), budgetAmount, newIcon || undefined)
    setNewName('')
    setNewBudget('')
    setNewIcon('')
    setAddingPocket(false)
  }

  const globalRatio = monthlyBudget > 0 ? totalSpent / monthlyBudget : 0
  const totalPocketBudget = pockets.reduce((s, p) => s + p.budget, 0)
  const hasBudget = monthlyBudget > 0
  // Budget-first: how much of the budget has been split across pockets
  const unassigned = hasBudget ? monthlyBudget - totalPocketBudget : 0
  const assignedPct = hasBudget ? Math.round((totalPocketBudget / monthlyBudget) * 100) : 0
  // Check if user budgeted more than monthly income
  const isOverBudget = totalPocketBudget > totalIncome

  // ── Exceeded pocket tracking ──────────────────────────────────────────────
  const exceededPockets = pockets.filter(
    (p) => p.budget > 0 && (spentByPocket[p.id] ?? 0) > p.budget
  )
  const totalExcess = exceededPockets.reduce((s, p) => s + (spentByPocket[p.id] ?? 0) - p.budget, 0)
  const budgetRemaining = monthlyBudget > 0 ? monthlyBudget - totalSpent : null

  return (
    <div className="pb-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-5 bg-white border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500 mb-1">
          Control
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Presupuesto</h1>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* ── 0. INGRESOS MENSUALES ─────────────────────────────────────── */}
        {/* Input field ONLY renders when editingIncome=true (user explicitly tapped).
            This prevents mobile keyboards from auto-opening on tab switch. */}
        {editingIncome ? (
          <Card className="p-5 space-y-4">
            <SectionHeader>Ingresos mensuales</SectionHeader>
            <div className="flex gap-2.5">
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                placeholder={`ej. ${config.defaultBudget.toLocaleString()}`}
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveIncome()}
                className="flex-1 min-w-0 border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none transition-colors bg-slate-50 focus:bg-white"
              />
              <PrimaryButton onClick={saveIncome} className="px-5 py-3 text-sm shrink-0">
                Guardar
              </PrimaryButton>
              <button
                onClick={() => {
                  setEditingIncome(false)
                  setIncomeInput('')
                }}
                className="px-3 text-slate-500 hover:text-slate-600"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          </Card>
        ) : (
          <Card
            className="p-5 cursor-pointer active:opacity-80"
            onClick={() => {
              setEditingIncome(true)
              setIncomeInput(totalIncome > 0 ? String(totalIncome) : '')
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">
                Ingresos mensuales
              </p>
              <span
                className="text-xs font-semibold transition-colors"
                style={{ color: DS.primary }}
              >
                Editar
              </span>
            </div>
            {totalIncome === 0 ? (
              <p className="text-2xl font-bold text-slate-400">Toca para configurar</p>
            ) : (
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{mm(totalIncome)}</p>
            )}
          </Card>
        )}

        {/* ── 1.5. EDITABLE BUDGET (Presupuesto a gastar) ────────────────────────────────────── */}
        {totalIncome > 0 && !editingSavings && (
          <Card className="p-5">
            <div className="flex items-start justify-between mb-5">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">
                Presupuesto a gastar
              </p>
              <button
                onClick={() => {
                  setEditingSavings(true)
                  setSavingsInput(String(monthlySavings))
                  setSavingsPercentage(String(savingsPercentageValue))
                }}
                className="text-xs font-semibold transition-colors"
                style={{ color: DS.primary }}
              >
                Editar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Presupuesto */}
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500 mb-2">
                  Presupuesto{' '}
                  {manualBudget && manualBudget > 0 && (
                    <span className="text-red-500">(manual)</span>
                  )}
                </p>
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{ color: isOverBudget ? '#EF4444' : '#0F172A' }}
                >
                  {mm(monthlyBudget)}
                </p>
                {manualBudget && manualBudget > 0 && (
                  <button
                    onClick={() => onSetManualBudget(0)}
                    className="mt-2 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    ✕ Desactivar
                  </button>
                )}
              </div>
              {/* Gastado */}
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500 mb-2">
                  Gastado
                </p>
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{ color: totalSpent > monthlyBudget ? '#EF4444' : '#0F172A' }}
                >
                  {mm(totalSpent)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ── 1.6. AHORRO AUTOMÁTICO (Read-only) ────────────────────────────────────── */}
        {totalIncome > 0 && !editingSavings && (
          <Card className="p-5">
            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500 mb-4">
              Ahorro automático
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{mm(monthlySavings)}</p>
            <p className="text-sm text-slate-500 mt-2 tabular-nums">
              {savingsPercentageValue}% de tus ingresos
            </p>
          </Card>
        )}

        {/* ── 1.7. AHORRO ACUMULADO ───────────────────────────────────────── */}
        {/* Card removida de Presupuesto — lógica y datos intactos en page.tsx  */}
        {/* cumulativeSavings sigue disponible para Insights / futuras métricas  */}

        {/* ── 2. DISTRIBUCIÓN ────────────────────────────────────────────── */}
        {hasBudget && (
          <div
            className="rounded-2xl overflow-hidden bg-white border border-slate-100"
            style={{ boxShadow: '0 1px 6px rgba(15,23,42,.06)' }}
          >
            <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">
                distribución
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              {/* Asignado a bolsillos */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500 mb-1">
                  Asignado
                </p>
                <p
                  className="text-sm font-bold tabular-nums leading-tight"
                  style={{ color: isOverBudget ? '#EF4444' : DS.primary }}
                >
                  {mm(totalPocketBudget)}
                </p>
                {assignedPct > 0 && (
                  <p className="text-[9px] text-slate-500 mt-0.5">{assignedPct}%</p>
                )}
              </div>
              {/* Sin asignar */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500 mb-1">
                  Sin asignar
                </p>
                <p
                  className="text-sm font-bold tabular-nums leading-tight"
                  style={{ color: unassigned >= 0 ? '#16A34A' : '#EF4444' }}
                >
                  {unassigned >= 0 ? mm(unassigned) : `−${mm(-unassigned)}`}
                </p>
              </div>
            </div>
            {/* Allocation bar */}
            <div className="h-1 bg-slate-100 mx-4 mb-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, assignedPct)}%`,
                  background:
                    assignedPct > 100 ? '#EF4444' : 'linear-gradient(90deg, #0f766e, #14b8a6)',
                }}
              />
            </div>
          </div>
        )}

        {/* ── 1.5b. BUDGET EDIT MODE ────────────────────────────────────── */}
        {totalIncome > 0 && editingSavings && (
          <Card className="p-5 space-y-4">
            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">
              Editar presupuesto
            </p>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => {
                  setBudgetEditMode('savings')
                  setSavingsInput('')
                }}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${budgetEditMode === 'savings' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500'}`}
              >
                Editar ahorro
              </button>
              <button
                onClick={() => {
                  setBudgetEditMode('budget')
                  setSavingsInput('')
                }}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${budgetEditMode === 'budget' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500'}`}
              >
                Editar presupuesto
              </button>
            </div>

            {budgetEditMode === 'savings' ? (
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-[.12em] text-slate-600 block mb-2">
                  Ahorro mensual
                </label>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  placeholder={`ej. ${mm(monthlySavings)}`}
                  value={savingsInput}
                  onChange={(e) => setSavingsInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveSavings()}
                  className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
                />
                <p className="text-[9px] text-slate-500 mt-2">
                  Presupuesto resultante:{' '}
                  {savingsInput
                    ? mm(Math.max(0, totalIncome - parseAmount(savingsInput)))
                    : mm(monthlyBudget)}
                </p>
              </div>
            ) : (
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-[.12em] text-slate-600 block mb-2">
                  Presupuesto a gastar
                </label>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  placeholder={`ej. ${mm(monthlyBudget)}`}
                  value={savingsInput}
                  onChange={(e) => setSavingsInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveSavings()}
                  className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
                />
                <p className="text-[9px] text-slate-500 mt-2">Máximo: {mm(totalIncome)}</p>
              </div>
            )}

            <div className="flex gap-2.5">
              <PrimaryButton onClick={saveSavings} className="flex-1 py-3 text-sm">
                Guardar
              </PrimaryButton>
              <button
                onClick={() => {
                  setEditingSavings(false)
                  setSavingsInput('')
                  setSavingsPercentage('')
                  setBudgetEditMode('savings')
                }}
                className="px-4 py-3 text-slate-500 text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </Card>
        )}

        {/* ── Month navigator ───────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-4 py-3"
          style={{
            background: isViewingPast
              ? 'linear-gradient(135deg,#334155,#475569)'
              : 'linear-gradient(135deg,#0f766e,#0d9488)',
          }}
        >
          <MonthNavigator
            activeMonth={activeMonth}
            currentMonth={realCurrentMonth}
            onChange={onChangeMonth}
          />
        </div>

        {/* ── Pockets ────────────────────────────────────────────────────────── */}
        <div>
          {/* ALERTA CRÍTICA: Si unassigned < 0, bolsillos exceden presupuesto */}
          {unassigned < 0 && (
            <div
              style={{
                background: '#fee2e2',
                border: '2px solid #ef4444',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  color: '#991b1b',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  margin: '0 0 4px 0',
                }}
              >
                ⚠️ EXCESO CRÍTICO
              </p>
              <p style={{ color: '#991b1b', fontSize: '12px', margin: 0 }}>
                Bolsillos asignados (${mm(totalPocketBudget)}) SUPERAN presupuesto ($
                {mm(monthlyBudget)})
              </p>
            </div>
          )}

          <SectionHeader
            action={
              !addingPocket ? (
                <button onClick={() => setAddingPocket(true)}>+ Agregar</button>
              ) : undefined
            }
          >
            Bolsillos
            {totalPocketBudget > 0 && (
              <span className="text-[9px] font-normal text-slate-500 ml-2 normal-case tracking-normal">
                {mm(totalPocketBudget)} asignados de {mm(monthlyBudget)}
                {unassigned >= 0
                  ? ` (${mm(unassigned)} libre)`
                  : ` (${mm(-unassigned)} sobre límite)`}
              </span>
            )}
          </SectionHeader>

          {addingPocket && (
            <Card className="p-5 space-y-3 mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">
                Nuevo bolsillo
              </p>

              {/* Icon preview + name row */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(true)}
                  className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-2xl transition-all active:scale-95 shrink-0 relative"
                  title="Cambiar ícono"
                >
                  {selectedIcon}
                  <span className="absolute -bottom-1 -right-1 text-[10px] bg-teal-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    ✎
                  </span>
                </button>
                <input
                  autoFocus
                  placeholder="Nombre (ej. Transporte)"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    setNewIcon('')
                  }}
                  onKeyDown={(e) => e.key === 'Escape' && setAddingPocket(false)}
                  className="flex-1 border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              {newIcon && (
                <p className="text-[10px] text-teal-600 font-medium px-1">
                  Ícono personalizado ·{' '}
                  <button className="underline" onClick={() => setNewIcon('')}>
                    usar automático
                  </button>
                </p>
              )}

              <input
                placeholder={`Presupuesto (ej. ${Math.round(config.defaultBudget / 5).toLocaleString()})`}
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addPocket()
                  if (e.key === 'Escape') setAddingPocket(false)
                }}
                inputMode="numeric"
                className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
              />
              <div className="flex gap-2.5">
                <PrimaryButton onClick={addPocket} className="flex-1 py-3 text-sm">
                  Agregar
                </PrimaryButton>
                <button
                  onClick={() => {
                    setAddingPocket(false)
                    setNewName('')
                    setNewBudget('')
                    setNewIcon('')
                  }}
                  className="px-4 py-3 text-slate-500 text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </Card>
          )}

          {showEmojiPicker && (
            <EmojiPicker
              current={selectedIcon}
              onSelect={setNewIcon}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            {pockets.map((p, i) => {
              const spent = spentByPocket[p.id] ?? 0
              return (
                <PocketCard
                  key={p.id}
                  pocket={p}
                  spent={spent}
                  pocketIndex={i}
                  config={config}
                  onEdit={onEditPocket}
                  onDelete={onDeletePocket}
                  isPrivacyMode={isPrivacyMode}
                  expenseCount={spent > 0 ? 1 : 0}
                />
              )
            })}
          </div>
        </div>

        {/* ── Exceeded pockets impact ──────────────────────────────────────── */}
        {exceededPockets.length > 0 && (
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: '#FFF5F5', border: '1px solid rgba(239,68,68,.18)' }}
          >
            <div className="flex items-start gap-2.5 mb-3">
              <span className="text-base leading-none mt-0.5 shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-bold text-red-800">
                  {exceededPockets.length === 1
                    ? '1 bolsillo excedido'
                    : `${exceededPockets.length} bolsillos excedidos`}
                </p>
                <p className="text-xs text-red-600 mt-0.5 tabular-nums">
                  Exceso total: {mm(totalExcess)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 mb-3">
              {exceededPockets.map((p) => {
                const exc = (spentByPocket[p.id] ?? 0) - p.budget
                return (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-xs text-red-700 font-medium">{p.name}</span>
                    <span className="text-xs font-bold text-red-600 tabular-nums">+{mm(exc)}</span>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-red-600 border-t border-red-100 pt-2.5 leading-relaxed">
              Esto reduce tu presupuesto disponible.{' '}
              {budgetRemaining !== null && (
                <>
                  Quedan{' '}
                  <span className="font-bold tabular-nums">
                    {budgetRemaining >= 0 ? mm(budgetRemaining) : `−${mm(-budgetRemaining)}`}
                  </span>
                  {budgetRemaining < 0 ? ' (presupuesto excedido).' : ' del presupuesto total.'}
                </>
              )}
            </p>
          </div>
        )}

        {/* ── Restante por asignar ─────────────────────────────────────────── */}
        {hasBudget && unassigned > 0 && (
          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)',
              border: '1px solid rgba(21,128,61,.15)',
            }}
          >
            <p className="text-sm font-bold text-slate-800 mb-1">
              {mm(unassigned)} Disponibles por asignar
            </p>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Esta parte del presupuesto no está asignada a ningún bolsillo. Puedes:
            </p>
            <div className="space-y-2">
              {[
                { emoji: '➕', text: 'Crear un nuevo bolsillo para ese gasto' },
                { emoji: '🏦', text: 'Reservarlo como ahorro del mes' },
                { emoji: '🛡️', text: 'Dejarlo como colchón para imprevistos' },
              ].map(({ emoji, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{emoji}</span>
                  <p className="text-xs font-medium text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bolsillos sobre-asignados ─────────────────────────────────────── */}
        {hasBudget && unassigned < 0 && (
          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: '#FFF7ED',
              border: '1px solid rgba(234,88,12,.15)',
            }}
          >
            <p className="text-sm font-bold text-orange-800 mb-1">
              Bolsillos sobre-asignados en {mm(-unassigned)}
            </p>
            <p className="text-xs text-orange-600 leading-relaxed">
              Los presupuestos de tus bolsillos superan el presupuesto total. Reduce alguno para
              cuadrar.
            </p>
          </div>
        )}

        {/* ── DISPONIBLE REAL (carry-over) ─────────────────────────────────── */}
        {/* At the bottom: shows accumulated balance/deficit from prior months.
            Visible whenever carryOver ≠ 0, regardless of whether income is set. */}
        {!editingIncome && carryOver !== 0 && (
          <Card className="p-5 border-l-4 border-teal-600">
            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500 mb-4">
              Disponible real
            </p>
            <div className="space-y-2.5">
              {/* Row 1: Ingresos del mes — only when income is set */}
              {totalIncome > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Ingresos del mes</span>
                  <span className="text-sm font-semibold text-slate-700 tabular-nums">
                    {mm(totalIncome)}
                  </span>
                </div>
              )}

              {/* Row 2: Balance acumulado / Déficit acumulado */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center gap-1.5">
                  {carryOver > 0 ? 'Balance acumulado' : 'Déficit acumulado'}
                  {isViewingFuture && (
                    <span className="text-[9px] text-slate-400 font-medium tracking-wide">
                      proyección
                    </span>
                  )}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: carryOver > 0 ? '#0d9488' : '#EF4444' }}
                >
                  {carryOver > 0 ? `+${mm(carryOver)}` : `−${mm(-carryOver)}`}
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100" />

              {/* Row 3: Total disponible */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Total disponible</span>
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {totalAvailable >= 0 ? mm(totalAvailable) : `−${mm(-totalAvailable)}`}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
