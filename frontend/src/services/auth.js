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

console.log('[Auth] Auth service loaded')

const googleProvider = new GoogleAuthProvider()

// Check for redirect result on page load
export const checkRedirectResult = async () => {
	console.log('[Auth] Checking redirect result...')
	try {
		const result = await getRedirectResult(auth)
		console.log('[Auth] Redirect result:', result ? 'got user' : 'no result')
		if (result && result.user) {
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
		console.error('[Auth] Redirect result error:', error)
		return null
	}
}

// Use popup for a smoother and more reliable development authentication flow
export const signInWithGoogle = async () => {
	console.log('[Auth] signInWithGoogle - using popup')
	const result = await signInWithPopup(auth, googleProvider)
	const idToken = await result.user.getIdToken()
	return {
		uid: result.user.uid,
		email: result.user.email,
		name: result.user.displayName || result.user.email,
		picture: result.user.photoURL,
		idToken,
	}
}

export const signOutUser = async () => {
	console.log('[Auth] signOutUser called')
	await signOut(auth)
	console.log('[Auth] Signed out')
}

export const signUpWithEmail = async ({ name, email, password }) => {
	console.log('[Auth] signUpWithEmail called for:', email)
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
}

export const signInWithEmail = async ({ email, password }) => {
	console.log('[Auth] signInWithEmail called for:', email)
	const result = await signInWithEmailAndPassword(auth, email, password)
	const idToken = await result.user.getIdToken()
	return {
		uid: result.user.uid,
		email: result.user.email,
		name: result.user.displayName || result.user.email,
		picture: result.user.photoURL,
		idToken,
	}
}

export const updateDisplayName = async (displayName) => {
	console.log('[Auth] updateDisplayName called:', displayName)
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
