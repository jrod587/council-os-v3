import { useState } from 'react'

const TOOL_ICONS = {
  analysis: 'AN',
  research: 'RS',
  web_search: 'WS',
  code: 'CD',
  github: 'GH',
  supabase: 'DB',
  notion: 'NT',
  design: 'DS',
  summarize: 'SM',
  planning: 'PL',
}

function HexTile({ agent, index }) {
  const delay = index * 120
  return (
    <div className="hex-tile group flex flex-col items-center text-center cursor-default" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative mb-1.5">
        <svg width="52" height="58" viewBox="0 0 72 78" fill="none" className="drop-shadow-lg">
          <polygon
            points="36,2 68,19 68,59 36,76 4,59 4,19"
            fill="rgb(var(--color-emerald) / 0.06)"
            stroke="rgb(var(--color-emerald) / 0.35)"
            strokeWidth="1.5"
            className="transition-all duration-300 group-hover:fill-[rgb(var(--color-emerald)/0.12)] group-hover:stroke-[rgb(var(--color-emerald)/0.6)]"
          />
          <polygon points="36,14 56,25 56,53 36,64 16,53 16,25" fill="rgb(var(--color-emerald) / 0.04)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-emerald text-base font-bold font-mono leading-none">{agent.role?.charAt(0) || '?'}</span>
        </div>
      </div>

      <p className="text-text-primary text-[10px] font-semibold leading-tight mb-0.5">{agent.role}</p>
      <p className="text-text-dim text-[8px] leading-snug max-w-[56px] mb-1">{agent.domain}</p>
      <div className="flex flex-wrap justify-center gap-0.5">
        {(agent.tools ?? []).slice(0, 2).map((tool) => (
          <span key={tool} title={tool} className="text-[7px] bg-forest-mid text-text-dim px-1 py-0.5 rounded font-mono">
            {TOOL_ICONS[tool] ?? 'TL'}
          </span>
        ))}
      </div>
    </div>
  )
}

function Gate1Interstitial({ team, onApproveTeam, isLoading }) {
  return (
    <div className="space-y-4">
      <p className="text-text-dim text-[10px] uppercase tracking-widest font-medium">Council Assembled</p>
      {team.length > 0 ? (
        <div className="flex flex-wrap gap-2 justify-center py-1">
          {team.map((agent, index) => (
            <HexTile key={`${agent.role}-${index}`} agent={agent} index={index} />
          ))}
        </div>
      ) : null}

      {team.length > 0 && (
        <button
          onClick={onApproveTeam}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald/15 hover:bg-emerald/25 border border-emerald/30 hover:border-emerald/50 text-emerald text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating plan…' : 'Approve Council'}
        </button>
      )}
    </div>
  )
}

function Gate2Loading() {
  return (
    <div className="py-4 text-center space-y-2">
      <div className="flex justify-center gap-1.5 mb-3">
        {[0, 1, 2].map((index) => (
          <span key={index} className="w-1.5 h-1.5 rounded-full bg-emerald/50 animate-pulse" style={{ animationDelay: `${index * 200}ms` }} />
        ))}
      </div>
      <p className="text-text-dim text-xs">Atlas is generating your action plan…</p>
      <p className="text-text-dim text-[10px]">Payment and credit checks already passed for this session.</p>
    </div>
  )
}

function ActionPlanDisplay({ plan, onApprovePlan, isApproved = false }) {
  if (!plan) return null

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-forest-mid/50 border border-border-subtle p-3">
        <p className="text-[9px] text-emerald uppercase tracking-widest font-medium mb-1.5">Executive Summary</p>
        <p className="text-text-secondary text-[11px] leading-relaxed">{plan.summary}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[9px] text-text-dim uppercase tracking-widest font-medium">Action Plan</p>
        {(plan.tasks ?? []).map((task) => (
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

      {plan.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plan.tech_stack.map((item) => (
            <span key={item} className="text-[9px] bg-forest-mid text-text-dim px-1.5 py-0.5 rounded font-mono">
              {item}
            </span>
          ))}
        </div>
      )}

      {!isApproved && (
        <button
          onClick={onApprovePlan}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald/15 hover:bg-emerald/25 border border-emerald/30 hover:border-emerald/50 text-emerald text-sm font-medium transition-all duration-200"
        >
          Approve Plan
        </button>
      )}
    </div>
  )
}

