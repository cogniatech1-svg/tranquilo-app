'use client'

import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { Icon } from '../components/ui/Icon'
import { DS, formatMoney, maskMoney } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import { calculateInvestmentStats, calculatePortfolioSummary } from '../lib/investmentEngine'
import type {
  Investment,
  InvestmentPayment,
  InvestmentType,
  InterestType,
  InterestFrequency,
} from '../lib/types/investment'

interface Props {
  investments: Investment[]
  payments: InvestmentPayment[]
  addInvestment: (data: Omit<Investment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void
  deleteInvestment: (id: string) => void
  addPayment: (
    investmentId: string,
    data: Omit<InvestmentPayment, 'id' | 'investmentId' | 'userId' | 'createdAt'>
  ) => void
  removePayment: (paymentId: string) => void
  config: CountryConfig
  isPrivacyMode?: boolean
}

const TYPE_OPTIONS: { value: InvestmentType; label: string; emoji: string }[] = [
  { value: 'real_estate', label: 'Inmueble', emoji: '🏠' },
  { value: 'financial', label: 'Financiero', emoji: '📈' },
  { value: 'vehicle', label: 'Vehículo', emoji: '🚗' },
  { value: 'other', label: 'Otro', emoji: '💼' },
]

function typeLabel(type: InvestmentType) {
  return TYPE_OPTIONS.find((o) => o.value === type) ?? TYPE_OPTIONS[3]
}

export function InvestmentsScreen({
  investments,
  payments,
  addInvestment,
  deleteInvestment,
  addPayment,
  removePayment,
  config,
  isPrivacyMode = false,
}: Props) {
  const mm = (n: number) => maskMoney(n, config, isPrivacyMode)
  const fmt = (n: number) => formatMoney(n, config)

  // ── Estado formulario nueva inversión ────────────────────────────────────
  const [addingInvestment, setAddingInvestment] = useState(false)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<InvestmentType>('real_estate')
  const [formTotal, setFormTotal] = useState('')
  const [formStart, setFormStart] = useState(new Date().toISOString().slice(0, 10))
  const [formHasInterest, setFormHasInterest] = useState(false)
  const [formRate, setFormRate] = useState('')
  const [formInterestType, setFormInterestType] = useState<InterestType>('simple')
  const [formFrequency, setFormFrequency] = useState<InterestFrequency>('monthly')
  const [formNotes, setFormNotes] = useState('')

  // ── Estado formulario pago por inversión ─────────────────────────────────
  const [addingPaymentFor, setAddingPaymentFor] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentNotes, setPaymentNotes] = useState('')

  const resetForm = () => {
    setFormName('')
    setFormType('real_estate')
    setFormTotal('')
    setFormStart(new Date().toISOString().slice(0, 10))
    setFormHasInterest(false)
    setFormRate('')
    setFormInterestType('simple')
    setFormFrequency('monthly')
    setFormNotes('')
    setAddingInvestment(false)
  }

  const handleAddInvestment = () => {
    if (!formName.trim()) return
    addInvestment({
      name: formName.trim(),
      type: formType,
      totalAmount: formTotal
        ? parseFloat(formTotal.replace(/[^0-9.]/g, '')) || undefined
        : undefined,
      startDate: formStart,
      hasInterest: formHasInterest,
      interestRate: formHasInterest && formRate ? parseFloat(formRate) || undefined : undefined,
      interestType: formHasInterest ? formInterestType : undefined,
      interestFrequency: formHasInterest ? formFrequency : undefined,
      notes: formNotes.trim() || undefined,
    })
    resetForm()
  }

  const resetPaymentForm = () => {
    setAddingPaymentFor(null)
    setPaymentAmount('')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentNotes('')
  }

  const handleAddPayment = (investmentId: string) => {
    const amount = parseFloat(paymentAmount.replace(/[^0-9.]/g, ''))
    if (!amount || amount <= 0) return
    addPayment(investmentId, { date: paymentDate, amount, notes: paymentNotes.trim() || undefined })
    resetPaymentForm()
  }

  const portfolio = calculatePortfolioSummary(investments, payments)

  const inputClass =
    'w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none bg-slate-50 focus:bg-white transition-colors'
  const labelClass = 'text-[9px] font-bold uppercase tracking-[.14em] text-slate-500 block mb-1.5'

