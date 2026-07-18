// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA OFICIAL DE REGRESIÓN — Pages Function /api/delete-account (Cloudflare)
// ─────────────────────────────────────────────────────────────────────────────
// Valida el comportamiento runtime de la Pages Function contra Supabase real:
// crea un usuario de prueba sintético, le crea datos, ejecuta delete-account vía
// la Function y verifica la eliminación completa (datos + usuario de auth).
//
// NO forma parte del runtime de la app. NO se despliega. Solo herramienta de test.
//
// Requisitos para ejecutar:
//   1. wrangler pages dev public --port 8788   (levanta la Function; carga .env.local)
//   2. node scripts/e2e/delete-account.mjs
//
// Seguridad: usa SOLO el anon key (público). El service_role vive dentro de la
// Function (wrangler lo carga de .env.local); este script nunca lo toca.
// Los usuarios de prueba se autoeliminan por la propia Function (self-cleaning).
// ─────────────────────────────────────────────────────────────────────────────
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

config({ path: new URL('../../.env.local', import.meta.url) })

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const FN = process.env.E2E_FN_URL || 'http://127.0.0.1:8788/api/delete-account'

const email = `e2e-cf-${Date.now()}@tranquilo-e2e.test`
const password = 'E2e-Test-' + randomUUID().slice(0, 12)
const sb = createClient(SUPA_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })

const TABLES = ['pockets', 'monthly_records', 'users']
const countFor = async (uid) => {
  const out = {}
  for (const t of TABLES) {
    const col = t === 'users' ? 'id' : 'user_id'
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true }).eq(col, uid)
    out[t] = count ?? 0
  }
  return out
}

console.log('── E2E delete-account (Cloudflare Pages Function) ──\n')

// 1. Crear usuario
const { data: su, error: suErr } = await sb.auth.signUp({ email, password })
if (suErr) { console.error('❌ signUp:', suErr.message); process.exit(1) }
let session = su.session
if (!session) {
  const { data: si, error: siErr } = await sb.auth.signInWithPassword({ email, password })
  if (siErr || !si.session) { console.error('❌ Sin sesión (¿email confirmation ON?):', siErr?.message); process.exit(2) }
  session = si.session
}
const userId = session.user.id
const token = session.access_token
console.log('1. Usuario de prueba:', userId, `(${email})`)

// 2. Crear datos
const authed = createClient(SUPA_URL, ANON, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
})
// Crear la fila public.users primero (la FK de pockets/monthly_records la referencia).
// Replica lo que hace el signUp de la app (lib/auth.ts).
const us = await authed.from('users').insert([{ id: userId, email }])
if (us.error) console.log('   ⚠️ insert users:', us.error.message)
const pk = await authed.from('pockets').insert([
  { user_id: userId, pocket_id: 'mercado', name: 'Mercado', budget: 500000, icon: '🛒' },
  { user_id: userId, pocket_id: 'ahorro', name: 'Ahorro', budget: 300000, icon: '💰' },
])
if (pk.error) console.log('   ⚠️ insert pockets:', pk.error.message)
const mr = await authed.from('monthly_records').insert([
  { user_id: userId, month: '2026-07', income: 3000000, savings: 500000, pockets_data: '[]' },
])
if (mr.error) console.log('   ⚠️ insert monthly_records:', mr.error.message)
console.log('2. Datos creados (pockets, monthly_records, users)')

// 3. Estado ANTES
const before = await countFor(userId)
console.log('3. Filas ANTES del borrado:', JSON.stringify(before))

// 4. Ejecutar delete-account vía la Function
const res = await fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
const body = await res.json()
console.log(`4. delete-account → HTTP ${res.status} ${JSON.stringify(body)}`)

// 5. Estado DESPUÉS
const after = await countFor(userId)
console.log('5. Filas DESPUÉS del borrado:', JSON.stringify(after))

// 6. Verificar usuario de auth eliminado (re-login debe fallar)
const { data: relog, error: relogErr } = await sb.auth.signInWithPassword({ email, password })
const authDeleted = !!relogErr || !relog?.session
console.log('6. Re-login tras borrado:', authDeleted ? `✅ falla (auth eliminado): ${relogErr?.message}` : '❌ el usuario AÚN existe en auth')

// Resumen
const dataGone = Object.values(after).every((c) => c === 0)
const httpOk = res.status === 200 && body.success === true
console.log('\n── RESULTADO ──')
console.log('Datos eliminados por completo:', dataGone ? '✅' : '❌', JSON.stringify(after))
console.log('Usuario de auth eliminado:', authDeleted ? '✅' : '❌')
console.log('Respuesta HTTP == éxito:', httpOk ? '✅ 200 {success:true}' : `❌ ${res.status}`)
console.log(dataGone && authDeleted && httpOk ? '\n✅✅ E2E PASÓ' : '\n❌ E2E FALLÓ')
process.exit(dataGone && authDeleted && httpOk ? 0 : 3)
