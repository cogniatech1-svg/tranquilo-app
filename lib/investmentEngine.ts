import type { Investment, InvestmentPayment } from './types/investment'

export interface InvestmentStats {
  totalPaid: number
  remainingAmount: number | null
  progressPercent: number | null
  interestAccrued: number | null
  monthsElapsed: number
}

export interface PortfolioSummary {
  investmentCount: number
  totalPaid: number
  totalKnownAmount: number
  totalInterestAccrued: number
}

function monthsElapsedSince(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
}

function calculateInterest(
  investment: Investment,
  principal: number,
  months: number
): number | null {
  if (!investment.hasInterest) return null
  const rate = investment.interestRate
  if (!rate || rate <= 0) return null

  const r = rate / 100
  const t = investment.interestFrequency === 'annual' ? months / 12 : months

  if (investment.interestType === 'compound') {
    return principal * Math.pow(1 + r, t) - principal
  }
  return principal * r * t
}

export function calculateInvestmentStats(
  investment: Investment,
  payments: InvestmentPayment[]
): InvestmentStats {
  const relevantPayments = payments.filter((p) => p.investmentId === investment.id)
  const totalPaid = relevantPayments.reduce((sum, p) => sum + p.amount, 0)
  const monthsElapsed = Math.max(0, monthsElapsedSince(investment.startDate))

  const principal = investment.totalAmount ?? totalPaid

  const remainingAmount = investment.totalAmount != null ? investment.totalAmount - totalPaid : null

  const progressPercent =
    investment.totalAmount != null && investment.totalAmount > 0
      ? Math.min(100, (totalPaid / investment.totalAmount) * 100)
      : null

  const interestAccrued = calculateInterest(investment, principal, monthsElapsed)

  return {
    totalPaid,
    remainingAmount,
    progressPercent,
    interestAccrued,
    monthsElapsed,
  }
}

export function calculatePortfolioSummary(
  investments: Investment[],
  payments: InvestmentPayment[]
): PortfolioSummary {
  let totalPaid = 0
  let totalKnownAmount = 0
  let totalInterestAccrued = 0

  for (const inv of investments) {
    const stats = calculateInvestmentStats(inv, payments)
    totalPaid += stats.totalPaid
    if (inv.totalAmount != null) totalKnownAmount += inv.totalAmount
    if (stats.interestAccrued != null) totalInterestAccrued += stats.interestAccrued
  }

  return {
    investmentCount: investments.length,
    totalPaid,
    totalKnownAmount,
    totalInterestAccrued,
  }
}
