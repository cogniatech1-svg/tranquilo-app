'use client'

import { Icon } from './ui/Icon'
import type { Pocket } from '../lib/types'

interface Props {
  pocket: Pocket
  gastoCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeletePocketModal({
  pocket,
  gastoCount,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-lg font-bold text-slate-900">Eliminar bolsillo</h2>
        </div>

        {/* Content */}
        <p className="text-sm text-slate-700">
          El bolsillo <strong>{pocket.name}</strong> tiene:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 ml-4">
          {pocket.budget > 0 && (
            <li className="flex items-center gap-2">
              <span>•</span>
              <span>
                Presupuesto asignado: <strong>${pocket.budget.toLocaleString()}</strong>
              </span>
            </li>
          )}
          {gastoCount > 0 && (
            <li className="flex items-center gap-2">
              <span>•</span>
              <span>
                {gastoCount} {gastoCount === 1 ? 'gasto' : 'gastos'} registrado
                {gastoCount === 1 ? '' : 's'}
              </span>
            </li>
          )}
        </ul>

        <p className="text-xs text-red-600 font-semibold">Esta acción no se puede deshacer.</p>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
