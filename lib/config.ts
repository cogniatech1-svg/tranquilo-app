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

export function maskMoney(amount: number, config: CountryConfig, isPrivacy: boolean): string {
  return isPrivacy ? '••••' : formatMoney(amount, config)
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export const DS = {
  bg:            '#F8FAFC',
  card:          '#FFFFFF',
  primary:       '#0D6259',
  primaryGrad:   'linear-gradient(135deg, #0D6259 0%, #0F9E8E 100%)',
  heroGrad:      'linear-gradient(160deg, #042F2E 0%, #0D6259 55%, #0891B2 100%)',
  text:          '#0F172A',
  textMuted:     '#64748B',
  border:        '#F1F5F9',
  // Deeper green — avoids neon/lime feel while keeping enough vibrancy
  statusGreen:   '#16A34A',
  statusYellow:  '#D97706',
  statusRed:     '#DC2626',
} as const

// Calm state gradients — only used for hero card
export const CALM_GRADS = {
  // Deep navy → desaturated teal → muted cyan: high contrast, no neon
  tranquilo: 'linear-gradient(150deg, #0A1628 0%, #0D6259 48%, #0891B2 100%)',
  ajustado:  'linear-gradient(150deg, #1C0F00 0%, #A05209 50%, #F0C040 100%)',
  riesgo:    'linear-gradient(150deg, #2D0A0A 0%, #B02020 50%, #F87171 100%)',
  neutral:   'linear-gradient(150deg, #0A1628 0%, #0D6259 48%, #0891B2 100%)',
} as const

// Per-pocket color palette (tinted backgrounds, no gradients in data)
export const POCKET_PALETTE = [
  { bg: '#EDE9FE', icon: '#7C3AED', bar: '#8B5CF6', text: '#6D28D9', emoji: '🎬' },
  { bg: '#DBEAFE', icon: '#1D4ED8', bar: '#3B82F6', text: '#1E40AF', emoji: '🏠' },
  { bg: '#FEF3C7', icon: '#D97706', bar: '#F59E0B', text: '#92400E', emoji: '🍔' },
  { bg: '#CCFBF1', icon: '#0D6259', bar: '#14B8A6', text: '#0D6259', emoji: '🚗' },
  { bg: '#FCE7F3', icon: '#BE185D', bar: '#EC4899', text: '#9D174D', emoji: '💊' },
  { bg: '#DCFCE7', icon: '#15803D', bar: '#22C55E', text: '#15803D', emoji: '🛍️' },
] as const

export const POCKET_ICONS: Record<string, string> = {
  recreacion:   '🎬',
  hogar:        '🏠',
  alimentacion: '🍔',
}

// Keyword → emoji map for auto-detecting pocket icons from names
const ICON_KEYWORDS: Array<[RegExp, string]> = [
  // Transporte
  [/transporte|movilidad|bus|taxi|uber|didi|metro|gasolina|combustible|moto|carro|vehiculo|vehículo|bicicleta|parqueadero|peaje|tren|avion|avión|vuelo/i, '🚗'],
  // Alimentación / comida
  [/aliment|comida|mercado|supermercado|tienda|compras.*(viv|comi)|despensa|restaurante|almuerzo|desayuno|cena|comedor|sodexo|rappi|ifood|domicilio|cafeter|cafe|café|snack|fruta|verdura|carnez|pescado/i, '🍔'],
  // Hogar / vivienda
  [/hogar|arriendo|arrend|hipoteca|casa|apartamento|piso|vivienda|mueble|decoracion|decoración|aseo|limpieza|mantenimiento|plomeria|plomería|electricista|gas|agua|luz|servicios.*(pub|bás)|internet|wifi|cable|telefon/i, '🏠'],
  // Salud
  [/salud|medico|médico|doctor|clinica|clínica|hospital|farmacia|medicamento|droga|droguer|consulta|cita|optometria|odontolog|dental|seguro.*(med|sal)|eps|medicina/i, '🏥'],
  // Educación
  [/educacion|educación|colegio|universidad|escuela|libro|curso|clase|capacitacion|capacitación|matrícula|matricula|taller|seminario|diplomado|estudio/i, '📚'],
  // Entretenimiento / recreación
  [/recreacion|recreación|entretenim|cine|pelicul|película|teatro|concierto|evento|parque|museo|juego|videojuego|gaming|netflix|streaming|spotify|youtube|deezer|ocio|diversión|diversion/i, '🎬'],
  // Ropa / moda
  [/ropa|vestim|moda|zapatos|calzado|accesorio|camisa|pantalon|pantalón|jean|vestido|prenda|boutique|tienda.*(ropa|moda)/i, '👕'],
  // Tecnología
  [/tecnolog|electronica|electrónica|celular|telefono|teléfono|computador|laptop|tablet|dispositivo|gadget|accesorio.*(tech|elec)|apple|samsung|software|app/i, '💻'],
  // Mascotas
  [/mascota|perro|gato|veterinario|veterinaria|animal|pet|pienso|alimento.*(mas|ani)/i, '🐾'],
  // Viajes / turismo
  [/viaje|viajes|vacacion|vacación|turismo|hotel|vuelo|hospedaje|alojamiento|airbnb|excursion|excursión|tour/i, '✈️'],
  // Deporte / gym
  [/deporte|gym|gimnasio|ejercicio|fitness|crossfit|natacion|natación|yoga|pilates|cancha|entrenamiento|suplemento/i, '💪'],
  // Belleza / cuidado personal
  [/belleza|peluquer|barberia|barbería|cosmet|estetica|estética|maquillaje|manicure|pedicure|spa|cuidado.*(pers|piel)|crema|shampoo/i, '💄'],
  // Suscripciones / servicios digitales
  [/suscripcion|suscripción|membresia|membresía|plan|streaming|plataforma|digital|mensualidad/i, '📱'],
  // Ahorro / inversión
  [/ahorro|ahorros|inversion|inversión|fondo|acciones|crypto|bitcoin|bolsa|cdts?|fiducia|pension|pensión/i, '💰'],
  // Trabajo / negocio
  [/trabajo|negocio|empresa|oficina|materiales.*(ofic|trab)|útiles|utiles|papeleria|papelería|herramienta/i, '💼'],
  // Regalos / fiestas
  [/regalo|regalos|fiesta|celebracion|celebración|cumpleaños|boda|navidad|aniversario/i, '🎁'],
  // Familia / hijos
  [/familia|hijo|hija|niño|niña|bebe|bebé|colegio.*(hijo|niñ)|guarderia|guardería|juguete/i, '👨‍👩‍👧'],
  // Seguros
  [/seguro|poliza|póliza|aseguradora/i, '🛡️'],
  // Impuestos / trámites
  [/impuesto|tributo|declaracion|declaración|renta|iva|predial|tramite|trámite|multa/i, '📋'],
  // Donaciones
  [/donacion|donación|caridad|iglesia|diezmo|ofrenda|voluntario/i, '🤝'],
  // Construccion / remodelacion
  [/construccion|construcción|remodelacion|remodelación|obra|material.*(const|constr)|pintura|cemento|ladrillo/i, '🔨'],
  // Jardín / plantas
  [/jardin|jardín|planta|jardineria|jardinería|flores|maceta|semilla/i, '🌱'],
  // Música
  [/musica|música|instrument|guitarra|piano|clases.*(musi)|concierto/i, '🎵'],
  // Deudas / crédito
  [/deuda|credito|crédito|prestamo|préstamo|cuota|financiamiento|pago.*(deud|cred)/i, '💳'],
]

/** Returns the best-matching emoji for a pocket given its name */
export function guessIconFromName(name: string): string {
  for (const [pattern, icon] of ICON_KEYWORDS) {
    if (pattern.test(name)) return icon
  }
  return '💳'
}

/** Returns the icon for a pocket: stored icon > fixed map > keyword guess */
export function getPocketIcon(pocketId: string, pocketName: string, storedIcon?: string): string {
  if (storedIcon) return storedIcon
  return POCKET_ICONS[pocketId] ?? guessIconFromName(pocketName)
}

export function getPocketPalette(pocketId: string, index: number) {
  const FIXED: Record<string, number> = {
    recreacion: 0, hogar: 1, alimentacion: 2,
  }
  const i = FIXED[pocketId] ?? index % POCKET_PALETTE.length
  return POCKET_PALETTE[i]
}
