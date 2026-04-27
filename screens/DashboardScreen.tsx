import { useMemo, useState, useEffect } from 'react'
import { StatCard } from '../components/StatCard'
import { PocketCard } from '../components/PocketCard'
import { TransactionItem } from '../components/TransactionItem'
import { SectionHeader } from '../components/ui/SectionHeader'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { CALM_GRADS, DS, formatMoney, maskMoney } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { CalmState, Expense, ExtraIncome, Pocket } from '../lib/types'
import type { FinancialSnapshot } from '../lib/financialEngine'
import { getCalmState, getDaysInMonth, getSpendingOveragePct } from '../lib/utils'
import { MonthNavigator } from '../components/MonthNavigator'

const STATUS_CONFIG: Record<CalmState, { dot: string; label: string }> = {
  tranquilo: { dot: '#4ADE80', label: 'Vas bien' },
  ajustado:  { dot: '#FBB040', label: 'Vas un poco por encima' },
  riesgo:    { dot: '#F87171', label: 'Estás gastando demasiado rápido' },
  neutral:   { dot: '#4ADE80', label: 'Vas bien' },
}

interface Props {
  snapshot: FinancialSnapshot  // ÚNICA FUENTE DE VERDAD
  expenses: Expense[]
  pockets: Pocket[]
  spentByPocket: Record<string, number>
  config: CountryConfig
  activeMonth: string
  realCurrentMonth: string
  onChangeMonth: (m: string) => void
  onAdd: () => void
  isPrivacyMode: boolean
  onTogglePrivacy: () => void
}

