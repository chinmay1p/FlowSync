import { create } from 'zustand'
import {
	signInWithEmail as signInWithEmailApi,
	signInWithGoogle as signInWithGoogleApi,
	signOutUser as signOutUserApi,
	signUpWithEmail as signUpWithEmailApi,
	updateDisplayName as updateDisplayNameApi,
	checkRedirectResult,
} from '../services/auth'

console.log('[AuthStore] Store loaded')

const formatUser = (payload) => ({
	uid: payload.uid,
	name: payload.name || payload.email,
	email: payload.email,
	picture: payload.picture || '',
})

const useAuthStore = create((set, get) => ({
	user: null,
	idToken: null,
	loading: false,
	error: null,

	// Set user from Firebase auth state change
	setFromFirebase: (payload) => {
		console.log('[AuthStore] setFromFirebase called:', payload ? payload.email : 'null')
		if (!payload) {
			set({ user: null, idToken: null, loading: false, error: null })
			return
		}
		const { uid, email, displayName, photoURL, idToken } = payload
		set({
			user: formatUser({ uid, email, name: displayName, picture: photoURL }),
			idToken,
			loading: false,
			error: null,
		})
	},

	// Check for redirect result (after Google redirect)
	checkRedirect: async () => {
		console.log('[AuthStore] checkRedirect called')
		try {
			const userData = await checkRedirectResult()
			if (userData) {
				console.log('[AuthStore] Got user from redirect:', userData.email)
				set({
					user: formatUser(userData),
					idToken: userData.idToken,
					loading: false,
					error: null,
				})
				return true
			}
			console.log('[AuthStore] No redirect result')
			return false
		} catch (err) {
			console.error('[AuthStore] checkRedirect error:', err)
			return false
		}
	},

	// Google sign-in (uses popup)
	loginWithGoogle: async () => {
		console.log('[AuthStore] loginWithGoogle called')
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signInWithGoogleApi()
			set({
				user: formatUser(userData),
				idToken: userData.idToken,
				loading: false,
				error: null,
			})
		} catch (err) {
			console.error('[AuthStore] loginWithGoogle error:', err)
			set({ error: err.message || 'Login failed', loading: false })
		}
	},

	// Email sign-in
	signInWithEmail: async (email, password) => {
		console.log('[AuthStore] signInWithEmail called')
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signInWithEmailApi({ email: email.trim(), password })
			set({
				user: formatUser(userData),
				idToken: userData.idToken,
				loading: false,
				error: null,
			})
		} catch (err) {
			console.error('[AuthStore] signInWithEmail error:', err.message)
			set({ error: err.message || 'Login failed', loading: false })
		}
	},

	// Email sign-up
	signUpWithEmail: async ({ name, email, password }) => {
		console.log('[AuthStore] signUpWithEmail called')
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signUpWithEmailApi({ name: name.trim(), email: email.trim(), password })
			set({
				user: formatUser(userData),
				idToken: userData.idToken,
				loading: false,
				error: null,
			})
		} catch (err) {
			console.error('[AuthStore] signUpWithEmail error:', err.message)
			set({ error: err.message || 'Sign-up failed', loading: false })
		}
	},

	// Logout
	logout: async () => {
		console.log('[AuthStore] logout called')
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			await signOutUserApi()
		} finally {
			set({ user: null, idToken: null, loading: false, error: null })
		}
	},

	// Update profile name
	updateProfileName: async (name) => {
		console.log('[AuthStore] updateProfileName called')
		if (!name || !name.trim()) {
			set({ error: 'Name is required' })
			return
		}
		set({ loading: true, error: null })
		try {
			const updated = await updateDisplayNameApi(name.trim())
			set((state) => ({
				user: state.user ? { ...state.user, name: updated.name } : null,
				loading: false,
			}))
		} catch (err) {
			set({ error: err.message || 'Failed to update profile', loading: false })
		}
	},
}))

export default useAuthStore