  return (
    <div className="pb-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-5 bg-white border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500 mb-1">
          Patrimonio
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inversiones</h1>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* ── Resumen del portfolio ────────────────────────────────────────── */}
        {investments.length > 0 && (
          <div className="rounded-2xl px-5 py-4" style={{ background: DS.primaryGrad }}>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/70 mb-3">
              Portfolio
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-white/60 mb-1">
                  Inversiones activas
                </p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {portfolio.investmentCount}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-white/60 mb-1">
                  Total pagado
                </p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {mm(portfolio.totalPaid)}
                </p>
              </div>
              {portfolio.totalKnownAmount > 0 && (
                <div className="col-span-2 pt-3 border-t border-white/20">
                  <p className="text-[9px] font-bold uppercase tracking-[.12em] text-white/60 mb-1">
                    Valor total conocido
                  </p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {mm(portfolio.totalKnownAmount)}
                  </p>
                </div>
              )}
              {portfolio.totalInterestAccrued > 0 && (
                <div className="col-span-2">
                  <p className="text-[9px] font-bold uppercase tracking-[.12em] text-white/60 mb-1">
                    Interés acumulado estimado
                  </p>
                  <p className="text-base font-bold text-white/90 tabular-nums">
                    {mm(portfolio.totalInterestAccrued)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Lista de inversiones ─────────────────────────────────────────── */}
        <div>
          <SectionHeader
            action={
              !addingInvestment ? (
                <button onClick={() => setAddingInvestment(true)}>+ Agregar</button>
              ) : undefined
            }
          >
            Inversiones
          </SectionHeader>

          {/* ── Formulario nueva inversión ───────────────────────────────── */}
          {addingInvestment && (
            <Card className="p-5 space-y-4 mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">
                Nueva inversión
              </p>

              <div>
                <label className={labelClass}>Nombre</label>
                <input
                  autoFocus
                  placeholder="ej. Lote en Fusagasugá"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && resetForm()}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormType(opt.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border-2 text-sm font-medium transition-all ${
                        formType === opt.value
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-100 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Valor total (opcional)</label>
                <input
                  placeholder="ej. 50000000"
                  value={formTotal}
                  onChange={(e) => setFormTotal(e.target.value)}
                  inputMode="numeric"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Fecha de inicio</label>
                <input
                  type="date"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="has-interest"
                  type="checkbox"
                  checked={formHasInterest}
                  onChange={(e) => setFormHasInterest(e.target.checked)}
                  className="w-4 h-4 accent-teal-600"
                />
                <label htmlFor="has-interest" className="text-sm font-medium text-slate-700">
                  Tiene intereses
                </label>
              </div>

              {formHasInterest && (
                <div className="space-y-3 pl-4 border-l-2 border-teal-100">
                  <div>
                    <label className={labelClass}>Tasa (%)</label>
                    <input
                      placeholder="ej. 1.5"
                      value={formRate}
                      onChange={(e) => setFormRate(e.target.value)}
                      inputMode="decimal"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tipo de interés</label>
                    <div className="flex gap-2">
                      {(['simple', 'compound'] as InterestType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormInterestType(t)}
                          className={`flex-1 py-2 rounded-2xl border-2 text-sm font-medium transition-all ${
                            formInterestType === t
                              ? 'border-teal-500 bg-teal-50 text-teal-700'
                              : 'border-slate-100 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {t === 'simple' ? 'Simple' : 'Compuesto'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Frecuencia</label>
                    <div className="flex gap-2">
                      {(['monthly', 'annual'] as InterestFrequency[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFormFrequency(f)}
                          className={`flex-1 py-2 rounded-2xl border-2 text-sm font-medium transition-all ${
                            formFrequency === f
                              ? 'border-teal-500 bg-teal-50 text-teal-700'
                              : 'border-slate-100 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {f === 'monthly' ? 'Mensual' : 'Anual'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Notas (opcional)</label>
                <input
                  placeholder="ej. Lote con escritura en trámite"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2.5">
                <PrimaryButton onClick={handleAddInvestment} className="flex-1 py-3 text-sm">
                  Guardar
                </PrimaryButton>
                <button
                  onClick={resetForm}
                  className="px-4 py-3 text-slate-500 text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </Card>
          )}

          {/* ── Estado vacío ─────────────────────────────────────────────── */}
          {investments.length === 0 && !addingInvestment && (
            <Card className="p-8 text-center">
              <p className="text-3xl mb-3">📈</p>
              <p className="text-sm font-semibold text-slate-700 mb-1">Sin inversiones aún</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Registra tus inversiones para hacer seguimiento de cuánto has pagado y cuánto falta.
              </p>
              <button
                onClick={() => setAddingInvestment(true)}
                className="mt-4 text-sm font-semibold"
                style={{ color: DS.primary }}
              >
                + Agregar primera inversión
              </button>
            </Card>
          )}

          {/* ── Cards de inversión ────────────────────────────────────────── */}
          <div className="space-y-4">
            {investments.map((inv) => {
              const stats = calculateInvestmentStats(inv, payments)
              const invPayments = payments.filter((p) => p.investmentId === inv.id)
              const { emoji, label } = typeLabel(inv.type)
              const isAddingPayment = addingPaymentFor === inv.id

              return (
                <Card key={inv.id} className="overflow-hidden">
                  {/* Header de la inversión */}
                  <div className="px-5 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{emoji}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm leading-tight truncate">
                            {inv.name}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteInvestment(inv.id)}
                        className="shrink-0 p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>

                    {/* Montos */}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500 mb-1">
                          Pagado
                        </p>
                        <p className="text-lg font-bold tabular-nums" style={{ color: DS.primary }}>
                          {mm(stats.totalPaid)}
                        </p>
                      </div>
                      {inv.totalAmount != null && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500 mb-1">
                            {stats.remainingAmount != null && stats.remainingAmount > 0
                              ? 'Pendiente'
                              : 'Total'}
                          </p>
                          <p className="text-lg font-bold tabular-nums text-slate-900">
                            {stats.remainingAmount != null && stats.remainingAmount > 0
                              ? mm(stats.remainingAmount)
                              : mm(inv.totalAmount)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Barra de progreso */}
                    {stats.progressPercent != null && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1.5">
                          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">
                            Progreso
                          </p>
                          <p className="text-[10px] font-bold text-slate-700 tabular-nums">
                            {Math.round(stats.progressPercent)}%
                          </p>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, stats.progressPercent)}%`,
                              background: DS.primaryGrad,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Interés acumulado */}
                    {inv.hasInterest &&
                      stats.interestAccrued != null &&
                      stats.interestAccrued > 0 && (
                        <div
                          className="mt-3 px-3 py-2 rounded-xl"
                          style={{ background: '#FEF3C7', border: '1px solid rgba(217,119,6,.15)' }}
                        >
                          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-amber-700 mb-0.5">
                            Interés acumulado estimado
                          </p>
                          <p className="text-sm font-bold text-amber-800 tabular-nums">
                            {mm(stats.interestAccrued)}
                          </p>
                          <p className="text-[9px] text-amber-600 mt-0.5">
                            {inv.interestRate}%{' '}
                            {inv.interestFrequency === 'annual' ? 'anual' : 'mensual'} · interés{' '}
                            {inv.interestType === 'compound' ? 'compuesto' : 'simple'} ·{' '}
                            {stats.monthsElapsed} {stats.monthsElapsed === 1 ? 'mes' : 'meses'}
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Sección de pagos */}
                  <div className="border-t border-slate-100 px-5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">
                        Pagos ({invPayments.length})
                      </p>
                      {!isAddingPayment && (
                        <button
                          onClick={() => {
                            setAddingPaymentFor(inv.id)
                            setPaymentDate(new Date().toISOString().slice(0, 10))
                            setPaymentAmount('')
                            setPaymentNotes('')
                          }}
                          className="text-xs font-semibold"
                          style={{ color: DS.primary }}
                        >
                          + Agregar pago
                        </button>
                      )}
                    </div>

                    {/* Formulario pago */}
                    {isAddingPayment && (
                      <div className="space-y-2 mb-3">
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            placeholder="Monto"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            inputMode="numeric"
                            className="flex-1 min-w-0 border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-3 py-2.5 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
                          />
                          <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-3 py-2.5 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
                          />
                        </div>
                        <input
                          placeholder="Notas (opcional)"
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          className="w-full border-2 border-slate-100 focus:border-teal-400 rounded-2xl px-3 py-2.5 text-sm outline-none bg-slate-50 focus:bg-white transition-colors"
                        />
                        <div className="flex gap-2">
                          <PrimaryButton
                            onClick={() => handleAddPayment(inv.id)}
                            className="flex-1 py-2.5 text-sm"
                          >
                            Guardar
                          </PrimaryButton>
                          <button
                            onClick={resetPaymentForm}
                            className="px-4 py-2.5 text-slate-500 text-sm font-medium"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista de pagos */}
                    {invPayments.length > 0 ? (
                      <ul className="space-y-1.5">
                        {invPayments
                          .slice()
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                  {p.date.slice(0, 10)}
                                </span>
                                {p.notes && (
                                  <span className="text-[10px] text-slate-500 truncate">
                                    {p.notes}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-bold tabular-nums text-slate-800">
                                  {fmt(p.amount)}
                                </span>
                                <button
                                  onClick={() => removePayment(p.id)}
                                  className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                                >
                                  <Icon name="x" size={12} />
                                </button>
                              </div>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 py-1">Sin pagos registrados aún.</p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
