import { supabase } from './supabase'
import { saveInitializedUserData, markOnboardingComplete } from './initializeUserData'

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

  // Initialize user data with 8 pockets + 5M income
  // This preconfigures the user's financial data
  saveInitializedUserData(userId, 5000000)

  // Mark onboarding as complete so user goes to main app
  markOnboardingComplete(userId)

  console.log('[signUp] ✅ User created and data initialized:', userId)

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
export function onAuthStateChanged(
  callback: (user: AuthUser | null) => void,
): () => void {
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
 * Generate a unique guest user ID
 * Format: guest_{timestamp}_{randomString}
 */
export function generateGuestUserId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
}
