'use client'

import { useState, useEffect } from 'react'
import { formatMoney } from '../lib/config'
import type { CountryCode, CountryConfig } from '../lib/config'
import { parseAmount } from '../lib/utils'

// ── Shared input style ─────────────────────────────────────────────────────
const inputCls = [
  'w-full rounded-2xl px-5 py-4 outline-none transition-all',
  'text-xl font-bold text-white text-center tabular-nums',
  'placeholder:text-white/40',
  // Glass: enough opacity to read text, strong border at rest
  'bg-white/[0.13] border-2 border-white/45',
  'focus:border-white focus:bg-white/[0.20]',
].join(' ')

interface Props {
  config: CountryConfig
  onComplete: (countryCode: CountryCode, budget: number, income: number) => void
}

export function OnboardingScreen({ config, onComplete }: Props) {
  const [hydrated, setHydrated] = useState(false)
  const [step, setStep] = useState<'income' | 'budget'>('income')
  const [incomeInput, setIncomeInput] = useState('')
  const [budgetInput, setBudgetInput] = useState('')
  const [error, setError] = useState('')

  // Ensure component is hydrated before rendering to avoid splash screen
  useEffect(() => {
    setHydrated(true)
  }, [])

  const parsedIncome = parseAmount(incomeInput)
  const parsedBudget = parseAmount(budgetInput)

  const handleIncomeContinue = () => {
    if (incomeInput.trim() && !parsedIncome) {
      setError(`Ingresa un monto válido. Ej: ${config.defaultBudget.toLocaleString()}`)
      return
    }
    setError('')
    setStep('budget')
  }

  const handleStart = () => {
    const budget = parseAmount(budgetInput)
    if (budgetInput.trim() && !budget) {
      setError(`Ingresa un monto válido. Ej: ${config.defaultBudget.toLocaleString()}`)
      return
    }
    onComplete(config.code, budget, parsedIncome)
  }

  // Don't render until hydrated to prevent flash of logo-only screen
  if (!hydrated) return null

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        // Darker start, less-saturated mid-green, cooler blue end → more depth & contrast
        background: 'linear-gradient(160deg, #051C1B 0%, #0A5C57 58%, #0A72A0 100%)',
      }}
    >
      {/* Decorative blobs — kept subtle so they don't add competing hue */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/[0.04] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-cyan-300/[0.06] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center max-w-sm mx-auto w-full">

        {/* ── Logo ── */}
        <div className="w-20 h-20 flex items-center justify-center mb-8">
          <img src="/icons/logo-clean-v2.png" className="w-16 h-16" />
        </div>

        {/* ── Brand ── */}
        <h1
          className="text-4xl font-bold text-white tracking-tight mb-2"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.30)' }}
        >
          Tranquilo
        </h1>
        <p className="text-white/70 text-base leading-relaxed mb-12">
          Finanzas personales sin estrés
        </p>

        {/* ── Step: Income ── */}
        {step === 'income' && (
          <div className="w-full space-y-5">
            <p className="text-white/85 text-sm font-semibold">
              ¿Cuánto recibes al mes?
            </p>

            <div>
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                placeholder={config.defaultBudget.toLocaleString()}
                value={incomeInput}
                onChange={e => { setIncomeInput(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleIncomeContinue()}
                className={inputCls}
                style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.10)' }}
              />
              {incomeInput && parsedIncome > 0 && (
                <p className="text-white/65 text-xs text-center mt-2 tabular-nums">
                  {formatMoney(parsedIncome, config)}
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-300 text-xs font-medium">{error}</p>
            )}

            <div className="space-y-3 pt-2">
              {/* Primary CTA — white fills max contrast on any dark bg */}
              <button
                onClick={handleIncomeContinue}
                className="w-full py-4 text-base font-bold rounded-2xl text-[#0A5C57] bg-white active:scale-[0.97] transition-all"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.22)' }}
              >
                Continuar →
              </button>
              <button
                onClick={() => { setError(''); setStep('budget') }}
                className="w-full text-white/65 text-sm py-2 hover:text-white/85 transition-colors"
              >
                Continuar sin ingresos
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Budget ── */}
        {step === 'budget' && (
          <div className="w-full space-y-5">
            <div>
              <p className="text-white/85 text-sm font-semibold">
                ¿Cuánto planeas gastar este mes?
              </p>
              {parsedIncome > 0 && (
                <p className="text-white/55 text-xs mt-1 tabular-nums">
                  Ingresos: {formatMoney(parsedIncome, config)}
                </p>
              )}
            </div>

            <div>
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                placeholder={config.defaultBudget.toLocaleString()}
                value={budgetInput}
                onChange={e => { setBudgetInput(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                className={inputCls}
                style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.10)' }}
              />
              {budgetInput && parsedBudget > 0 && (
                <p className="text-white/65 text-xs text-center mt-2 tabular-nums">
                  {formatMoney(parsedBudget, config)}
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-300 text-xs font-medium">{error}</p>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={handleStart}
                className="w-full py-4 text-base font-bold rounded-2xl text-[#0A5C57] bg-white active:scale-[0.97] transition-all"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.22)' }}
              >
                Empezar →
              </button>
              <button
                onClick={() => onComplete(config.code, 0, parsedIncome)}
                className="w-full text-white/65 text-sm py-2 hover:text-white/85 transition-colors"
              >
                Continuar sin presupuesto
              </button>
            </div>

            <button
              onClick={() => { setStep('income'); setError('') }}
              className="text-white/55 text-xs hover:text-white/75 transition-colors"
            >
              ← Volver
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
