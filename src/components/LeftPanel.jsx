export default function LeftPanel({
  sessions,
  onNewSession,
  currentSessionId,
  userEmail,
  onSignOut,
  availableCredits,
  nextCreditSource,
  authReady,
}) {
  return (
    <div className="w-60 flex-shrink-0 flex flex-col bg-forest-dark border-r border-border-subtle">
      <div className="h-14 flex items-center px-4 border-b border-border-subtle gap-2.5">
        <HexLogo />
        <span className="text-text-primary font-semibold text-sm tracking-wide">Council OS</span>
        <span className="text-[10px] text-text-dim bg-forest-mid px-1.5 py-0.5 rounded font-mono ml-auto">v3</span>
      </div>

      <div className="p-3 border-b border-border-subtle space-y-3">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald/10 hover:bg-emerald/20 border border-emerald/20 hover:border-emerald/40 text-emerald text-sm font-medium transition-all duration-200"
        >
          <span className="text-base leading-none font-light">+</span>
          <span>Reset View</span>
        </button>

        <div className="rounded-lg bg-forest-mid/50 border border-border-subtle p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-text-dim">Access</p>
          {!authReady ? (
            <p className="text-text-dim text-xs">Checking auth…</p>
          ) : userEmail ? (
            <>
              <p className="text-text-primary text-xs break-all">{userEmail}</p>
              <p className="text-text-secondary text-[11px]">
                {availableCredits} credit{availableCredits === 1 ? '' : 's'} available
              </p>
              <p className="text-text-dim text-[10px] uppercase tracking-wider">
                {nextCreditSource === 'founder'
                  ? 'Founder credits spend first'
                  : nextCreditSource === 'purchased'
                    ? 'Purchased credits active'
                    : 'No credits loaded'}
              </p>
              <button
                onClick={onSignOut}
                className="w-full rounded-lg border border-border-subtle bg-forest-panel px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:border-emerald/30 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <p className="text-text-dim text-xs">Magic link sign-in required before session start.</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-text-dim text-xs">No tracked sessions yet</p>
            <p className="text-text-dim text-[10px] mt-1 opacity-60">Complete one guided run to build history</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  session.id === currentSessionId
                    ? 'bg-forest-panel text-text-primary border border-border-subtle'
                    : 'text-text-secondary'
                }`}
              >
                <p className="truncate font-medium">{session.preview || 'New session'}</p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="text-text-dim text-[10px] uppercase tracking-wider">{session.stage}</p>
                  {session.accessGrantType && (
                    <span className="text-[9px] rounded bg-forest-mid px-1.5 py-0.5 text-text-dim uppercase tracking-wider">
                      {session.accessGrantType}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border-subtle px-4 py-3 text-[10px] text-text-dim">
        Phase 4 hardening · auth + credits + billing gate
      </div>
    </div>
  )
}

function HexLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <polygon points="11,1.5 19.5,6 19.5,16 11,20.5 2.5,16 2.5,6" fill="none" stroke="rgb(var(--color-emerald))" strokeWidth="1.5" />
      <polygon points="11,6 16,8.5 16,13.5 11,16 6,13.5 6,8.5" fill="rgb(var(--color-emerald))" opacity="0.2" />
    </svg>
  )
}
