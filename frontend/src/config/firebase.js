import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

console.log('[Firebase] Loading firebase config...')

const hasEnvKeys = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== '***set***'

const firebaseConfig = hasEnvKeys ? {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
} : {
	// Fallback dummy config to prevent React crash on Vercel when keys are not set
	apiKey: "dummy-api-key-for-landing-page-fallback",
	authDomain: "dummy-project.firebaseapp.com",
	projectId: "dummy-project",
	storageBucket: "dummy-project.appspot.com",
	messagingSenderId: "1234567890",
	appId: "1:1234567890:web:dummy"
}

console.log('[Firebase] Config:', {
	apiKey: hasEnvKeys ? '***set***' : 'FALLBACK_DUMMY',
	authDomain: firebaseConfig.authDomain || 'MISSING',
	projectId: firebaseConfig.projectId || 'MISSING',
})

const app = initializeApp(firebaseConfig)
console.log('[Firebase] App initialized:', app.name)

const auth = getAuth(app)

// Connect to Auth Emulator in development if explicitly configured
if (hasEnvKeys && import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
	connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
	console.log('[Firebase] Connected to local Auth Emulator')
} else {
	console.log('[Firebase] Connected to live Firebase Auth')
}

console.log('[Firebase] Auth initialized, current user:', auth.currentUser?.email || 'none')

export { auth, app }