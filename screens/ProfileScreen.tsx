'use client'

import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Icon } from '../components/ui/Icon'
import type { CountryConfig } from '../lib/config'
import type { ExtraIncome } from '../lib/types'

interface Props {
  config: CountryConfig
  onClearData: () => void
  isPrivacyMode?: boolean
  onTogglePrivacy?: () => void
}

export function ProfileScreen({
  config,
  onClearData,
  isPrivacyMode = false,
  onTogglePrivacy,
}: Props) {
  const [pinEnabled, setPinEnabled] = useState(false)
  const [showPinInput, setShowPinInput] = useState(false)
  const [pin, setPin] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showPlansModal, setShowPlansModal] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  // Get current month and year
  const currentDate = new Date()
  const monthYear = currentDate.toLocaleDateString(config.locale, {
    month: 'long',
    year: 'numeric',
  })

  const handleExportCSV = () => {
    const raw = localStorage.getItem('tranquilo_v1')
    const data = raw ? JSON.parse(raw) : {}

    const pocketNames: Record<string, string> = {}
    for (const p of (data.pockets ?? [])) pocketNames[p.id] = p.name

    const rows: string[][] = [['Fecha', 'Tipo', 'Categoría', 'Monto', 'Descripción']]

    // Gastos del mes actual
    for (const e of (data.expenses ?? [])) {
      rows.push([
        e.date.slice(0, 10),
        'gasto',
        pocketNames[e.pocketId] ?? e.pocketId ?? '',
        String(e.amount),
        e.concept ?? '',
      ])
    }

    // Ingresos extras
    for (const i of (data.extraIncomes ?? [])) {
      rows.push([
        i.date.slice(0, 10),
        'ingreso',
        'Ingresos',
        String(i.amount),
        i.concept ?? '',
      ])
    }

    // Meses anteriores
    for (const [, record] of Object.entries(data.monthlyHistory ?? {})) {
      const rec = record as { expenses?: Array<{ date: string; pocketId: string; amount: number; concept: string }> }
      for (const e of (rec.expenses ?? [])) {
        rows.push([
          e.date.slice(0, 10),
          'gasto',
          pocketNames[e.pocketId] ?? e.pocketId ?? '',
          String(e.amount),
          e.concept ?? '',
        ])
      }
    }

    // Ordenar por fecha descendente
    const [header, ...body] = rows
    body.sort((a, b) => b[0].localeCompare(a[0]))

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [header, ...body].map(r => r.map(escape).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tranquilo-datos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.trim().split('\n')
        if (lines.length < 2) {
          setImportMessage('❌ CSV vacío o inválido')
          return
        }

        const raw = localStorage.getItem('tranquilo_v1')
        const data = raw ? JSON.parse(raw) : { expenses: [], extraIncomes: [], pockets: [] }

        const pocketMap: Record<string, string> = {}
        for (const p of (data.pockets ?? [])) {
          pocketMap[p.name] = p.id
        }

        let importedCount = 0
        const currentDate = new Date().toISOString().split('T')[0]

        // Skip header, process data rows
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').replace('""', '"'))
          if (parts.length < 4) continue

          const [fecha, tipo, categoria, monto] = parts
          const descripcion = parts.slice(4).join(',')

          if (tipo === 'gasto') {
            const pocketId = pocketMap[categoria] || 'recreacion'
            data.expenses.push({
              id: Date.now().toString() + Math.random(),
              date: fecha + 'T00:00:00',
              pocketId,
              amount: parseInt(monto) || 0,
              concept: descripcion,
            })
            importedCount++
          } else if (tipo === 'ingreso') {
            data.extraIncomes.push({
              id: Date.now().toString() + Math.random(),
              date: fecha + 'T00:00:00',
              amount: parseInt(monto) || 0,
              note: descripcion,
              category: 'extra' as const,
            })
            importedCount++
          }
        }

        localStorage.setItem('tranquilo_v1', JSON.stringify(data))
        setImportMessage(`✅ ${importedCount} movimientos importados correctamente`)
        setTimeout(() => {
          setImportMessage('')
          window.location.reload()
        }, 2000)
      } catch (err) {
        setImportMessage('❌ Error al importar. Verifica el formato del CSV')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-8 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
          boxShadow: '0 8px 40px rgba(4,47,46,.30)',
        }}
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-2 -left-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(103,232,249,.10) 0%, transparent 70%)' }} />

        <div className="relative">
          {/* Logo Icon */}
          <div className="w-28 h-28 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img
              src="/logo-ui.png"
              alt="Tranquilo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">Perfil</h2>
          <p className="text-sm text-white/70 capitalize">{monthYear}</p>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-5">
        {/* 1. USUARIO */}
        <div>
          <SectionHeader>Usuario</SectionHeader>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Plan</p>
                <p className="text-xs text-slate-500 mt-0.5">Acceso completo</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                Premium
              </span>
            </div>
            <button
              onClick={() => setShowPlansModal(true)}
              className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-800 transition-colors"
            >
              Ver planes
            </button>
          </Card>
        </div>

        {/* 2. SEGURIDAD */}
        <div>
          <SectionHeader>Seguridad</SectionHeader>
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">PIN de acceso</p>
                <p className="text-xs text-slate-500 mt-0.5">Protege tu app</p>
              </div>
              <button
                onClick={() => setPinEnabled(!pinEnabled)}
                className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${
                  pinEnabled ? 'bg-teal-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    pinEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {pinEnabled && !showPinInput && (
              <button
                onClick={() => setShowPinInput(true)}
                className="w-full px-3 py-2 text-xs font-semibold text-teal-600 hover:text-teal-700 text-left"
              >
                ➜ Configurar PIN
              </button>
            )}

            {showPinInput && (
              <div className="space-y-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Ingresa un PIN de 4 dígitos"
                  maxLength={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-center"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPinInput(false)}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (pin.length === 4 && /^\d+$/.test(pin)) {
                        setShowPinInput(false)
                        setPin('')
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-teal-500 text-white hover:bg-teal-600 rounded-lg transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* 3. DATOS */}
        <div>
          <SectionHeader>Datos</SectionHeader>
          <Card className="p-4 space-y-2">
            <button
              onClick={handleExportCSV}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg">📥</span>
                <span className="text-sm font-semibold text-slate-800">Exportar datos (CSV)</span>
              </span>
              <Icon name="chevron" size={14} className="text-slate-300 shrink-0" />
            </button>

            <label className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
              <span className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg">📤</span>
                <span className="text-sm font-semibold text-slate-800">Importar datos (CSV)</span>
              </span>
              <Icon name="chevron" size={14} className="text-slate-300 shrink-0" />
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </label>

            {importMessage && (
              <p className={`text-xs font-semibold text-center py-2 rounded ${
                importMessage.includes('✅') ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
              }`}>
                {importMessage}
              </p>
            )}

            <button
              onClick={() => setConfirmClear(true)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-red-50 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg">🗑️</span>
                <span className="text-sm font-semibold text-red-600">Borrar todos los datos</span>
              </span>
              <Icon name="chevron" size={14} className="text-slate-300 shrink-0" />
            </button>

            {confirmClear && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs font-semibold text-red-700 mb-2">¿Estás seguro? Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onClearData()
                      setConfirmClear(false)
                    }}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* 4. PREFERENCIAS */}
        <div>
          <SectionHeader>Preferencias</SectionHeader>
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Tema oscuro</p>
                <p className="text-xs text-slate-500 mt-0.5">Cambia el aspecto de la app</p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${
                  darkMode ? 'bg-slate-700' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-800">Ocultar montos</p>
                <p className="text-xs text-slate-500 mt-0.5">Privacidad en tu pantalla</p>
              </div>
              <button
                onClick={() => onTogglePrivacy?.()}
                className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${
                  isPrivacyMode ? 'bg-teal-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    isPrivacyMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </Card>
        </div>

        {/* 5. SOPORTE */}
        <div>
          <SectionHeader>Soporte</SectionHeader>
          <Card className="p-4">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg">💬</span>
                <span className="text-sm font-semibold text-slate-800">Enviar feedback</span>
              </span>
              <Icon name="chevron" size={14} className="text-slate-300 shrink-0" />
            </button>
          </Card>
        </div>

        {/* Versión */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-slate-400">Tranquilo v1.0.0</p>
          <p className="text-xs text-slate-400 mt-1">© 2026 Tranquilo</p>
        </div>
      </div>

      {/* Plans Modal */}
      {showPlansModal && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-50 transition-opacity"
            onClick={() => setShowPlansModal(false)}
          />
          {/* Modal */}
          <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-8">
            <div
              className="bg-white rounded-3xl overflow-hidden max-w-md mx-auto"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,.20)' }}
            >
              {/* Header with gradient */}
              <div
                className="px-6 pt-8 pb-6 text-center relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #0D6259 0%, #0891B2 100%)',
                }}
              >
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                <div className="relative">
                  <h3 className="text-2xl font-bold text-white mb-2">Tranquilo Premium</h3>
                  <p className="text-sm text-white/80">Próximamente</p>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📊</span>
                    <span className="text-sm text-slate-700">Insights más avanzados</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">💡</span>
                    <span className="text-sm text-slate-700">Recomendaciones inteligentes</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">💰</span>
                    <span className="text-sm text-slate-700">Mejor control de ahorro</span>
                  </div>
                </div>

                {/* Button */}
                <button className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all active:scale-95 mt-2">
                  Quiero acceso anticipado
                </button>

                {/* Close button */}
                <button
                  onClick={() => setShowPlansModal(false)}
                  className="w-full px-4 py-2.5 text-slate-600 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Versión — diagnóstico temporal */}
      <div className="text-center py-4">
        <p className="text-xs text-slate-400">v28-abr-2026-B</p>
      </div>
    </div>
  )
}
