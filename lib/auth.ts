import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Unsubscribe,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { getAuth_, getDb } from './firebase'
import { StoredData } from './types'

const STORAGE_KEY = 'tranquilo_v1'
const MIGRATION_FLAG = 'migration_completed'

/**
 * Sign up a new user with email and password
 * Creates user in Firebase Auth and migrates local data to Firestore
 */
export async function signUp(email: string, password: string): Promise<FirebaseUser> {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(getAuth_(), email, password)
    const user = userCredential.user
    const userId = user.uid

    // Migrate any existing local data to this user's Firestore namespace
    await migrateLocalDataToUser(userId)

    // Create user document in Firestore
    const userDocRef = doc(getDb(), 'users', userId, 'data', 'main')
    const userKey = `tranquilo_v1_${userId}`
    const localData = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_KEY)
    const dataToMigrate: StoredData = localData ? JSON.parse(localData) : {}

    // Remove undefined values before saving
    const cleanedData = cleanUndefined(dataToMigrate)

    console.log("USER KEY:", userKey)
    console.log("DATA USER:", localStorage.getItem(userKey))
    console.log("DATA LEGACY:", localStorage.getItem(STORAGE_KEY))
    console.log("DATA TO FIRESTORE:", cleanedData)

    if (
      !cleanedData ||
      (cleanedData.expenses?.length === 0 &&
        cleanedData.monthlyIncome === 0)
    ) {
      console.warn("Skipping Firestore save: data is empty")
    } else {
      await setDoc(userDocRef, cleanedData, { merge: true })
    }

    // Mark migration as complete
    localStorage.setItem(`${MIGRATION_FLAG}_${userId}`, 'true')

    console.log('User signed up and data migrated:', userId)
    return user
  } catch (error) {
    console.error('Error signing up:', error)
    throw error
  }
}

/**
 * Log in an existing user with email and password
 */
export async function logIn(email: string, password: string): Promise<FirebaseUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(getAuth_(), email, password)
    console.log('User logged in:', userCredential.user.uid)
    return userCredential.user
  } catch (error) {
    console.error('Error logging in:', error)
    throw error
  }
}

/**
 * Log out the current user
 * Clears user data from localStorage but keeps config
 */
export async function logOut(): Promise<void> {
  try {
    await signOut(getAuth_())
    // Clear user data from localStorage but keep config
    const userId = getAuth_().currentUser?.uid
    if (userId) {
      localStorage.removeItem(`tranquilo_v1_${userId}`)
      localStorage.removeItem(`${MIGRATION_FLAG}_${userId}`)
    }
    console.log('User logged out')
  } catch (error) {
    console.error('Error logging out:', error)
    throw error
  }
}

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(getAuth_(), callback)
}

/**
 * Get current user synchronously (if available)
 * Returns null if not logged in
 */
export function getCurrentUser(): FirebaseUser | null {
  return getAuth_().currentUser
}

/**
 * Migrate local data (from Phase 1) to user's Firestore namespace
 * SIMPLE AND CORRECT:
 * - Only run if user data doesn't exist
 * - Never overwrite existing user data
 * - Don't delete legacy data
 */
export async function migrateLocalDataToUser(userId: string): Promise<void> {
  const userKey = `tranquilo_v1_${userId}`
  const existingUserData = localStorage.getItem(userKey)

  // ❌ Already has data → DO NOT TOUCH
  if (existingUserData) {
    console.log('[migrate] User already has data, skipping migration')
    return
  }

  const legacyData = localStorage.getItem(STORAGE_KEY)

  if (!legacyData) {
    console.log('[migrate] No legacy data to migrate')
    return
  }

  console.log('[migrate] ✅ Migrating legacy data to user:', userId)

  localStorage.setItem(userKey, legacyData)
}

/**
 * Remove undefined values recursively (Firestore doesn't accept undefined)
 */
function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined)
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value)
      }
    }
    return cleaned
  }
  return obj
}
