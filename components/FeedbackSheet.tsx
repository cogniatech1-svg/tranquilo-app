'use client'

import { useState, useRef, useEffect } from 'react'
import { Icon } from './ui/Icon'
import { DS } from '../lib/config'

const TYPES = [
  { id: 'problema',   label: 'Reportar problema',  emoji: '🐛' },
  { id: 'sugerencia', label: 'Enviar sugerencia',   emoji: '💡' },
  { id: 'duda',       label: 'No entendí algo',     emoji: '🤔' },
] as const

type FeedbackType = typeof TYPES[number]['id']

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackSheet({ isOpen, onClose }: Props) {
  const [type,      setType]      = useState<FeedbackType | null>(null)
  const [message,   setMessage]   = useState('')
  const [submitted, setSubmitted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset on open
  useEffect(() => {
    if (!isOpen) return
    setType(null)
    setMessage('')
    setSubmitted(false)
  }, [isOpen])

  // Focus textarea once type is chosen
  useEffect(() => {
    if (type) setTimeout(() => textareaRef.current?.focus(), 80)
  }, [type])

  const canSubmit = type !== null && message.trim().length >= 5

  const handleSubmit = () => {
    if (!canSubmit) return
    const label    = TYPES.find(t => t.id === type)?.label ?? type
    const ts       = new Date().toISOString()
    const subject  = encodeURIComponent(`[Tranquilo Feedback] ${label}`)
    const body     = encodeURIComponent(
      `Tipo: ${label}\nFecha: ${ts}\n\n${message.trim()}`
    )
    window.location.href = `mailto:feedback@tranquilo.app?subject=${subject}&body=${body}`
    setSubmitted(true)
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
          style={{ background: DS.primaryGrad }}
        />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900">Feedback</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {submitted ? (
          /* ── Confirmation ──────────────────────────────────────────────── */
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl leading-none mb-4">💚</div>
            <p className="text-base font-bold text-slate-900">
              Gracias, esto nos ayuda a mejorar la app
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Leemos cada mensaje con cuidado.
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.97]"
              style={{ background: DS.primaryGrad }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Type selector ───────────────────────────────────────────── */}
            <div className="space-y-2">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-left transition-all border-2 ${
                    type === t.id
                      ? 'border-teal-400 bg-teal-50 text-teal-800'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base leading-none">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Message input ────────────────────────────────────────────── */}
            {type && (
              <>
                <textarea
                  ref={textareaRef}
                  rows={4}
                  placeholder="Cuéntanos con detalle…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3.5 text-sm outline-none resize-none transition-colors placeholder:text-slate-300 bg-slate-50 focus:bg-white"
                />

                {/* Privacy note */}
                <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
                  No incluyas información sensible como contraseñas o datos bancarios.
                </p>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full py-4 text-sm font-semibold text-white rounded-2xl transition-all active:scale-[0.97] disabled:opacity-40"
                  style={{
                    background: DS.primaryGrad,
                    boxShadow: '0 4px 16px rgba(15,118,110,.25)',
                  }}
                >
                  Enviar feedback
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
