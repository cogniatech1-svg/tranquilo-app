'use client'

import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { PocketCard } from '../components/PocketCard'
import { Icon } from '../components/ui/Icon'
import { DS, formatMoney } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Pocket } from '../lib/types'
import { parseAmount } from '../lib/utils'
import { MonthNavigator } from '../components/MonthNavigator'

interface Props {
  monthlyBudget: number
  monthlyIncome: number
  pockets: Pocket[]
  spentByPocket: Record<string, number>
  totalSpent: number
  config: CountryConfig
  activeMonth: string
  realCurrentMonth: string
  onChangeMonth: (m: string) => void
  isViewingPast: boolean
  onSetBudget: (v: number) => void
  onEditPocket: (id: string, name: string, budget: number) => void
  onDeletePocket: (id: string) => void
  onAddPocket: (name: string, budget: number) => void
}

export function BudgetScreen({
  monthlyBudget,
  monthlyIncome,
  pockets,
  spentByPocket,
  totalSpent,
  config,
  activeMonth,
  realCurrentMonth,
  onChangeMonth,
  isViewingPast,
  onSetBudget,
  onEditPocket,
  onDeletePocket,
  onAddPocket,
}: Props) {
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [addingPocket, setAddingPocket] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')

  const saveBudget = () => {
    const v = parseAmount(budgetInput)
    if (v > 0) {
      onSetBudget(v)
      setEditingBudget(false)
      setBudgetInput('')
    }
  }

  const addPocket = () => {
    if (!newName.trim()) return
    onAddPocket(newName.trim(), parseAmount(newBudget))
    setNewName('')
    setNewBudget('')
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

        {/* ── Budget allocation overview ────────────────────────────────── */}
        {hasBudget && (
          <div
            className="rounded-2xl overflow-hidden bg-white border border-slate-100"
            style={{ boxShadow: '0 1px 6px rgba(15,23,42,.06)' }}
          >
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {/* Presupuesto total */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Presupuesto</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums leading-tight">
                  {formatMoney(monthlyBudget, config)}
                </p>
              </div>
              {/* Asignado a bolsillos */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Asignado</p>
                <p className="text-sm font-bold tabular-nums leading-tight" style={{ color: DS.primary }}>
                  {formatMoney(totalPocketBudget, config)}
                </p>
                {assignedPct > 0 && (
                  <p className="text-[9px] text-slate-400 mt-0.5">{assignedPct}%</p>
                )}
              </div>
              {/* Restante por asignar */}
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Restante</p>
                <p
                  className="text-sm font-bold tabular-nums leading-tight"
                  style={{ color: unassigned >= 0 ? '#16A34A' : '#EF4444' }}
                >
                  {unassigned >= 0
                    ? formatMoney(unassigned, config)
                    : `−${formatMoney(-unassigned, config)}`}
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
              ? 'linear-gradient(135deg,#92400e,#b45309)'
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
                  {formatMoney(totalSpent, config)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                  de {formatMoney(monthlyBudget, config)} este mes
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">Disponible</p>
                <p
                  className="text-xl font-bold tabular-nums"
                  style={{ color: totalSpent > monthlyBudget ? '#EF4444' : DS.primary }}
                >
                  {totalSpent > monthlyBudget
                    ? `−${formatMoney(totalSpent - monthlyBudget, config)}`
                    : formatMoney(monthlyBudget - totalSpent, config)}
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
                {formatMoney(totalPocketBudget, config)} asignados
              </span>
            )}
          </SectionHeader>

          {addingPocket && (
            <Card className="p-5 space-y-3 mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
                Nuevo bolsillo
              </p>
              <input
                autoFocus
                placeholder="Nombre (ej. Transporte)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setAddingPocket(false)}
                className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
              />
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
                  onClick={() => { setAddingPocket(false); setNewName(''); setNewBudget('') }}
                  className="px-4 py-3 text-slate-400 text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </Card>
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
                  Exceso total: {formatMoney(totalExcess, config)}
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
                      +{formatMoney(exc, config)}
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
                      ? formatMoney(budgetRemaining, config)
                      : `−${formatMoney(-budgetRemaining, config)}`}
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
              {formatMoney(unassigned, config)} restantes por asignar
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
              Bolsillos sobre-asignados en {formatMoney(-unassigned, config)}
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
