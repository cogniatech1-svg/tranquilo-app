'use client'

import { useState } from 'react'
import { restoreFromBackup } from '../lib/utils'
import type { Expense, ExtraIncome, Pocket } from '../lib/types'
import { DS } from '../lib/config'

interface DataRestoreScreenProps {
  onRestore: (month: string, monthRecord: any) => void
  onClose: () => void
}

export function DataRestoreScreen({ onRestore, onClose }: DataRestoreScreenProps) {
  const [step, setStep] = useState<'input' | 'review' | 'code'>('input')
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    income: '',
    savings: '',
    pocketJson: '[]',
    expenseJson: '[]',
  })
  const [restoration, setRestoration] = useState<any>(null)
  const [error, setError] = useState('')

  const handleValidate = () => {
    try {
      setError('')

      const income = parseFloat(formData.income)
      const savings = parseFloat(formData.savings)
      const pockets = JSON.parse(formData.pocketJson) as Pocket[]
      const expenses = JSON.parse(formData.expenseJson) as Expense[]

      if (isNaN(income)) throw new Error('Income debe ser un número')
      if (isNaN(savings)) throw new Error('Savings debe ser un número')

      const result = restoreFromBackup(income, savings, expenses, [], pockets, formData.month)
      setRestoration(result)
      setStep('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar datos')
    }
  }

  const handleRestore = () => {
    if (restoration) {
      onRestore(formData.month, restoration.report.normalized)
      setStep('code')
    }
  }

  return (
    <div className="min-h-screen p-4" style={{ background: DS.bg }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: DS.text }}>
            Restaurar Datos Financieros
          </h1>
          <button onClick={onClose} className="text-2xl">
            ✕
          </button>
        </div>

        {step === 'input' && (
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-semibold">Mes (YYYY-MM)</label>
              <input
                type="text"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                placeholder="2026-04"
                className="w-full p-3 border rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-semibold">Ingresos</label>
                <input
                  type="number"
                  value={formData.income}
                  onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                  placeholder="2000000"
                  className="w-full p-3 border rounded"
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold">Ahorro</label>
                <input
                  type="number"
                  value={formData.savings}
                  onChange={(e) => setFormData({ ...formData, savings: e.target.value })}
                  placeholder="400000"
                  className="w-full p-3 border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-semibold">Bolsillos (JSON)</label>
              <textarea
                value={formData.pocketJson}
                onChange={(e) => setFormData({ ...formData, pocketJson: e.target.value })}
                placeholder='[{"id":"hogar","name":"Hogar","budget":800000}]'
                className="w-full p-3 border rounded font-mono text-sm h-24"
              />
              <p className="text-xs mt-1 opacity-70">
                Formato: {`[{"id":"string","name":"string","budget":numero}]`}
              </p>
            </div>

            <div>
              <label className="block mb-2 font-semibold">Gastos (JSON)</label>
              <textarea
                value={formData.expenseJson}
                onChange={(e) => setFormData({ ...formData, expenseJson: e.target.value })}
                placeholder='[{"id":"1","concept":"mercado","amount":50000,"pocketId":"alimentacion","date":"2026-04-01"}]'
                className="w-full p-3 border rounded font-mono text-sm h-24"
              />
              <p className="text-xs mt-1 opacity-70">
                Formato: {`[{"id":"string","concept":"string","amount":numero,"pocketId":"string","date":"YYYY-MM-DD"}]`}
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-100 text-red-800 rounded">
                ❌ {error}
              </div>
            )}

            <button
              onClick={handleValidate}
              className="w-full p-4 rounded font-semibold text-white"
              style={{ background: DS.primary }}
            >
              Validar Datos
            </button>
          </div>
        )}

        {step === 'review' && restoration && (
          <div className="space-y-6">
            <div className="p-4 rounded" style={{ background: restoration.report.valid ? '#e8f5e9' : '#fff3e0' }}>
              <h2 className="font-bold mb-3">
                {restoration.report.valid ? '✅ Datos Válidos' : '⚠️  Datos con Ajustes'}
              </h2>
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words">
                {restoration.summary}
              </pre>
            </div>

            {restoration.report.warnings.length > 0 && (
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <h3 className="font-bold mb-2 text-blue-900">Advertencias:</h3>
                <ul className="space-y-1">
                  {restoration.report.warnings.map((w: string, i: number) => (
                    <li key={i} className="text-sm text-blue-800">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep('input')}
                className="flex-1 p-4 rounded font-semibold border-2"
                style={{ borderColor: DS.primary, color: DS.primary }}
              >
                Volver
              </button>
              <button
                onClick={handleRestore}
                className="flex-1 p-4 rounded font-semibold text-white"
                style={{ background: DS.primary }}
              >
                Restaurar
              </button>
            </div>
          </div>
        )}

        {step === 'code' && restoration && (
          <div className="space-y-6">
            <div className="p-4 bg-green-100 text-green-800 rounded">
              ✅ Datos restaurados exitosamente
            </div>

            <div>
              <h3 className="font-bold mb-2">Código generado:</h3>
              <pre
                className="p-4 bg-gray-900 text-green-400 rounded font-mono text-sm overflow-x-auto"
                style={{ maxHeight: '300px' }}
              >
                {restoration.code}
              </pre>
            </div>

            <button
              onClick={onClose}
              className="w-full p-4 rounded font-semibold text-white"
              style={{ background: DS.primary }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
