'use client'

import { useState } from 'react'
import { Card } from './ui/Card'
import { ProgressBar } from './ui/ProgressBar'
import { Icon } from './ui/Icon'
import { getPocketIcon, getPocketPalette, formatMoney } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Pocket } from '../lib/types'
import { parseAmount } from '../lib/utils'

interface Props {
  pocket: Pocket
  spent: number
  pocketIndex?: number
  config: CountryConfig
  onEdit?: (id: string, name: string, budget: number) => void
  onDelete?: (id: string) => void
  compact?: boolean
}

export function PocketCard({
  pocket,
  spent,
  pocketIndex = 0,
  config,
  onEdit,
  onDelete,
  compact = false,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(pocket.name)
  const [draftBudget, setDraftBudget] = useState(
    pocket.budget > 0 ? String(pocket.budget) : '',
  )

  const ratio = pocket.budget > 0 ? spent / pocket.budget : 0
  const icon = getPocketIcon(pocket.id, pocket.name, pocket.icon)
  const pal = getPocketPalette(pocket.id, pocketIndex)

  const openEdit = () => {
    setDraftName(pocket.name)
    setDraftBudget(pocket.budget > 0 ? String(pocket.budget) : '')
    setEditing(true)
  }
  const cancelEdit = () => {
    setDraftName(pocket.name)
    setDraftBudget(pocket.budget > 0 ? String(pocket.budget) : '')
    setEditing(false)
  }
  const saveEdit = () => {
    const n = draftName.trim()
    if (n && onEdit) onEdit(pocket.id, n, parseAmount(draftBudget))
    setEditing(false)
  }

  if (editing) {
    return (
      <Card className="p-4 space-y-3">
        <input
          autoFocus
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveEdit()}
          placeholder="Nombre"
          className="w-full text-sm font-semibold text-slate-800 border-b border-teal-200 outline-none bg-transparent pb-1.5"
        />
        <input
          value={draftBudget}
          onChange={e => setDraftBudget(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveEdit()}
          placeholder="Presupuesto"
          inputMode="numeric"
          className="w-full text-sm text-slate-500 border-b border-slate-100 outline-none bg-transparent pb-1.5"
        />
        <div className="flex justify-between pt-1">
          <button onClick={cancelEdit} className="text-xs text-slate-400 font-medium">
            Cancelar
          </button>
          <button onClick={saveEdit} className="text-xs font-bold" style={{ color: '#0D6259' }}>
            Guardar
          </button>
        </div>
      </Card>
    )
  }

  const isOver   = pocket.budget > 0 && spent > pocket.budget
  const excess   = isOver ? spent - pocket.budget : 0
  const leftover = !isOver && pocket.budget > 0 ? pocket.budget - spent : 0

  // ── Compact (dashboard inline) ─────────────────────────────────────────────
  if (compact) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base leading-none shrink-0 select-none"
            style={{ backgroundColor: isOver ? '#FEE2E2' : pal.bg }}
          >
            {icon}
          </div>
          <span className="text-sm font-semibold text-slate-800 flex-1 truncate">
            {pocket.name}
          </span>
          <span
            className="text-xs font-bold tabular-nums shrink-0"
            style={{ color: isOver ? '#EF4444' : pal.text }}
          >
            {formatMoney(spent, config)}
            {pocket.budget > 0 ? ` / ${formatMoney(pocket.budget, config)}` : ''}
          </span>
        </div>
        {pocket.budget > 0 && (
          <>
            <ProgressBar ratio={ratio} thick color={isOver ? undefined : pal.bar} />
            {isOver && (
              <p className="text-[10px] font-bold text-red-600 mt-1 tabular-nums">
                Exceso: {formatMoney(excess, config)}
              </p>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Full card ──────────────────────────────────────────────────────────────
  return (
    <Card className="p-4 overflow-hidden relative">
      {/* Top accent strip — red when exceeded */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ backgroundColor: isOver ? '#EF4444' : pal.bar }}
      />
      <div className="flex items-start justify-between gap-1 mb-3 mt-1">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl leading-none select-none"
            style={{ backgroundColor: pal.bg }}
          >
            {icon}
          </div>
          <span className="text-sm font-bold text-slate-800 leading-snug truncate">
            {pocket.name}
          </span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-0.5 shrink-0 pt-0.5">
            {onEdit && (
              <button
                onClick={openEdit}
                className="p-1.5 text-slate-300 hover:text-slate-500 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Icon name="edit" size={12} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete!(pocket.id)}
                className="p-1.5 text-slate-300 hover:text-red-400 rounded-xl hover:bg-red-50 transition-colors"
              >
                <Icon name="trash" size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {pocket.budget > 0 ? (
        <>
          <div className="flex items-baseline gap-1 mb-2">
            <span
              className="text-base font-bold tabular-nums"
              style={{ color: isOver ? '#EF4444' : '#0F172A' }}
            >
              {formatMoney(spent, config)}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              / {formatMoney(pocket.budget, config)}
            </span>
          </div>
          <ProgressBar ratio={ratio} thick color={isOver ? undefined : pal.bar} />
          {isOver ? (
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] font-bold text-red-600 tabular-nums">
                Exceso: {formatMoney(excess, config)}
              </p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                +{Math.round((excess / pocket.budget) * 100)}%
              </span>
            </div>
          ) : (
            <p className="text-[10px] mt-1.5 tabular-nums font-semibold" style={{ color: pal.text }}>
              {Math.round(ratio * 100)}% del presupuesto
              {leftover > 0 && ` · ${formatMoney(leftover, config)} libre`}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-base font-bold text-slate-900 tabular-nums mb-2">
            {formatMoney(spent, config)}
          </p>
          {onEdit && (
            <button
              onClick={openEdit}
              className="text-xs font-bold hover:opacity-70 transition-opacity"
              style={{ color: pal.text }}
            >
              + Definir presupuesto
            </button>
          )}
        </>
      )}
    </Card>
  )
}
