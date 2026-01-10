import { create } from 'zustand'
import {
	signInWithEmail,
	signInWithGoogle,
	signOutUser,
	signUpWithEmail,
	updateDisplayName,
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

	// Set user from Firebase auth state change
	setFromFirebase: ({ uid, email, displayName, photoURL, idToken }) => {
		set({
			user: formatUser({ uid, email, name: displayName, picture: photoURL }),
			idToken,
			loading: false,
			error: null,
		})
	},

	// Google sign-in
	loginWithGoogle: async () => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signInWithGoogle()
			set({
				user: formatUser(userData),
				idToken: userData.idToken,
				loading: false,
				error: null,
			})
		} catch (err) {
			// User closed popup - not an error
			if (err.code === 'auth/popup-closed-by-user') {
				set({ loading: false, error: null })
				return
			}
			set({ error: err.message || 'Login failed', loading: false })
		}
	},

	// Email sign-in
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

	// Email sign-up
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

	// Logout
	logout: async () => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			await signOutUser()
		} finally {
			set({ user: null, idToken: null, loading: false, error: null })
		}
	},

	// Update profile name
	updateProfileName: async (name) => {
		if (!name || !name.trim()) {
			set({ error: 'Name is required' })
			return
		}
		set({ loading: true, error: null })
		try {
			const updated = await updateDisplayName(name.trim())
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