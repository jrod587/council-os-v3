export default function RightPanel({ stage, problemRefined, budgetPercent, estimatedCostUSD }) {
  const isIntake       = stage === 'intake'
  const isTeamProposed = stage === 'team_proposed'
  const isPostIntake   = !isIntake

  return (
    <div className="w-[340px] flex-shrink-0 flex flex-col bg-forest-dark border-l border-border-subtle">

      {/* Top bar */}
      <div className="h-14 flex items-center px-5 border-b border-border-subtle">
        <span className="text-text-secondary text-sm font-medium">Council Chamber</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Gate 1 — Team Assembly */}
        <GateBlock
          number={1}
          label="Approve Team"
          active={isTeamProposed}
          locked={isIntake}
          lockedHint="Waiting for problem definition..."
        >
          {isTeamProposed && (
            <div className="py-3 text-center space-y-1">
              <p className="text-text-dim text-xs">Team assembly ready next.</p>
              <p className="text-text-secondary text-xs">Hex council grid builds here in the next session.</p>
            </div>
          )}
        </GateBlock>

        {/* Refined Problem Statement — surfaces after intake */}
        {problemRefined && (
          <div className="rounded-xl bg-forest-panel border border-emerald/20 p-4">
            <p className="text-[10px] text-emerald font-medium uppercase tracking-widest mb-2">
              Problem Statement
            </p>
            <p className="text-text-secondary text-xs leading-relaxed">{problemRefined}</p>
          </div>
        )}

        {/* Gate 2 — Approve Plan */}
        <GateBlock
          number={2}
          label="Approve Plan"
          locked={true}
          lockedHint="Unlocks after Gate 1"
        />

        {/* Gate 3 — Final Audit (v2) */}
        <div className="gate-locked rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GateNumber number={3} locked />
              <span className="text-text-dim text-sm font-medium">Final Audit</span>
            </div>
            <span className="text-[10px] bg-forest-mid text-text-dim px-2 py-0.5 rounded-full font-mono tracking-wider">v2</span>
          </div>
          <p className="text-text-dim text-xs leading-relaxed">
            Lead agent reviews all outputs before delivery. Skipped in crewAI. Coming in v2.
          </p>
        </div>

      </div>

      {/* Token Budget Bar */}
      <div className="flex-shrink-0 border-t border-border-subtle p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-text-dim text-xs">Session Budget</span>
          <span className="text-text-secondary text-xs font-mono">${estimatedCostUSD} / $2.00</span>
        </div>
        <div className="h-1.5 bg-forest-mid rounded-full overflow-hidden">
          <div
            className="h-full budget-bar rounded-full transition-all duration-700"
            style={{ width: `${Math.max(budgetPercent, 1)}%` }}
          />
        </div>
        <p className="text-text-dim text-[10px] mt-1.5">
          Hard cap $2.00/session · 10 sessions/month
        </p>
      </div>
    </div>
  )
}

function GateBlock({ number, label, active, locked, lockedHint, children }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      active  ? 'bg-forest-panel border-emerald/30' :
      locked  ? 'bg-forest-mid/30 border-border-subtle opacity-55' :
                'bg-forest-panel border-border-subtle'
    }`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <GateNumber number={number} locked={locked} active={active} />
          <span className={`text-sm font-medium ${
            active ? 'text-text-primary' : locked ? 'text-text-dim' : 'text-text-secondary'
          }`}>{label}</span>
        </div>
        {locked && <LockIcon />}
        {active && (
          <span className="text-[10px] bg-emerald/15 text-emerald px-2 py-0.5 rounded-full font-mono">
            ready
          </span>
        )}
      </div>
      {locked && lockedHint && (
        <p className="text-text-dim text-xs">{lockedHint}</p>
      )}
      {children}
    </div>
  )
}

function GateNumber({ number, locked, active }) {
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
      active  ? 'bg-emerald/20 text-emerald border-emerald/40' :
      locked  ? 'bg-forest-mid text-text-dim border-border-subtle' :
                'bg-forest-panel text-text-secondary border-border-subtle'
    }`}>
      {number}
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <rect x="1.5" y="4.5" width="8" height="5.5" rx="1" stroke="#4D6357" strokeWidth="1.2"/>
      <path d="M3.5 4.5V3A2 2 0 017.5 3v1.5" stroke="#4D6357" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
