'use client'

/**
 * app/auth/callback/page.tsx
 *
 * Ruta intermedia para el redirect de Google OAuth.
 *
 * Flujo:
 *   Google → Supabase → /auth/callback#access_token=... → /
 *
 * Supabase JS detecta el fragmento #access_token automáticamente al inicializar
 * el cliente. Esta página solo existe para que el intent de Android quede
 * consumido en una ruta dedicada, evitando que la PWA se reabra sola después
 * de cerrarla. Una vez que Supabase procesa el token, redirige a la raíz donde
 * el listener de auth en page.tsx maneja la navegación final.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Supabase ya procesó el #access_token del fragmento durante la inicialización
    // del cliente (síncrono, antes de este useEffect). Redirigimos a raíz para que
    // el listener de onAuthStateChanged en page.tsx maneje la navegación final.
    router.replace('/')
  }, [router])

  return null
}
