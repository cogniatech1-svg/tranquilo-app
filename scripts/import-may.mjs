/**
 * Script de importación de datos de mayo 2026
 * Ejecutar con: node scripts/import-may.mjs
 *
 * Fuente: mayo_tranquilo_corregido.csv
 * 50 gastos — pocket IDs: donaciones, hogar, servicios, transporte, mercado, ocio
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

// [date YYYY-MM-DD, pocketId, amount, description]
const CSV_ROWS = [
  // Donaciones
  ['2026-05-16', 'donaciones', 400000, 'Mami'],
  ['2026-05-21', 'donaciones', 50000, 'Favio'],
  ['2026-05-10', 'donaciones', 50000, 'Favio'],
  ['2026-05-22', 'donaciones', 60000, 'Máximo'],
  ['2026-05-24', 'donaciones', 20000, 'Eucaristía'],
  ['2026-05-09', 'donaciones', 20000, 'Eucaristía'],
  // Hogar (Cuota apto)
  ['2026-05-21', 'hogar', 660000, 'Pago apartamento'],
  // Servicios
  ['2026-05-23', 'servicios', 48195, 'Colsanitas'],
  ['2026-05-18', 'servicios', 73649, 'Celular'],
  ['2026-05-13', 'servicios', 35300, 'Luz finca'],
  ['2026-05-14', 'servicios', 56244, 'Internet'],
  ['2026-05-19', 'servicios', 79990, 'Gym'],
  ['2026-05-03', 'servicios', 75694, 'Claude'],
  ['2026-05-19', 'servicios', 20600, 'ChatGPT'],
  ['2026-05-22', 'servicios', 11324, 'Gas'],
  ['2026-05-14', 'servicios', 65630, 'Agua'],
  // Transporte
  ['2026-05-13', 'transporte', 162000, 'Transcaribe'],
  ['2026-05-06', 'transporte', 30200, 'Taxi'],
  ['2026-05-08', 'transporte', 40100, 'Buseta'],
  // Compras básicas → hogar (mercado mapeado)
  ['2026-05-17', 'hogar', 5500, 'Pan'],
  ['2026-05-17', 'hogar', 24210, 'Ara'],
  ['2026-05-03', 'hogar', 42126, 'Carne'],
  ['2026-05-12', 'hogar', 20840, 'Jumbo'],
  ['2026-05-11', 'hogar', 20995, 'Ara'],
  ['2026-05-22', 'hogar', 2500, 'Pan'],
  ['2026-05-10', 'hogar', 3000, 'Jabón'],
  ['2026-05-04', 'hogar', 15102, 'Ara'],
  ['2026-05-16', 'hogar', 36877, 'Carne'],
  ['2026-05-13', 'hogar', 45000, 'Ledis'],
  ['2026-05-14', 'hogar', 16000, 'Chocolate'],
  ['2026-05-03', 'hogar', 42860, 'Jumbo'],
  ['2026-05-16', 'hogar', 28370, 'Ara'],
  // Recreación → recreacion (ocio mapeado)
  ['2026-05-15', 'recreacion', 21787, 'Almohadas'],
  ['2026-05-10', 'recreacion', 80300, 'Pizza'],
  ['2026-05-12', 'recreacion', 13000, 'Almuerzo'],
  ['2026-05-11', 'recreacion', 34000, 'Aceite cabello'],
  ['2026-05-02', 'recreacion', 9500, 'Mr Bono'],
  ['2026-05-18', 'recreacion', 90000, 'Barranquilla'],
  ['2026-05-21', 'recreacion', 19000, 'Merienda'],
  ['2026-05-18', 'recreacion', 21000, 'Crepes'],
  ['2026-05-06', 'recreacion', 7800, 'Mr Bono'],
  ['2026-05-16', 'recreacion', 90000, 'Café'],
  ['2026-05-21', 'recreacion', 9500, 'Mr Bono'],
  ['2026-05-23', 'recreacion', 5000, 'Merienda'],
  ['2026-05-03', 'recreacion', 14480, 'Jumbo'],
  ['2026-05-18', 'recreacion', 69800, 'El Corral'],
  ['2026-05-06', 'recreacion', 15000, 'Almuerzo'],
  ['2026-05-02', 'recreacion', 14000, 'Almuerzo'],
  ['2026-05-04', 'recreacion', 17500, 'Mr Bono'],
  ['2026-05-23', 'recreacion', 32000, 'Cena'],
]

async function main() {
  // ── Usuario ───────────────────────────────────────────────────────────────
  // Auth user_id confirmed via check-user-ids.mjs (monthly_record income=12927799)
  const userId = 'b48ba99a-0e03-42a3-bb5d-37f2cb905cb8'
  console.log(`✅ Usuario: ${userId}`)

  // ── Limpiar gastos importados con user_id incorrecto ──────────────────────
  const WRONG_USER_ID = 'a6e881b0-2cc4-46d3-b695-1dffce2f351f'
  console.log(`\n🗑️  Limpiando gastos con user_id incorrecto (${WRONG_USER_ID})...`)
  await supabase.from('expenses').delete().eq('user_id', WRONG_USER_ID).eq('month', '2026-05')
  console.log('   ✅ Gastos incorrectos eliminados')

  // ── Borrar gastos existentes de mayo (evita duplicados) ───────────────────
  console.log('\n🗑️  Borrando gastos existentes de mayo 2026...')
  const { data: existing } = await supabase
    .from('expenses')
    .select('id')
    .eq('user_id', userId)
    .eq('month', '2026-05')
  console.log(`   Encontrados: ${existing?.length ?? 0} gastos previos`)

  await supabase.from('expenses').delete().eq('user_id', userId).eq('month', '2026-05')
  console.log('   ✅ Gastos anteriores eliminados')

  // ── Upsert monthly_record de mayo ─────────────────────────────────────────
  console.log('\n📝 Creando registro mensual de mayo 2026...')
  const { error: monthError } = await supabase.from('monthly_records').upsert(
    {
      user_id: userId,
      month: '2026-05',
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
  console.log('✅ Registro mensual creado (income=0, configúralo en la app)')

  // ── Insertar gastos ───────────────────────────────────────────────────────
  console.log(`\n💸 Insertando ${CSV_ROWS.length} gastos de mayo...`)

  const expenses = CSV_ROWS.map(([date, pocketId, amount, concept]) => ({
    id: randomUUID(),
    user_id: userId,
    month: '2026-05',
    date: date + 'T00:00:00',
    amount,
    concept,
    pocket_id: pocketId,
  }))

  const { error: expError } = await supabase.from('expenses').insert(expenses)

  if (expError) {
    console.error('❌ Error insertando gastos:', expError.message)
    process.exit(1)
  }

  // ── Verificación ──────────────────────────────────────────────────────────
  const { data: verif } = await supabase
    .from('expenses')
    .select('id')
    .eq('user_id', userId)
    .eq('month', '2026-05')

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  console.log('\n════════════════════════════════════════════')
  console.log('✅ IMPORTACIÓN COMPLETADA')
  console.log(`   Gastos en DB: ${verif?.length ?? 0} / ${CSV_ROWS.length}`)
  console.log(`   Total: $${total.toLocaleString('es-CO')}`)
  console.log('\n   Desglose por categoría:')

  const byPocket = {}
  for (const e of expenses) {
    byPocket[e.pocket_id] = (byPocket[e.pocket_id] ?? 0) + e.amount
  }
  for (const [pocket, amt] of Object.entries(byPocket).sort(([, a], [, b]) => b - a)) {
    console.log(`   · ${pocket.padEnd(12)} $${amt.toLocaleString('es-CO')}`)
  }

  console.log('════════════════════════════════════════════')
  console.log('\n👉 Configura el ingreso de mayo en la app (Presupuesto → Ingresos mensuales)')
}

main().catch(console.error)
