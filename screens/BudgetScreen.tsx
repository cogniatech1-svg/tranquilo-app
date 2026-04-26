'use client'

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
import { parseAmount } from '../lib/utils'
import { MonthNavigator } from '../components/MonthNavigator'
import { EmojiPicker } from '../components/EmojiPicker'
import { guessIconFromName } from '../lib/config'

interface Props {
  monthlyBudget: number
  monthlyIncome: number
  monthlySavings: number
  pockets: Pocket[]
  spentByPocket: Record<string, number>
  totalSpent: number
  config: CountryConfig
  activeMonth: string
  realCurrentMonth: string
  onChangeMonth: (m: string) => void
  isViewingPast: boolean
  onSetBudget: (v: number) => void
  onSetSavings: (v: number) => void
  onEditPocket: (id: string, name: string, budget: number) => void
  onDeletePocket: (id: string) => void
  onAddPocket: (name: string, budget: number, icon?: string) => void
  isPrivacyMode?: boolean
}

export function BudgetScreen({
  monthlyBudget,
  monthlyIncome,
  monthlySavings,
  pockets,
  spentByPocket,
  totalSpent,
  config,
  activeMonth,
  realCurrentMonth,
  onChangeMonth,
  isViewingPast,
  onSetBudget,
  onSetSavings,
  onEditPocket,
  onDeletePocket,
  onAddPocket,
  isPrivacyMode = false,
}: Props) {
  const mm = (n: number) => maskMoney(n, config, isPrivacyMode)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [editingSavings, setEditingSavings] = useState(false)
  const [savingsInput, setSavingsInput] = useState('')
  const [savingsPercentage, setSavingsPercentage] = useState('')
  const [addingPocket, setAddingPocket] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const autoIcon = guessIconFromName(newName)
  const selectedIcon = newIcon || autoIcon

  const saveBudget = () => {
    const v = parseAmount(budgetInput)
    if (v > 0) {
      onSetBudget(v)
      setEditingBudget(false)
      setBudgetInput('')
    }
  }

  const saveSavings = () => {
    let newSavings = monthlySavings
    if (savingsInput) {
      newSavings = parseAmount(savingsInput)
    } else if (savingsPercentage && monthlyIncome > 0) {
      const pct = parseAmount(savingsPercentage)
      newSavings = Math.round(monthlyIncome * (pct / 100))
    }
    if (newSavings >= 0) {
      onSetSavings(newSavings)
      setEditingSavings(false)
      setSavingsInput('')
      setSavingsPercentage('')
    }
  }

  const savingsPercentageValue = monthlyIncome > 0
    ? Math.round((monthlySavings / monthlyIncome) * 100)
    : 0

  const addPocket = () => {
    if (!newName.trim()) return
    onAddPocket(newName.trim(), parseAmount(newBudget), newIcon || undefined)
    setNewName('')
    setNewBudget('')
    setNewIcon('')
    setAddingPocket(false)
  }

  const globalRatio = monthlyBudget > 0 ? totalSpent / monthlyBudget : 0
  const totalPocketBudget = pockets.reduce((s, p) => s + p.budget, 0)
  const hasBudget   = monthlyBudget > 0
  // Budget-first: how much of the budget has been split across pockets
  const unassigned  = hasBudget ? monthlyBudget - totalPocketBudget : 0
  const assignedPct = hasBudget
    ? Math.round((totalPocketBudget / monthlyBudget) * 100)
    : 0

  // ── Exceeded pocket tracking ──────────────────────────────────────────────
  const exceededPockets = pockets.filter(p => p.budget > 0 && (spentByPocket[p.id] ?? 0) > p.budget)
  const totalExcess     = exceededPockets.reduce((s, p) => s + (spentByPocket[p.id] ?? 0) - p.budget, 0)
  const budgetRemaining = monthlyBudget > 0 ? monthlyBudget - totalSpent : null

  return (
    <div className="pb-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-5 bg-white border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400 mb-1">
          Control
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Presupuesto</h1>
      </div>

      <div className="px-4 pt-5 space-y-6">

        {/* ── 1. ORIGEN DEL DINERO ──────────────────────────────────────── */}
        {monthlyIncome > 0 && (
          <div
            className="rounded-2xl overflow-hidden bg-white border border-slate-100"
            style={{ boxShadow: '0 1px 6px rgba(15,23,42,.06)' }}
          >
            <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">origen del dinero</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {/* Ingresos */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Ingresos</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums leading-tight">
                  {mm(monthlyIncome)}
                </p>
              </div>
              {/* Ahorro */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Ahorro</p>
                <p
                  className="text-sm font-bold tabular-nums leading-tight"
                  style={{ color: monthlySavings > 0 ? '#16A34A' : '#94A3B8' }}
                >
                  {mm(monthlySavings)}
                </p>
              </div>
              {/* Disponible (presupuesto) */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">A gastar</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums leading-tight">
                  {mm(monthlyBudget)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 1.5. EDITABLE SAVINGS ────────────────────────────────────── */}
        {monthlyIncome > 0 && !editingSavings && (
          <Card className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
                Ahorro sugerido
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
            <p className="text-lg font-bold text-slate-900 tabular-nums">
              {mm(monthlySavings)}
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({savingsPercentageValue}%)
              </span>
            </p>
          </Card>
        )}

        {/* ── 1.5b. SAVINGS EDIT MODE ────────────────────────────────────── */}
        {monthlyIncome > 0 && editingSavings && (
          <Card className="p-5 space-y-4">
            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
              Editar ahorro
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-[.12em] text-slate-600 block mb-2">
                  Monto
                </label>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  placeholder={`ej. ${mm(monthlySavings)}`}
                  value={savingsInput}
                  onChange={e => {
                    setSavingsInput(e.target.value)
                    if (e.target.value) {
                      const amt = parseAmount(e.target.value)
                      const pct = monthlyIncome > 0 ? (amt / monthlyIncome) * 100 : 0
                      setSavingsPercentage(String(Math.round(pct)))
                    }
                  }}
                  onKeyDown={e => e.key === 'Enter' && saveSavings()}
                  className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-[.12em] text-slate-600 block mb-2">
                  Porcentaje
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="ej. 20"
                  value={savingsPercentage}
                  onChange={e => {
                    setSavingsPercentage(e.target.value)
                    if (e.target.value) {
                      const pct = parseAmount(e.target.value)
                      const amt = Math.round(monthlyIncome * (pct / 100))
                      setSavingsInput(String(amt))
                    }
                  }}
                  onKeyDown={e => e.key === 'Enter' && saveSavings()}
                  className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2.5">
              <PrimaryButton onClick={saveSavings} className="flex-1 py-3 text-sm">
                Guardar
              </PrimaryButton>
              <button
                onClick={() => {
                  setEditingSavings(false)
                  setSavingsInput('')
                  setSavingsPercentage('')
                }}
                className="px-4 py-3 text-slate-400 text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </Card>
        )}

        {/* ── 2. DISTRIBUCIÓN ────────────────────────────────────────────── */}
        {hasBudget && (
          <div
            className="rounded-2xl overflow-hidden bg-white border border-slate-100"
            style={{ boxShadow: '0 1px 6px rgba(15,23,42,.06)' }}
          >
            <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">distribución</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              {/* Asignado a bolsillos */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Asignado</p>
                <p className="text-sm font-bold tabular-nums leading-tight" style={{ color: DS.primary }}>
                  {mm(totalPocketBudget)}
                </p>
                {assignedPct > 0 && (
                  <p className="text-[9px] text-slate-400 mt-0.5">{assignedPct}%</p>
                )}
              </div>
              {/* Sin asignar */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Sin asignar</p>
                <p
                  className="text-sm font-bold tabular-nums leading-tight"
                  style={{ color: unassigned >= 0 ? '#16A34A' : '#EF4444' }}
                >
                  {unassigned >= 0
                    ? mm(unassigned)
                    : `−${mm(-unassigned)}`}
                </p>
              </div>
            </div>
            {/* Allocation bar */}
            <div className="h-1 bg-slate-100 mx-4 mb-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, assignedPct)}%`,
                  background: assignedPct > 100
                    ? '#EF4444'
                    : 'linear-gradient(90deg, #0f766e, #14b8a6)',
                }}
              />
            </div>
          </div>
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

        {/* ── Monthly budget ────────────────────────────────────────────────── */}
        {editingBudget || monthlyBudget === 0 ? (
          <Card className="p-5 space-y-4">
            <SectionHeader>Presupuesto mensual</SectionHeader>
            <div className="flex gap-2.5">
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                placeholder={`ej. ${config.defaultBudget.toLocaleString()}`}
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveBudget()}
                className="flex-1 min-w-0 border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none transition-colors bg-slate-50 focus:bg-white"
              />
              <PrimaryButton onClick={saveBudget} className="px-5 py-3 text-sm shrink-0">
                Guardar
              </PrimaryButton>
              {monthlyBudget > 0 && (
                <button
                  onClick={() => { setEditingBudget(false); setBudgetInput('') }}
                  className="px-3 text-slate-400 hover:text-slate-600"
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
                Presupuesto mensual
              </p>
              <button
                onClick={() => { setEditingBudget(true); setBudgetInput(String(monthlyBudget)) }}
                className="text-xs font-semibold transition-colors"
                style={{ color: DS.primary }}
              >
                Editar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Gastado</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">
                  {mm(totalSpent)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                  de {mm(monthlyBudget)} este mes
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Disponible</p>
                <p
                  className="text-xl font-bold tabular-nums"
                  style={{ color: totalSpent > monthlyBudget ? '#EF4444' : DS.primary }}
                >
                  {totalSpent > monthlyBudget
                    ? `−${mm(totalSpent - monthlyBudget)}`
                    : mm(monthlyBudget - totalSpent)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                  {Math.round(globalRatio * 100)}% usado
                </p>
              </div>
            </div>
            <ProgressBar ratio={globalRatio} thick />
          </Card>
        )}

        {/* ── Pockets ────────────────────────────────────────────────────────── */}
        <div>
          <SectionHeader
            action={
              !addingPocket ? (
                <button onClick={() => setAddingPocket(true)}>+ Agregar</button>
              ) : undefined
            }
          >
            Bolsillos
            {totalPocketBudget > 0 && (
              <span className="text-[9px] font-normal text-slate-400 ml-2 normal-case tracking-normal">
                {mm(totalPocketBudget)} asignados
              </span>
            )}
          </SectionHeader>

          {addingPocket && (
            <Card className="p-5 space-y-3 mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
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
                  <span className="absolute -bottom-1 -right-1 text-[10px] bg-teal-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">✎</span>
                </button>
                <input
                  autoFocus
                  placeholder="Nombre (ej. Transporte)"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setNewIcon('') }}
                  onKeyDown={e => e.key === 'Escape' && setAddingPocket(false)}
                  className="flex-1 border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              {newIcon && (
                <p className="text-[10px] text-teal-600 font-medium px-1">
                  Ícono personalizado · <button className="underline" onClick={() => setNewIcon('')}>usar automático</button>
                </p>
              )}

              <input
                placeholder={`Presupuesto (ej. ${Math.round(config.defaultBudget / 5).toLocaleString()})`}
                value={newBudget}
                onChange={e => setNewBudget(e.target.value)}
                onKeyDown={e => {
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
                  onClick={() => { setAddingPocket(false); setNewName(''); setNewBudget(''); setNewIcon('') }}
                  className="px-4 py-3 text-slate-400 text-sm font-medium"
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
            {pockets.map((p, i) => (
              <PocketCard
                key={p.id}
                pocket={p}
                spent={spentByPocket[p.id] ?? 0}
                pocketIndex={i}
                config={config}
                onEdit={onEditPocket}
                onDelete={onDeletePocket}
                isPrivacyMode={isPrivacyMode}
              />
            ))}
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
              {exceededPockets.map(p => {
                const exc = (spentByPocket[p.id] ?? 0) - p.budget
                return (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-xs text-red-700 font-medium">{p.name}</span>
                    <span className="text-xs font-bold text-red-600 tabular-nums">
                      +{mm(exc)}
                    </span>
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
                    {budgetRemaining >= 0
                      ? mm(budgetRemaining)
                      : `−${mm(-budgetRemaining)}`}
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
              Los presupuestos de tus bolsillos superan el presupuesto total. Reduce alguno para cuadrar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
