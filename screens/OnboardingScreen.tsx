'use client'

import { useState } from 'react'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { DS, formatMoney } from '../lib/config'
import type { CountryCode, CountryConfig } from '../lib/config'
import { parseAmount } from '../lib/utils'

interface Props {
  config: CountryConfig
  onComplete: (countryCode: CountryCode, budget: number, income: number) => void
}

export function OnboardingScreen({ config, onComplete }: Props) {
  const [step, setStep] = useState<'income' | 'budget'>('income')
  const [incomeInput, setIncomeInput] = useState('')
  const [budgetInput, setBudgetInput] = useState('')
  const [error, setError] = useState('')

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

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #042F2E 0%, #0F766E 55%, #0891B2 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 translate-x-1/4 -translate-y-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-teal-300/15 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center max-w-sm mx-auto w-full">

        {/* Logo */}
        <div
          className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-8 text-4xl select-none border border-white/25"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,.15)', backdropFilter: 'blur(4px)' }}
        >
          🌿
        </div>

        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Tranquilo</h1>
        <p className="text-white/60 text-base leading-relaxed mb-12">
          Finanzas personales sin estrés
        </p>

        {/* ── Step: Income ── */}
        {step === 'income' && (
          <div className="w-full space-y-5">
            <div>
              <p className="text-white/60 text-sm leading-relaxed">
                ¿Cuánto recibes al mes?
              </p>
            </div>

            <div>
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                placeholder={config.defaultBudget.toLocaleString()}
                value={incomeInput}
                onChange={e => { setIncomeInput(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleIncomeContinue()}
                className="w-full bg-white/15 border-2 border-white/20 focus:border-white/60 rounded-2xl px-5 py-4 text-xl font-bold text-white placeholder:text-white/30 outline-none transition-colors text-center tabular-nums"
              />
              {incomeInput && parsedIncome > 0 && (
                <p className="text-white/50 text-xs text-center mt-2">
                  {formatMoney(parsedIncome, config)}
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-300 text-xs font-medium">{error}</p>
            )}

            <div className="space-y-3 pt-2">
              <PrimaryButton
                onClick={handleIncomeContinue}
                className="w-full py-4 text-base"
              >
                Continuar →
              </PrimaryButton>
              <button
                onClick={() => { setError(''); setStep('budget') }}
                className="w-full text-white/50 text-sm py-2 hover:text-white/70 transition-colors"
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
              <p className="text-white/60 text-sm leading-relaxed">
                ¿Cuánto planeas gastar este mes?
              </p>
              {parsedIncome > 0 && (
                <p className="text-white/40 text-xs mt-1">
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
                className="w-full bg-white/15 border-2 border-white/20 focus:border-white/60 rounded-2xl px-5 py-4 text-xl font-bold text-white placeholder:text-white/30 outline-none transition-colors text-center tabular-nums"
              />
              {budgetInput && parsedBudget > 0 && (
                <p className="text-white/50 text-xs text-center mt-2">
                  {formatMoney(parsedBudget, config)}
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-300 text-xs font-medium">{error}</p>
            )}

            <div className="space-y-3 pt-2">
              <PrimaryButton
                onClick={handleStart}
                className="w-full py-4 text-base"
              >
                Empezar →
              </PrimaryButton>
              <button
                onClick={() => onComplete(config.code, 0, parsedIncome)}
                className="w-full text-white/50 text-sm py-2 hover:text-white/70 transition-colors"
              >
                Continuar sin presupuesto
              </button>
            </div>

            <button
              onClick={() => { setStep('income'); setError('') }}
              className="text-white/40 text-xs hover:text-white/60 transition-colors"
            >
              ← Volver
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
