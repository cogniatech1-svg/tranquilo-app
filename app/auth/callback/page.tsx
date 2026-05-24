'use client'

/**
 * app/auth/callback/page.tsx
 *
 * Ruta intermedia para el redirect de Google OAuth.
 *
 * Flujo:
 *   Google → Supabase → /auth/callback#access_token=... → /
 *
 * getSession() fuerza a Supabase a detectar y guardar el token del fragmento
 * #access_token antes de redirigir a raíz. Sin este paso, el fragmento se
 * perdería en la navegación y el usuario vería la pantalla de login.
 * Una vez guardada la sesión en localStorage, el listener de auth en page.tsx
 * detecta el usuario y maneja la navegación final.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Si el usuario cerró sesión explícitamente, ignorar el token del callback.
    // Esto evita que el pending intent de Android vuelva a autenticar al usuario
    // cuando reinicia la PWA después de cerrar sesión.
    const explicitlySignedOut =
      typeof window !== 'undefined' && localStorage.getItem('explicitly_signed_out') === '1'

    if (explicitlySignedOut) {
      router.replace('/')
      return
    }

    // getSession() detecta el #access_token del fragmento y lo guarda en
    // localStorage. Solo después redirigimos a raíz para no perder el token.
    supabase.auth.getSession().then(() => {
      router.replace('/')
    })
  }, [router])

  return null
}
