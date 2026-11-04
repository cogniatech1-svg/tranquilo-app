import { describe, it, expect } from 'vitest'
import { inheritPockets, getOrCreateMonth } from '../monthRecord'
import type { MonthRecord, Pocket } from '../types'

const pocket = (id: string, budget = 100_000): Pocket => ({ id, name: id, budget, icon: '🏠' })

function month(pockets: Pocket[], income = 0): MonthRecord {
  return { income, savings: 0, expenses: [], extraIncomes: [], pockets }
}

describe('inheritPockets', () => {
  it('copies the pockets (with budgets) of the previous month', () => {
    const history = { '2026-10': month([pocket('hogar', 500_000), pocket('ocio', 80_000)]) }
    expect(inheritPockets('2026-11', history)).toEqual(history['2026-10'].pockets)
  })

  it('uses the closest earlier month, not an older one', () => {
    const history = {
      '2026-08': month([pocket('viejo')]),
      '2026-10': month([pocket('hogar')]),
    }
    expect(inheritPockets('2026-12', history).map((p) => p.id)).toEqual(['hogar'])
  })

  it('skips earlier months that have no pockets', () => {
    const history = {
      '2026-09': month([pocket('hogar')]),
      '2026-10': month([]),
    }
    expect(inheritPockets('2026-11', history).map((p) => p.id)).toEqual(['hogar'])
  })

  it('crosses the year boundary (December → January)', () => {
    const history = { '2026-12': month([pocket('hogar', 900_000)]) }
    expect(inheritPockets('2027-01', history)).toEqual([pocket('hogar', 900_000)])
  })

  it('ignores the same month and later months', () => {
    const history = {
      '2026-11': month([pocket('mismo')]),
      '2026-12': month([pocket('futuro')]),
    }
    expect(inheritPockets('2026-11', history)).toEqual([])
  })

  it('returns an empty list when there is nothing to inherit', () => {
    expect(inheritPockets('2026-11', {})).toEqual([])
  })
})

describe('getOrCreateMonth', () => {
  it('returns an existing record untouched, even with no pockets', () => {
    const existing = month([], 5_000_000)
    expect(
      getOrCreateMonth({ '2026-11': existing, '2026-10': month([pocket('a')]) }, '2026-11')
    ).toBe(existing)
  })

  it('creates an empty month that inherits the previous pockets', () => {
    const created = getOrCreateMonth({ '2026-10': month([pocket('hogar', 700_000)]) }, '2026-11')
    expect(created.pockets).toEqual([pocket('hogar', 700_000)])
    expect(created.expenses).toEqual([])
    expect(created.extraIncomes).toEqual([])
    expect(created.income).toBe(0)
  })

  it('does not mutate the history', () => {
    const history = { '2026-10': month([pocket('hogar')]) }
    getOrCreateMonth(history, '2026-11')
    expect(Object.keys(history)).toEqual(['2026-10'])
  })
})
