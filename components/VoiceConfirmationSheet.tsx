'use client'

import { DS, formatMoney, getPocketIcon } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { ParsedTransaction, Pocket } from '../lib/types'

interface Props {
  isOpen: boolean
  parsed: ParsedTransaction
  voiceText: string
  pockets: Pocket[]
  config: CountryConfig
  onConfirm: () => void
  onEdit: () => void
  onClose: () => void
}

export function VoiceConfirmationSheet({
  isOpen,
  parsed,
  voiceText,
  pockets,
  config,
  onConfirm,
  onEdit,
  onClose,
}: Props) {
  const pocket = parsed.category
    ? pockets.find(p => p.id === parsed.category)
    : null

  const typeLabel = parsed.type === 'income' ? 'Ingreso' : 'Gasto'
  const categoryLabel = pocket?.name || 'Sin categoría'

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
          className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: DS.primaryGrad }}
        />

        {/* Escuchaste */}
        <div className="mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
            Escuché:
          </p>
          <p className="text-lg font-bold text-slate-900">
            {voiceText}
          </p>
        </div>

        {/* Main summary line */}
        <div className="mb-8 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between">
            {/* Monto */}
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatMoney(parsed.amount, config)}
            </span>

            {/* Separadores */}
            <div className="flex items-center gap-2 px-3">
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-sm font-semibold text-slate-600">
                {typeLabel}
              </span>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Categoría con ícono */}
            <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
              {pocket && getPocketIcon(pocket.id, pocket.name, pocket.icon)}
              {categoryLabel}
            </span>
          </div>
        </div>

        {/* Concepto */}
        <div className="mb-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
            Concepto:
          </p>
          <p className="text-base font-semibold text-slate-700">
            {parsed.description}
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-2.5">
          {/* Confirm button */}
          <button
            onClick={onConfirm}
            className="w-full py-4 text-sm font-semibold text-white rounded-2xl transition-all active:scale-[0.97]"
            style={{
              background: DS.primaryGrad,
              boxShadow: '0 4px 16px rgba(15,118,110,.25)',
            }}
          >
            ✓ Confirmar
          </button>

          {/* Edit button */}
          <button
            onClick={onEdit}
            className="w-full py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors active:scale-[0.97]"
          >
            ✏️ Editar
          </button>

          {/* Cancel button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}
