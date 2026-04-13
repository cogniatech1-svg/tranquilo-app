import { useMemo } from 'react'
import { StatCard } from '../components/StatCard'
import { PocketCard } from '../components/PocketCard'
import { TransactionItem } from '../components/TransactionItem'
import { SectionHeader } from '../components/ui/SectionHeader'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { CALM_GRADS, DS, formatMoney } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { CalmState, Expense, ExtraIncome, Pocket } from '../lib/types'
import { getCalmState, getDaysInMonth, getSpendingOveragePct } from '../lib/utils'
import { MonthNavigator } from '../components/MonthNavigator'

const STATUS_CONFIG: Record<CalmState, { dot: string; label: string }> = {
  tranquilo: { dot: '#4ADE80', label: 'Vas bien' },
  ajustado:  { dot: '#FBB040', label: 'Vas un poco por encima' },
  riesgo:    { dot: '#F87171', label: 'Estás gastando demasiado rápido' },
  neutral:   { dot: '#4ADE80', label: 'Vas bien' },
}

interface Props {
  expenses: Expense[]
  pockets: Pocket[]
  monthlyBudget: number
  monthlyIncome: number
  extraIncomes: ExtraIncome[]
  currentMonth: string
  spentByPocket: Record<string, number>
  config: CountryConfig
  activeMonth: string
  realCurrentMonth: string
  onChangeMonth: (m: string) => void
  onAdd: () => void
  onAddExtraIncome: () => void
  onDeleteExtraIncome: (id: string) => void
}

