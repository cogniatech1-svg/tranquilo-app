import { describe, it, expect } from 'vitest'
import { generateStarterPockets, DEFAULT_POCKETS } from '../dataMigration'

describe('generateStarterPockets', () => {
  // ── Regla 50/30/20 sobre ingreso positivo ──────────────────────────────────
  describe('distribución 50/30/20', () => {
    it('income 2.000.000 → Hogar 1.000.000 / Recreación 600.000 / Reserva 400.000', () => {
      const pockets = generateStarterPockets(2_000_000)
      expect(pockets).toHaveLength(3)
      expect(pockets[0]).toMatchObject({ id: 'hogar', budget: 1_000_000 })
      expect(pockets[1]).toMatchObject({ id: 'recreacion', budget: 600_000 })
      expect(pockets[2]).toMatchObject({ id: 'reserva', budget: 400_000 })
    })

    it('income 1.500.000 → 750.000 / 450.000 / 300.000', () => {
      const pockets = generateStarterPockets(1_500_000)
      expect(pockets[0].budget).toBe(750_000)
      expect(pockets[1].budget).toBe(450_000)
      expect(pockets[2].budget).toBe(300_000)
    })

    it('income 3.000.000 → 1.500.000 / 900.000 / 600.000', () => {
      const pockets = generateStarterPockets(3_000_000)
      expect(pockets[0].budget).toBe(1_500_000)
      expect(pockets[1].budget).toBe(900_000)
      expect(pockets[2].budget).toBe(600_000)
    })
  })

  // ── Redondeo hacia abajo al múltiplo de 1.000 más cercano ─────────────────
  describe('redondeo floor a 1.000', () => {
    it('income 1.333.333 → presupuestos múltiplos de 1.000', () => {
      const pockets = generateStarterPockets(1_333_333)
      for (const p of pockets) {
        expect(p.budget % 1_000).toBe(0)
      }
    })

    it('income 999.999 → presupuestos múltiplos de 1.000', () => {
      const pockets = generateStarterPockets(999_999)
      for (const p of pockets) {
        expect(p.budget % 1_000).toBe(0)
      }
    })

    it('la suma de presupuestos no supera el ingreso', () => {
      const income = 1_777_777
      const pockets = generateStarterPockets(income)
      const total = pockets.reduce((s, p) => s + p.budget, 0)
      expect(total).toBeLessThanOrEqual(income)
    })
  })

  // ── Estructura y campos obligatorios ──────────────────────────────────────
  describe('estructura de cada pocket', () => {
    it('los 3 pockets tienen id, name, icon y budget', () => {
      const pockets = generateStarterPockets(2_000_000)
      for (const p of pockets) {
        expect(p).toHaveProperty('id')
        expect(p).toHaveProperty('name')
        expect(p).toHaveProperty('icon')
        expect(typeof p.budget).toBe('number')
      }
    })

    it('IDs correctos: hogar / recreacion / reserva', () => {
      const ids = generateStarterPockets(2_000_000).map((p) => p.id)
      expect(ids).toEqual(['hogar', 'recreacion', 'reserva'])
    })

    it('"reserva" no existe en DEFAULT_POCKETS (no se duplicará en reparación)', () => {
      const defaultIds = DEFAULT_POCKETS.map((p) => p.id)
      expect(defaultIds).not.toContain('reserva')
    })
  })

  // ── Edge cases ─────────────────────────────────────────────────────────────
  describe('edge cases — income inválido o cero', () => {
    it('income 0 → [] (llamador debe usar DEFAULT_POCKETS)', () =>
      expect(generateStarterPockets(0)).toEqual([]))

    it('income negativo → []', () => expect(generateStarterPockets(-500_000)).toEqual([]))
  })
})
