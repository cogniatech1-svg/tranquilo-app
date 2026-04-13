'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Icon } from './ui/Icon'
import { PrimaryButton } from './ui/PrimaryButton'
import { getPocketIcon, DS } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Expense, ExpensePayload, Pocket } from '../lib/types'
import { parseTransaction } from '../lib/utils'
import { formatMoney } from '../lib/config'

interface Props {
  isOpen: boolean
  editingExpense: Expense | null
  pockets: Pocket[]
  conceptMap: Record<string, string>
  config: CountryConfig
  onSave: (p: ExpensePayload) => void
  onSaveIncome?: (amount: number, note: string) => void
  onClose: () => void
}

export function AddExpenseSheet({
  isOpen,
  editingExpense,
  pockets,
  conceptMap,
  config,
  onSave,
  onSaveIncome,
  onClose,
}: Props) {
  const [text,         setText]         = useState('')
  const [pocketId,     setPocketId]     = useState('')
  const [typeOverride, setTypeOverride] = useState<'income' | 'expense' | null>(null)
  const [error,        setError]        = useState('')
  const [toast,        setToast]        = useState('')
  const [date,         setDate]         = useState(() => new Date().toISOString().slice(0, 10))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    if (editingExpense) {
      setText(`${editingExpense.concept} ${editingExpense.amount}`)
      setPocketId(editingExpense.pocketId)
      setDate(editingExpense.date.slice(0, 10))
    } else {
      setText('')
      setPocketId('')
      setDate(new Date().toISOString().slice(0, 10))
    }
    setTypeOverride(null)
    setError('')
  }, [isOpen, editingExpense])

  // ── Parse current text ───────────────────────────────────────────────────
  const parsed = useMemo(
    () => parseTransaction(text, conceptMap, pockets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text],
  )

  // Auto-fill pocket from parsed category when not editing
  useEffect(() => {
    if (editingExpense) return
    if (parsed.category) setPocketId(prev => prev || parsed.category!)
    else if (!pocketId) setPocketId('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.category])

  const txType = typeOverride ?? parsed.type
  const suggestedPocket = parsed.category
    ? pockets.find(p => p.id === parsed.category)
    : null

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!parsed.amount) {
      setError(`No encontré el monto. Ejemplo: ${config.exampleExpense}`)
      return
    }

    const showToast = (msg: string) => {
      setToast(msg)
      setTimeout(() => setToast(''), 1800)
    }

    if (txType === 'income') {
      const note = parsed.description === 'Gasto' ? '' : parsed.description
      onSaveIncome?.(parsed.amount, note)
      showToast(`💚 Ingreso de ${formatMoney(parsed.amount, config)} registrado`)
      setText('')
      setPocketId('')
      setTypeOverride(null)
      setError('')
      setTimeout(() => textareaRef.current?.focus(), 50)
      return
    }

    // Expense path
    const resolvedPocketId = pocketId || parsed.category || (pockets[0]?.id ?? '')
    const pocketName = pockets.find(p => p.id === resolvedPocketId)?.name ?? ''
    onSave({
      concept: parsed.description,
      amount:  parsed.amount,
      pocketId: resolvedPocketId,
      date: new Date(date + 'T12:00:00').toISOString(),
      id: editingExpense?.id,
    })

    if (editingExpense) {
      onClose()
    } else {
      showToast(`✓ ${formatMoney(parsed.amount, config)}${pocketName ? ` · ${pocketName}` : ''} guardado`)
      setText('')
      setPocketId('')
      setTypeOverride(null)
      setError('')
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  // ── Accent color based on type ───────────────────────────────────────────
  const accentGrad  = txType === 'income'
    ? 'linear-gradient(90deg, #16A34A, #22C55E)'
    : DS.primaryGrad
  const borderFocus = txType === 'income' ? 'focus:border-green-400' : 'focus:border-teal-400'

  return (
    <>
      {/* Overlay */}
      <div
        role="presentation"
        tabIndex={-1}
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[2rem] z-50 px-6 pt-5 pb-10 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ boxShadow: '0 -8px 40px rgba(15,23,42,.12)' }}
      >
        {/* Handle */}
        <div
          className="w-10 h-1 rounded-full mx-auto mb-6 transition-all duration-300"
          style={{ background: accentGrad }}
        />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            {editingExpense ? 'Editar' : txType === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Text input */}
          <textarea
            ref={textareaRef}
            rows={2}
            autoFocus={isOpen && !editingExpense}
            placeholder={
              txType === 'income'
                ? `ej. Salario 3000000  ·  Freelance 500000`
                : `ej. ${config.exampleExpense}  ·  Domicilio pizza`
            }
            value={text}
            onChange={e => { setText(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
            className={`w-full border-2 border-slate-100 ${borderFocus} rounded-2xl px-4 py-3.5 text-sm outline-none resize-none transition-colors placeholder:text-slate-300 bg-slate-50 focus:bg-white`}
          />

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <Icon name="calendar" size={14} className="text-slate-400 shrink-0" />
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setDate(e.target.value)}
              className="flex-1 border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-2.5 text-sm outline-none bg-slate-50 focus:bg-white transition-colors text-slate-700"
            />
            {date !== new Date().toISOString().slice(0, 10) && (
              <button
                type="button"
                onClick={() => setDate(new Date().toISOString().slice(0, 10))}
                className="text-xs text-teal-600 font-semibold px-2 py-1 rounded-xl hover:bg-teal-50 transition-colors"
              >
                Hoy
              </button>
            )}
          </div>

          {/* Live parse preview */}
          {text.trim().length > 0 && parsed.amount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Amount chip */}
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 tabular-nums">
                {formatMoney(parsed.amount, config)}
              </span>
              {/* Category chip — tappable to change */}
              {txType === 'expense' && (
                <button
                  type="button"
                  onClick={() => setPocketId('')}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100 transition-colors hover:bg-teal-100"
                >
                  {(() => { const p = pockets.find(q => q.id === (pocketId || parsed.category)); return getPocketIcon(p?.id ?? '', p?.name ?? '') })()} {' '}
                  {pockets.find(p => p.id === (pocketId || parsed.category))?.name ?? 'Sin categoría'}
                </button>
              )}
              {/* Type chip */}
              <span
                className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${
                  txType === 'income'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {txType === 'income' ? 'Ingreso' : 'Gasto'}
              </span>
            </div>
          )}

          {/* Toast confirmation */}
          {toast && (
            <div className="text-xs font-semibold text-center py-2 rounded-xl bg-slate-900 text-white transition-all">
              {toast}
            </div>
          )}

          {/* Type toggle — only shown if onSaveIncome is wired and not editing */}
          {onSaveIncome && !editingExpense && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTypeOverride('expense')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  txType === 'expense'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                💳 Gasto
              </button>
              <button
                type="button"
                onClick={() => setTypeOverride('income')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  txType === 'income'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                💚 Ingreso
              </button>
            </div>
          )}

          {/* Category suggestion chip (expenses only) */}
          {txType === 'expense' && suggestedPocket && !pocketId && (
            <button
              type="button"
              onClick={() => setPocketId(suggestedPocket.id)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 transition-colors hover:bg-teal-100"
            >
              💡 {suggestedPocket.name} detectado — toca para confirmar
            </button>
          )}

          {/* Pocket selector (expenses only) */}
          {txType === 'expense' && (
            <div className="relative">
              <select
                value={pocketId}
                onChange={e => setPocketId(e.target.value)}
                className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3.5 text-sm outline-none bg-slate-50 focus:bg-white appearance-none transition-colors"
              >
                <option value="">Categoría (opcional)</option>
                {pockets.map(p => (
                  <option key={p.id} value={p.id}>
                    {getPocketIcon(p.id, p.name)} {p.name}
                  </option>
                ))}
              </select>
              {/* Show auto-selected indicator */}
              {pocketId && pocketId === parsed.category && (
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] font-bold text-teal-600 pointer-events-none">
                  auto
                </span>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 px-1 font-medium">{error}</p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full py-4 text-sm font-semibold text-white rounded-2xl transition-all active:scale-[0.97]"
            style={{
              background: accentGrad,
              boxShadow: txType === 'income'
                ? '0 4px 16px rgba(21,128,61,.30)'
                : '0 4px 16px rgba(15,118,110,.25)',
            }}
          >
            {editingExpense
              ? 'Guardar cambios'
              : txType === 'income'
                ? 'Registrar ingreso'
                : 'Registrar gasto'}
          </button>
        </div>
      </div>
    </>
  )
}
