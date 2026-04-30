import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Unsubscribe,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    const userId = user.uid

    // Migrate any existing local data to this user's Firestore namespace
    await migrateLocalDataToUser(userId)

    // Create user document in Firestore
    const userDocRef = doc(db, 'users', userId, 'data', 'main')
    const localData = localStorage.getItem(STORAGE_KEY)
    const dataToMigrate: StoredData = localData ? JSON.parse(localData) : {}

    // Remove undefined values before saving
    const cleanedData = cleanUndefined(dataToMigrate)

    await setDoc(userDocRef, cleanedData, { merge: true })

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
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
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
    await signOut(auth)
    // Clear user data from localStorage but keep config
    localStorage.removeItem(STORAGE_KEY)
    const userId = auth.currentUser?.uid
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
  return onAuthStateChanged(auth, callback)
}

/**
 * Get current user synchronously (if available)
 * Returns null if not logged in
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser
}

/**
 * Migrate local data (from Phase 1) to user's Firestore namespace
 * This happens automatically on signup
 */
async function migrateLocalDataToUser(userId: string): Promise<void> {
  try {
    const localData = localStorage.getItem(STORAGE_KEY)
    if (!localData) {
      console.log('No local data to migrate')
      return
    }

    const parsedData = JSON.parse(localData) as StoredData
    const userDataRef = doc(db, 'users', userId, 'data', 'main')

    // Save to user's namespace
    const cleanedData = cleanUndefined(parsedData)
    await setDoc(userDataRef, cleanedData, { merge: true })

    // Change localStorage key to user-specific key
    localStorage.setItem(`tranquilo_v1_${userId}`, JSON.stringify(parsedData))
    localStorage.setItem(`${MIGRATION_FLAG}_${userId}`, 'true')

    console.log('Data migrated to user namespace:', userId)
  } catch (error) {
    console.error('Error migrating data:', error)
    // Don't throw - migration failure shouldn't break signup
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
