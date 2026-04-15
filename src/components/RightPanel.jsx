const TOOL_ICONS = {
  analysis:   '📊',
  research:   '🔬',
  web_search: '🌐',
  code:       '💻',
  github:     '🐙',
  supabase:   '🗄️',
  notion:     '📝',
  design:     '🎨',
  summarize:  '📋',
  planning:   '🗺️',
}

// ─── Hex Tile for a single agent ─────────────────────────────────────────────
function HexTile({ agent, index }) {
  const delay = index * 120
  return (
    <div
      className="hex-tile group flex flex-col items-center text-center cursor-default"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Hex SVG shell */}
      <div className="relative mb-2">
        <svg width="72" height="78" viewBox="0 0 72 78" fill="none" className="drop-shadow-lg">
          <polygon
            points="36,2 68,19 68,59 36,76 4,59 4,19"
            fill="rgba(34,211,101,0.06)"
            stroke="rgba(34,211,101,0.35)"
            strokeWidth="1.5"
            className="group-hover:fill-[rgba(34,211,101,0.12)] group-hover:stroke-[rgba(34,211,101,0.6)] transition-all duration-300"
          />
          <polygon
            points="36,14 56,25 56,53 36,64 16,53 16,25"
            fill="rgba(34,211,101,0.04)"
          />
        </svg>
        {/* Role initial */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-emerald text-xl font-bold font-mono leading-none">
            {agent.role.charAt(0)}
          </span>
        </div>
      </div>

      {/* Role label */}
      <p className="text-text-primary text-[11px] font-semibold leading-tight mb-0.5">
        {agent.role}
      </p>

      {/* Domain */}
      <p className="text-text-dim text-[9px] leading-snug max-w-[72px] mb-1.5">
        {agent.domain}
      </p>

      {/* Tool chips */}
      <div className="flex flex-wrap justify-center gap-0.5">
        {(agent.tools ?? []).slice(0, 3).map(tool => (
          <span
            key={tool}
            title={tool}
            className="text-[8px] bg-forest-mid text-text-dim px-1 py-0.5 rounded font-mono"
          >
            {TOOL_ICONS[tool] ?? '⚙️'} {tool}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Gate 1 — Team Assembly Interstitial ─────────────────────────────────────
function Gate1Interstitial({ team, onApproveTeam, isLoading }) {
  return (
    <div className="space-y-4">
      <p className="text-text-dim text-[10px] uppercase tracking-widest font-medium">
        Council Assembled
      </p>

      {/* Hex grid */}
      {team.length > 0 ? (
        <div className="flex flex-wrap gap-3 justify-center py-2">
          {team.map((agent, i) => (
            <HexTile key={agent.role} agent={agent} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex justify-center py-4">
          <div className="flex gap-1.5 items-center text-text-dim text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-text-dim/40 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-text-dim/40 animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-text-dim/40 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Approve button */}
      {team.length > 0 && (
        <button
          onClick={onApproveTeam}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald/15 hover:bg-emerald/25 border border-emerald/30 hover:border-emerald/50 text-emerald text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              Assembling…
            </>
          ) : (
            <>
              Approve Council
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ─── Gate 2 — Plan Generation Loading ────────────────────────────────────────
function Gate2Loading() {
  return (
    <div className="py-4 text-center space-y-2">
      <div className="flex justify-center gap-1.5 mb-3">
        {[0,1,2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-emerald/50 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
      <p className="text-text-dim text-xs">Atlas is generating your action plan…</p>
      <p className="text-text-dim text-[10px]">This may take 15–30 seconds</p>
    </div>
  )
}

// ─── Gate 2 — Action Plan Display ────────────────────────────────────────────
function ActionPlanDisplay({ plan, onApprovePlan }) {
  if (!plan) return null

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="rounded-lg bg-forest-mid/50 border border-border-subtle p-3">
        <p className="text-[9px] text-emerald uppercase tracking-widest font-medium mb-1.5">Executive Summary</p>
        <p className="text-text-secondary text-[11px] leading-relaxed">{plan.summary}</p>
      </div>

      {/* Tasks */}
      <div className="space-y-1.5">
        <p className="text-[9px] text-text-dim uppercase tracking-widest font-medium">Action Plan</p>
        {(plan.tasks ?? []).map(task => (
          <div key={task.id} className="rounded-lg bg-forest-mid/30 border border-border-subtle p-2.5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-text-secondary text-[11px] font-medium leading-snug flex-1">{task.title}</p>
              <span className="flex-shrink-0 text-[8px] bg-emerald/10 text-emerald border border-emerald/20 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                {task.owner}
              </span>
            </div>
            <p className="text-text-dim text-[10px] leading-snug mb-1">{task.description}</p>
            <p className="text-text-dim/60 text-[9px] font-mono">{task.timeline}</p>
          </div>
        ))}
      </div>

      {/* Meta row */}
      <div className="flex gap-2">
        {plan.timeline_total && (
          <div className="flex-1 rounded-lg bg-forest-mid/30 border border-border-subtle p-2.5 text-center">
            <p className="text-[9px] text-text-dim uppercase tracking-wider mb-0.5">Timeline</p>
            <p className="text-text-secondary text-[11px] font-medium">{plan.timeline_total}</p>
          </div>
        )}
        {plan.cost_estimate && (
          <div className="flex-1 rounded-lg bg-forest-mid/30 border border-border-subtle p-2.5 text-center">
            <p className="text-[9px] text-text-dim uppercase tracking-wider mb-0.5">Est. Cost</p>
            <p className="text-text-secondary text-[11px] font-medium">{plan.cost_estimate}</p>
          </div>
        )}
      </div>

      {/* Tech stack */}
      {plan.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plan.tech_stack.map(t => (
            <span key={t} className="text-[9px] bg-forest-mid text-text-dim px-1.5 py-0.5 rounded font-mono">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Approve Plan button */}
      <button
        onClick={onApprovePlan}
        className="w-full py-2.5 px-4 rounded-xl bg-emerald/15 hover:bg-emerald/25 border border-emerald/30 hover:border-emerald/50 text-emerald text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        Approve Plan
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

// ─── Plan Approved Confirmation ───────────────────────────────────────────────
function PlanApprovedState() {
  return (
    <div className="py-4 text-center space-y-3">
      <div className="w-10 h-10 rounded-full bg-emerald/15 border border-emerald/30 flex items-center justify-center mx-auto">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 9L7 13L15 5" stroke="#22D365" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <p className="text-text-primary text-sm font-semibold mb-1">Session Complete</p>
        <p className="text-text-dim text-[11px] leading-relaxed">
          Plan written to session record. Start a new session when ready.
        </p>
      </div>
    </div>
  )
}

// ─── Main RightPanel ──────────────────────────────────────────────────────────
export default function RightPanel({
  stage,
  problemRefined,
  team,
  actionPlan,
  budgetPercent,
  estimatedCostUSD,
  sessionSaved,
  onApproveTeam,
  onApprovePlan,
  isLoading,
}) {
  const isIntake        = stage === 'intake'
  const isTeamProposed  = stage === 'team_proposed'
  const isTeamApproved  = stage === 'team_approved'
  const isPlanProposed  = stage === 'plan_proposed'
  const isPlanApproved  = stage === 'plan_approved'

  // Gate 2 is unlocked once team is approved
  const gate2Locked = isIntake || isTeamProposed

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
          complete={isTeamApproved || isPlanProposed || isPlanApproved}
        >
          {isTeamProposed && (
            <Gate1Interstitial
              team={team}
              onApproveTeam={onApproveTeam}
              isLoading={isLoading}
            />
          )}
          {(isTeamApproved || isPlanProposed || isPlanApproved) && (
            <div className="flex flex-wrap gap-1 pt-1">
              {team.map(a => (
                <span key={a.role} className="text-[9px] bg-emerald/10 text-emerald border border-emerald/20 px-1.5 py-0.5 rounded font-medium">
                  {a.role}
                </span>
              ))}
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
          active={isPlanProposed}
          locked={gate2Locked}
          lockedHint="Unlocks after Gate 1"
          complete={isPlanApproved}
        >
          {isTeamApproved && !actionPlan && <Gate2Loading />}
          {isPlanProposed && actionPlan && (
            <ActionPlanDisplay plan={actionPlan} onApprovePlan={onApprovePlan} />
          )}
          {isPlanApproved && <PlanApprovedState />}
        </GateBlock>

        {isPlanApproved && (
          <div className="rounded-xl bg-forest-panel border border-emerald/20 p-4">
            <p className="text-[10px] text-emerald font-medium uppercase tracking-widest mb-2">
              Persistence
            </p>
            <p className="text-text-secondary text-xs leading-relaxed">
              {sessionSaved
                ? 'Supabase session record saved with the approved team and action plan.'
                : 'Session marked complete in the UI, but persistence was not confirmed.'}
            </p>
          </div>
        )}

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

function GateBlock({ number, label, active, locked, lockedHint, complete, children }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      complete ? 'bg-forest-panel border-emerald/20 opacity-70' :
      active   ? 'bg-forest-panel border-emerald/30' :
      locked   ? 'bg-forest-mid/30 border-border-subtle opacity-55' :
                 'bg-forest-panel border-border-subtle'
    }`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <GateNumber number={number} locked={locked} active={active} complete={complete} />
          <span className={`text-sm font-medium ${
            active || complete ? 'text-text-primary' : locked ? 'text-text-dim' : 'text-text-secondary'
          }`}>{label}</span>
        </div>
        {locked   && <LockIcon />}
        {complete && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="#22D365" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {active && !complete && (
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

function GateNumber({ number, locked, active, complete }) {
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
      complete ? 'bg-emerald/15 text-emerald border-emerald/30' :
      active   ? 'bg-emerald/20 text-emerald border-emerald/40' :
      locked   ? 'bg-forest-mid text-text-dim border-border-subtle' :
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
