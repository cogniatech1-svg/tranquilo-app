// ─────────────────────────────────────────────────────────────────────────────
// LATAM COUNTRY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export type CountryCode = 'CO' | 'MX' | 'CL'

export interface CountryConfig {
  code: CountryCode
  name: string
  flag: string
  currency: string
  locale: string
  defaultBudget: number
  exampleExpense: string
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  CO: {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    currency: 'COP',
    locale: 'es-CO',
    defaultBudget: 2_000_000,
    exampleExpense: 'Café 8000',
  },
  MX: {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    currency: 'MXN',
    locale: 'es-MX',
    defaultBudget: 15_000,
    exampleExpense: 'Café 80',
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    currency: 'CLP',
    locale: 'es-CL',
    defaultBudget: 800_000,
    exampleExpense: 'Café 3000',
  },
}

export function formatMoney(amount: number, config: CountryConfig): string {
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export const DS = {
  bg:            '#F8FAFC',
  card:          '#FFFFFF',
  primary:       '#0F766E',
  primaryGrad:   'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
  heroGrad:      'linear-gradient(160deg, #042F2E 0%, #0F766E 55%, #0891B2 100%)',
  text:          '#0F172A',
  textMuted:     '#64748B',
  border:        '#F1F5F9',
  statusGreen:   '#22C55E',
  statusYellow:  '#F59E0B',
  statusRed:     '#EF4444',
} as const

// Calm state gradients — only used for hero card
export const CALM_GRADS = {
  // Deep navy-indigo → teal-600 → bright cyan: máximo contraste, lectura clara
  tranquilo: 'linear-gradient(150deg, #0F172A 0%, #0F766E 45%, #06B6D4 100%)',
  ajustado:  'linear-gradient(150deg, #1C0F00 0%, #B45309 50%, #FCD34D 100%)',
  riesgo:    'linear-gradient(150deg, #2D0A0A 0%, #C0392B 50%, #FC8181 100%)',
  neutral:   'linear-gradient(150deg, #0F172A 0%, #0F766E 45%, #06B6D4 100%)',
} as const

// Per-pocket color palette (tinted backgrounds, no gradients in data)
export const POCKET_PALETTE = [
  { bg: '#EDE9FE', icon: '#7C3AED', bar: '#8B5CF6', text: '#6D28D9', emoji: '🎬' },
  { bg: '#DBEAFE', icon: '#1D4ED8', bar: '#3B82F6', text: '#1E40AF', emoji: '🏠' },
  { bg: '#FEF3C7', icon: '#D97706', bar: '#F59E0B', text: '#92400E', emoji: '🍔' },
  { bg: '#CCFBF1', icon: '#0F766E', bar: '#14B8A6', text: '#0F766E', emoji: '🚗' },
  { bg: '#FCE7F3', icon: '#BE185D', bar: '#EC4899', text: '#9D174D', emoji: '💊' },
  { bg: '#DCFCE7', icon: '#15803D', bar: '#22C55E', text: '#15803D', emoji: '🛍️' },
] as const

export const POCKET_ICONS: Record<string, string> = {
  recreacion:   '🎬',
  hogar:        '🏠',
  alimentacion: '🍔',
}

export function getPocketPalette(pocketId: string, index: number) {
  const FIXED: Record<string, number> = {
    recreacion: 0, hogar: 1, alimentacion: 2,
  }
  const i = FIXED[pocketId] ?? index % POCKET_PALETTE.length
  return POCKET_PALETTE[i]
}
