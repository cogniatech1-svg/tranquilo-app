/**
 * Script de importación de datos de abril 2026
 * Ejecutar con: node scripts/import-april.mjs
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variables de entorno faltantes: NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.error('   Verifica que existe .env.local en la raíz del proyecto')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Gastos de abril desde CSV ────────────────────────────────────────────────
const CSV_ROWS = [
  ['29/04/2026', 'transporte', 3000, 'moto'],
  ['29/04/2026', 'transporte', 50000, 'transcaribe'],
  ['29/04/2026', 'extras', 90000, 'arreglobici'],
  ['28/04/2026', 'Recreación', 17500, 'mrbono'],
  ['28/04/2026', 'transporte', 3000, 'moto'],
  ['28/04/2026', 'extras', 13000, 'almuerzo'],
  ['27/04/2026', 'transporte', 3000, 'moto'],
  ['27/04/2026', 'extras', 18000, 'cargador'],
  ['26/04/2026', 'hogar', 6000, 'pan'],
  ['26/04/2026', 'Recreación', 35600, 'crepes'],
  ['26/04/2026', 'transporte', 3000, 'moto'],
  ['26/04/2026', 'extras', 15000, 'almuerzo'],
  ['26/04/2026', 'transporte', 4000, 'buseta'],
  ['25/04/2026', 'extras', 64000, 'arreglobici'],
  ['25/04/2026', 'transporte', 4000, 'transcaribe'],
  ['25/04/2026', 'Recreación', 78700, 'pizza'],
  ['24/04/2026', 'hogar', 14530, 'Ara'],
  ['24/04/2026', 'transporte', 3000, 'Moto'],
  ['24/04/2026', 'extras', 4700000, 'Cadenas'],
  ['23/04/2026', 'transporte', 18000, 'Taxi'],
  ['23/04/2026', 'extras', 32709, 'Naranjas'],
  ['23/04/2026', 'hogar', 5010, 'Azúcar'],
  ['22/04/2026', 'transporte', 50000, 'transcaribe'],
  ['22/04/2026', 'transporte', 3000, 'moto'],
  ['21/04/2026', 'servicios', 41700, 'luz finca'],
  ['21/04/2026', 'Recreación', 5700, 'conos'],
  ['20/04/2026', 'donaciones', 40000, 'Favio'],
  ['20/04/2026', 'hogar', 111780, 'Luz apartamento'],
  ['20/04/2026', 'hogar', 101448, 'mercado'],
  ['20/04/2026', 'servicios', 20900, 'Chatgpt'],
  ['20/04/2026', 'Recreación', 65800, 'El Corral'],
  ['19/04/2026', 'capacitaciones', 5600, 'Pasto taxi museo carnaval'],
  ['19/04/2026', 'capacitaciones', 7000, 'Pasto taxi'],
  ['19/04/2026', 'capacitaciones', 12000, 'Pasto desayuno'],
  ['19/04/2026', 'capacitaciones', 38700, 'Pasto taxis aeropuerto'],
  ['19/04/2026', 'capacitaciones', 35000, 'Pasto almuerzo aeropuerto'],
  ['19/04/2026', 'capacitaciones', 12500, 'Pasto capuchino'],
  ['19/04/2026', 'extras', 25000, 'Cena'],
  ['19/04/2026', 'transporte', 14000, 'Taxi'],
  ['18/04/2026', 'capacitaciones', 16400, 'Pasto desayuno'],
  ['18/04/2026', 'capacitaciones', 62000, 'La cocha, almuerzo,'],
  ['18/04/2026', 'capacitaciones', 80000, 'La cocha, transporte'],
  ['18/04/2026', 'capacitaciones', 100000, 'La cocha paseo en lancha'],
  ['18/04/2026', 'capacitaciones', 71400, 'La Cocha, souvenir madre'],
  ['18/04/2026', 'capacitaciones', 33000, 'La Cocha souvenirs'],
  ['18/04/2026', 'capacitaciones', 20000, 'Pasto merienda'],
  ['18/04/2026', 'servicios', 45000, 'Peluquería'],
  ['17/04/2026', 'capacitaciones', 6900, 'Pasto taxi terminal'],
  ['17/04/2026', 'capacitaciones', 15000, 'Pasto Ipiales bus'],
  ['17/04/2026', 'capacitaciones', 6000, 'Ipiales desayuno'],
  ['17/04/2026', 'capacitaciones', 4000, 'Ipiales bus Rumichaca y regreso'],
  ['17/04/2026', 'capacitaciones', 115706, 'pasto souvenirs'],
  ['17/04/2026', 'capacitaciones', 10000, 'Ipiales merienda'],
  ['17/04/2026', 'capacitaciones', 10000, 'Ipiales cementerio'],
  ['17/04/2026', 'capacitaciones', 7000, 'Tulcán ida y regreso Rumichaca'],
  ['17/04/2026', 'capacitaciones', 6000, 'Transporte Ipiales las Lajas'],
  ['17/04/2026', 'capacitaciones', 5700, 'Las Lajas, merienda'],
  ['17/04/2026', 'capacitaciones', 34000, 'Las Lajas, Teleférico'],
  ['17/04/2026', 'capacitaciones', 9000, 'Ipiales cena'],
  ['17/04/2026', 'capacitaciones', 16000, 'Ipiales pasto bus'],
  ['17/04/2026', 'capacitaciones', 9600, 'Pasto taxi'],
  ['16/04/2026', 'capacitaciones', 9000, 'Pasto taxi'],
  ['16/04/2026', 'capacitaciones', 21900, 'Pasto desayuno almuerzo'],
  ['16/04/2026', 'capacitaciones', 115000, 'Pasto souvenirs'],
  ['16/04/2026', 'capacitaciones', 3000, 'Pasto pan'],
  ['16/04/2026', 'capacitaciones', 5000, 'Pasto casa museo'],
  ['16/04/2026', 'capacitaciones', 8000, 'Pasto taxi'],
  ['16/04/2026', 'capacitaciones', 14500, 'Pasto merienda'],
  ['16/04/2026', 'cuota apartamento', 651777, 'Crédito apto'],
  ['16/04/2026', 'hogar', 127723, 'Agua'],
  ['16/04/2026', 'hogar', 20104, 'Gas'],
  ['15/04/2026', 'capacitaciones', 8500, 'Pasto taxi'],
  ['15/04/2026', 'capacitaciones', 4000, 'Pasto merienda'],
  ['15/04/2026', 'capacitaciones', 17100, 'Pasto almuerzo'],
  ['15/04/2026', 'capacitaciones', 9000, 'Pasto taxi'],
  ['15/04/2026', 'extras', 25900, 'Crema dental'],
  ['15/04/2026', 'capacitaciones', 27000, 'Pasto cena'],
  ['14/04/2026', 'capacitaciones', 12000, 'Taxi Cartagena'],
  ['14/04/2026', 'capacitaciones', 22000, 'Pasto taxi'],
  ['14/04/2026', 'capacitaciones', 7000, 'Pasto merienda'],
  ['14/04/2026', 'capacitaciones', 14100, 'Pasto Mr Bono'],
  ['13/04/2026', 'hogar', 40000, 'Ledis'],
  ['13/04/2026', 'hogar', 25000, 'Ledis'],
  ['12/04/2026', 'donaciones', 140000, 'Ricardo'],
  ['12/04/2026', 'hogar', 44086, 'Ara'],
  ['12/04/2026', 'hogar', 2000, 'Pan'],
  ['12/04/2026', 'capacitaciones', 345000, 'Pasto Airbnb'],
  ['11/04/2026', 'hogar', 18490, 'Jumbo'],
  ['10/04/2026', 'transporte', 11000, 'Buseta'],
  ['10/04/2026', 'Recreación', 600, 'Banano'],
  ['10/04/2026', 'Recreación', 23000, 'Gaseosas'],
  ['10/04/2026', 'extras', 100000, 'Audífonos'],
  ['10/04/2026', 'Recreación', 140400, 'Cumpleaños Dan'],
  ['10/04/2026', 'Recreación', 32000, 'Almuerzos'],
  ['09/04/2026', 'transporte', 50000, 'Transcaribe'],
  ['09/04/2026', 'hogar', 18490, 'Jumbo'],
  ['09/04/2026', 'Recreación', 18600, 'Mr Bono'],
  ['09/04/2026', 'Recreación', 18600, 'Jugos'],
  ['08/04/2026', 'Recreación', 30800, 'Café instantáneo'],
  ['07/04/2026', 'transporte', 74000, 'Taxi'],
  ['07/04/2026', 'hogar', 50000, 'Ledis'],
  ['07/04/2026', 'Recreación', 140000, 'Il Forno'],
  ['07/04/2026', 'Recreación', 40000, 'El Depósito Café'],
  ['07/04/2026', 'capacitaciones', 975710, 'Pasto Vuelo'],
  ['06/04/2026', 'servicios', 48195, 'Colsanitas'],
  ['06/04/2026', 'servicios', 73650, 'Celular'],
  ['06/04/2026', 'hogar', 51244, 'Internet'],
  ['06/04/2026', 'Recreación', 44800, 'Hamburguesa'],
  ['06/04/2026', 'Recreación', 800, 'Botella de agua'],
  ['05/04/2026', 'donaciones', 52000, 'Eucaristía'],
  ['05/04/2026', 'Recreación', 10000, 'El Depósito Café'],
  ['05/04/2026', 'Recreación', 74296, 'Mila'],
  ['05/04/2026', 'Recreación', 9000, 'Cerveza'],
  ['04/04/2026', 'hogar', 35000, 'Ledis'],
  ['04/04/2026', 'hogar', 3000, 'Pan'],
  ['04/04/2026', 'Recreación', 17300, 'Tostao'],
  ['03/04/2026', 'donaciones', 140000, 'Ricardo'],
  ['03/04/2026', 'hogar', 28706, 'Jumbo'],
  ['03/04/2026', 'Recreación', 19800, 'Crepes'],
  ['02/04/2026', 'donaciones', 400000, 'madre'],
  ['02/04/2026', 'hogar', 14943, 'Ara'],
  ['02/04/2026', 'Recreación', 25990, 'Jumbo salsa'],
  ['02/04/2026', 'Recreación', 3900, 'Mr Bono'],
  ['01/04/2026', 'hogar', 15665, 'Carne'],
  ['01/04/2026', 'extras', 506635, 'Lavavajillas'],
  ['01/04/2026', 'extras', 21785, 'Almohadas'],
  ['01/04/2026', 'Recreación', 107967, 'Ollas'],
]

function toIsoDate(fecha) {
  const [day, month, year] = fecha.split('/')
  return `${year}-${month}-${day}`
}

async function main() {
  // ── Buscar usuario por email ────────────────────────────────────────────────
  console.log('🔍 Buscando usuario en Supabase...')
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'cogniatech.1@gmail.com')
    .single()

  if (userError || !userData) {
    console.error('❌ No se pudo encontrar el usuario (posiblemente RLS):')
    console.error(userError?.message)
    console.log('\n⚠️  Proporciona tu USER ID manualmente.')
    console.log(
      '   Puedes encontrarlo en Supabase → Authentication → Users → tu email → User UID'
    )
    process.exit(1)
  }

  const userId = userData.id
  console.log(`✅ Usuario encontrado: ${userId}`)

  // ── Borrar SIEMPRE los gastos existentes de abril (evita duplicados) ────────
  console.log('\n🗑️  Borrando gastos existentes de abril 2026...')
  const { data: existing } = await supabase
    .from('expenses')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('month', '2026-04')
  console.log(`   Encontrados: ${existing?.length ?? 0} gastos previos`)

  await supabase.from('expenses').delete().eq('user_id', userId).eq('month', '2026-04')
  console.log('   ✅ Gastos anteriores eliminados')

  // ── Upsert monthly_record de abril ──────────────────────────────────────
  console.log('\n📝 Creando registro mensual de abril 2026...')
  const { error: monthError } = await supabase.from('monthly_records').upsert(
    {
      user_id: userId,
      month: '2026-04',
      income: 0,
      savings: 0,
      manual_budget: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,month' }
  )

  if (monthError) {
    console.error('❌ Error creando monthly_record:', monthError.message)
    process.exit(1)
  }
  console.log('✅ Registro mensual creado')

  // ── Insertar gastos ───────────────────────────────────────────────────────
  console.log(`\n💸 Insertando ${CSV_ROWS.length} gastos de abril...`)

  const expenses = CSV_ROWS.map(([fecha, pocketId, monto, descripcion]) => ({
    id: randomUUID(),
    user_id: userId,
    month: '2026-04',
    date: toIsoDate(fecha) + 'T00:00:00',
    amount: monto,
    concept: descripcion,
    pocket_id: pocketId,
  }))

  const { error: expError } = await supabase.from('expenses').insert(expenses)

  if (expError) {
    console.error('❌ Error insertando gastos:', expError.message)
    process.exit(1)
  }

  console.log(`✅ ${expenses.length} gastos importados exitosamente`)

  // ── Verificación final ────────────────────────────────────────────────────
  const { data: verif } = await supabase
    .from('expenses')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('month', '2026-04')

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  console.log('\n════════════════════════════════════════════')
  console.log('✅ IMPORTACIÓN COMPLETADA')
  console.log(`   Gastos en DB: ${verif?.length ?? 0}`)
  console.log(`   Total: $${total.toLocaleString('es-CO')}`)
  console.log('════════════════════════════════════════════')
  console.log('\n👉 Abre la app, ve a abril 2026 y verifica los datos.')
}

main().catch(console.error)
