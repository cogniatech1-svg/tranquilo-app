import { describe, it, expect } from 'vitest'
import { calculateCarryOver } from '../carryOver'
import type { MonthRecord } from '../types'

// ── Helper ────────────────────────────────────────────────────────────────────
// Builds a minimal MonthRecord from amounts only (structure noise removed)
function month(
  income: number,
  expenseAmounts: number[],
  extraIncomeAmounts: number[] = []
): MonthRecord {
  return {
    income,
    savings: 0,
    expenses: expenseAmounts.map((amount, i) => ({
      id: `e${i}`,
      concept: 'test',
      amount,
      pocketId: 'p1',
      date: '2026-01-15',
    })),
    extraIncomes: extraIncomeAmounts.map((amount, i) => ({
      id: `i${i}`,
      concept: 'extra',
      amount,
      date: '2026-01-15',
    })),
    pockets: [],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCarryOver — no prior months', () => {
  it('returns 0 for an empty history', () => {
    expect(calculateCarryOver('2026-05', {})).toBe(0)
  })

  it('returns 0 when history only contains the target month', () => {
    const history = { '2026-05': month(100_000, [60_000]) }
    expect(calculateCarryOver('2026-05', history)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCarryOver — positive carry-over (surplus)', () => {
  it('accumulates surplus from a single prior month', () => {
    const history = { '2026-04': month(100_000, [60_000]) } // net = +40k
    expect(calculateCarryOver('2026-05', history)).toBe(40_000)
  })

  it('accumulates surplus across multiple prior months', () => {
    const history = {
      '2026-03': month(100_000, [80_000]), // net = +20k
      '2026-04': month(100_000, [70_000]), // net = +30k
    }
    expect(calculateCarryOver('2026-05', history)).toBe(50_000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCarryOver — negative carry-over (deficit)', () => {
  it('returns negative value when expenses exceeded income', () => {
    const history = { '2026-04': month(100_000, [130_000]) } // net = -30k
    expect(calculateCarryOver('2026-05', history)).toBe(-30_000)
  })

  it('accumulates deficit across multiple months', () => {
    const history = {
      '2026-01': month(100_000, [110_000]), // -10k
      '2026-02': month(100_000, [105_000]), // -5k
      '2026-03': month(100_000, [108_000]), // -8k
    }
    expect(calculateCarryOver('2026-04', history)).toBe(-23_000)
  })

  it('mixed surplus and deficit sum correctly', () => {
    const history = {
      '2026-03': month(100_000, [80_000]), // +20k
      '2026-04': month(100_000, [110_000]), // -10k
    }
    expect(calculateCarryOver('2026-05', history)).toBe(10_000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCarryOver — extra incomes', () => {
  it('includes extra incomes in the net calculation', () => {
    // income=100k, extra=50k, expenses=80k → net = 70k
    const history = { '2026-04': month(100_000, [80_000], [50_000]) }
    expect(calculateCarryOver('2026-05', history)).toBe(70_000)
  })

  it('extra incomes alone (no monthly income) contribute correctly', () => {
    const history = { '2026-04': month(0, [20_000], [80_000]) } // net = +60k
    expect(calculateCarryOver('2026-05', history)).toBe(60_000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCarryOver — month boundary rules', () => {
  it('excludes the target month from calculation', () => {
    const history = {
      '2026-04': month(100_000, [80_000]), // +20k → included
      '2026-05': month(200_000, [10_000]), // target → excluded
    }
    expect(calculateCarryOver('2026-05', history)).toBe(20_000)
  })

  it('excludes months after the target month', () => {
    const history = {
      '2026-03': month(100_000, [80_000]), // +20k → included
      '2026-06': month(200_000, [10_000]), // future → excluded
    }
    expect(calculateCarryOver('2026-05', history)).toBe(20_000)
  })

  it('gap months (absent from history) contribute zero — surplus persists', () => {
    // March is missing — the gap adds 0, prior surplus still carries forward
    const history = {
      '2026-02': month(100_000, [80_000]), // +20k
      // '2026-03' missing → 0
      '2026-04': month(100_000, [90_000]), // +10k
    }
    expect(calculateCarryOver('2026-05', history)).toBe(30_000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCarryOver — ordering and edge cases', () => {
  it('result is identical regardless of Object.keys insertion order', () => {
    // Keys inserted in reverse order — sort must guarantee chronological sum
    const reversed: Record<string, MonthRecord> = {}
    reversed['2026-04'] = month(100_000, [90_000]) // +10k (second)
    reversed['2026-03'] = month(100_000, [80_000]) // +20k (first)

    const ordered: Record<string, MonthRecord> = {
      '2026-03': month(100_000, [80_000]),
      '2026-04': month(100_000, [90_000]),
    }

    expect(calculateCarryOver('2026-05', reversed)).toBe(calculateCarryOver('2026-05', ordered))
    expect(calculateCarryOver('2026-05', ordered)).toBe(30_000)
  })

  it('zero-income, zero-expense month contributes 0 without NaN', () => {
    const history = { '2026-04': month(0, [0]) }
    const result = calculateCarryOver('2026-05', history)
    expect(result).toBe(0)
    expect(Number.isNaN(result)).toBe(false)
  })

  it('record.savings is excluded from carry-over (savings is intent, not cash)', () => {
    // savings field = 20k, but carry-over formula only uses income - expenses
    const history: Record<string, MonthRecord> = {
      '2026-04': {
        income: 100_000,
        savings: 20_000, // should NOT be deducted
        expenses: [
          { id: 'e1', concept: 'test', amount: 80_000, pocketId: 'p1', date: '2026-04-01' },
        ],
        extraIncomes: [],
        pockets: [],
      },
    }
    // net = income - expenses = 100k - 80k = 20k (savings field ignored)
    expect(calculateCarryOver('2026-05', history)).toBe(20_000)
  })
})
