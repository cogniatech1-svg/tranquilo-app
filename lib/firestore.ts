import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { StoredData } from './types'

const STORAGE_KEY = 'tranquilo_v1'
const FIRESTORE_COLLECTION = 'shared_data'
const FIRESTORE_DOC_ID = 'main' // Single document for Phase 1, will be per-user after Phase 2 auth

/**
 * Merge strategy: Keep all data from both sources WITHOUT duplicates
 * - For monthlyHistory, merge months and deduplicate expenses by ID
 * - Cloud version takes precedence for metadata, local for recent edits
 */
function mergeLocalAndCloud(local: StoredData, cloud: StoredData): StoredData {
  // Merge monthlyHistory with deduplication
  const mergedHistory: Record<string, any> = {}

  // First add all cloud months
  if (cloud.monthlyHistory) {
    for (const [month, record] of Object.entries(cloud.monthlyHistory)) {
      mergedHistory[month] = { ...record }
    }
  }

  // Then merge local months (overwriting cloud, but deduplicating expenses)
  if (local.monthlyHistory) {
    for (const [month, localRecord] of Object.entries(local.monthlyHistory)) {
      const cloudRecord = mergedHistory[month]

      if (cloudRecord) {
        // Deduplicate expenses by ID
        const expenseMap = new Map()

        // Add cloud expenses first
        if (cloudRecord.expenses) {
          for (const exp of cloudRecord.expenses) {
            expenseMap.set(exp.id, exp)
          }
        }

        // Override with local expenses (local is more recent)
        if (localRecord.expenses) {
          for (const exp of localRecord.expenses) {
            expenseMap.set(exp.id, exp)
          }
        }

        // Do the same for extraIncomes
        const incomeMap = new Map()
        if (cloudRecord.extraIncomes) {
          for (const inc of cloudRecord.extraIncomes) {
            incomeMap.set(inc.id, inc)
          }
        }
        if (localRecord.extraIncomes) {
          for (const inc of localRecord.extraIncomes) {
            incomeMap.set(inc.id, inc)
          }
        }

        // Update the merged record
        mergedHistory[month] = {
          ...cloudRecord,
          ...localRecord,
          expenses: Array.from(expenseMap.values()),
          extraIncomes: Array.from(incomeMap.values()),
        }
      } else {
        // No cloud record for this month, use local
        mergedHistory[month] = localRecord
      }
    }
  }

  return {
    ...local,
    ...cloud,
    monthlyHistory: mergedHistory,
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

/**
 * Save data to Firestore with error handling
 * Saves to localStorage FIRST (synchronously), then Firestore (async)
 */
export async function saveToFirestore(data: StoredData): Promise<void> {
  try {
    // Always save to localStorage first (immediate)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

    // Then save to Firestore (background, non-blocking)
    // Remove undefined values first (Firestore doesn't accept them)
    const cleanedData = cleanUndefined(data)
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID)
    await setDoc(docRef, cleanedData, { merge: true })
  } catch (error) {
    console.error('Error saving to Firestore:', error)
    // Data is safe in localStorage, Firestore error won't block the app
  }
}

/**
 * Load data from Firestore with fallback to localStorage
 * Returns localStorage immediately, updates from Firestore in background
 * Has a 3-second timeout to avoid blocking the app
 */
export async function loadFromFirestore(): Promise<StoredData | null> {
  try {
    // Load from localStorage first (always available)
    const localData = localStorage.getItem(STORAGE_KEY)
    const localParsed = localData ? JSON.parse(localData) : null

    // Try to load from Firestore in background with timeout
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID)

    // Create a promise with timeout
    const firestorePromise = getDoc(docRef)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timeout')), 3000)
    )

    try {
      const snapshot = await Promise.race([firestorePromise, timeoutPromise]) as any

      if (snapshot.exists()) {
        const cloudData = snapshot.data() as StoredData

        // Merge if both exist
        if (localParsed) {
          return mergeLocalAndCloud(localParsed, cloudData)
        }

        // Use cloud data if local doesn't exist
        return cloudData
      }

      // Return local data if cloud doesn't exist
      return localParsed
    } catch (timeoutError) {
      // Timeout or other error - use localStorage
      return localParsed
    }
  } catch (error) {
    console.error('Error loading from Firestore, using localStorage:', error)
    // Fall back to localStorage
    const localData = localStorage.getItem(STORAGE_KEY)
    return localData ? JSON.parse(localData) : null
  }
}

/**
 * Subscribe to real-time updates from Firestore
 * Merges cloud data with local on every update
 * Returns unsubscribe function
 */
export function subscribeToFirestore(
  onUpdate: (data: StoredData) => void
): Unsubscribe {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID)

    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudData = snapshot.data() as StoredData

        // Get current local data
        const localData = localStorage.getItem(STORAGE_KEY)
        const localParsed = localData ? JSON.parse(localData) : null

        // Merge and call update callback
        const mergedData = localParsed
          ? mergeLocalAndCloud(localParsed, cloudData)
          : cloudData

        // Update localStorage with merged data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData))

        // Notify app of update
        onUpdate(mergedData)
      }
    })
  } catch (error) {
    console.error('Error subscribing to Firestore:', error)
    // Return dummy unsubscribe function if subscription fails
    return () => {}
  }
}
