const Topbar = ({ context, user, onLogout }) => {
	return (
		<header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
			<div>
				<p className="text-xs uppercase tracking-[0.4em] text-slate-400">{context.organization?.name || 'Organization'}</p>
				<p className="text-lg font-semibold text-slate-900">{context.organization?.description || 'Unified workspace'}</p>
			</div>
			<div className="flex items-center gap-4">
				<div className="text-right">
					<p className="text-sm font-semibold text-slate-900">{user?.name || 'User'}</p>
					<p className="text-xs text-slate-500">{user?.email}</p>
				</div>
				{user?.picture ? (
					<img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full border border-slate-200" />
				) : (
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
						{user?.name?.[0] || '?'}
					</div>
				)}
				<button
					onClick={onLogout}
					className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
				>
					Logout
				</button>
			</div>
		</header>
	)
}

export default Topbar
