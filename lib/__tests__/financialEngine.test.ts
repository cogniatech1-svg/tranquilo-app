import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calculateFinancialSnapshot } from '../financialEngine'
import type { Expense, ExtraIncome, Pocket } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeExpense(amount: number, id = 'e1'): Expense {
  return { id, concept: 'test', amount, pocketId: 'p1', date: '2026-01-15' }
}

function makePocket(budget: number, id = 'p1'): Pocket {
  return { id, name: 'Test', budget }
}

function makeIncome(amount: number, id = 'i1'): ExtraIncome {
  return { id, concept: 'bonus', amount, date: '2026-01-15' }
}

// Fixed reference month: January 2026 (31 days)
const MONTH = '2026-01'

// Minimal base input — override only the fields relevant to each test
function base(overrides: Partial<Parameters<typeof calculateFinancialSnapshot>[0]> = {}) {
  return calculateFinancialSnapshot({
    monthlyIncome: 0,
    monthlySavings: 0,
    extraIncomes: [],
    expenses: [],
    pockets: [],
    currentMonth: MONTH,
    ...overrides,
  })
}

// ── Silence engine debug logs in test output ──────────────────────────────────
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — remaining', () => {
  it('remaining = budget - totalExpenses when within budget', () => {
    const snap = base({
      monthlyIncome: 100_000,
      expenses: [makeExpense(30_000)],
      pockets: [makePocket(80_000)],
    })
    expect(snap.budget).toBe(80_000)
    expect(snap.totalExpenses).toBe(30_000)
    expect(snap.remaining).toBe(50_000)
  })

  it('remaining is negative when expenses exceed budget', () => {
    const snap = base({
      monthlyIncome: 100_000,
      expenses: [makeExpense(90_000)],
      pockets: [makePocket(80_000)],
    })
    expect(snap.remaining).toBe(-10_000)
  })

  it('remaining = 0 when expenses exactly match budget', () => {
    const snap = base({
      monthlyIncome: 100_000,
      expenses: [makeExpense(80_000)],
      pockets: [makePocket(80_000)],
    })
    expect(snap.remaining).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — overspent and savings floor', () => {
  it('savings is never negative even when expenses exceed income', () => {
    const snap = base({
      monthlyIncome: 50_000,
      expenses: [makeExpense(200_000)],
      pockets: [makePocket(80_000)],
    })
    expect(snap.savings).toBeGreaterThanOrEqual(0)
  })

  it('dailyAvailable is never negative when overspent', () => {
    const snap = base({
      monthlyIncome: 50_000,
      expenses: [makeExpense(200_000)],
      pockets: [makePocket(80_000)],
    })
    expect(snap.dailyAvailable).toBeGreaterThanOrEqual(0)
  })

  it('expenses larger than income produce red status', () => {
    const snap = base({
      monthlyIncome: 50_000,
      expenses: [makeExpense(200_000)],
      pockets: [makePocket(80_000)],
    })
    expect(snap.status).toBe('red')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — income = 0', () => {
  it('returns 0 for all amounts without NaN or errors', () => {
    const snap = base()
    expect(snap.totalIncome).toBe(0)
    expect(snap.totalExpenses).toBe(0)
    expect(snap.remaining).toBe(0)
    expect(snap.savings).toBe(0)
    expect(snap.budget).toBe(0)
  })

  it('savingsRate is 0 (not NaN) when income = 0', () => {
    const snap = base()
    expect(Number.isNaN(snap.savingsRate)).toBe(false)
    expect(snap.savingsRate).toBe(0)
  })

  it('dailyAvailable is 0 (not NaN) when income = 0', () => {
    const snap = base()
    expect(Number.isNaN(snap.dailyAvailable)).toBe(false)
    expect(snap.dailyAvailable).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — totalAvailable and carryOver', () => {
  it('totalAvailable = totalIncome + carryOver (positive carry-over)', () => {
    const snap = base({ monthlyIncome: 100_000, carryOver: 20_000 })
    expect(snap.carryOver).toBe(20_000)
    expect(snap.totalAvailable).toBe(120_000)
  })

  it('totalAvailable = totalIncome + carryOver (negative carry-over / deficit)', () => {
    const snap = base({ monthlyIncome: 100_000, carryOver: -30_000 })
    expect(snap.carryOver).toBe(-30_000)
    expect(snap.totalAvailable).toBe(70_000)
  })

  it('carryOver defaults to 0 when not provided', () => {
    const snap = base({ monthlyIncome: 100_000 })
    expect(snap.carryOver).toBe(0)
    expect(snap.totalAvailable).toBe(100_000)
  })

  it('carry-over does NOT affect remaining or budget', () => {
    const withCarry = base({
      monthlyIncome: 100_000,
      expenses: [makeExpense(30_000)],
      pockets: [makePocket(80_000)],
      carryOver: 50_000,
    })
    const without = base({
      monthlyIncome: 100_000,
      expenses: [makeExpense(30_000)],
      pockets: [makePocket(80_000)],
    })
    // carry-over is display-only in Phase 1 — must not touch remaining or budget
    expect(withCarry.remaining).toBe(without.remaining)
    expect(withCarry.budget).toBe(without.budget)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — savingsRate', () => {
  it('calculates savingsRate as an integer percentage', () => {
    // income=100k, budget=80k → savings=20k → rate=20%
    const snap = base({
      monthlyIncome: 100_000,
      pockets: [makePocket(80_000)],
    })
    expect(snap.savingsRate).toBe(20)
  })

  it('savingsRate = 100 when budget = 0 and no expenses', () => {
    const snap = base({ monthlyIncome: 100_000 })
    // budget=0, savings=max(0, 100k-0-0)=100k → rate=100%
    expect(snap.savingsRate).toBe(100)
  })

  it('savingsRate = 0 when savings = 0', () => {
    const snap = base({
      monthlyIncome: 100_000,
      expenses: [makeExpense(100_000)],
      pockets: [makePocket(100_000)],
    })
    expect(snap.savingsRate).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — totalIncome with extra incomes', () => {
  it('sums extra incomes into totalIncome', () => {
    const snap = base({
      monthlyIncome: 100_000,
      extraIncomes: [makeIncome(50_000, 'i1'), makeIncome(25_000, 'i2')],
    })
    expect(snap.totalIncome).toBe(175_000)
  })

  it('extra incomes with no monthly income', () => {
    const snap = base({ extraIncomes: [makeIncome(60_000)] })
    expect(snap.totalIncome).toBe(60_000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — manualBudget', () => {
  it('manualBudget overrides pocket-assigned sum when > 0', () => {
    const snap = base({
      monthlyIncome: 200_000,
      expenses: [makeExpense(50_000)],
      pockets: [makePocket(100_000)],
      manualBudget: 150_000,
    })
    expect(snap.budget).toBe(150_000)
    expect(snap.remaining).toBe(100_000)
  })

  it('manualBudget = 0 falls back to pocket-assigned sum', () => {
    const snap = base({
      pockets: [makePocket(90_000)],
      manualBudget: 0,
    })
    expect(snap.budget).toBe(90_000)
  })

  it('assigned reflects pocket sum regardless of manualBudget', () => {
    const snap = base({
      pockets: [makePocket(60_000), makePocket(40_000, 'p2')],
      manualBudget: 120_000,
    })
    expect(snap.assigned).toBe(100_000)
    expect(snap.budget).toBe(120_000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — status', () => {
  it('status is red when totalExpenses > budget', () => {
    const snap = base({
      monthlyIncome: 100_000,
      expenses: [makeExpense(85_000)],
      pockets: [makePocket(80_000)],
    })
    expect(snap.status).toBe('red')
  })

  it('status is red when pockets assigned exceeds manualBudget', () => {
    // assigned=140k > manualBudget=100k → red regardless of expenses
    const snap = base({
      monthlyIncome: 200_000,
      pockets: [makePocket(90_000), makePocket(50_000, 'p2')],
      manualBudget: 100_000,
    })
    expect(snap.assigned).toBe(140_000)
    expect(snap.budget).toBe(100_000)
    expect(snap.status).toBe('red')
  })

  it('status is green when expenses = 0 (no spending yet)', () => {
    // expectedSpend = (day/daysInMonth)*budget ≥ 0, expenses = 0 ≤ expectedSpend
    const snap = base({
      monthlyIncome: 100_000,
      pockets: [makePocket(80_000)],
    })
    expect(snap.status).toBe('green')
  })

  it('status is yellow when expenses exceed expectedSpend but not budget', () => {
    // Freeze time to day 1 of month: expectedSpend = (1/31)*budget ≈ tiny
    // Any non-trivial expense will be > expectedSpend but < budget
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00'))

    const snap = base({
      monthlyIncome: 100_000,
      expenses: [makeExpense(10_000)], // more than 1/31 of 80k ≈ 2580
      pockets: [makePocket(80_000)],
    })
    expect(snap.status).toBe('yellow')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — month parsing', () => {
  it('parses YYYY-MM format: January has 31 days', () => {
    const snap = base({ currentMonth: '2026-01' })
    expect(snap.daysInMonth).toBe(31)
  })

  it('parses YYYY-MM format: February 2026 has 28 days (non-leap year)', () => {
    const snap = base({ currentMonth: '2026-02' })
    expect(snap.daysInMonth).toBe(28)
  })

  it('parses YYYY-MM format: February 2024 has 29 days (leap year)', () => {
    const snap = base({ currentMonth: '2024-02' })
    expect(snap.daysInMonth).toBe(29)
  })

  it('parses YYYY-MM format: April has 30 days', () => {
    const snap = base({ currentMonth: '2026-04' })
    expect(snap.daysInMonth).toBe(30)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateFinancialSnapshot — NaN/undefined protection', () => {
  it('all values are finite numbers with empty inputs', () => {
    const snap = base()
    const keys: (keyof typeof snap)[] = [
      'totalIncome',
      'totalExpenses',
      'savings',
      'budget',
      'assigned',
      'remaining',
      'dailyAvailable',
      'expectedSpend',
      'savingsRate',
      'carryOver',
      'totalAvailable',
    ]
    for (const key of keys) {
      expect(Number.isFinite(snap[key] as number), `${key} should be finite`).toBe(true)
    }
  })

  it('handles multiple expenses summed correctly', () => {
    const snap = base({
      expenses: [makeExpense(10_000, 'e1'), makeExpense(20_000, 'e2'), makeExpense(30_000, 'e3')],
      pockets: [makePocket(100_000)],
    })
    expect(snap.totalExpenses).toBe(60_000)
    expect(snap.remaining).toBe(40_000)
  })
})
