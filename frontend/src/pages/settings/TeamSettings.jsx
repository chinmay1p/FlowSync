import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { isAdmin } from '../../utils/dashboardRoutes'
import { renameTeam } from '../../services/teamApi'

const TeamSettings = () => {
	const { context, refreshContext } = useOutletContext()
	const admin = isAdmin(context)
	const teams = context.orgTeams || []
	const [selectedTeamId, setSelectedTeamId] = useState(() => teams[0]?.teamId || '')
	const selectedTeam = teams.find((team) => team.teamId === selectedTeamId) || teams[0]
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [status, setStatus] = useState('')

	useEffect(() => {
		if (selectedTeam) {
			setName(selectedTeam.teamName || '')
			setDescription(selectedTeam.description || '')
		}
	}, [selectedTeam, selectedTeamId])

	if (!admin) {
		return <Restricted />
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		if (!selectedTeamId) return
		try {
			setStatus('Saving…')
			await renameTeam(selectedTeamId, { name, description })
			await refreshContext()
			setStatus('Team updated')
		} catch (err) {
			setStatus(err.message || 'Failed to update team')
		}
	}

	return (
		<div className="space-y-6">
			<header>
				<p className="text-xs uppercase tracking-[0.4em] text-slate-500">Settings</p>
				<h1 className="text-3xl font-semibold text-slate-900">Team settings</h1>
				<p className="text-sm text-slate-600">Rename teams and update descriptions.</p>
			</header>

			{teams.length === 0 ? (
				<div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
					<p className="text-sm text-slate-600">Create a team first to manage its settings.</p>
				</div>
			) : (
				<form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
				<label className="text-xs uppercase tracking-wide text-slate-500">Select team</label>
				<select
					value={selectedTeamId}
					onChange={(e) => setSelectedTeamId(e.target.value)}
					className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
				>
					{teams.map((team) => (
						<option key={team.teamId} value={team.teamId}>{team.teamName}</option>
					))}
				</select>

				<label className="text-xs uppercase tracking-wide text-slate-500">Team name</label>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
				/>

				<label className="text-xs uppercase tracking-wide text-slate-500">Description</label>
				<textarea
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
					rows={3}
				></textarea>

				<button type="submit" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white">Save changes</button>
				{status && <p className="text-xs text-slate-500">{status}</p>}
			</form>
			)}
		</div>
	)
}

const Restricted = () => (
	<div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
		<p className="text-sm text-slate-600">Only admins can manage teams from settings.</p>
	</div>
)

export default TeamSettings
