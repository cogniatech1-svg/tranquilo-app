'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from './ui/Icon'
import type { CountryConfig } from '../lib/config'
import { parseAmount, extractConcept } from '../lib/utils'

interface Props {
  isOpen: boolean
  config: CountryConfig
  onSave: (amount: number, note: string) => void
  onClose: () => void
}

export function AddExtraIncomeSheet({ isOpen, config, onSave, onClose }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setText('')
    setError('')
  }, [isOpen])

  const handleSave = () => {
    const amount = parseAmount(text)
    if (!amount) {
      setError(`Ingresa un monto. Ej: Freelance ${config.exampleExpense.split(' ')[1] ?? '50000'}`)
      return
    }
    const note = extractConcept(text)
    onSave(amount, note === 'Gasto' ? '' : note)
    setText('')
    setError('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

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
          style={{ background: 'linear-gradient(90deg, #16A34A, #22C55E)' }}
        />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Ingreso extra</h2>
            <p className="text-xs text-slate-400 mt-0.5">Freelance, bono, venta…</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="space-y-3.5">
          <textarea
            ref={inputRef}
            rows={2}
            autoFocus={isOpen}
            placeholder={`ej. Freelance ${config.exampleExpense.split(' ')[1] ?? '200000'}  ·  Bono 500000`}
            value={text}
            onChange={e => { setText(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
            className="w-full border-2 border-slate-100 focus:border-green-400 rounded-2xl px-4 py-3.5 text-sm outline-none resize-none transition-colors placeholder:text-slate-300 bg-slate-50 focus:bg-white"
          />

          {error && (
            <p className="text-xs text-red-500 px-1 font-medium">{error}</p>
          )}

          <button
            onClick={handleSave}
            className="w-full py-4 text-sm font-semibold text-white rounded-2xl transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #15803D 0%, #22C55E 100%)',
              boxShadow: '0 4px 16px rgba(21,128,61,.30)',
            }}
          >
            Registrar ingreso
          </button>
        </div>
      </div>
    </>
  )
}