export function DashboardScreen({
  snapshot,
  expenses,
  pockets,
  spentByPocket,
  config,
  activeMonth,
  realCurrentMonth,
  onChangeMonth,
  onAdd,
  isPrivacyMode,
  onTogglePrivacy,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const mm = (n: number) => maskMoney(n, config, isPrivacyMode)

  // USAR snapshot en lugar de cálculos locales
  const {
    totalIncome,
    totalExpenses: totalSpent,
    budget: monthlyBudget,
    remaining,
    status: calmState,
    day,
    daysInMonth,
  } = snapshot

  // Skeleton loading effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleExportCSV = () => {
    const raw = localStorage.getItem('tranquilo_v1')
    const data = raw ? JSON.parse(raw) : {}

    const pocketNames: Record<string, string> = {}
    for (const p of (data.pockets ?? [])) pocketNames[p.id] = p.name

    const rows: string[][] = [['Fecha', 'Tipo', 'Categoría', 'Monto', 'Descripción']]

    // Gastos del mes actual
    for (const e of (data.expenses ?? [])) {
      rows.push([
        e.date.slice(0, 10),
        'gasto',
        pocketNames[e.pocketId] ?? e.pocketId ?? '',
        String(e.amount),
        e.concept ?? '',
      ])
    }

    // Ingresos extras
    for (const i of (data.extraIncomes ?? [])) {
      rows.push([
        i.date.slice(0, 10),
        'ingreso',
        'Ingresos',
        String(i.amount),
        i.note ?? '',
      ])
    }

    // Meses anteriores
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

    // Ordenar por fecha descendente
    const [header, ...body] = rows
    body.sort((a, b) => b[0].localeCompare(a[0]))

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [header, ...body].map(r => r.map(escape).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tranquilo-datos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setMenuOpen(false)
  }
  const isViewingPast = activeMonth !== realCurrentMonth
  const today    = useMemo(() => new Date(), [])
  const todayStr = today.toISOString().slice(0, 10)
  const weekAgo  = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  }, [])

  // CÁLCULOS ESPECÍFICOS de Dashboard (no están en snapshot)
  const todaySpent = useMemo(
    () => expenses.filter(e => e.date.startsWith(todayStr)).reduce((s, e) => s + e.amount, 0),
    [expenses, todayStr],
  )
  const weekSpent = useMemo(
    () => expenses.filter(e => new Date(e.date) >= weekAgo).reduce((s, e) => s + e.amount, 0),
    [expenses, weekAgo],
  )

  // Derivados de snapshot para cálculos secundarios
  const calendarRate = snapshot.day / snapshot.daysInMonth
  const daysLeft     = snapshot.daysInMonth - snapshot.day
  const effectiveBudget = monthlyBudget > 0 ? monthlyBudget : totalIncome
  const hasIncome = totalIncome > 0

  const dailyAvg = snapshot.day > 0 ? totalSpent / snapshot.day : 0
  const projectedSpent = dailyAvg * snapshot.daysInMonth
  const projectedSaving = hasIncome ? totalIncome - projectedSpent : 0
  const plannedSavings = hasIncome && monthlyBudget > 0 ? totalIncome - monthlyBudget : null
  const savingsDisplay = plannedSavings !== null ? plannedSavings : projectedSaving
  const savingsRate = hasIncome && totalIncome > 0 ? Math.round((savingsDisplay / totalIncome) * 100) : 0
  const savingsLabel = plannedSavings !== null ? 'Ahorro planeado' : 'Ahorro proy.'

  // ── Daily feedback pill ───────────────────────────────────────────────────
  const dailyFeedback = useMemo(() => {
    const ref = effectiveBudget > 0 ? effectiveBudget / daysInMonth : 0
    if (ref <= 0) return null
    const ratio = todaySpent / ref
    if (ratio <= 1.10) return { emoji: '🟢', text: 'Hoy vas bien' }
    if (ratio <= 1.25) return { emoji: '🟡', text: 'Hoy vas un poco por encima' }
    return { emoji: '🔴', text: 'Hoy te pasaste bastante' }
  }, [todaySpent, effectiveBudget, daysInMonth])

  // ── Contextual overage message ────────────────────────────────────────────
  const overagePct = getSpendingOveragePct(totalSpent, effectiveBudget, calendarRate)

  // ── Prediction message ────────────────────────────────────────────────────
  const predictionMsg = useMemo(() => {
    if (day < 3 || daysLeft <= 0) return null
    const fm = (n: number) => formatMoney(n, config)

    // Budget controls spending — always check this first
    if (monthlyBudget > 0) {
      if (totalSpent > monthlyBudget) {
        return {
          positive: false,
          label: 'Presupuesto',
          text: `Llevas ${fm(totalSpent - monthlyBudget)} por encima del presupuesto.`,
        }
      }
      const diff = monthlyBudget - projectedSpent
      return diff >= 0
        ? { positive: true,  label: 'Proyección del mes', text: `A este ritmo cerrarás con ${fm(diff)} disponibles del presupuesto.` }
        : { positive: false, label: 'Proyección del mes', text: `A este ritmo podrías exceder el presupuesto en ${fm(-diff)}.` }
    }

    // Income-based savings projection — only when no budget is set
    if (hasIncome) {
      return projectedSaving > 0
        ? { positive: true,  label: 'Proyección de ahorro', text: `Si continúas así, ahorrarás ${fm(projectedSaving)} este mes (${savingsRate}%).` }
        : { positive: false, label: 'Proyección de ahorro', text: `Si continúas así, gastarás ${fm(-projectedSaving)} más de lo que recibes.` }
    }

    return null
  }, [hasIncome, projectedSaving, savingsRate, monthlyBudget, projectedSpent, totalSpent, day, daysLeft, config])

  const activePockets  = pockets.filter(p => (spentByPocket[p.id] ?? 0) > 0 || p.budget > 0)
  const recentExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [expenses],
  )

  const dateLabel = today.toLocaleDateString(config.locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="pb-8">

      {/* ── Hero Card ────────────────────────────────────────────────────── */}
      {isLoading ? (
        // Skeleton Hero Card
        <div
          className="rounded-b-[2.5rem] px-5 pt-12 pb-8 overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #0D6259 0%, #0891B2 100%)',
            boxShadow: '0 8px 40px rgba(4,47,46,.30)',
          }}
        >
          <div className="space-y-4">
            {/* Date skeleton */}
            <div className="flex justify-between items-center mb-8">
              <div className="h-3 w-24 bg-white/20 rounded animate-pulse" />
              <div className="h-10 w-10 bg-white/20 rounded-2xl animate-pulse" />
            </div>
            {/* Status skeleton */}
            <div className="h-4 w-32 bg-white/20 rounded animate-pulse mb-4" />
            {/* Main number skeleton */}
            <div className="h-16 w-48 bg-white/20 rounded animate-pulse mb-2" />
            {/* Context skeleton */}
            <div className="h-4 w-40 bg-white/20 rounded animate-pulse mb-4" />
            {/* Progress bar skeleton */}
            <div className="h-3 w-full bg-white/10 rounded-full animate-pulse" />
          </div>
        </div>
      ) : (
      <div
        className="rounded-b-[2.5rem] px-5 pt-12 pb-8 overflow-hidden relative transition-all duration-500"
        style={{
          background: CALM_GRADS[calmState],
          boxShadow: '0 8px 40px rgba(4,47,46,.30)',
        }}
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/8 pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(103,232,249,.15) 0%, transparent 70%)' }} />

        {/* Top row */}
        <div className="flex items-center justify-between mb-8 relative">
          <p className="text-[11px] text-white/70 font-medium">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>

          {/* ☰ Menu button */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-11 h-11 bg-white/20 hover:bg-white/30 active:scale-95 rounded-2xl flex items-center justify-center text-white transition-all border border-white/20"
              style={{ backdropFilter: 'blur(4px)' }}
            >
              <Icon name="menu" size={20} />
            </button>

            {menuOpen && (
              <>
                {/* Overlay to close menu */}
                <div
                  className="fixed inset-0 z-30 opacity-0 transition-opacity duration-150"
                  onClick={() => setMenuOpen(false)}
                />
                {/* Dropdown panel */}
                <div
                  className="fixed bg-white rounded-2xl z-40 overflow-hidden opacity-100 transition-opacity duration-200"
                  style={{
                    width: 260,
                    top: '80px',
                    right: '20px',
                    boxShadow: '0 8px 32px rgba(15,23,42,.18)'
                  }}
                >
                  {/* Exportar datos */}
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <span className="text-base">📥</span>
                      Exportar datos
                    </span>
                    <Icon name="chevron" size={14} className="text-slate-300" />
                  </button>

                  {/* Ocultar montos toggle */}
                  <div className="px-4 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Ocultar montos</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Privacidad</p>
                    </div>
                    <button
                      onClick={() => { onTogglePrivacy(); setMenuOpen(false) }}
                      className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${
                        isPrivacyMode ? 'bg-teal-500' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          isPrivacyMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Accionable header: qué hacer hoy */}
        {effectiveBudget > 0 && (() => {
          const spendingPct = Math.round((totalSpent / effectiveBudget) * 100)
          const dailySpend = daysLeft > 0 ? remaining / daysLeft : 0
          const maxTodaySpend = Math.max(0, dailySpend)

          // Determinar estado con copy más directo
          let statusText = ''
          if (totalSpent > effectiveBudget) {
            statusText = 'Te quedaste sin presupuesto'
          } else if (spendingPct >= 95) {
            statusText = 'Cuidado, estás al límite'
          } else if (spendingPct >= 80) {
            statusText = 'Vas muy justo'
          } else {
            statusText = 'Vas dentro del presupuesto'
          }

          return (
            <>
              {/* 1. Estado (texto corto pero directo) */}
              <div className="mb-4 mt-4">
                <p className="text-sm font-semibold text-white/85 leading-snug">
                  {statusText}
                </p>
              </div>

              {/* 2. Número principal: monto restante */}
              <p className="text-[3rem] font-bold text-white tabular-nums leading-none mb-1">
                {totalSpent > effectiveBudget
                  ? `−${mm(-remaining)}`
                  : mm(remaining)}
              </p>

              {/* 3. ACCIÓN PRINCIPAL: qué gastar hoy (la instrucción) */}
              <p className="text-base font-bold text-white/95 tabular-nums mb-5 py-2 px-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,.10)' }}>
                Hoy puedes gastar máximo {mm(maxTodaySpend)}
              </p>

              {/* 4. Barra de progreso */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, spendingPct)}%`,
                    background: totalSpent > effectiveBudget
                      ? 'linear-gradient(90deg, #EF4444, #FCA5A5)'
                      : spendingPct >= 80
                        ? 'linear-gradient(90deg, #FBBF24, #FCD34D)'
                        : 'linear-gradient(90deg, #10B981, #6EE7B7)',
                  }}
                />
              </div>
            </>
          )
        })()}
      </div>
      )}

      {/* ── Financial summary (income mode) ─────────────────────────────── */}
      {isLoading ? (
        // Skeleton Financial Summary
        <div className="px-4 mt-5 space-y-2">
          <div
            className="rounded-2xl bg-white overflow-hidden border border-slate-100"
            style={{ boxShadow: '0 1px 6px rgba(15,23,42,.06)' }}
          >
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-4 py-3.5 space-y-2">
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-slate-300 rounded animate-pulse" />
                  <div className="h-2 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : hasIncome ? (
        <div className="px-4 mt-5 space-y-2">
          {/* ── Summary grid ── */}
          <div
            className="rounded-2xl bg-white overflow-hidden border border-slate-100"
            style={{ boxShadow: '0 1px 6px rgba(15,23,42,.06)' }}
          >
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {/* Gastado */}
              <div className="px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-0.5">Gastado</p>
                <p
                  className="text-sm font-bold tabular-nums"
                  style={{ color: (monthlyBudget > 0 ? totalSpent > monthlyBudget : totalSpent > totalIncome) ? '#EF4444' : '#0F172A' }}
                >
                  {mm(totalSpent)}
                </p>
                <p className="text-[9px] text-slate-400 tabular-nums">
                  {monthlyBudget > 0
                    ? `${Math.round((totalSpent / monthlyBudget) * 100)}% del presupuesto`
                    : `${Math.round((totalSpent / totalIncome) * 100)}% del ingreso`}
                </p>
              </div>
              {/* Disponible */}
              <div className="px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-0.5">Disponible</p>
                <p
                  className="text-sm font-bold tabular-nums"
                  style={{ color: remaining >= 0 ? DS.primary : '#EF4444' }}
                >
                  {remaining >= 0 ? mm(remaining) : `−${mm(-remaining)}`}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {monthlyBudget > 0 ? 'del presupuesto' : 'del ingreso'}
                </p>
              </div>
              {/* Ahorro planeado / proyectado */}
              <div className="px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-0.5">{savingsLabel}</p>
                <p
                  className="text-sm font-bold tabular-nums"
                  style={{ color: savingsDisplay >= 0 ? '#16A34A' : '#EF4444' }}
                >
                  {plannedSavings !== null || day >= 3
                    ? (savingsDisplay >= 0 ? mm(savingsDisplay) : `−${mm(-savingsDisplay)}`)
                    : '—'}
                </p>
                {(plannedSavings !== null || day >= 3) && (
                  <p className="text-[9px] text-slate-400">
                    {savingsDisplay >= 0 ? `${savingsRate}% del ingreso` : 'Supera ingresos'}
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ── Stats row (budget-only or empty mode) ───────────────────────── */
        <div className="px-4 mt-5 grid grid-cols-3 gap-3">
          <StatCard label="Hoy" value={mm(todaySpent)} />
          <StatCard label="Esta semana" value={mm(weekSpent)} />
          <StatCard
            label="Disponible"
            value={monthlyBudget > 0 ? mm(Math.max(0, monthlyBudget - totalSpent)) : '—'}
            accent={monthlyBudget > 0}
          />
        </div>
      )}

      {/* ── Hoy / Esta semana (when income mode is active) ─────────────── */}
      {hasIncome && (
        <div className="px-4 mt-3 grid grid-cols-2 gap-3">
          <StatCard label="Hoy" value={mm(todaySpent)} />
          <StatCard label="Esta semana" value={mm(weekSpent)} />
        </div>
      )}

      {/* ── Daily feedback pill (solo si estado es positivo) ──────────────── */}
      {dailyFeedback && (snapshot.status === 'green') && (
        <div className="px-4 mt-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white border border-slate-100 text-slate-700 shadow-sm">
            {dailyFeedback.emoji} {dailyFeedback.text}
          </span>
        </div>
      )}

      {/* ── Prediction banner ────────────────────────────────────────────── */}
      {predictionMsg && (
        <div className="px-4 mt-4">
          <div
            className={`rounded-2xl px-4 py-3.5 border-l-4 ${
              predictionMsg.positive
                ? 'bg-teal-50/80 border-teal-400'
                : 'bg-red-50/80 border-red-400'
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-1">
              {predictionMsg.label}
            </p>
            <p
              className={`text-sm font-semibold leading-relaxed ${
                predictionMsg.positive ? 'text-teal-800' : 'text-red-700'
              }`}
            >
              {predictionMsg.text}
            </p>
          </div>
        </div>
      )}

      {/* ── Pockets ──────────────────────────────────────────────────────── */}
      {activePockets.length > 0 && (
        <div className="px-4 mt-6">
          <SectionHeader>Bolsillos</SectionHeader>
          <Card className="divide-y divide-slate-50">
            {activePockets.map((p, i) => (
              <div key={p.id} className="p-4">
                <PocketCard
                  pocket={p}
                  spent={spentByPocket[p.id] ?? 0}
                  pocketIndex={i}
                  config={config}
                  compact
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── Recent transactions ──────────────────────────────────────────── */}
      {recentExpenses.length > 0 && (
        <div className="px-4 mt-6">
          <SectionHeader>Recientes</SectionHeader>
          <Card className="overflow-hidden">
            {recentExpenses.map((e, i) => {
              const pocket = pockets.find(p => p.id === e.pocketId)
              const pi     = pockets.findIndex(p => p.id === e.pocketId)
              return (
                <TransactionItem
                  key={e.id}
                  expense={e}
                  pocket={pocket}
                  pocketIndex={pi}
                  config={config}
                  showDivider={i < recentExpenses.length - 1}
                  isPrivacyMode={isPrivacyMode}
                />
              )
            })}
          </Card>
        </div>
      )}

      {/* ── Monthly progress bar ─────────────────────────────────────────── */}
      {expenses.length > 0 && (
        <div className="px-4 mt-6">
          <div
            className="rounded-2xl px-4 py-3.5 bg-white border border-slate-100 flex items-center justify-between"
            style={{ boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400 mb-0.5">
                Mes en curso
              </p>
              <p className="text-sm font-semibold text-slate-700">
                Día {day} de {daysInMonth} · {expenses.length} registros
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(calendarRate * 100))}%`,
                    background: 'linear-gradient(90deg, #0f766e, #14b8a6)',
                  }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                {Math.round(calendarRate * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
