import { useMemo, useState, useEffect } from 'react'
import { PocketCard } from '../components/PocketCard'
import { TransactionItem } from '../components/TransactionItem'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { maskMoney } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { CalmState, Expense, Pocket } from '../lib/types'
import type { FinancialSnapshot } from '../lib/financialEngine'

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
        i.concept ?? '',
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
  const today = useMemo(() => new Date(), [])


  // Derivados de snapshot para cálculos secundarios
  const calendarRate = snapshot.day / snapshot.daysInMonth
  const effectiveBudget = monthlyBudget > 0 ? monthlyBudget : totalIncome

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
          background: calmState === 'green'
            ? 'linear-gradient(150deg, #0A1628 0%, #0D6259 48%, #0891B2 100%)'  // tranquilo
            : calmState === 'yellow'
              ? 'linear-gradient(150deg, #1C0F00 0%, #A05209 50%, #F0C040 100%)' // ajustado
              : 'linear-gradient(150deg, #2D0A0A 0%, #B02020 50%, #F87171 100%)', // riesgo (red)
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

        {/* ────────────────────────────────────────────────────────────────
            Pantalla simplificada: 3 elementos clave en 3 segundos
            ────────────────────────────────────────────────────────────────
        */}
        {effectiveBudget > 0 && (() => {
          const spendingPct = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0

          // Status message del snapshot: green, yellow, red
          const statusMessages: Record<string, string> = {
            'green': 'Vas bien',
            'yellow': 'Ojo, vas por encima',
            'red': 'Te estás pasando',
          }
          const statusText = statusMessages[calmState] || 'Vas bien'

          return (
            <>
              {/* 1. ESTADO (basado en snapshot.status) */}
              <div className="mb-6 mt-4">
                <p className="text-sm font-semibold text-white/85 leading-snug">
                  {statusText}
                </p>
              </div>

              {/* 2. NÚMERO PRINCIPAL: dinero disponible */}
              <p className="text-[3.5rem] font-bold text-white tabular-nums leading-none mb-3">
                {remaining >= 0 ? mm(remaining) : `−${mm(-remaining)}`}
              </p>

              {/* 3. GASTO DIARIO PERMITIDO */}
              <p className="text-sm text-white/80 mb-5 font-medium">
                Hoy puedes gastar máximo {mm(snapshot.dailyAvailable)}
              </p>

              {/* 4. BARRA DE PROGRESO vs PRESUPUESTO */}
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, spendingPct)}%`,
                    background: calmState === 'red'
                      ? 'linear-gradient(90deg, #EF4444, #FCA5A5)'
                      : calmState === 'yellow'
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
