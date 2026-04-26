'use client'

import { Icon } from './ui/Icon'
import { getPocketIcon, DS, formatMoney } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { ParsedTransaction, Pocket } from '../lib/types'

interface Props {
  isOpen: boolean
  parsed: ParsedTransaction
  pockets: Pocket[]
  config: CountryConfig
  onConfirm: () => void
  onEdit: () => void
  onClose: () => void
}

export function VoiceConfirmationSheet({
  isOpen,
  parsed,
  pockets,
  config,
  onConfirm,
  onEdit,
  onClose,
}: Props) {
  const pocket = parsed.category
    ? pockets.find(p => p.id === parsed.category)
    : null

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
          className="w-10 h-1 rounded-full mx-auto mb-6"
          style={{ background: DS.primaryGrad }}
        />

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            🎤 Confirmar reconocimiento
          </h2>
          <p className="text-sm text-slate-500">
            Verifica que escuchamos correctamente
          </p>
        </div>

        {/* Voice text */}
        <div className="mb-5 p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <p className="text-xs font-bold text-blue-600 uppercase mb-1">
            Escuché:
          </p>
          <p className="text-sm font-semibold text-blue-900">
            {parsed.description}
          </p>
        </div>

        {/* Details grid */}
        <div className="space-y-3 mb-6">
          {/* Type */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-xs font-bold text-slate-600 uppercase">
              Tipo
            </span>
            <span
              className={`text-sm font-bold ${
                parsed.type === 'income'
                  ? 'text-green-600'
                  : 'text-slate-700'
              }`}
            >
              {parsed.type === 'income' ? '💚 Ingreso' : '💳 Gasto'}
            </span>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-xs font-bold text-slate-600 uppercase">
              Monto
            </span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {formatMoney(parsed.amount, config)}
            </span>
          </div>

          {/* Category */}
          {pocket && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-xs font-bold text-slate-600 uppercase">
                Categoría
              </span>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                {getPocketIcon(pocket.id, pocket.name, pocket.icon)}
                {pocket.name}
              </span>
            </div>
          )}

          {/* Concept */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-xs font-bold text-slate-600 uppercase">
              Concepto
            </span>
            <span className="text-sm font-bold text-slate-900 text-right max-w-xs truncate">
              {parsed.description}
            </span>
          </div>
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