export function DashboardScreen({
  expenses,
  pockets,
  monthlyBudget,
  monthlyIncome,
  extraIncomes,
  currentMonth,
  spentByPocket,
  config,
  activeMonth,
  realCurrentMonth,
  onChangeMonth,
  onAdd,
  onAddExtraIncome,
  onDeleteExtraIncome,
}: Props) {
  const isViewingPast = activeMonth !== realCurrentMonth
  const today    = useMemo(() => new Date(), [])
  const todayStr = today.toISOString().slice(0, 10)
  const weekAgo  = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  }, [])

  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  )
  const todaySpent = useMemo(
    () => expenses.filter(e => e.date.startsWith(todayStr)).reduce((s, e) => s + e.amount, 0),
    [expenses, todayStr],
  )
  const weekSpent = useMemo(
    () => expenses.filter(e => new Date(e.date) >= weekAgo).reduce((s, e) => s + e.amount, 0),
    [expenses, weekAgo],
  )

  const day          = today.getDate()
  const daysInMonth  = getDaysInMonth(currentMonth)
  const calendarRate = day / daysInMonth
  const daysLeft     = daysInMonth - day

  // Use income as budget fallback for the progress arc when no explicit budget is set
  const effectiveBudget = monthlyBudget > 0 ? monthlyBudget : monthlyIncome
  const calmState = getCalmState(totalSpent, effectiveBudget, calendarRate)

  // ── Income-based calculations ─────────────────────────────────────────────
  const extraIncomeTotal = useMemo(
    () => extraIncomes.reduce((s, e) => s + e.amount, 0),
    [extraIncomes],
  )
  const totalIncome = monthlyIncome + extraIncomeTotal
  const hasIncome   = totalIncome > 0
  // Budget is the spending limit — income is reference only for savings
  const remaining   = monthlyBudget > 0
    ? monthlyBudget - totalSpent
    : hasIncome ? totalIncome - totalSpent : 0
  const dailyAvg    = day > 0 ? totalSpent / day : 0
  const projectedSpent  = dailyAvg * daysInMonth
  const projectedSaving = hasIncome ? totalIncome - projectedSpent : 0
  const savingsRate     = hasIncome && totalIncome > 0
    ? Math.round((projectedSaving / totalIncome) * 100)
    : 0

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
        <div className="flex items-center justify-between mb-4 relative">
          <p className="text-[11px] text-white/70 font-medium capitalize">{dateLabel}</p>
          <button
            onClick={onAdd}
            className="w-11 h-11 bg-white/20 hover:bg-white/30 active:scale-95 rounded-2xl flex items-center justify-center text-white transition-all border border-white/20 relative overflow-hidden"
            style={{ backdropFilter: 'blur(4px)' }}
          >
            {/* Extremely faint leaf watermark — must not compete with + */}
            <svg
              aria-hidden
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 44 44"
              style={{ opacity: 0.07 }}
            >
              <path d="M22 6 C22 6 35 8 36 20 C37 30 29 37 22 40 C15 37 7 30 8 20 C9 8 22 6 22 6Z"
                    fill="white"/>
              <line x1="22" y1="9" x2="22" y2="37" stroke="white" strokeWidth="1"/>
            </svg>
            <Icon name="plus" size={20} />
          </button>
        </div>

        {/* Month navigator */}
        <MonthNavigator
          activeMonth={activeMonth}
          currentMonth={realCurrentMonth}
          onChange={onChangeMonth}
        />

        {/* Status headline */}
        <div className="flex items-center gap-2 mb-3 mt-4">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: STATUS_CONFIG[calmState].dot }}
          />
          <p className="text-sm font-semibold text-white/90 tracking-wide">
            {STATUS_CONFIG[calmState].label}
          </p>
        </div>

        {/* Main number */}
        <p className="text-[2.75rem] font-bold text-white tabular-nums leading-none mb-1">
          {formatMoney(totalSpent, config)}
        </p>

        {/* Context */}
        {effectiveBudget > 0 && (
          <p className="text-sm text-white/65 tabular-nums mb-5">
            de {formatMoney(effectiveBudget, config)} este mes
          </p>
        )}

        {/* Remaining */}
        {effectiveBudget > 0 && (
          <p className="text-base font-bold tabular-nums" style={{ color: remaining >= 0 ? '#5EEAD4' : '#F87171' }}>
            {remaining >= 0
              ? `Te quedan ${formatMoney(remaining, config)}${monthlyBudget > 0 ? ' del presupuesto' : ''}`
              : `Excediste el presupuesto por ${formatMoney(-remaining, config)}`}
          </p>
        )}

        {/* Progress bar */}
        {effectiveBudget > 0 && (
          <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.18)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.round((totalSpent / effectiveBudget) * 100))}%`,
                background: calmState === 'riesgo'
                  ? 'linear-gradient(90deg, #F87171, #FECACA)'
                  : calmState === 'ajustado'
                    ? 'linear-gradient(90deg, #FBBF24, #FDE68A)'
                    : 'linear-gradient(90deg, #14B8A6, #67E8F9)',
              }}
            />
          </div>
        )}

        {/* Contextual overage insight */}
        {overagePct > 0 && (
          <p className="text-[11px] text-white/60 mt-3">
            Vas {overagePct}% por encima de lo ideal para hoy
          </p>
        )}
      </div>

      {/* ── Financial summary (income mode) ─────────────────────────────── */}
      {hasIncome ? (
        <div className="px-4 mt-5 space-y-2">
          {/* ── Summary grid ── */}
          <div
            className="rounded-2xl bg-white overflow-hidden border border-slate-100"
            style={{ boxShadow: '0 1px 6px rgba(15,23,42,.06)' }}
          >
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
              {/* Ingresos */}
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">Ingresos</p>
                  <button
                    onClick={onAddExtraIncome}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
                    title="Agregar ingreso extra"
                  >
                    <Icon name="plus" size={12} />
                  </button>
                </div>
                <p className="text-sm font-bold text-slate-900 tabular-nums">{formatMoney(totalIncome, config)}</p>
                {extraIncomeTotal > 0 && (
                  <p className="text-[9px] text-slate-400 tabular-nums mt-0.5">
                    Base {formatMoney(monthlyIncome, config)} + {formatMoney(extraIncomeTotal, config)} extra
                  </p>
                )}
              </div>
              {/* Gastado */}
              <div className="px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-0.5">Gastado</p>
                <p
                  className="text-sm font-bold tabular-nums"
                  style={{ color: (monthlyBudget > 0 ? totalSpent > monthlyBudget : totalSpent > totalIncome) ? '#EF4444' : '#0F172A' }}
                >
                  {formatMoney(totalSpent, config)}
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
                  {remaining >= 0 ? formatMoney(remaining, config) : `−${formatMoney(-remaining, config)}`}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {monthlyBudget > 0 ? 'del presupuesto' : 'del ingreso'}
                </p>
              </div>
              {/* Ahorro proyectado */}
              <div className="px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400 mb-0.5">Ahorro proy.</p>
                <p
                  className="text-sm font-bold tabular-nums"
                  style={{ color: projectedSaving >= 0 ? '#16A34A' : '#EF4444' }}
                >
                  {day >= 3
                    ? (projectedSaving >= 0 ? formatMoney(projectedSaving, config) : `−${formatMoney(-projectedSaving, config)}`)
                    : '—'}
                </p>
                {day >= 3 && (
                  <p className="text-[9px] text-slate-400">
                    {projectedSaving >= 0 ? `${savingsRate}% del ingreso` : 'Supera ingresos'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Extra income list ── */}
          {extraIncomes.length > 0 && (
            <div
              className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-50"
              style={{ boxShadow: '0 1px 4px rgba(15,23,42,.04)' }}
            >
              {extraIncomes.map(ei => (
                <div key={ei.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-base leading-none">💚</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 tabular-nums">
                      +{formatMoney(ei.amount, config)}
                    </p>
                    {ei.note && (
                      <p className="text-[11px] text-slate-400 truncate capitalize">{ei.note}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-300 shrink-0">
                    {new Date(ei.date).toLocaleDateString(config.locale, { day: 'numeric', month: 'short' })}
                  </p>
                  <button
                    onClick={() => onDeleteExtraIncome(ei.id)}
                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Stats row (budget-only or empty mode) ───────────────────────── */
        <div className="px-4 mt-5 grid grid-cols-3 gap-3">
          <StatCard label="Hoy" value={formatMoney(todaySpent, config)} />
          <StatCard label="Esta semana" value={formatMoney(weekSpent, config)} />
          <StatCard
            label="Disponible"
            value={monthlyBudget > 0 ? formatMoney(Math.max(0, monthlyBudget - totalSpent), config) : '—'}
            accent={monthlyBudget > 0}
          />
        </div>
      )}

      {/* ── Hoy / Esta semana (when income mode is active) ─────────────── */}
      {hasIncome && (
        <div className="px-4 mt-3 grid grid-cols-2 gap-3">
          <StatCard label="Hoy" value={formatMoney(todaySpent, config)} />
          <StatCard label="Esta semana" value={formatMoney(weekSpent, config)} />
        </div>
      )}

      {/* ── Daily feedback pill ──────────────────────────────────────────── */}
      {dailyFeedback && (
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

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {expenses.length === 0 && (
        <div className="px-4 mt-6">
          <Card className="p-10 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 select-none overflow-hidden"
              style={{ background: DS.primaryGrad }}
            >
              <img
                src="/icons/icon-192.png"
                alt="Tranquilo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <p className="text-slate-500 text-sm mb-5 leading-relaxed">
              Sin gastos este mes.<br />Empieza a registrar.
            </p>
            <PrimaryButton onClick={onAdd} className="px-8 py-3 text-sm">
              Registrar primer gasto
            </PrimaryButton>
          </Card>
        </div>
      )}
    </div>
  )
}
