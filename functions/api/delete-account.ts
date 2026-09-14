/**
 * Cloudflare Pages Function — POST /api/delete-account
 * ----------------------------------------------------
 * Port 1:1 de app/api/delete-account/route.ts para el runtime de Cloudflare Pages.
 * La LÓGICA es idéntica (misma secuencia, mismos `failedStep`, mismos códigos de
 * estado). Solo cambia lo específico del framework:
 *   • NextRequest/NextResponse  →  Request/Response (Web API, Workers)
 *   • process.env.*             →  context.env.*    (bindings de la Function)
 *   • export async function POST → export const onRequestPost
 *
 * Seguridad (idéntica al route.ts):
 *   • userId se deriva EXCLUSIVAMENTE del JWT validado — nunca del body.
 *   • SUPABASE_SERVICE_ROLE_KEY solo se usa aquí (servidor) — jamás en cliente.
 *   • Fail-fast: si cualquier paso falla, se detiene y devuelve { failedStep }.
 *
 * Orden de eliminación aprobado:
 *   expenses → extra_incomes → concept_map → learned_category_map →
 *   monthly_records → pockets → users → auth.users
 */

import { createClient } from '@supabase/supabase-js'

// ── Bindings de entorno de la Function ───────────────────────────────────────
interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

// ── Tipos ────────────────────────────────────────────────────────────────────
type DeleteResponse = { success: true } | { success: false; failedStep: string }

// ── Pasos de borrado (tablas financieras + perfil) ───────────────────────────
// Cada entrada: [nombre del paso, tabla, columna de filtro]
const TABLE_STEPS: Array<[step: string, table: string, column: string]> = [
  ['delete_expenses', 'expenses', 'user_id'],
  ['delete_extra_incomes', 'extra_incomes', 'user_id'],
  ['delete_concept_map', 'concept_map', 'user_id'],
  ['delete_learned_category_map', 'learned_category_map', 'user_id'],
  ['delete_monthly_records', 'monthly_records', 'user_id'],
  ['delete_pockets', 'pockets', 'user_id'],
  // public.users usa 'id' como PK (no 'user_id')
  ['delete_users', 'users', 'id'],
]

// Helper de respuesta JSON (equivalente a NextResponse.json).
function json(body: DeleteResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Handler principal ─────────────────────────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // ── 1. Extraer token del header Authorization ──────────────────────────────
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ success: false, failedStep: 'auth_missing_token' }, 401)
  }
  const token = authHeader.slice(7) // quitar "Bearer "

  // ── 2. Verificar config del servidor ──────────────────────────────────────
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('[delete-account] Faltan variables de entorno del servidor')
    return json({ success: false, failedStep: 'server_missing_config' }, 500)
  }

  // ── 3. Validar token → obtener userId ────────────────────────────────────
  // Se usa el anon key para verificar el JWT del usuario (no bypasea RLS).
  // userId se deriva EXCLUSIVAMENTE del token validado.
  const supabaseVerify = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const {
    data: { user },
    error: authError,
  } = await supabaseVerify.auth.getUser(token)

  if (authError || !user) {
    return json({ success: false, failedStep: 'auth_invalid_token' }, 401)
  }

  const userId = user.id

  // ── 4. Cliente admin (service_role) — solo para borrado ──────────────────
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 5. Borrado secuencial de tablas (fail-fast) ───────────────────────────
  for (const [step, table, column] of TABLE_STEPS) {
    const { error } = await supabaseAdmin.from(table).delete().eq(column, userId)
    if (error) {
      console.error(`[delete-account] Falló paso ${step}:`, error.message)
      return json({ success: false, failedStep: step }, 500)
    }
  }

  // ── 6. Eliminar usuario de auth.users ─────────────────────────────────────
  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (deleteAuthError) {
    // 404 / "not found" → cuenta ya eliminada → idempotente, continuar
    const isNotFound =
      deleteAuthError.message?.toLowerCase().includes('not found') ||
      (deleteAuthError as { status?: number }).status === 404
    if (!isNotFound) {
      console.error('[delete-account] Falló delete_auth_user:', deleteAuthError.message)
      return json({ success: false, failedStep: 'delete_auth_user' }, 500)
    }
  }

  // ── 7. Éxito ──────────────────────────────────────────────────────────────
  return json({ success: true }, 200)
}