function ExportControls({ plan, problemRefined }) {
  const [copied, setCopied] = useState(false)

  const buildMarkdown = () => {
    const lines = []
    lines.push('# Council OS — Action Plan')
    lines.push('')
    if (problemRefined) {
      lines.push(`**Problem:** ${problemRefined}`)
      lines.push('')
    }
    if (plan.summary) {
      lines.push('## Executive Summary')
      lines.push(plan.summary)
      lines.push('')
    }
    if (plan.tasks?.length > 0) {
      lines.push('## Action Plan')
      lines.push('')
      plan.tasks.forEach((task) => {
        lines.push(`### ${task.id}. ${task.title}`)
        lines.push(`**Owner:** ${task.owner} · **Timeline:** ${task.timeline}`)
        lines.push('')
        lines.push(task.description)
        lines.push('')
      })
    }
    if (plan.tech_stack?.length > 0) {
      lines.push('## Tech Stack')
      lines.push(plan.tech_stack.join(', '))
      lines.push('')
    }
    const meta = []
    if (plan.cost_estimate) meta.push(`**Cost Estimate:** ${plan.cost_estimate}`)
    if (plan.timeline_total) meta.push(`**Total Timeline:** ${plan.timeline_total}`)
    if (meta.length > 0) lines.push(meta.join('  \n'))
    return lines.join('\n')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  const handleDownload = () => {
    const blob = new Blob([buildMarkdown()], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'council-os-action-plan.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      <p className="text-[9px] text-text-dim uppercase tracking-widest font-medium">Export Deliverable</p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border-subtle bg-forest-mid hover:border-emerald/30 hover:text-emerald text-text-secondary text-xs font-medium transition-all duration-200"
        >
          <ClipboardIcon />
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border-subtle bg-forest-mid hover:border-emerald/30 hover:text-emerald text-text-secondary text-xs font-medium transition-all duration-200"
        >
          <DownloadIcon />
          Download .md
        </button>
      </div>
    </div>
  )
}

function GateNumber({ number, locked }) {
  return (
    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-semibold ${locked ? 'border-border-subtle text-text-dim' : 'border-emerald/40 text-emerald'}`}>
      {number}
    </div>
  )
}

function GateBlock({ number, label, active, locked, lockedHint, complete, children }) {
  return (
    <div className={`rounded-xl p-4 border ${locked ? 'gate-locked' : active ? 'border-emerald/30 bg-forest-panel' : 'border-border-subtle bg-forest-panel/70'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GateNumber number={number} locked={locked && !complete} />
          <span className={`text-sm font-medium ${locked ? 'text-text-dim' : 'text-text-secondary'}`}>{label}</span>
        </div>
        {complete && <span className="text-[10px] text-emerald uppercase tracking-widest">Done</span>}
      </div>
      {locked ? (
        <p className="text-xs text-text-dim">{lockedHint}</p>
      ) : children}
    </div>
  )
}

function PromptKitCard({ task }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(task.prompt_template || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-forest-mid/30 p-2.5 rounded-lg border border-border-subtle">
      <p className="text-text-secondary text-[11px] font-medium leading-snug truncate flex-1" title={task.title}>
        {task.id ?? ''}. {task.title}
      </p>
      <button
        onClick={handleCopy}
        disabled={!task.prompt_template}
        className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded bg-forest-mid border border-border-subtle hover:border-emerald/40 hover:text-emerald text-text-dim text-[10px] font-medium transition-colors disabled:opacity-50"
      >
        {copied ? <CheckIcon /> : <ClipboardIcon />}
        {copied ? 'Copied!' : 'Copy Prompt'}
      </button>
    </div>
  )
}

function SessionDashboard({ sessionSaved, plan, team, problemRefined }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-emerald/15 border border-emerald/30 flex items-center justify-center flex-shrink-0">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L3.5 7L8.5 2" stroke="rgb(var(--color-emerald))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-emerald text-xs font-medium">
          {sessionSaved ? 'Session saved' : 'Plan approved'}
        </p>
      </div>

      {/* Council Summary */}
      <div className="space-y-2">
        <p className="text-[9px] text-text-dim uppercase tracking-widest font-medium">Your Council</p>
        <div className="space-y-1.5">
          {team?.map((agent, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-shrink-0 text-[9px] bg-emerald/10 text-emerald border border-emerald/20 px-1.5 py-0.5 rounded font-mono">
                {agent.role}
              </span>
              {agent.domain && (
                <span className="text-[10px] text-text-dim truncate" title={agent.domain}>
                  {agent.domain}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Task Tracker */}
      <div className="space-y-2">
        <p className="text-[9px] text-text-dim uppercase tracking-widest font-medium">Execution Plan</p>
        <div className="space-y-1.5 border-l-2 border-emerald/20 pl-2">
          {plan?.tasks?.map((task, i) => (
            <div key={task.id ?? i} className="flex items-center gap-2">
              <span className="text-[10px] text-text-dim font-mono">{task.id ?? i + 1}.</span>
              <p className="text-[11px] text-text-secondary font-medium truncate flex-1" title={task.title}>{task.title}</p>
              <span className="text-[9px] text-emerald bg-emerald/10 px-1.5 py-0.5 rounded">{task.owner}</span>
              <span className="text-[9px] text-text-dim">{task.timeline}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Kit */}
      <div className="space-y-2">
        <div>
          <p className="text-[9px] text-text-dim uppercase tracking-widest font-medium mb-0.5">Prompt Kit — relay these to your LLM</p>
          <p className="text-[10px] text-text-dim leading-snug">Each phase has a ready-to-use prompt. Copy it, paste it into any AI, paste the response into your tracking doc.</p>
        </div>
        <div className="space-y-1.5">
          {plan?.tasks?.map((task, i) => (
            <PromptKitCard key={task.id ?? i} task={task} />
          ))}
        </div>
      </div>

      <ExportControls plan={plan} problemRefined={problemRefined} />
    </div>
  )
}

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
  isAuthenticated,
  account,
  availableCredits,
  nextCreditSource,
  checkoutState,
}) {
  const isIntake = stage === 'intake'
  const isTeamProposed = stage === 'team_proposed'
  const isTeamApproved = stage === 'team_approved'
  const isPlanProposed = stage === 'plan_proposed'
  const isPlanApproved = stage === 'plan_approved'

  return (
    <div className="w-[340px] flex-shrink-0 flex flex-col bg-forest-dark border-l border-border-subtle">
      <div className="h-14 flex items-center px-5 border-b border-border-subtle">
        <span className="text-text-secondary text-sm font-medium">Council Chamber</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="rounded-xl bg-forest-panel border border-border-subtle p-4">
          <p className="text-[10px] text-emerald font-medium uppercase tracking-widest mb-2">Account Gate</p>
          {isAuthenticated ? (
            <div className="space-y-2 text-xs text-text-secondary">
              <p>{availableCredits} credit{availableCredits === 1 ? '' : 's'} available</p>
              <p>
                Founder credits: {account?.founder_credits_remaining ?? 0} · Purchased credits: {account?.purchased_credits_remaining ?? 0}
              </p>
              <p className="text-text-dim">
                {nextCreditSource === 'founder'
                  ? 'Founder credits spend first.'
                  : nextCreditSource === 'purchased'
                    ? 'Purchased credits ready.'
                    : 'Sign in, redeem a founder code, or buy via Stripe.'}
              </p>
              {checkoutState === 'success' && (
                <p className="text-emerald">Waiting for Stripe webhook confirmation.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-dim">Magic link sign-in required before any paid or founder-gated run can start.</p>
          )}
        </div>

        <GateBlock
          number={1}
          label="Approve Team"
          active={isTeamProposed}
          locked={isIntake}
          lockedHint="Unlocks after Atlas refines the problem."
          complete={isTeamApproved || isPlanProposed || isPlanApproved}
        >
          {isTeamProposed && <Gate1Interstitial team={team} onApproveTeam={onApproveTeam} isLoading={isLoading} />}
          {(isTeamApproved || isPlanProposed || isPlanApproved) && (
            <div className="flex flex-wrap gap-1 pt-1">
              {team.map((agent) => (
                <span key={agent.role} className="text-[9px] bg-emerald/10 text-emerald border border-emerald/20 px-1.5 py-0.5 rounded font-medium">
                  {agent.role}
                </span>
              ))}
            </div>
          )}
        </GateBlock>

        {problemRefined && (
          <div className="rounded-xl bg-forest-panel border border-emerald/20 p-4">
            <p className="text-[10px] text-emerald font-medium uppercase tracking-widest mb-2">Problem Statement</p>
            <p className="text-text-secondary text-xs leading-relaxed">{problemRefined}</p>
          </div>
        )}

        <GateBlock
          number={2}
          label="Approve Plan"
          active={isPlanProposed}
          locked={isIntake || isTeamProposed}
          lockedHint="Unlocks after the team is approved."
          complete={isPlanApproved}
        >
          {isTeamApproved && !actionPlan && <Gate2Loading />}
          {isPlanProposed && actionPlan && <ActionPlanDisplay plan={actionPlan} onApprovePlan={onApprovePlan} />}
          {isPlanApproved && <SessionDashboard sessionSaved={sessionSaved} plan={actionPlan} team={team} problemRefined={problemRefined} />}
        </GateBlock>

        <div className="gate-locked rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GateNumber number={3} locked />
              <span className="text-text-dim text-sm font-medium">Final Audit</span>
            </div>
            <span className="text-[10px] bg-forest-mid text-text-dim px-2 py-0.5 rounded-full font-mono tracking-wider">v2</span>
          </div>
          <p className="text-text-dim text-xs leading-relaxed">
            Lead audit and deploy approval stay locked in this validation build. Auth, credits, and payment gating are the Phase 4 priority.
          </p>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border-subtle p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-text-dim text-xs">Session Budget</span>
          <span className="text-text-secondary text-xs font-mono">${estimatedCostUSD} / $2.00</span>
        </div>
        <div className="h-1.5 bg-forest-mid rounded-full overflow-hidden">
          <div className="h-full budget-bar rounded-full transition-all duration-700" style={{ width: `${Math.max(budgetPercent, 1)}%` }} />
        </div>
        <p className="text-text-dim text-[10px] mt-1.5">Hard cap $2.00/session · payment required before Atlas runs</p>
      </div>
    </div>
  )
}

function ClipboardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="4" y="1" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 3H1.5A.5.5 0 0 0 1 3.5v7a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 10h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
