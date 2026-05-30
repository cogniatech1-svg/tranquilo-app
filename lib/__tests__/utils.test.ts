import { describe, it, expect } from 'vitest'
import { parseAmount, extractConcept } from '../utils'

// ─────────────────────────────────────────────────────────────────────────────
// parseAmount
// ─────────────────────────────────────────────────────────────────────────────
describe('parseAmount', () => {
  // ── Regresión crítica: "X mil" NO debe tratarse como millones ──────────────
  // El bug original: mFormat (/m(?:illones?)?/) capturaba la "m" de "mil",
  // convirtiendo "25 mil" → 25.000.000 (1000× incorrecto).
  describe('regresión — "X mil" no debe inflarse a millones', () => {
    it('"25 mil" → 25.000', () => expect(parseAmount('25 mil')).toBe(25_000))
    it('"800 mil" → 800.000', () => expect(parseAmount('800 mil')).toBe(800_000))
    it('"18 mil" → 18.000', () => expect(parseAmount('18 mil')).toBe(18_000))
    it('"uber 25 mil" → 25.000', () => expect(parseAmount('uber 25 mil')).toBe(25_000))
    it('"arriendo 800 mil" → 800.000', () => expect(parseAmount('arriendo 800 mil')).toBe(800_000))
    it('"Netflix 18 mil" → 18.000', () => expect(parseAmount('Netflix 18 mil')).toBe(18_000))
    it('"500 mil pesos" → 500.000', () => expect(parseAmount('500 mil pesos')).toBe(500_000))
  })

  // ── Millones explícitos deben seguir funcionando ───────────────────────────
  describe('millones explícitos — deben seguir funcionando', () => {
    it('"2 millones" → 2.000.000', () => expect(parseAmount('2 millones')).toBe(2_000_000))
    it('"1 millón" → 1.000.000 (con tilde)', () => expect(parseAmount('1 millón')).toBe(1_000_000))
    it('"6m" → 6.000.000', () => expect(parseAmount('6m')).toBe(6_000_000))
    it('"6 m" → 6.000.000', () => expect(parseAmount('6 m')).toBe(6_000_000))
    it('"matrícula 2 millones" → 2.000.000', () =>
      expect(parseAmount('matrícula 2 millones')).toBe(2_000_000))
  })

  // ── Slang colombiano: lucas (×1.000) ──────────────────────────────────────
  describe('slang — lucas (×1.000)', () => {
    it('"30 lucas" → 30.000', () => expect(parseAmount('30 lucas')).toBe(30_000))
    it('"30 lucas de almuerzo" → 30.000', () =>
      expect(parseAmount('30 lucas de almuerzo')).toBe(30_000))
    it('"85 lucas" → 85.000', () => expect(parseAmount('85 lucas')).toBe(85_000))
    it('"compré ropa 85 lucas" → 85.000', () =>
      expect(parseAmount('compré ropa 85 lucas')).toBe(85_000))
    it('"1 lucas" → 1.000', () => expect(parseAmount('1 lucas')).toBe(1_000))
  })

  // ── Slang colombiano: palo/palos (×1.000.000) ─────────────────────────────
  describe('slang — palo / palos (×1.000.000)', () => {
    it('"1 palo" → 1.000.000', () => expect(parseAmount('1 palo')).toBe(1_000_000))
    it('"2 palos" → 2.000.000', () => expect(parseAmount('2 palos')).toBe(2_000_000))
    it('"1 palo de arriendo" → 1.000.000', () =>
      expect(parseAmount('1 palo de arriendo')).toBe(1_000_000))
  })

  // ── Formatos existentes que no deben romperse ─────────────────────────────
  describe('formatos existentes — no regresión', () => {
    it('"15k" → 15.000', () => expect(parseAmount('15k')).toBe(15_000))
    it('"12k" → 12.000', () => expect(parseAmount('12k')).toBe(12_000))
    it('"taxi 12k" → 12.000', () => expect(parseAmount('taxi 12k')).toBe(12_000))
    it('"pagué parqueadero 15k" → 15.000', () =>
      expect(parseAmount('pagué parqueadero 15k')).toBe(15_000))
    it('"rappi 25.000" → 25.000', () => expect(parseAmount('rappi 25.000')).toBe(25_000))
    it('"almuerzo 12.000" → 12.000', () => expect(parseAmount('almuerzo 12.000')).toBe(12_000))
    it('"tinto 2.500" → 2.500', () => expect(parseAmount('tinto 2.500')).toBe(2_500))
    it('"tinto 2500" → 2.500', () => expect(parseAmount('tinto 2500')).toBe(2_500))
    it('"2500" → 2.500', () => expect(parseAmount('2500')).toBe(2_500))
    it('"250" → 250', () => expect(parseAmount('250')).toBe(250))
    it('"transmilenio 2800" → 2.800', () => expect(parseAmount('transmilenio 2800')).toBe(2_800))
    it('"factura de luz 50.000" → 50.000', () =>
      expect(parseAmount('factura de luz 50.000')).toBe(50_000))
  })

  // ── Números en palabras españolas: "dos mil", "cinco millones" ───────────
  describe('palabras numéricas en español', () => {
    it('"dos mil" → 2.000', () => expect(parseAmount('dos mil')).toBe(2_000))
    it('"cinco mil" → 5.000', () => expect(parseAmount('cinco mil')).toBe(5_000))
    it('"diez mil" → 10.000', () => expect(parseAmount('diez mil')).toBe(10_000))
    it('"veinte mil" → 20.000', () => expect(parseAmount('veinte mil')).toBe(20_000))
    it('"cincuenta mil" → 50.000', () => expect(parseAmount('cincuenta mil')).toBe(50_000))
    it('"cien mil" → 100.000', () => expect(parseAmount('cien mil')).toBe(100_000))
    it('"dos millones" → 2.000.000 (en palabras)', () =>
      expect(parseAmount('dos millones')).toBe(2_000_000))
    it('"tinto dos mil" → 2.000', () => expect(parseAmount('tinto dos mil')).toBe(2_000))
    it('"mercado tres mil pesos" → 3.000', () =>
      expect(parseAmount('mercado tres mil pesos')).toBe(3_000))
  })

  // ── Números compuestos en palabras: "dos mil quinientos" = 2.500 ──────────
  describe('números compuestos en palabras', () => {
    it('"dos mil quinientos" → 2.500', () => expect(parseAmount('dos mil quinientos')).toBe(2_500))
    it('"tres mil quinientos" → 3.500', () =>
      expect(parseAmount('tres mil quinientos')).toBe(3_500))
    it('"quinientos mil" → 500.000', () => expect(parseAmount('quinientos mil')).toBe(500_000))
    it('"ciento cincuenta mil" → 150.000', () =>
      expect(parseAmount('ciento cincuenta mil')).toBe(150_000))
    it('"un millón dos mil quinientos" → 1.002.500', () =>
      expect(parseAmount('un millón dos mil quinientos')).toBe(1_002_500))
    it('"almuerzo dos mil quinientos" → 2.500 (concepto + número)', () =>
      expect(parseAmount('almuerzo dos mil quinientos')).toBe(2_500))
    it('"doscientos cincuenta" → 250 (sin escala, multi-palabra)', () =>
      expect(parseAmount('doscientos cincuenta')).toBe(250))
  })

  // ── Anti-regresión: artículos/palabras sueltas NO son montos ──────────────
  describe('artículos no deben leerse como monto', () => {
    it('"un café 2000" → 2.000 (no 1)', () => expect(parseAmount('un café 2000')).toBe(2_000))
    it('"una pizza 15.000" → 15.000', () => expect(parseAmount('una pizza 15.000')).toBe(15_000))
    it('"un almuerzo" → 0 (sin monto)', () => expect(parseAmount('un almuerzo')).toBe(0))
  })

  // ── Inputs sin cantidad válida deben retornar 0 ───────────────────────────
  describe('sin monto válido → 0', () => {
    it('texto sin números', () => expect(parseAmount('mercado')).toBe(0))
    it('cadena vacía', () => expect(parseAmount('')).toBe(0))
    it('"lucas" sin número previo', () => expect(parseAmount('lucas')).toBe(0))
    it('"palo" sin número previo', () => expect(parseAmount('palo')).toBe(0))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// extractConcept
// ─────────────────────────────────────────────────────────────────────────────
describe('extractConcept', () => {
  // ── Slang colombiano: el multiplicador se elimina, queda el concepto ───────
  describe('slang — concepto correcto tras eliminar multiplicador', () => {
    it('"30 lucas de almuerzo" → almuerzo', () =>
      expect(extractConcept('30 lucas de almuerzo')).toBe('almuerzo'))
    it('"1 palo de arriendo" → arriendo', () =>
      expect(extractConcept('1 palo de arriendo')).toBe('arriendo'))
    it('"2 palos matrícula" → matrícula', () =>
      expect(extractConcept('2 palos matrícula')).toBe('matrícula'))
    it('"85 lucas ropa" → ropa', () => expect(extractConcept('85 lucas ropa')).toBe('ropa'))
  })

  // ── "X mil" corregido: uber/mercado/netflix como concepto ─────────────────
  describe('"X mil" — concepto correcto tras corrección del bug', () => {
    it('"uber 25 mil" → uber', () => expect(extractConcept('uber 25 mil')).toBe('uber'))
    it('"Netflix 18 mil" → netflix', () => expect(extractConcept('Netflix 18 mil')).toBe('netflix'))
    it('"arriendo 800 mil" → arriendo', () =>
      expect(extractConcept('arriendo 800 mil')).toBe('arriendo'))
  })

  // ── Formatos existentes no rotos ──────────────────────────────────────────
  describe('formatos existentes — no regresión', () => {
    it('"tinto 2500" → tinto', () => expect(extractConcept('tinto 2500')).toBe('tinto'))
    it('"rappi 25.000" → rappi', () => expect(extractConcept('rappi 25.000')).toBe('rappi'))
    it('"almuerzo 12.000" → almuerzo', () =>
      expect(extractConcept('almuerzo 12.000')).toBe('almuerzo'))
    it('"factura de luz 50.000" → factura', () =>
      expect(extractConcept('factura de luz 50.000')).toBe('factura'))
    it('"taxi 12k" → taxi', () => expect(extractConcept('taxi 12k')).toBe('taxi'))
    it('"2 millones de matrícula" → matrícula', () =>
      expect(extractConcept('2 millones de matrícula')).toBe('matrícula'))
  })

  // ── Números compuestos en palabras: concepto limpio ───────────────────────
  describe('números compuestos — concepto sin residuos numéricos', () => {
    it('"dos mil quinientos" → Gasto (sin concepto)', () =>
      expect(extractConcept('dos mil quinientos')).toBe('Gasto'))
    it('"almuerzo dos mil quinientos" → almuerzo', () =>
      expect(extractConcept('almuerzo dos mil quinientos')).toBe('almuerzo'))
    it('"mercado ciento cincuenta mil" → mercado', () =>
      expect(extractConcept('mercado ciento cincuenta mil')).toBe('mercado'))
  })
})
