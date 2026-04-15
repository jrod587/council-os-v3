export default function LeftPanel({ sessions, onNewSession, currentSessionId }) {
  return (
    <div className="w-60 flex-shrink-0 flex flex-col bg-forest-dark border-r border-border-subtle">

      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border-subtle gap-2.5">
        <HexLogo />
        <span className="text-text-primary font-semibold text-sm tracking-wide">Council OS</span>
        <span className="text-[10px] text-text-dim bg-forest-mid px-1.5 py-0.5 rounded font-mono ml-auto">v3</span>
      </div>

      {/* New Session */}
      <div className="p-3 border-b border-border-subtle">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald/10 hover:bg-emerald/20 border border-emerald/20 hover:border-emerald/40 text-emerald text-sm font-medium transition-all duration-200"
        >
          <span className="text-base leading-none font-light">+</span>
          <span>New Session</span>
        </button>
      </div>

      {/* Session History */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-text-dim text-xs">No sessions yet</p>
            <p className="text-text-dim text-[10px] mt-1 opacity-60">Start by describing a problem</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {sessions.map(s => (
              <div
                key={s.id}
                className={`px-3 py-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  s.id === currentSessionId
                    ? 'bg-forest-panel text-text-primary border border-border-subtle'
                    : 'text-text-secondary hover:bg-forest-mid hover:text-text-primary'
                }`}
              >
                <p className="truncate font-medium">{s.preview || 'New session'}</p>
                <p className="text-text-dim mt-0.5 text-[10px] uppercase tracking-wider">{s.stage}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="h-11 border-t border-border-subtle flex items-center px-4">
        <span className="text-text-dim text-[10px] font-mono">Phase 3 hardening · α</span>
      </div>
    </div>
  )
}

function HexLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <polygon points="11,1.5 19.5,6 19.5,16 11,20.5 2.5,16 2.5,6"
        fill="none" stroke="#22D365" strokeWidth="1.5" />
      <polygon points="11,6 16,8.5 16,13.5 11,16 6,13.5 6,8.5"
        fill="#22D365" opacity="0.2" />
    </svg>
  )
}
