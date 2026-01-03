import useUserContext from '../../hooks/useUserContext'

const Integrations = () => {
  const { context } = useUserContext()
  const orgName = context?.organization?.name || 'Your organization'

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Integrations</p>
          <h1 className="text-3xl font-semibold text-slate-900">Slack & GitHub status</h1>
          <p className="text-sm text-slate-600">Static demo: external connections are already set up for {orgName}.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Slack</p>
                <p className="text-xs text-slate-500">Slash commands are live.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Connected</span>
            </div>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Channel link (static)</label>
            <input disabled value="https://slack.com/app/flowsync" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600" />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">GitHub</p>
                <p className="text-xs text-slate-500">Issues sync is enabled.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Connected</span>
            </div>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Repository (static)</label>
            <input disabled value="https://github.com/chinmay1p/GDG-NU-2026" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Integrations
