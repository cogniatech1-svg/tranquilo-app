'use client'

import { useState, useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatCard } from '../components/StatCard'
import { ProgressBar } from '../components/ui/ProgressBar'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { Icon } from '../components/ui/Icon'
import { DS, formatMoney, COUNTRIES } from '../lib/config'
import type { CountryConfig, CountryCode } from '../lib/config'
import type { MonthRecord } from '../lib/types'
import { parseAmount } from '../lib/utils'
import { FeedbackSheet } from '../components/FeedbackSheet'

interface Props {
  expenseCount: number
  pocketCount: number
  currentMonth: string
  monthlyHistory: Record<string, MonthRecord> | undefined
  monthlyBudget: number
  monthlyIncome: number
  config: CountryConfig
  onClearData: () => void
  onChangeCountry: (code: CountryCode) => void
  onSetIncome: (income: number) => void
}

export function ProfileScreen({
  expenseCount,
  pocketCount,
  currentMonth,
  monthlyHistory,
  monthlyBudget,
  monthlyIncome,
  config,
  onClearData,
  onChangeCountry,
  onSetIncome,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const handleExport = () => {
    const raw  = localStorage.getItem('tranquilo_v1')
    const data = raw ? JSON.parse(raw) : {}
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'mis-datos-financieros.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const raw  = localStorage.getItem('tranquilo_v1')
    const data = raw ? JSON.parse(raw) : {}

    const pocketNames: Record<string, string> = {}
    for (const p of (data.pockets ?? [])) pocketNames[p.id] = p.name

    const rows: string[][] = [['Fecha', 'Tipo', 'Categoría', 'Monto', 'Descripción']]

    // Current-month expenses
    for (const e of (data.expenses ?? [])) {
      rows.push([
        e.date.slice(0, 10),
        'gasto',
        pocketNames[e.pocketId] ?? e.pocketId ?? '',
        String(e.amount),
        e.concept ?? '',
      ])
    }

    // Extra incomes
    for (const i of (data.extraIncomes ?? [])) {
      rows.push([
        i.date.slice(0, 10),
        'ingreso',
        'Ingresos',
        String(i.amount),
        i.note ?? '',
      ])
    }

    // Historical months
    for (const [, record] of Object.entries(data.monthlyHistory ?? {})) {
      const rec = record as { expenses?: Array<{ date: string; pocketId: string; amount: number; concept: string }> }
      for (const e of (rec.expenses ?? [])) {
        rows.push([
          e.date.slice(0, 10),
          'gasto',
          pocketNames[e.pocketId] ?? e.pocketId ?? '',
          String(e.amount),
          e.concept ?? '',
        ])
      }
    }

    // Sort by date descending
    const [header, ...body] = rows
    body.sort((a, b) => b[0].localeCompare(a[0]))

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv    = [header, ...body].map(r => r.map(escape).join(',')).join('\r\n')
    const blob   = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = 'mis-finanzas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveIncome = () => {
    const v = parseAmount(incomeInput)
    if (v > 0) {
      onSetIncome(v)
      setEditingIncome(false)
      setIncomeInput('')
    }
  }

  const monthName = new Date(currentMonth + '-15').toLocaleDateString(config.locale, {
    month: 'long',
    year: 'numeric',
  })

  const monthList = useMemo(() => {
    if (!monthlyHistory) return []
    return Object.entries(monthlyHistory)
      .map(([month, data]) => ({
        month,
        totalSpent: data.totalSpent,
        budget: data.budget || monthlyBudget,
        count: data.expenses.length,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12)
  }, [monthlyHistory, monthlyBudget])

  const avgSpent = monthList.length > 0
    ? monthList.reduce((s, m) => s + m.totalSpent, 0) / monthList.length
    : 0

  return (
    <div className="pb-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="px-5 pt-14 pb-8 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
          boxShadow: '0 4px 28px rgba(4,47,46,.35)',
        }}
      >
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-cyan-400/[0.07] pointer-events-none" />
        <div className="relative">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl select-none border border-white/30 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            🌿
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.25)' }}>
            Tranquilo
          </h2>
          <p className="text-xs text-white/70 mt-1 font-medium">Finanzas personales · {config.flag} {config.name}</p>
          <p className="text-xs text-white/45 mt-0.5 capitalize">{monthName}</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* ── Month stats ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Gastos este mes"
            value={String(expenseCount)}
            sub="movimientos"
            accent
          />
          <StatCard
            label="Bolsillos activos"
            value={String(pocketCount)}
            sub="categorías"
          />
        </div>

        {/* ── Country selector ──────────────────────────────────────────────── */}
        <Card className="p-5">
          <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400 mb-3">
            País
          </p>
          <div className="flex gap-2">
            {(Object.keys(COUNTRIES) as CountryCode[]).map(code => {
              const c = COUNTRIES[code]
              const isActive = config.code === code
              return (
                <button
                  key={code}
                  onClick={() => onChangeCountry(code)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    isActive ? 'border-teal-500 bg-teal-50' : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                  style={isActive ? { color: DS.primary } : { color: '#64748B' }}
                >
                  <span className="text-lg">{c.flag}</span>
                  <span>{c.name}</span>
                  <span className="text-[9px] font-medium opacity-60">{c.currency}</span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* ── Income ───────────────────────────────────────────────────────── */}
        {editingIncome ? (
          <Card className="p-5 space-y-4">
            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
              Ingresos mensuales
            </p>
            <div className="flex gap-2.5">
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                placeholder={`ej. ${config.defaultBudget.toLocaleString()}`}
                value={incomeInput}
                onChange={e => setIncomeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveIncome()}
                className="flex-1 min-w-0 border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none transition-colors bg-slate-50 focus:bg-white"
              />
              <PrimaryButton onClick={saveIncome} className="px-5 py-3 text-sm shrink-0">
                Guardar
              </PrimaryButton>
              <button
                onClick={() => { setEditingIncome(false); setIncomeInput('') }}
                className="px-3 text-slate-400 hover:text-slate-600"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
                Ingresos mensuales
              </p>
              <button
                onClick={() => { setEditingIncome(true); setIncomeInput(monthlyIncome > 0 ? String(monthlyIncome) : '') }}
                className="text-xs font-semibold transition-colors"
                style={{ color: DS.primary }}
              >
                {monthlyIncome > 0 ? 'Editar' : 'Agregar'}
              </button>
            </div>
            {monthlyIncome > 0 ? (
              <p className="text-3xl font-bold text-slate-900 tabular-nums mt-1">
                {formatMoney(monthlyIncome, config)}
              </p>
            ) : (
              <p className="text-sm text-slate-400 mt-1">No configurado</p>
            )}
          </Card>
        )}

        {/* ── Monthly history ───────────────────────────────────────────────── */}
        {monthList.length > 0 && (
          <div>
            <SectionHeader>
              Histórico
              {avgSpent > 0 && (
                <span className="text-[9px] font-normal text-slate-400 ml-2 normal-case tracking-normal">
                  Prom. {formatMoney(avgSpent, config)}
                </span>
              )}
            </SectionHeader>
            <Card className="p-4 space-y-3">
              {monthList.map(({ month, totalSpent, budget, count }) => {
                const [year, monthNum] = month.split('-')
                const mName = new Date(`${year}-${monthNum}-15`).toLocaleDateString(config.locale, {
                  month: 'short',
                  year: '2-digit',
                })
                const ratio = budget > 0 ? totalSpent / budget : 0
                const isOver = ratio > 1

                return (
                  <div
                    key={month}
                    className="flex items-center gap-3 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-col text-center bg-slate-50">
                      <span className="text-[10px] font-bold text-slate-600 capitalize">
                        {mName.split(' ')[0]}
                      </span>
                      <span className="text-[8px] font-medium text-slate-400">
                        {mName.split(' ')[1] ?? ''}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-slate-800 tabular-nums truncate">
                          {formatMoney(totalSpent, config)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            isOver ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'
                          }`}
                        >
                          {count} gasto{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {budget > 0 && (
                        <>
                          <ProgressBar ratio={ratio} thick />
                          <p className="text-[9px] text-slate-400 mt-1 tabular-nums">
                            {Math.round(ratio * 100)}% de {formatMoney(budget, config)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        )}

        {/* ── Tagline ───────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-5 py-4 text-center"
          style={{
            background: 'linear-gradient(135deg, #F0FDFA, #EDE9FE)',
            border: '1px solid rgba(15,118,110,.12)',
          }}
        >
          <p
            className="text-sm font-bold leading-relaxed"
            style={{ color: DS.primary }}
          >
            "Ajustes pequeños para llegar tranquilo a fin de mes."
          </p>
        </div>

        {/* ── Export ────────────────────────────────────────────────────────── */}
        <Card className="px-5 py-4 space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
            Exportar datos
          </p>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-between text-sm font-semibold transition-colors"
            style={{ color: DS.primary }}
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">📥</span>
              Exportar mis datos (JSON)
            </span>
            <Icon name="chevron" size={14} className="text-slate-300" />
          </button>
          <div className="border-t border-slate-100" />
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between text-sm font-semibold transition-colors"
            style={{ color: DS.primary }}
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">📊</span>
              Exportar a Excel (CSV)
            </span>
            <Icon name="chevron" size={14} className="text-slate-300" />
          </button>
        </Card>

        {/* ── Feedback ──────────────────────────────────────────────────────── */}
        <Card className="px-5 py-4">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full flex items-center justify-between text-sm font-semibold transition-colors"
            style={{ color: DS.primary }}
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">💬</span>
              Enviar feedback
            </span>
            <Icon name="chevron" size={14} className="text-slate-300" />
          </button>
        </Card>

        {/* ── Danger zone ───────────────────────────────────────────────────── */}
        <Card className="px-5 py-4">
          {confirming ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-red-600">¿Borrar todos los datos?</p>
              <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => { onClearData(); setConfirming(false) }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl text-sm font-semibold transition-colors"
                >
                  Sí, borrar todo
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 border-2 border-slate-100 py-3 rounded-2xl text-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-sm text-red-400 hover:text-red-500 font-semibold transition-colors"
            >
              Borrar todos los datos
            </button>
          )}
        </Card>
      </div>

      <FeedbackSheet isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
