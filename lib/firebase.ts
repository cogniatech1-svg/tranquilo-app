import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Singleton pattern - only initialize once on client side
let firebaseApp: any = null
let firebaseDb: any = null
let firebaseAuth: any = null
let initialized = false

function ensureFirebaseInitialized() {
  // Only run on client side
  if (typeof window === 'undefined') {
    return
  }

  // Only initialize once
  if (initialized) {
    return
  }

  try {
    initialized = true
    firebaseApp = initializeApp(firebaseConfig)
    firebaseDb = getFirestore(firebaseApp)
    firebaseAuth = getAuth(firebaseApp)

    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase initialized successfully')
    }
  } catch (error) {
    console.warn('Firebase initialization error:', error)
    initialized = false
  }
}

// Initialize on first import if on client
if (typeof window !== 'undefined') {
  ensureFirebaseInitialized()
}

// Getters that ensure Firebase is initialized before use
export function getApp() {
  ensureFirebaseInitialized()
  return firebaseApp
}

export function getDb() {
  ensureFirebaseInitialized()
  return firebaseDb
}

export function getAuth_() {
  ensureFirebaseInitialized()
  return firebaseAuth
}

// For backward compatibility, also export direct references
export const app = firebaseApp
export const db = firebaseDb
export const auth = firebaseAuth
