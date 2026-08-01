import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

console.log('[Firebase] Loading firebase config...')

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

console.log('[Firebase] Config:', {
	apiKey: firebaseConfig.apiKey ? '***set***' : 'MISSING',
	authDomain: firebaseConfig.authDomain || 'MISSING',
	projectId: firebaseConfig.projectId || 'MISSING',
})

const app = initializeApp(firebaseConfig)
console.log('[Firebase] App initialized:', app.name)

const auth = getAuth(app)

// Connect to Auth Emulator in development if explicitly configured
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
	connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
	console.log('[Firebase] Connected to local Auth Emulator')
} else {
	console.log('[Firebase] Connected to live Firebase Auth')
}

console.log('[Firebase] Auth initialized, current user:', auth.currentUser?.email || 'none')

export { auth, app }