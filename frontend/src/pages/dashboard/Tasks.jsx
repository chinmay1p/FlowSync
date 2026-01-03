import { useCallback, useEffect, useMemo, useState } from 'react'
import useAuthStore from '../../store/authStore'
import useUserContext from '../../hooks/useUserContext'
import { isAdmin, isManager } from '../../utils/dashboardRoutes'
import { completeTask, createTask, fetchTasks } from '../../services/tasksApi'

const priorityBadgeStyles = {
	low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
	medium: 'border-amber-200 bg-amber-50 text-amber-700',
	high: 'border-rose-200 bg-rose-50 text-rose-700',
}

const sourceBadgeStyles = {
	SLACK: 'border-sky-200 bg-sky-50 text-sky-700',
	DASHBOARD: 'border-indigo-200 bg-indigo-50 text-indigo-700',
}

const COMPLETED_STATUS = 'COMPLETED'
const isCompletedStatus = (value = '') => (value || '').toUpperCase() === COMPLETED_STATUS

const buildFilterTemplate = (mineOnly) => ({
	assignedToEmail: '',
	priority: '',
	source: '',
	github: 'all',
	mine: mineOnly,
})

const createDefaultForm = () => ({
	title: '',
	description: '',
	assignedToEmail: '',
	priority: 'medium',
	dueDate: '',
	createGithubIssue: true,
})

const fmtDate = (value, withYear = false) => {
	if (!value) return null
	try {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: withYear ? 'numeric' : undefined,
		}).format(new Date(value))
	} catch (err) {
		return null
	}
}

const fmtDateTime = (value) => {
	if (!value) return null
	try {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
		}).format(new Date(value))
	} catch (err) {
		return null
	}
}

const formatStatus = (value) => (value ? value.toUpperCase() : 'UNKNOWN')

