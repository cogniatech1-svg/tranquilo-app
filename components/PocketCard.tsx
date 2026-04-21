'use client'

import { useState } from 'react'
import { Card } from './ui/Card'
import { ProgressBar } from './ui/ProgressBar'
import { Icon } from './ui/Icon'
import { getPocketIcon, getPocketPalette, maskMoney, guessIconFromName } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Pocket } from '../lib/types'
import { parseAmount } from '../lib/utils'
import { EmojiPicker } from './EmojiPicker'

interface Props {
  pocket: Pocket
  spent: number
  pocketIndex?: number
  config: CountryConfig
  onEdit?: (id: string, name: string, budget: number, icon?: string) => void
  onDelete?: (id: string) => void
  compact?: boolean
  isPrivacyMode?: boolean
}

export function PocketCard({
  pocket,
  spent,
  pocketIndex = 0,
  config,
  onEdit,
  onDelete,
  compact = false,
  isPrivacyMode = false,
}: Props) {
  const mm = (n: number) => maskMoney(n, config, isPrivacyMode)
  const [editing, setEditing]       = useState(false)
  const [draftName, setDraftName]   = useState(pocket.name)
  const [draftBudget, setDraftBudget] = useState(
    pocket.budget > 0 ? String(pocket.budget) : '',
  )
  const [draftIcon, setDraftIcon]   = useState(pocket.icon ?? '')
  const [showPicker, setShowPicker] = useState(false)

  const ratio = pocket.budget > 0 ? spent / pocket.budget : 0
  const icon  = getPocketIcon(pocket.id, pocket.name, pocket.icon)
  const pal   = getPocketPalette(pocket.id, pocketIndex)

  const previewIcon = draftIcon || guessIconFromName(draftName)

  const openEdit = () => {
    setDraftName(pocket.name)
    setDraftBudget(pocket.budget > 0 ? String(pocket.budget) : '')
    setDraftIcon(pocket.icon ?? '')
    setEditing(true)
  }
  const cancelEdit = () => {
    setDraftName(pocket.name)
    setDraftBudget(pocket.budget > 0 ? String(pocket.budget) : '')
    setDraftIcon(pocket.icon ?? '')
    setEditing(false)
  }
  const saveEdit = () => {
    const n = draftName.trim()
    if (n && onEdit) onEdit(pocket.id, n, parseAmount(draftBudget), draftIcon || undefined)
    setEditing(false)
  }

  if (editing) {
    return (
      <>
        <Card className="p-4 space-y-3">
          {/* Icon + name row */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xl transition-all active:scale-95 shrink-0 relative"
            >
              {previewIcon}
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-teal-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">✎</span>
            </button>
            <input
              autoFocus
              value={draftName}
              onChange={e => { setDraftName(e.target.value); setDraftIcon('') }}
              onKeyDown={e => e.key === 'Enter' && saveEdit()}
              placeholder="Nombre"
              className="flex-1 text-sm font-semibold text-slate-800 border-b border-teal-200 outline-none bg-transparent pb-1.5"
            />
          </div>
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
        {showPicker && (
          <EmojiPicker
            current={previewIcon}
            onSelect={setDraftIcon}
            onClose={() => setShowPicker(false)}
          />
        )}
      </>
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
            {mm(spent)}
            {pocket.budget > 0 ? ` / ${mm(pocket.budget)}` : ''}
          </span>
        </div>
        {pocket.budget > 0 && (
          <>
            <ProgressBar ratio={ratio} thick color={isOver ? undefined : pal.bar} />
            {isOver && (
              <p className="text-[10px] font-bold text-red-600 mt-1 tabular-nums">
                Exceso: {mm(excess)}
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
              {mm(spent)}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              / {mm(pocket.budget)}
            </span>
          </div>
          <ProgressBar ratio={ratio} thick color={isOver ? undefined : pal.bar} />
          {isOver ? (
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] font-bold text-red-600 tabular-nums">
                Exceso: {mm(excess)}
              </p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                +{Math.round((excess / pocket.budget) * 100)}%
              </span>
            </div>
          ) : (
            <p className="text-[10px] mt-1.5 tabular-nums font-semibold" style={{ color: pal.text }}>
              {Math.round(ratio * 100)}% del presupuesto
              {leftover > 0 && ` · ${mm(leftover)} libre`}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-base font-bold text-slate-900 tabular-nums mb-2">
            {mm(spent)}
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
