import { Icon } from './ui/Icon'
import { getPocketIcon, getPocketPalette } from '../lib/config'
import { formatMoney } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Expense, Pocket } from '../lib/types'

interface Props {
  expense: Expense
  pocket?: Pocket
  pocketIndex?: number
  config: CountryConfig
  onEdit?: (e: Expense) => void
  onDelete?: (id: string) => void
  showDivider?: boolean
}

export function TransactionItem({
  expense,
  pocket,
  pocketIndex = 0,
  config,
  onEdit,
  onDelete,
  showDivider = true,
}: Props) {
  const icon = pocket ? getPocketIcon(pocket.id, pocket.name, pocket.icon) : '💳'
  const pal = getPocketPalette(pocket?.id ?? '', pocketIndex)

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${
        showDivider ? 'border-b border-slate-50' : ''
      }`}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl leading-none select-none"
        style={{ backgroundColor: pal.bg }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 capitalize truncate leading-tight">
          {expense.concept}
        </p>
        {pocket && (
          <p className="text-[11px] mt-0.5 font-medium" style={{ color: pal.text }}>
            {pocket.name}
          </p>
        )}
      </div>

      {/* Amount */}
      <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
        {formatMoney(expense.amount, config)}
      </span>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="flex gap-0.5 shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(expense)}
              className="p-1.5 text-slate-300 hover:text-slate-500 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Icon name="edit" size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(expense.id)}
              className="p-1.5 text-slate-300 hover:text-red-400 rounded-xl hover:bg-red-50 transition-colors"
            >
              <Icon name="trash" size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
