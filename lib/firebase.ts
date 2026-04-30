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

// Lazy initialization - only on client side
let initialized = false
let app: any = {}
let db: any = {}
let auth: any = {}

const initializeFirebase = () => {
  if (initialized || typeof window === 'undefined') {
    return
  }

  try {
    initialized = true
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)

    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase initialized:', {
        apiKey: firebaseConfig.apiKey ? '***hidden***' : 'MISSING',
        projectId: firebaseConfig.projectId,
      })
    }
  } catch (error) {
    console.warn('Firebase initialization error:', error)
    // Keep dummy objects to prevent runtime errors
  }
}

// Initialize immediately if on client side
if (typeof window !== 'undefined') {
  initializeFirebase()
}

export { app, db, auth, initializeFirebase }
