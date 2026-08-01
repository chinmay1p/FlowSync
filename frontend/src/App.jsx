import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

import BotSpawner from './components/BotSpawner'
import TaskApprovalPopup from './components/TaskApprovalPopup'
import DashboardLayout from './components/layout/DashboardLayout'
import { TaskApprovalProvider } from './context/TaskApprovalContext'
import AudioControl from './pages/AudioControl'
import CreateOrganization from './pages/CreateOrganization'
import DashboardRedirect from './pages/DashboardRedirect'
import JoinOrganization from './pages/JoinOrganization'
import LandingPage from './pages/LandingPage'
import Meetings from './pages/Meetings'
import OrgOnboarding from './pages/OrgOnboarding'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Calendar from './pages/dashboard/Calendar'
import Integrations from './pages/dashboard/Integrations'
import Members from './pages/dashboard/Members'
import Overview from './pages/dashboard/Overview'
import Tasks from './pages/dashboard/Tasks'
import Teams from './pages/dashboard/Teams'
import OrganizationSettings from './pages/settings/OrganizationSettings'
import ProfileSettings from './pages/settings/ProfileSettings'
import TeamSettings from './pages/settings/TeamSettings'
import useAuthStore from './store/authStore'

// Lazy load Zoom components
const ZoomTest = lazy(() => import('./pages/ZoomTest'))
const ZoomBotClient = lazy(() => import('./pages/ZoomBotClient'))

function App() {
	const setFromFirebase = useAuthStore((state) => state.setFromFirebase)

	useEffect(() => {

		const auth = getAuth()

		// Don't block - just set up listener
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			console.log('[Auth] State changed:', user?.email || 'no user')
			if (user) {
				const token = await user.getIdToken()
				setFromFirebase({
					uid: user.uid,
					email: user.email,
					displayName: user.displayName,
					photoURL: user.photoURL,
					idToken: token,
				})
			} else {
				setFromFirebase(null)
			}
		})

		return () => unsubscribe()
	}, [setFromFirebase])

	return (
		<TaskApprovalProvider>
			<BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="/signin" element={<SignIn />} />
					<Route path="/signup" element={<SignUp />} />
					<Route path="/loading" element={<DashboardRedirect />} />
					<Route path="/get-started" element={<OrgOnboarding />} />
					<Route path="/create-org" element={<CreateOrganization />} />
					<Route path="/join-org" element={<JoinOrganization />} />
					<Route path="/zoom-test" element={<Suspense fallback={<div>Loading...</div>}><ZoomTest /></Suspense>} />
					<Route path="/audio-control" element={<AudioControl />} />
					<Route path="/bot/zoom/:meetingId" element={<Suspense fallback={<div>Loading...</div>}><ZoomBotClient /></Suspense>} />
					<Route path="/dashboard" element={<DashboardLayout />}>
						<Route index element={<Navigate to="overview" replace />} />
						<Route path="overview" element={<Overview />} />
						<Route path="teams" element={<Teams />} />
						<Route path="members" element={<Members />} />
						<Route path="tasks" element={<Tasks />} />
						<Route path="calendar" element={<Calendar />} />
						<Route path="meetings" element={<Meetings />} />
						<Route path="integrations" element={<Integrations />} />
						<Route path="settings">
							<Route index element={<Navigate to="organization" replace />} />
							<Route path="organization" element={<OrganizationSettings />} />
							<Route path="teams" element={<TeamSettings />} />
							<Route path="profile" element={<ProfileSettings />} />
						</Route>
					</Route>
				</Routes>
				<TaskApprovalPopup />
				<BotSpawner />
			</BrowserRouter>
		</TaskApprovalProvider>
	)
}

export default App