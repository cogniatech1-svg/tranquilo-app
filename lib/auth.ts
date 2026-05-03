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
import { migrateToMonthlyHistory } from './migrations'

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

    // Migrate guest data to user's scoped storage
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
    const userId = userCredential.user.uid

    // Migrate guest data to user's scoped storage
    await migrateLocalDataToUser(userId)

    console.log('User logged in:', userId)
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
 * Migrate guest data to user's scoped storage
 * - Validate that user doesn't already have real data
 * - If no guest data → skip
 * - If guest data exists → transform structure and save to user key
 */
export async function migrateLocalDataToUser(userId: string): Promise<void> {
  const guestKey = 'tranquilo_v1'
  const userKey = `tranquilo_v1_${userId}`

  const guestRaw = localStorage.getItem(guestKey)
  const userRaw = localStorage.getItem(userKey)

  // 1. Validate if user already has real data
  let userData = null

  if (userRaw) {
    try {
      userData = JSON.parse(userRaw)
    } catch {
      userData = null
    }
  }

  // Solo saltar si tiene datos REALES (no solo estructura vacía)
  if (userData && Object.keys(userData).length > 0) {
    // Verificar si hay datos reales: expenses array con items, o monthlyHistory con meses
    const hasRealExpenses = userData.expenses && Array.isArray(userData.expenses) && userData.expenses.length > 0
    const hasRealMonthlyHistory = userData.monthlyHistory && Object.keys(userData.monthlyHistory).length > 0
    const hasRealIncomes = userData.extraIncomes && Array.isArray(userData.extraIncomes) && userData.extraIncomes.length > 0

    if (hasRealExpenses || hasRealMonthlyHistory || hasRealIncomes) {
      console.log('[migration] User already has valid data, skipping')
      return
    }

    console.log('[migration] User has empty structure, will migrate guest data')
  }

  // 2. Si no hay datos guest → no hay nada que migrar
  if (!guestRaw) {
    console.log('[migration] No guest data found')
    return
  }

  try {
    const parsed = JSON.parse(guestRaw)

    // 3. Transformar estructura (usar función pura)
    const migrated = migrateToMonthlyHistory(parsed)

    // 4. Guardar en la clave del usuario
    localStorage.setItem(userKey, JSON.stringify(migrated))

    // 5. Eliminar datos guest INMEDIATAMENTE (muy importante - no permitir ambas keys)
    localStorage.removeItem(guestKey)
    console.log('[migration] cleaned guest data')

    console.log('[migration] Guest data migrated successfully')
  } catch (error) {
    console.error('[migration] Error parsing guest data:', error)
  }
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
