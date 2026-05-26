import { supabase } from './supabase'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import { logger } from './logger'
import { STORAGE_KEYS, storageGet, storageSet, storageRemove } from './storage'

export interface AuthUser {
  uid: string
  email: string
}

/**
 * Sign up a new user with email and password
 * Creates a user in Supabase Auth + users table
 * Initializes localStorage with 8 pockets + 5M income
 */
export async function signUp(email: string, password: string): Promise<AuthUser> {
  logger.debug(`[Auth.signUp] 📝 Attempting signup for: ${email}`)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    logger.error(`[Auth.signUp] ❌ Signup failed:`, error)
    throw new Error(`Sign up failed: ${error.message}`)
  }

  if (!data.user) {
    logger.error(`[Auth.signUp] ❌ No user returned from Supabase`)
    throw new Error('Sign up failed: No user returned')
  }

  const userId = data.user.id
  logger.debug(`[Auth.signUp] ✅ Signup successful for: ${data.user.email} (${userId})`)

  // Create user profile in users table
  const { error: insertError } = await supabase.from('users').insert({
    id: userId,
    email: data.user.email,
  })

  if (insertError) {
    logger.error('[Auth.signUp] ⚠️ Error creating user profile:', insertError)
  } else {
    logger.debug(`[Auth.signUp] ✅ User profile created in database`)
  }

  return {
    uid: userId,
    email: data.user.email || '',
  }
}

/**
 * Log in with email and password
 */
export async function logIn(email: string, password: string): Promise<AuthUser> {
  logger.debug(`[Auth.logIn] 🔐 Attempting login for: ${email}`)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    logger.error(`[Auth.logIn] ❌ Login failed:`, error)
    throw new Error(`Login failed: ${error.message}`)
  }

  if (!data.user) {
    logger.error(`[Auth.logIn] ❌ No user returned from Supabase`)
    throw new Error('Login failed: No user returned')
  }

  logger.debug(`[Auth.logIn] ✅ Login successful for: ${data.user.email} (${data.user.id})`)
  return {
    uid: data.user.id,
    email: data.user.email || '',
  }
}

/**
 * Log out current user
 */
export async function logOut(): Promise<void> {
  if (typeof window !== 'undefined') {
    // Marcar cierre de sesión explícito para bloquear el pending intent de Android.
    storageSet(STORAGE_KEYS.EXPLICITLY_SIGNED_OUT, '1')

    // Pre-establecer un guest_id nuevo ANTES del signOut.
    // Sin esto, la lógica de recuperación de ID en page.tsx busca claves
    // tranquilo_v1_<UUID> en localStorage, encuentra la del usuario autenticado
    // y la reutiliza como guestUserId, cargando todos sus datos sin sesión activa.
    storageSet(STORAGE_KEYS.GUEST_ID, generateGuestUserId())
  }
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(`Logout failed: ${error.message}`)
  }
}

/**
 * Send password reset email
 * Works for any registered email, including Google OAuth accounts
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  // Hardcoded para evitar mismatch con la lista de allowed redirect URLs de Supabase.
  // En localhost se usa el origen dinámico; en producción siempre la URL canónica.
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const redirectTo = isLocalhost
    ? `${window.location.origin}/reset-password`
    : 'https://tranquilo-app-git-main-giannuzzos-projects.vercel.app/reset-password'
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) {
    throw new Error(`Reset failed: ${error.message}`)
  }
}

/**
 * Update the current user's password (used after clicking a reset link)
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    throw new Error(`Password update failed: ${error.message}`)
  }
}

/**
 * Sign in with Google OAuth
 * Redirects to Google — la navegación post-auth la maneja onAuthStateChanged en page.tsx
 */
export async function signInWithGoogle(): Promise<void> {
  // El usuario inicia un login nuevo — marcar el intento Y limpiar el cierre explícito.
  // La bandera signing_in_with_google sobrevive la redirección a Google y permite
  // que /auth/callback distinga un OAuth fresco de un pending intent de Android.
  if (typeof window !== 'undefined') {
    storageSet(STORAGE_KEYS.SIGNING_IN_WITH_GOOGLE, '1')
    storageRemove(STORAGE_KEYS.EXPLICITLY_SIGNED_OUT)
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo:
        typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
    },
  })

  if (error) {
    throw new Error(`Google sign-in failed: ${error.message}`)
  }
}

/**
 * Get current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return {
    uid: user.id,
    email: user.email || '',
  }
}

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function onAuthStateChanged(
  callback: (event: AuthChangeEvent, user: AuthUser | null) => void
): () => void {
  logger.debug('[Supabase Auth] 🔗 Setting up onAuthStateChange listener...')

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    logger.debug(
      `[Supabase Auth] 🔔 Auth event fired: event=${event}, hasSession=${!!session}, user=${session?.user?.email || 'none'}`
    )

    if (session?.user) {
      logger.debug(`[Supabase Auth] ✅ User detected: ${session.user.email} (${session.user.id})`)
      callback(event, {
        uid: session.user.id,
        email: session.user.email || '',
      })
    } else {
      logger.debug(`[Supabase Auth] ❌ No user in session`)
      callback(event, null)
    }
  })

  logger.debug('[Supabase Auth] ✅ Listener registered')

  return () => {
    logger.debug('[Supabase Auth] 🛑 Unsubscribing from auth events')
    subscription?.unsubscribe()
  }
}

/**
 * Generate a unique guest user ID as a valid UUID v4
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is any hex digit and y is 8, 9, A, or B
 */
export function generateGuestUserId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Require a valid user ID (authenticated or guest)
 * Guarantees to return a non-null string.
 *
 * Priority:
 * 1. Currently authenticated user ID
 * 2. Existing guest ID from localStorage
 * 3. Generate new guest ID
 */
export async function requireUserId(): Promise<string> {
  // 1. Usuario autenticado
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const authUserId = session?.user?.id

  if (authUserId) {
    return authUserId
  }

  // 2. Guest existente
  const storedGuestId = storageGet(STORAGE_KEYS.GUEST_ID)

  if (storedGuestId) {
    return storedGuestId
  }

  // 3. Crear nuevo guest
  const newGuestId = generateGuestUserId()

  storageSet(STORAGE_KEYS.GUEST_ID, newGuestId)

  return newGuestId
}
