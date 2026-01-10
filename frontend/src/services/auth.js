import {
	createUserWithEmailAndPassword,
	GoogleAuthProvider,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut,
	updateProfile,
} from 'firebase/auth'
import { auth } from '../config/firebase'

const googleProvider = new GoogleAuthProvider()

// Simple Google sign-in with popup only
export const signInWithGoogle = async () => {
	const result = await signInWithPopup(auth, googleProvider)
	const idToken = await result.user.getIdToken()
	return {
		uid: result.user.uid,
		email: result.user.email,
		name: result.user.displayName,
		picture: result.user.photoURL,
		idToken,
	}
}

export const signOutUser = async () => {
	await signOut(auth)
}

export const signUpWithEmail = async ({ name, email, password }) => {
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
