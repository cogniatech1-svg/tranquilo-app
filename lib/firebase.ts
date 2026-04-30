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

// Initialize Firebase
let app: any
let db: any
let auth: any

try {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
} catch (error) {
  console.warn('Firebase initialization error:', error)
  // If initialization fails, create dummy objects to prevent runtime errors
  app = {}
  db = {}
  auth = {}
}

export { app, db, auth }
