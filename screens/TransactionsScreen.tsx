import { useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { TransactionItem } from '../components/TransactionItem'
import { formatMoney, DS } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Expense, ExtraIncome, Pocket } from '../lib/types'

interface Props {
  expenses: Expense[]
  extraIncomes: ExtraIncome[]
  pockets: Pocket[]
  config: CountryConfig
  activeMonth: string
  realCurrentMonth: string
  onChangeMonth: (m: string) => void
  onAdd: () => void
  onEdit: (e: Expense) => void
  onDelete: (id: string) => void
  onDeleteExtraIncome: (id: string) => void
}

type Row =
  | { kind: 'expense'; date: string; data: Expense }
  | { kind: 'income';  date: string; data: ExtraIncome }

export function TransactionsScreen({
  expenses,
  extraIncomes,
  pockets,
  config,
  activeMonth,
  realCurrentMonth,
  onChangeMonth,
  onAdd,
  onEdit,
  onDelete,
  onDeleteExtraIncome,
}: Props) {
  const isViewingPast = activeMonth !== realCurrentMonth

  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  )

  const grouped = useMemo(() => {
    const rows: Row[] = [
      ...expenses.map(e => ({ kind: 'expense' as const, date: e.date, data: e })),
      ...extraIncomes.map(i => ({ kind: 'income' as const, date: i.date, data: i })),
    ].sort((a, b) => b.date.localeCompare(a.date))

    const today     = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    const map: Record<string, Row[]> = {}
    for (const row of rows) {
      const key = row.date.slice(0, 10);
      (map[key] ??= []).push(row)
    }

    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        const d = new Date(key + 'T12:00:00')
        let label: string
        if (d.toDateString() === today.toDateString()) label = 'Hoy'
        else if (d.toDateString() === yesterday.toDateString()) label = 'Ayer'
        else label = d.toLocaleDateString(config.locale, { weekday: 'short', day: 'numeric', month: 'short' })

        const dayExpenses = items.filter(r => r.kind === 'expense').reduce((s, r) => s + r.data.amount, 0)
        const dayIncome   = items.filter(r => r.kind === 'income').reduce((s, r) => s + r.data.amount, 0)

        return { label, items, dayExpenses, dayIncome }
      })
  }, [expenses, extraIncomes, config.locale])

  const isEmpty = expenses.length === 0 && extraIncomes.length === 0

  return (
    <div className="pb-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-5 bg-white border-b border-slate-100">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400 mb-1">
              Registro
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Movimientos</h1>
            {!isEmpty && (
              <p className="text-sm text-slate-500 mt-0.5">
                {expenses.length} gastos · {formatMoney(totalSpent, config)}
              </p>
            )}
          </div>
          <button
            onClick={onAdd}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 mb-0.5"
            style={{ background: DS.primaryGrad, boxShadow: '0 4px 12px rgba(15,118,110,.25)' }}
          >
            <Icon name="plus" size={20} />
          </button>
        </div>

      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 space-y-6">
        {isEmpty ? (
          <Card className="p-12 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl select-none"
              style={{ background: DS.primaryGrad }}
            >
              📋
            </div>
            <p className="text-slate-500 text-sm mb-4">Aún no hay movimientos</p>
            <button
              onClick={onAdd}
              className="text-sm font-bold transition-colors"
              style={{ color: DS.primary }}
            >
              Agregar el primero
            </button>
          </Card>
        ) : (
          grouped.map(({ label, items, dayExpenses, dayIncome }) => (
            <div key={label}>
              {/* Date group header */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400 shrink-0">
                  {label}
                </p>
                <div className="flex-1 h-px bg-slate-100" />
                <div className="flex items-center gap-2 shrink-0">
                  {dayIncome > 0 && (
                    <span className="text-xs font-bold text-green-600 tabular-nums">
                      +{formatMoney(dayIncome, config)}
                    </span>
                  )}
                  {dayExpenses > 0 && (
                    <span className="text-xs font-bold text-slate-600 tabular-nums">
                      {formatMoney(dayExpenses, config)}
                    </span>
                  )}
                </div>
              </div>

              <Card className="overflow-hidden">
                {items.map((row, i) => {
                  const isLast = i === items.length - 1

                  if (row.kind === 'income') {
                    return (
                      <div
                        key={row.data.id}
                        className={`flex items-center gap-3 px-4 py-3.5 bg-green-50/70 ${!isLast ? 'border-b border-green-100' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-100 text-base shrink-0 select-none">
                          💚
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-green-800 tabular-nums">
                            +{formatMoney(row.data.amount, config)}
                          </p>
                          {row.data.note ? (
                            <p className="text-xs text-green-600 truncate capitalize">{row.data.note}</p>
                          ) : (
                            <p className="text-xs text-green-500">Ingreso</p>
                          )}
                        </div>
                        {!isViewingPast && (
                          <button
                            onClick={() => onDeleteExtraIncome(row.data.id)}
                            className="w-7 h-7 flex items-center justify-center text-green-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          >
                            <Icon name="x" size={13} />
                          </button>
                        )}
                      </div>
                    )
                  }

                  const expense = row.data as Expense
                  const pocket  = pockets.find(p => p.id === expense.pocketId)
                  const pi      = pockets.findIndex(p => p.id === expense.pocketId)
                  return (
                    <TransactionItem
                      key={expense.id}
                      expense={expense}
                      pocket={pocket}
                      pocketIndex={pi}
                      config={config}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      showDivider={!isLast}
                    />
                  )
                })}
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
