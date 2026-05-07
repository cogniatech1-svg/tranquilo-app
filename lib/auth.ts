import { supabase } from './supabase'

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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    throw new Error(`Sign up failed: ${error.message}`)
  }

  if (!data.user) {
    throw new Error('Sign up failed: No user returned')
  }

  const userId = data.user.id

  // Create user profile in users table
  const { error: insertError } = await supabase.from('users').insert({
    id: userId,
    email: data.user.email,
  })

  if (insertError) {
    console.error('Error creating user profile:', insertError)
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(`Login failed: ${error.message}`)
  }

  if (!data.user) {
    throw new Error('Login failed: No user returned')
  }

  return {
    uid: data.user.id,
    email: data.user.email || '',
  }
}

/**
 * Log out current user
 */
export async function logOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(`Logout failed: ${error.message}`)
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
export function onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      callback({
        uid: session.user.id,
        email: session.user.email || '',
      })
    } else {
      callback(null)
    }
  })

  return () => {
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
  const storedGuestId = localStorage.getItem('guest_id')

  if (storedGuestId) {
    return storedGuestId
  }

  // 3. Crear nuevo guest
  const newGuestId = generateGuestUserId()

  localStorage.setItem('guest_id', newGuestId)

  return newGuestId
}
