import { useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Icon } from '../components/ui/Icon'
import { TransactionItem } from '../components/TransactionItem'
import { formatMoney, DS } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Expense, Pocket } from '../lib/types'
import { groupByDate } from '../lib/utils'

interface Props {
  expenses: Expense[]
  pockets: Pocket[]
  config: CountryConfig
  onAdd: () => void
  onEdit: (e: Expense) => void
  onDelete: (id: string) => void
}

export function TransactionsScreen({
  expenses,
  pockets,
  config,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const grouped = useMemo(
    () => groupByDate(expenses, config.locale),
    [expenses, config.locale],
  )

  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  )

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
            {expenses.length > 0 && (
              <p className="text-sm text-slate-500 mt-0.5">
                {expenses.length} transacciones · {formatMoney(totalSpent, config)}
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
        {expenses.length === 0 ? (
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
          grouped.map(({ label, items }) => (
            <div key={label}>
              {/* Date group header */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400 shrink-0">
                  {label}
                </p>
                <div className="flex-1 h-px bg-slate-100" />
                <p className="text-xs font-bold text-slate-600 tabular-nums shrink-0">
                  {formatMoney(items.reduce((s, e) => s + e.amount, 0), config)}
                </p>
              </div>

              <Card className="overflow-hidden">
                {items.map((e, i) => {
                  const pocket = pockets.find(p => p.id === e.pocketId)
                  const pi = pockets.findIndex(p => p.id === e.pocketId)
                  return (
                    <TransactionItem
                      key={e.id}
                      expense={e}
                      pocket={pocket}
                      pocketIndex={pi}
                      config={config}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      showDivider={i < items.length - 1}
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
