/**
 * Diagnostic: check which user IDs have data and whether they match
 * node scripts/check-user-ids.mjs
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

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

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('🔍 DIAGNÓSTICO DE USER IDs')
  console.log('═══════════════════════════════════════════\n')

  // 1. Users table
  const { data: users } = await supabase
    .from('users')
    .select('id, email, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10)

  console.log('📋 users table (últimos 10):')
  for (const u of users || []) {
    console.log(`  id=${u.id}  email=${u.email}  updated=${u.updated_at?.slice(0,19)}`)
  }

  // 2. monthly_records — which user_ids have May
  const { data: mrs } = await supabase
    .from('monthly_records')
    .select('user_id, month, income')
    .eq('month', '2026-05')

  console.log('\n📅 monthly_records for 2026-05:')
  for (const mr of mrs || []) {
    console.log(`  user_id=${mr.user_id}  income=${mr.income}`)
  }

  // 3. expenses — which user_ids have May data
  const { data: exps } = await supabase
    .from('expenses')
    .select('user_id')
    .eq('month', '2026-05')

  const expCounts = {}
  for (const e of exps || []) {
    expCounts[e.user_id] = (expCounts[e.user_id] || 0) + 1
  }
  console.log('\n💸 expenses for 2026-05 by user_id:')
  for (const [uid, cnt] of Object.entries(expCounts)) {
    console.log(`  user_id=${uid}  count=${cnt}`)
  }

  // 4. expenses — April
  const { data: aprilExps } = await supabase
    .from('expenses')
    .select('user_id')
    .eq('month', '2026-04')

  const aprilCounts = {}
  for (const e of aprilExps || []) {
    aprilCounts[e.user_id] = (aprilCounts[e.user_id] || 0) + 1
  }
  console.log('\n💸 expenses for 2026-04 by user_id:')
  for (const [uid, cnt] of Object.entries(aprilCounts)) {
    console.log(`  user_id=${uid}  count=${cnt}`)
  }

  console.log('\n═══════════════════════════════════════════')
}

main().catch(console.error)
