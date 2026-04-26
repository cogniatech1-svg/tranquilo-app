'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
import { Icon } from './ui/Icon'
import { PrimaryButton } from './ui/PrimaryButton'
import { getPocketIcon, DS } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Expense, ExtraIncome, ExpensePayload, Pocket } from '../lib/types'
import { parseTransaction } from '../lib/utils'
import { formatMoney } from '../lib/config'
import { useSpeechRecognition } from '../lib/hooks/useSpeechRecognition'
import { VoiceConfirmationSheet } from './VoiceConfirmationSheet'

interface Props {
  isOpen: boolean
  editingExpense: Expense | null
  editingIncome?: ExtraIncome | null
  pockets: Pocket[]
  conceptMap: Record<string, string>
  config: CountryConfig
  defaultType?: 'income' | 'expense'
  onSave: (p: ExpensePayload) => void
  onSaveIncome?: (amount: number, note: string) => void
  onUpdateIncome?: (id: string, amount: number, note: string, date: string) => void
  onSwitchToIncome?: (expenseId: string, amount: number, note: string, date: string) => void
  onClose: () => void
  learnedCategoryMap?: Record<string, string>
  setLearnedCategoryMap?: (map: Record<string, string>) => void
}

export function AddExpenseSheet({
  isOpen,
  editingExpense,
  editingIncome,
  pockets,
  conceptMap,
  config,
  defaultType,
  onSave,
  onSaveIncome,
  onUpdateIncome,
  onSwitchToIncome,
  onClose,
  learnedCategoryMap,
  setLearnedCategoryMap,
}: Props) {
  const [text,         setText]         = useState('')
  const [pocketId,     setPocketId]     = useState('')
  const [typeOverride, setTypeOverride] = useState<'income' | 'expense' | null>(null)
  const [error,        setError]        = useState('')
  const [toast,        setToast]        = useState('')
  const [date,         setDate]         = useState(() => localToday())
  const [voiceConfirmationOpen, setVoiceConfirmationOpen] = useState(false)
  const [pendingVoiceData, setPendingVoiceData] = useState<{ text: string; parsed: any } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Voice recognition ────────────────────────────────────────────────────
  const { isListening, transcript, startListening, stopListening, error: voiceError } = useSpeechRecognition({
    language: 'es-CO',
    onResult: (voiceText) => {
      // Parse the voice text
      const voiceParsed = parseTransaction(voiceText, conceptMap, pockets, learnedCategoryMap)

      // Store for confirmation
      setPendingVoiceData({ text: voiceText, parsed: voiceParsed })
      setVoiceConfirmationOpen(true)
    },
    onError: (err) => {
      setToast(`Error de voz: ${err}`)
      setTimeout(() => setToast(''), 2000)
    },
  })

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    if (editingExpense) {
      setText(`${editingExpense.concept} ${editingExpense.amount}`)
      setPocketId(editingExpense.pocketId)
      setDate(editingExpense.date.slice(0, 10))
      setTypeOverride('expense')
    } else if (editingIncome) {
      const textVal = editingIncome.note
        ? `${editingIncome.note} ${editingIncome.amount}`
        : String(editingIncome.amount)
      setText(textVal)
      setPocketId('')
      setDate(editingIncome.date.slice(0, 10))
      setTypeOverride('income')
    } else {
      setText('')
      setPocketId('')
      setDate(localToday())
      setTypeOverride(defaultType ?? null)
    }
    setError('')
  }, [isOpen, editingExpense, editingIncome])

  // ── Parse current text ───────────────────────────────────────────────────
  const parsed = useMemo(
    () => parseTransaction(text, conceptMap, pockets, learnedCategoryMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, learnedCategoryMap],
  )

  // Auto-fill pocket from parsed category — only when creating (not editing)
  useEffect(() => {
    if (editingExpense) return
    if (parsed.category) setPocketId(prev => prev || parsed.category!)
    else if (!pocketId) setPocketId('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.category, editingExpense])

  const txType = typeOverride ?? parsed.type
  const suggestedPocket = parsed.category
    ? pockets.find(p => p.id === parsed.category)
    : null

  // ── Confirm voice input (save with learning) ────────────────────────────
  const handleVoiceConfirm = () => {
    if (!pendingVoiceData) return

    const { text: voiceText, parsed: voiceParsed } = pendingVoiceData

    if (!voiceParsed.amount) {
      setToast('No se detectó monto válido')
      setVoiceConfirmationOpen(false)
      setPendingVoiceData(null)
      return
    }

    const voiceType = voiceParsed.type
    const resolvedPocketId = voiceParsed.category || (pockets[0]?.id ?? '')

    // Learn from voice if category was detected
    if (voiceParsed.category && learnedCategoryMap && setLearnedCategoryMap) {
      const words = voiceText.split(/\s+/).filter(w => w.length > 0)
      if (words.length > 0) {
        const keyword = words[0].toLowerCase()
        if (!/^\d+$/.test(keyword) && keyword !== voiceParsed.category) {
          const newMap = {
            ...learnedCategoryMap,
            [keyword]: voiceParsed.category,
          }
          setLearnedCategoryMap(newMap)
        }
      }
    }

    // Save the transaction
    if (voiceType === 'income') {
      const note = voiceParsed.description === 'Gasto' ? '' : voiceParsed.description
      const isoDate = new Date(date + 'T12:00:00').toISOString()
      onSaveIncome?.(voiceParsed.amount, note)
    } else {
      const isoDate = new Date(date + 'T12:00:00').toISOString()
      onSave({
        concept: voiceParsed.description,
        amount: voiceParsed.amount,
        pocketId: resolvedPocketId,
        date: isoDate,
      })
    }

    // Show confirmation toast
    setToast('✓ Movimiento guardado')
    setTimeout(() => setToast(''), 1800)

    // Reset and close
    setVoiceConfirmationOpen(false)
    setPendingVoiceData(null)
    setText('')
    setPocketId('')
    onClose()
  }

  // ── Edit voice input (open in full form) ──────────────────────────────────
  const handleVoiceEdit = () => {
    if (!pendingVoiceData) return

    const { text: voiceText } = pendingVoiceData

    // Pre-fill the form with voice data
    setText(voiceText)
    setVoiceConfirmationOpen(false)
    setPendingVoiceData(null)
  }

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
      const isoDate = new Date(date + 'T12:00:00').toISOString()

      if (editingExpense) {
        onSwitchToIncome?.(editingExpense.id, parsed.amount, note, isoDate)
        onClose()
        return
      }

      if (editingIncome) {
        onUpdateIncome?.(editingIncome.id, parsed.amount, note, isoDate)
        onClose()
        return
      }

      onSaveIncome?.(parsed.amount, note)
      onClose()
      return
    }

    // Expense path
    const resolvedPocketId = pocketId || parsed.category || (pockets[0]?.id ?? '')
    const pocketName = pockets.find(p => p.id === resolvedPocketId)?.name ?? ''

    // ── Learning: user manually selected category (different from parser's suggestion) ──
    if (pocketId && pocketId !== parsed.category && learnedCategoryMap && setLearnedCategoryMap) {
      // Extract first meaningful word from description
      const words = parsed.description.split(/\s+/).filter(w => w.length > 0)
      if (words.length > 0) {
        const keyword = words[0].toLowerCase()
        // Only learn if it's not purely numeric
        if (!/^\d+$/.test(keyword)) {
          const newMap = {
            ...learnedCategoryMap,
            [keyword]: pocketId,
          }
          setLearnedCategoryMap(newMap)
        }
      }
    }

    onSave({
      concept: parsed.description,
      amount:  parsed.amount,
      pocketId: resolvedPocketId,
      date: new Date(date + 'T12:00:00').toISOString(),
      id: editingExpense?.id,
    })

    onClose()
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
            {editingIncome
              ? 'Editar ingreso'
              : editingExpense
                ? txType === 'income' ? 'Editar ingreso' : 'Editar gasto'
                : txType === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Text input + voice button */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={2}
              autoFocus={isOpen && !editingExpense}
              placeholder={
                txType === 'income'
                  ? `ej. Salario 3000000`
                  : `ej. ${config.exampleExpense}`
              }
              value={text}
              onChange={e => { setText(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
              className={`w-full border-2 border-slate-100 ${borderFocus} rounded-2xl px-4 py-3.5 text-sm outline-none resize-none transition-colors placeholder:text-slate-300 bg-slate-50 focus:bg-white`}
            />
            {/* Voice button */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-lg transition-all text-lg ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isListening ? 'Detener grabación' : 'Grabar voz'}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <Icon name="calendar" size={14} className="text-slate-400 shrink-0" />
            <input
              type="date"
              value={date}
              max={localToday()}
              onChange={e => setDate(e.target.value)}
              className="flex-1 border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-2.5 text-sm outline-none bg-slate-50 focus:bg-white transition-colors text-slate-700"
            />
            {date !== localToday() && (
              <button
                type="button"
                onClick={() => setDate(localToday())}
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
              {/* Category chip — only when NOT editing, tappable to clear auto-selection */}
              {txType === 'expense' && !editingExpense && (
                <button
                  type="button"
                  onClick={() => setPocketId('')}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100 transition-colors hover:bg-teal-100"
                >
                  {(() => { const p = pockets.find(q => q.id === (pocketId || parsed.category)); return getPocketIcon(p?.id ?? '', p?.name ?? '', p?.icon) })()} {' '}
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

          {/* Type toggle — shown whenever income saving/switching is wired */}
          {(onSaveIncome || onSwitchToIncome) && (
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

          {/* Pocket selector — always visible when editing, otherwise only for expenses */}
          {(editingExpense || txType === 'expense') && (
            <div className="relative">
              <select
                value={pocketId}
                onChange={e => setPocketId(e.target.value)}
                className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3.5 text-sm outline-none bg-slate-50 focus:bg-white appearance-none transition-colors"
              >
                <option value="">Categoría (opcional)</option>
                {pockets.map(p => (
                  <option key={p.id} value={p.id}>
                    {getPocketIcon(p.id, p.name, p.icon)} {p.name}
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

      {/* Voice confirmation modal */}
      {pendingVoiceData && (
        <VoiceConfirmationSheet
          isOpen={voiceConfirmationOpen}
          parsed={pendingVoiceData.parsed}
          voiceText={pendingVoiceData.text}
          pockets={pockets}
          config={config}
          onConfirm={handleVoiceConfirm}
          onEdit={handleVoiceEdit}
          onClose={() => {
            setVoiceConfirmationOpen(false)
            setPendingVoiceData(null)
          }}
        />
      )}
    </>
  )
}
