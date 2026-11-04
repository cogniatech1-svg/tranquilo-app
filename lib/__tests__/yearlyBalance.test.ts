import { describe, it, expect } from 'vitest'
import { buildYearlyBalance, listYearsWithData, sumPaymentsByMonth } from '../yearlyBalance'
import type { MonthRecord, Pocket } from '../types'

const pocket = (id: string, name: string): Pocket => ({ id, name, budget: 0 })

function month(opts: {
  income?: number
  extra?: number[]
  expenses?: [number, string][]
  pockets?: Pocket[]
}): MonthRecord {
  return {
    income: opts.income ?? 0,
    savings: 0,
    expenses: (opts.expenses ?? []).map(([amount, pocketId], i) => ({
      id: `e${i}`,
      concept: 'x',
      amount,
      pocketId,
      date: '2026-01-10',
    })),
    extraIncomes: (opts.extra ?? []).map((amount, i) => ({
      id: `i${i}`,
      concept: 'extra',
      amount,
      date: '2026-01-10',
    })),
    pockets: opts.pockets ?? [],
  }
}

describe('sumPaymentsByMonth', () => {
  it('groups investment payments by YYYY-MM', () => {
    expect(
      sumPaymentsByMonth([
        { date: '2026-09-16', amount: 100 },
        { date: '2026-09-30T10:00:00.000Z', amount: 50 },
        { date: '2026-10-01', amount: 7 },
      ])
    ).toEqual({ '2026-09': 150, '2026-10': 7 })
  })
})

describe('listYearsWithData', () => {
  it('lists years with data, most recent first, including years with only investments', () => {
    const history = {
      '2025-12': month({ income: 1000 }),
      '2026-03': month({ expenses: [[10, 'a']] }),
      '2024-06': month({}),
    }
    expect(listYearsWithData(history, { '2027-01': 500 })).toEqual([2027, 2026, 2025])
  })
})

describe('buildYearlyBalance', () => {
  const hogar = pocket('p1', 'Hogar')
  const history: Record<string, MonthRecord> = {
    '2025-12': month({ income: 9_999, expenses: [[9_999, 'p1']], pockets: [hogar] }),
    '2026-01': month({
      income: 3_000_000,
      extra: [500_000],
      expenses: [[1_000_000, 'p1']],
      pockets: [hogar],
    }),
    '2026-02': month({
      income: 3_000_000,
      expenses: [
        [400_000, 'p2'],
        [100_000, 'unassigned'],
      ],
      pockets: [pocket('p2', ' hogar ')],
    }),
  }

  it('sums only the requested year', () => {
    const b = buildYearlyBalance(2026, history)!
    expect(b.income).toBe(6_500_000)
    expect(b.expenses).toBe(1_500_000)
    expect(b.monthsWithData).toBe(2)
  })

  it('subtracts investment payments in the net balance', () => {
    const b = buildYearlyBalance(2026, history, { '2026-01': 1_000_000, '2025-12': 5 })!
    expect(b.invested).toBe(1_000_000)
    expect(b.net).toBe(6_500_000 - 1_500_000 - 1_000_000)
  })

  it('groups spending by pocket name across months with different ids', () => {
    const b = buildYearlyBalance(2026, history)!
    expect(b.byPocket).toEqual([
      { name: 'Hogar', total: 1_400_000, share: 93 },
      { name: 'Sin categoría', total: 100_000, share: 7 },
    ])
  })

  it('reports the month with the highest spending and the monthly average', () => {
    const b = buildYearlyBalance(2026, history)!
    expect(b.topExpenseMonth).toEqual({ month: '2026-01', expenses: 1_000_000 })
    expect(b.averageMonthlyExpenses).toBe(750_000)
  })

  it('counts a month that only has investment payments', () => {
    const b = buildYearlyBalance(2027, {}, { '2027-03': 200 })!
    expect(b.months).toEqual([{ month: '2027-03', income: 0, expenses: 0, invested: 200 }])
    expect(b.topExpenseMonth).toBeNull()
    expect(b.net).toBe(-200)
  })

  it('returns null for a year without data', () => {
    expect(buildYearlyBalance(2030, history)).toBeNull()
  })
})
