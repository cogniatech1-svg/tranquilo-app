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
    // Si el usuario acaba de iniciar un OAuth fresco (toque en "Sign in with Google"),
    // signInWithGoogle() habrá puesto esta bandera. En ese caso, siempre procesamos
    // el callback normalmente, ignorando explicitly_signed_out.
    const freshOAuth =
      typeof window !== 'undefined' && localStorage.getItem('signing_in_with_google') === '1'

    if (freshOAuth) {
      localStorage.removeItem('signing_in_with_google')
      localStorage.removeItem('explicitly_signed_out')
      supabase.auth.getSession().then(() => {
        router.replace('/')
      })
      return
    }

    // Si el usuario cerró sesión explícitamente Y esto no es un OAuth fresco,
    // es un pending intent de Android reproduciendo un token antiguo.
    // Forzamos signOut() para destruir la sesión creada por ese token.
    const explicitlySignedOut =
      typeof window !== 'undefined' && localStorage.getItem('explicitly_signed_out') === '1'

    if (explicitlySignedOut) {
      supabase.auth.signOut().finally(() => {
        router.replace('/')
      })
      return
    }

    // Flujo normal: getSession() detecta el #access_token y lo guarda.
    supabase.auth.getSession().then(() => {
      router.replace('/')
    })
  }, [router])

  return null
}