const Tasks = () => {
	const { user } = useAuthStore()
	const { context, loading: contextLoading, error: contextError, refreshContext } = useUserContext()
	const [tasks, setTasks] = useState([])
	const [lastGoodTasks, setLastGoodTasks] = useState([])
	const [filters, setFilters] = useState(() => buildFilterTemplate(true))
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [formValues, setFormValues] = useState(() => createDefaultForm())
	const [formMessage, setFormMessage] = useState(null)
	const [isCreating, setIsCreating] = useState(false)
	const [showCompleted, setShowCompleted] = useState(false)
	const [completingTaskId, setCompletingTaskId] = useState(null)
	const [completionMessage, setCompletionMessage] = useState(null)

	const canManage = useMemo(() => isAdmin(context) || isManager(context), [context])
	const userEmail = (user?.email || '').toLowerCase()

	useEffect(() => {
		// Only update filters once context finishes loading to avoid race conditions
		if (contextLoading) return
		setFilters((prev) => {
			const requiredMine = !canManage
			if (prev.mine === requiredMine) return prev
			return { ...prev, mine: requiredMine }
		})
	}, [canManage, contextLoading])

	const deriveQueryFromFilters = useCallback(() => {
		const next = { mine: filters.mine }
		const trimmedEmail = filters.assignedToEmail.trim()
		if (trimmedEmail) next.assignedToEmail = trimmedEmail
		if (filters.priority) next.priority = filters.priority
		if (filters.source) next.source = filters.source
		if (filters.github === 'with') next.hasGithubIssue = true
		if (filters.github === 'without') next.hasGithubIssue = false
		return next
	}, [filters])

	const loadTasks = useCallback(async () => {
		if (!user || !context) return
		setLoading(true)
		setError(null)
		try {
			const data = await fetchTasks(deriveQueryFromFilters())
			setTasks(data)
			setLastGoodTasks(data)
		} catch (err) {
			setError(err.message || 'Unable to load tasks')
		} finally {
			setLoading(false)
		}
	}, [user, context, deriveQueryFromFilters])

	useEffect(() => {
		if (!context || !user || contextLoading) return
		loadTasks()
	}, [context, user, contextLoading, loadTasks])

	const handleFilterChange = (event) => {
		const { name, value } = event.target
		setFilters((prev) => ({ ...prev, [name]: value }))
	}

	const toggleMine = () => {
		if (!canManage) return
		setFilters((prev) => ({ ...prev, mine: !prev.mine }))
	}

	const resetFilters = () => {
		setFilters(buildFilterTemplate(!canManage))
	}

	const handleFormChange = (event) => {
		const { name, value, type, checked } = event.target
		setFormValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
	}

	const handleCreateTask = async (event) => {
		event.preventDefault()
		setFormMessage(null)
		setIsCreating(true)
		try {
			const payload = {
				title: formValues.title.trim(),
				description: formValues.description.trim(),
				assignedToEmail: formValues.assignedToEmail.trim().toLowerCase(),
				priority: formValues.priority,
				createGithubIssue: formValues.createGithubIssue,
			}
			if (!payload.title || !payload.description || !payload.assignedToEmail) {
				throw new Error('Title, description, and assignee email are required.')
			}
			if (formValues.dueDate) {
				payload.dueDate = `${formValues.dueDate}T00:00:00Z`
			}
			await createTask(payload)
			setFormMessage({ type: 'success', text: 'Task created and synced.' })
			setFormValues(createDefaultForm())
			await loadTasks()
		} catch (err) {
			setFormMessage({ type: 'error', text: err.message || 'Unable to create the task.' })
		} finally {
			setIsCreating(false)
		}
	}

	const handleCompleteTask = async (taskId) => {
		if (!taskId) return
		setCompletionMessage(null)
		setCompletingTaskId(taskId)
		try {
			await completeTask(taskId)
			setCompletionMessage({ type: 'success', text: 'Task marked as completed.' })
			await loadTasks()
		} catch (err) {
			setCompletionMessage({ type: 'error', text: err.message || 'Unable to complete the task.' })
		} finally {
			setCompletingTaskId(null)
		}
	}

	const displayTasks = useMemo(() => {
		if ((loading || error) && tasks.length === 0 && lastGoodTasks.length > 0) {
			return lastGoodTasks
		}
		return tasks
	}, [tasks, lastGoodTasks, loading, error])

	const activeTasks = useMemo(() => displayTasks.filter((task) => !isCompletedStatus(task.status)), [displayTasks])
	const completedTasks = useMemo(() => displayTasks.filter((task) => isCompletedStatus(task.status)), [displayTasks])

	const dueSoonCount = useMemo(() => {
		const now = Date.now()
		const horizon = now + 7 * 24 * 60 * 60 * 1000
		return activeTasks.filter((task) => {
			if (!task.dueDate) return false
			const due = new Date(task.dueDate).getTime()
			return due >= now && due <= horizon
		}).length
	}, [activeTasks])

	const githubLinked = useMemo(() => activeTasks.filter((task) => Boolean(task.githubIssueUrl)).length, [activeTasks])

	const canCompleteTask = useCallback(
		(task) => {
			if (!task || isCompletedStatus(task.status)) return false
			if (canManage) return true
			if (!userEmail || !task.assignedToEmail) return false
			return task.assignedToEmail.toLowerCase() === userEmail
		},
		[canManage, userEmail],
	)

	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
				<div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
					<p className="text-sm font-semibold text-slate-600">Sign in to view tasks</p>
					<p className="mt-2 text-sm text-slate-500">Use Google sign-in from the landing page to continue.</p>
				</div>
			</div>
		)
	}

	if (contextError) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
				<div className="max-w-xl w-full rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-2xl">
					<p className="text-lg font-semibold text-rose-600">We hit a snag loading your workspace</p>
					<p className="mt-2 text-sm text-slate-600">{contextError}</p>
					<button onClick={refreshContext} className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">Retry</button>
				</div>
			</div>
		)
	}

	if (contextLoading || !context) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading tasks…</div>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white px-6 py-10">
			<div className="mx-auto max-w-6xl space-y-8">
				<header className="space-y-3">
					<p className="text-xs uppercase tracking-[0.4em] text-slate-500">Task command center</p>
					<h1 className="text-3xl font-semibold text-slate-900">Assign, sync, and track work</h1>
					<p className="text-sm text-slate-600">Slack slash commands, manual entries, and GitHub issues land in a single stream with instant approvals.</p>
				</header>

				<section className="grid gap-4 md:grid-cols-3">
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
						<p className="text-sm font-semibold text-slate-500">Active tasks</p>
						<p className="mt-2 text-4xl font-semibold text-slate-900">{loading ? '—' : activeTasks.length}</p>
						<p className="text-xs text-slate-500">Filtered view updates in real time.</p>
					</div>
					<div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-xl">
						<p className="text-sm font-semibold text-amber-700">Due within 7 days</p>
						<p className="mt-2 text-4xl font-semibold text-amber-900">{loading ? '—' : dueSoonCount}</p>
						<p className="text-xs text-amber-700/80">Keep these priorities unblocked.</p>
					</div>
					<div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xl">
						<p className="text-sm font-semibold text-white/80">GitHub synced</p>
						<p className="mt-2 text-4xl font-semibold">{loading ? '—' : githubLinked}</p>
						<p className="text-xs text-white/70">Issues were opened automatically.</p>
					</div>
				</section>

				{completedTasks.length > 0 && (
					<section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
						<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
							<div>
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Completed tasks</p>
								<h2 className="text-2xl font-semibold text-slate-900">Wrapped up work</h2>
								<p className="text-sm text-slate-500">Showing {completedTasks.length} completed task{completedTasks.length === 1 ? '' : 's'} with the current filters.</p>
							</div>
							<button onClick={() => setShowCompleted((prev) => !prev)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400">
								{showCompleted ? 'Hide list' : 'Show list'}
							</button>
						</div>

						{showCompleted && (
							<div className="mt-6 divide-y divide-slate-100">
								{completedTasks.map((task) => {
									const priority = (task.priority || 'medium').toLowerCase()
									const priorityStyle = priorityBadgeStyles[priority] || priorityBadgeStyles.medium
									const sourceStyle = sourceBadgeStyles[task.source?.toUpperCase()] || 'border-slate-200 bg-slate-50 text-slate-700'
									return (
										<div key={`completed-${task.taskId}`} className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
											<div>
												<p className="text-base font-semibold text-slate-900">{task.title || 'Untitled task'}</p>
												<p className="mt-1 text-sm text-slate-600">{task.description || 'No description provided.'}</p>
												<div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
													<span>Assignee: <span className="font-semibold text-slate-700">{task.assignedToEmail || 'Unassigned'}</span></span>
													{task.completedAt ? (
														<span>Completed {fmtDateTime(task.completedAt)}</span>
													) : (
														<span>Completion syncing…</span>
													)}
												</div>
											</div>
											<div className="flex flex-wrap gap-2 md:justify-end">
												<span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${priorityStyle}`}>{priority}</span>
												<span className={`rounded-full border px-3 py-1 text-xs font-semibold ${sourceStyle}`}>{task.source || 'DASHBOARD'}</span>
												<span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Completed</span>
												{task.githubIssueUrl ? (
													<a href={task.githubIssueUrl} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400">GitHub</a>
												) : (
													<span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400">No issue</span>
												)}
											</div>
										</div>
									)
								})}
							</div>
						)}
					</section>
				)}

				{canManage && (
					<section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div>
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Create task</p>
								<h2 className="text-2xl font-semibold text-slate-900">Assign tasks</h2>
							</div>
							<button onClick={loadTasks} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">
								Refresh tasks
							</button>
						</div>
						<form onSubmit={handleCreateTask} className="mt-6 grid gap-4 md:grid-cols-2">
							<div className="md:col-span-2">
								<label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Title</label>
								<input name="title" value={formValues.title} onChange={handleFormChange} placeholder="Ship onboarding notes" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none" />
							</div>
							<div className="md:col-span-2">
								<label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</label>
								<textarea name="description" value={formValues.description} onChange={handleFormChange} rows={3} placeholder="Outline the next customer ritual, capture owners, and flag GitHub blockers." className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none" />
							</div>
							<div>
								<label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assignee email</label>
								<input name="assignedToEmail" value={formValues.assignedToEmail} onChange={handleFormChange} placeholder="teammate@company.com" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none" />
							</div>
							<div>
								<label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Priority</label>
								<select name="priority" value={formValues.priority} onChange={handleFormChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none">
									<option value="low">Low</option>
									<option value="medium">Medium</option>
									<option value="high">High</option>
								</select>
							</div>
							<div>
								<label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Due date</label>
								<input type="date" name="dueDate" value={formValues.dueDate} onChange={handleFormChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none" />
							</div>
							<div className="flex flex-col justify-end">
								<label className="flex items-center gap-3 text-sm font-semibold text-slate-600">
									<input type="checkbox" name="createGithubIssue" checked={formValues.createGithubIssue} onChange={handleFormChange} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
									Open GitHub issue
								</label>
								<p className="mt-1 text-xs text-slate-500">Auto-sync to the org repository.</p>
							</div>
							<div className="md:col-span-2 flex flex-wrap items-center gap-3">
								<button type="submit" disabled={isCreating} className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70">{isCreating ? 'Creating…' : 'Create task'}</button>
								{formMessage && (
									<p className={`text-sm ${formMessage.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{formMessage.text}</p>
								)}
							</div>
						</form>
					</section>
				)}

				<section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Task stream</p>
							<h2 className="text-2xl font-semibold text-slate-900">Active tasks</h2>
							<p className="text-sm text-slate-500">Showing {activeTasks.length} task{activeTasks.length === 1 ? '' : 's'} with the current filters.</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<button onClick={resetFilters} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400">Reset filters</button>
							<button onClick={loadTasks} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Refresh list</button>
						</div>
					</div>

					<div className="mt-6 grid gap-4 lg:grid-cols-4">
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assignee</label>
							<input name="assignedToEmail" value={filters.assignedToEmail} onChange={handleFilterChange} placeholder="person@org.com" disabled={!canManage} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70" />
						</div>
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Priority</label>
							<select name="priority" value={filters.priority} onChange={handleFilterChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none">
								<option value="">All</option>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
							</select>
						</div>
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Source</label>
							<select name="source" value={filters.source} onChange={handleFilterChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none">
								<option value="">All</option>
								<option value="SLACK">Slack</option>
								<option value="DASHBOARD">Dashboard</option>
							</select>
						</div>
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-slate-500">GitHub issues</label>
							<select name="github" value={filters.github} onChange={handleFilterChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none">
								<option value="all">All states</option>
								<option value="with">Only linked</option>
								<option value="without">Missing links</option>
							</select>
						</div>
						{canManage && (
							<div className="lg:col-span-4 flex items-center gap-3 text-sm font-semibold text-slate-600">
								<label className="flex items-center gap-2">
									<input type="checkbox" checked={filters.mine} onChange={toggleMine} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
									My tasks only
								</label>
								<p className="text-xs font-normal text-slate-500">Toggle to focus on items assigned to you.</p>
							</div>
						)}
					</div>

					{error && (
						<div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error}</div>
					)}

					{completionMessage && (
						<div
							className={`mt-4 rounded-2xl border p-4 text-sm ${completionMessage.type === 'error' ? 'border-rose-100 bg-rose-50 text-rose-600' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}
						>
							{completionMessage.text}
						</div>
					)}

					<div className="mt-6 divide-y divide-slate-100">
						{loading && <p className="py-6 text-center text-sm text-slate-500">Loading tasks…</p>}
						{!loading && activeTasks.length === 0 && !error && (
							<p className="py-6 text-center text-sm text-slate-500">No tasks match the current filters.</p>
						)}
						{activeTasks.map((task) => {
							const priority = (task.priority || 'medium').toLowerCase()
							const priorityStyle = priorityBadgeStyles[priority] || priorityBadgeStyles.medium
							const sourceStyle = sourceBadgeStyles[task.source?.toUpperCase()] || 'border-slate-200 bg-slate-50 text-slate-700'
							return (
								<div key={task.taskId} className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
									<div>
										<p className="text-base font-semibold text-slate-900">{task.title || 'Untitled task'}</p>
										<p className="mt-1 text-sm text-slate-600">{task.description || 'No description provided.'}</p>
										<div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
											<span>Assignee: <span className="font-semibold text-slate-700">{task.assignedToEmail || 'Unassigned'}</span></span>
											<span>Due: <span className="font-semibold text-slate-700">{fmtDate(task.dueDate, true) || 'No due date'}</span></span>
											{task.createdAt && <span>Created {fmtDateTime(task.createdAt)}</span>}
										</div>
									</div>
									<div className="flex flex-wrap gap-2 md:justify-end">
										<span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${priorityStyle}`}>{priority}</span>
										<span className={`rounded-full border px-3 py-1 text-xs font-semibold ${sourceStyle}`}>{task.source || 'DASHBOARD'}</span>
										<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{formatStatus(task.status)}</span>
										{canCompleteTask(task) && (
											<button
												onClick={() => handleCompleteTask(task.taskId)}
												disabled={completingTaskId === task.taskId}
												className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 disabled:opacity-60"
											>
												{completingTaskId === task.taskId ? 'Completing…' : 'Mark complete'}
											</button>
										)}
										{task.githubIssueUrl ? (
											<a href={task.githubIssueUrl} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400">GitHub</a>
										) : (
											<span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400">No issue</span>
										)}
									</div>
								</div>
							)
						})}
					</div>
				</section>
			</div>
		</div>
	)
}

export default Tasks
