import {
	createUserWithEmailAndPassword,
	GoogleAuthProvider,
	signInWithEmailAndPassword,
	signInWithPopup,
	signInWithRedirect,
	getRedirectResult,
	signOut,
	updateProfile,
} from 'firebase/auth'
import { auth } from '../config/firebase'

const googleProvider = new GoogleAuthProvider()

// Check for redirect result on page load
export const checkRedirectResult = async () => {
	try {
		const result = await getRedirectResult(auth)
		if (result) {
			const idToken = await result.user.getIdToken()
			return {
				uid: result.user.uid,
				email: result.user.email,
				name: result.user.displayName,
				picture: result.user.photoURL,
				idToken,
			}
		}
		return null
	} catch (error) {
		console.error('Redirect result error:', error)
		return null
	}
}

export const signInWithGoogle = async () => {
	try {
		const result = await signInWithPopup(auth, googleProvider)
		const idToken = await result.user.getIdToken()
		return {
			uid: result.user.uid,
			email: result.user.email,
			name: result.user.displayName,
			picture: result.user.photoURL,
			idToken,
		}
	} catch (error) {
		// Downgrade noisy popup errors and fall back to redirect
		if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
			console.info('Popup sign-in interrupted; falling back to redirect flow.')
			await signInWithRedirect(auth, googleProvider)
			return null
		}

		console.error('Google sign-in error:', error.code, error.message)
		const err = new Error(error.message || 'Sign-in failed')
		err.code = error.code
		throw err
	}
}

export const signOutUser = async () => {
	try {
		await signOut(auth)
	} catch (error) {
		throw new Error(error.message || 'Sign-out failed')
	}
}

export const signUpWithEmail = async ({ name, email, password }) => {
	try {
		const result = await createUserWithEmailAndPassword(auth, email, password)
		if (name) {
			await updateProfile(result.user, { displayName: name })
		}
		const idToken = await result.user.getIdToken()
		return {
			uid: result.user.uid,
			email: result.user.email,
			name: result.user.displayName || name || result.user.email,
			picture: result.user.photoURL,
			idToken,
		}
	} catch (error) {
		throw new Error(error.message || 'Sign-up failed')
	}
}

export const signInWithEmail = async ({ email, password }) => {
	try {
		const result = await signInWithEmailAndPassword(auth, email, password)
		const idToken = await result.user.getIdToken()
		return {
			uid: result.user.uid,
			email: result.user.email,
			name: result.user.displayName || result.user.email,
			picture: result.user.photoURL,
			idToken,
		}
	} catch (error) {
		throw new Error(error.message || 'Sign-in failed')
	}
}

export const updateDisplayName = async (displayName) => {
	if (!auth.currentUser) {
		throw new Error('Not authenticated')
	}
	await updateProfile(auth.currentUser, { displayName })
	return {
		name: auth.currentUser.displayName,
		email: auth.currentUser.email,
		picture: auth.currentUser.photoURL,
		uid: auth.currentUser.uid,
	}
}

export const verifyTokenWithBackend = async (idToken) => {
	const response = await fetch('http://localhost:9000/auth/login', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ idToken }),
	})
	if (!response.ok) {
		throw new Error('Token verification failed')
	}
	return response.json()
}
