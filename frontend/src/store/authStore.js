import { create } from 'zustand'
import {
	signInWithEmail,
	signInWithGoogle,
	signOutUser,
	signUpWithEmail,
	updateDisplayName,
	checkRedirectResult,
} from '../services/auth'

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
	setFromFirebase: ({ uid, email, displayName, photoURL, idToken }) => {
		set({
			user: formatUser({ uid, email, name: displayName, picture: photoURL }),
			idToken,
			loading: false,
			error: null,
		})
	},
	// Check for redirect result (called on app init)
	checkRedirectAuth: async () => {
		try {
			const userData = await checkRedirectResult()
			if (userData) {
				set({
					user: formatUser(userData),
					idToken: userData.idToken,
					loading: false,
					error: null,
				})
				return true
			}
			return false
		} catch (err) {
			console.error('Redirect auth check failed:', err)
			return false
		}
	},
	loginWithGoogle: async () => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signInWithGoogle()
			// userData will be null if redirecting
			if (userData) {
				set({
					user: formatUser(userData),
					idToken: userData.idToken,
					loading: false,
					error: null,
				})
			}
		} catch (err) {
			// Handle popup interruptions gracefully; redirect fallback is already triggered in the service
			if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/popup-blocked') {
				set({ error: null, loading: false })
				return
			}
			set({ error: err.message || 'Login failed', loading: false })
		}
	},
	signInWithEmail: async (email, password) => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signInWithEmail({ email: email.trim(), password })
			set({
				user: formatUser(userData),
				idToken: userData.idToken,
				loading: false,
				error: null,
			})
		} catch (err) {
			set({ error: err.message || 'Login failed', loading: false })
		}
	},
	signUpWithEmail: async ({ name, email, password }) => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signUpWithEmail({ name: name.trim(), email: email.trim(), password })
			set({
				user: formatUser(userData),
				idToken: userData.idToken,
				loading: false,
				error: null,
			})
		} catch (err) {
			set({ error: err.message || 'Sign-up failed', loading: false })
		}
	},
	logout: async () => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			await signOutUser()
		} finally {
			set({ user: null, idToken: null, loading: false, error: null })
		}
	},
	updateProfileName: async (name) => {
		if (!name || !name.trim()) {
			set({ error: 'Name is required' })
			return
		}
		set({ loading: true, error: null })
		try {
			const updated = await updateDisplayName(name.trim())
			set((state) => ({
				user: state.user
					? {
						...state.user,
						name: updated.name,
					}
					: {
						name: updated.name,
						email: updated.email,
						picture: updated.picture,
						uid: updated.uid,
					},
				loading: false,
			}))
		} catch (err) {
			set({ error: err.message || 'Failed to update profile', loading: false })
		}
	},
}))

export default useAuthStore
