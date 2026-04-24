import { useEffect, useRef, useState } from 'react'

const STAGE_LABELS = {
  intake: 'Stage 1 — Intake',
  team_proposed: 'Gate 1 — Refine & Approve Team',
  team_approved: 'Gate 2 — Generating Plan',
  plan_proposed: 'Gate 2 — Approve Plan',
  plan_approved: 'Session Complete',
}

export default function MiddlePanel({
  messages,
  isLoading,
  stage,
  team,
  teamRationale,
  actionPlan,
  problemRefined,
  onApproveTeam,
  onApprovePlan,
  onSendMessage,
  error,
  authReady,
  isAuthenticated,
  isNewUser,
  onDismissWelcome,
  authEmail,
  setAuthEmail,
  onSendMagicLink,
  authEmailSent,
  sessionReady,
  availableCredits,
  onStartSession,
  isStartingSession,
  isBuying,
  onCheckout,
  founderCode,
  setFounderCode,
  onRedeemFounderCode,
  isRedeemingFounderCode,
  nextCreditSource,
  checkoutState,
  viewerLoading,
}) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const isEmpty = messages.length === 0
  const isBlocked = !isAuthenticated || !sessionReady

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || isLoading || isBlocked) return
    onSendMessage(text)
    setInput('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  // Full-screen landing page for unauthenticated visitors
  if (authReady && !isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-forest-night overflow-y-auto">
        <LandingHero
          authEmail={authEmail}
          setAuthEmail={setAuthEmail}
          onSendMagicLink={onSendMagicLink}
          authEmailSent={authEmailSent}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-forest-night">
      <div className="h-14 flex items-center justify-between px-6 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLoading ? 'bg-gold animate-pulse' : 'bg-emerald'}`} />
          <span className="text-text-secondary text-sm font-medium">{STAGE_LABELS[stage] ?? 'Council OS'}</span>
        </div>
        <span className="text-text-dim text-xs font-mono">Atlas · Lead AI</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {!authReady ? (
          <GateCard title="Checking access" body="Loading your auth session and credits." />
        ) : !sessionReady ? (
          <>
            {isNewUser && <WelcomeBanner onDismiss={onDismissWelcome} />}
            <BillingGate
              availableCredits={availableCredits}
              onStartSession={onStartSession}
              isStartingSession={isStartingSession}
              isBuying={isBuying}
              onCheckout={onCheckout}
              founderCode={founderCode}
              setFounderCode={setFounderCode}
              onRedeemFounderCode={onRedeemFounderCode}
              isRedeemingFounderCode={isRedeemingFounderCode}
              nextCreditSource={nextCreditSource}
              checkoutState={checkoutState}
              viewerLoading={viewerLoading}
            />
          </>
        ) : (
          <>
            {isEmpty && <EmptyState />}
            {messages.map((message, index) => (
              <Message key={index} message={message} />
            ))}
            {stage === 'team_proposed' && team && team.length > 0 && (
              <Gate1ApprovalBanner team={team} rationale={teamRationale} onApprove={onApproveTeam} isLoading={isLoading} />
            )}
            {stage === 'plan_proposed' && actionPlan && (
              <Gate2ApprovalBanner plan={actionPlan} onApprove={onApprovePlan} isLoading={isLoading} />
            )}
            {stage === 'plan_approved' && actionPlan && (
              <FinalPlanDisplay plan={actionPlan} problemRefined={problemRefined} />
            )}
            {isLoading && <TypingIndicator />}
          </>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 px-6 py-4 border-t border-border-subtle">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !isAuthenticated
                ? 'Sign in with a magic link to unlock chat'
                : !sessionReady
                  ? 'Start a credited session before Atlas runs'
                  : stage === 'team_proposed'
                    ? 'Ask Atlas about the team, or approve it in the panel when ready...'
                    : 'Describe your problem...'
            }
            rows={1}
            disabled={isBlocked}
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            className="w-full bg-forest-panel border border-border-subtle rounded-xl px-4 py-3 pr-12 text-text-primary text-sm placeholder-text-dim resize-none focus:outline-none focus:border-emerald/40 transition-colors leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isBlocked}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-emerald/15 hover:bg-emerald/25 disabled:opacity-25 disabled:cursor-not-allowed text-emerald transition-all"
          >
            <SendIcon />
          </button>
        </form>
        <p className="text-text-dim text-[10px] mt-1.5 text-center">
          Magic link only · Founder credits spend before purchased credits
        </p>
      </div>
    </div>
  )
}

function LandingHero({ authEmail, setAuthEmail, onSendMagicLink, authEmailSent }) {
  const steps = [
    {
      num: '01',
      title: 'Describe the problem',
      body: 'Drop in your raw idea, challenge, or question. Atlas sharpens it into something precise before anything else happens.',
    },
    {
      num: '02',
      title: 'Approve your council',
      body: 'AI assembles the right domain experts and tells you exactly why each one is at the table. Adjust or approve.',
    },
    {
      num: '03',
      title: 'Get the plan',
      body: 'A structured action plan with tasks, owners, and timelines. Export to Notion, Linear, or anywhere.',
    },
  ]

  const roadmap = [
    'Council Teams — share sessions with real collaborators',
    'Async mode — drop a problem, get the plan in your inbox',
    'Direct exports — push to Notion, Linear, GitHub Issues',
    'Custom agent library — build and save your own council',
  ]

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="flex flex-col items-center text-center px-8 pt-20 pb-14">
        <div className="mb-8">
          <svg width="56" height="62" viewBox="0 0 72 78" fill="none">
            <polygon points="36,2 68,19 68,59 36,76 4,59 4,19"
              fill="rgb(var(--color-emerald) / 0.08)"
              stroke="rgb(var(--color-emerald) / 0.5)"
              strokeWidth="1.5"
            />
            <polygon points="36,16 56,27 56,51 36,62 16,51 16,27"
              fill="rgb(var(--color-emerald) / 0.05)"
              stroke="rgb(var(--color-emerald) / 0.2)"
              strokeWidth="1"
            />
            <circle cx="36" cy="39" r="5" fill="rgb(var(--color-emerald))" opacity="0.7" />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald/20 bg-emerald/5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
          <span className="text-emerald text-[11px] font-medium tracking-wide">First 2 sessions are on us · No card needed</span>
        </div>

        <h1 className="text-4xl font-bold text-text-primary leading-tight mb-5 max-w-xl" style={{ letterSpacing: '-0.02em' }}>
          Your problem.<br />
          <span style={{ color: 'rgb(var(--color-emerald))' }}>A council of AI agents.</span><br />
          A plan you can act on.
        </h1>

        <p className="text-text-secondary text-base leading-relaxed max-w-lg mb-10">
          Stop switching tabs between AI tools. Council OS breaks your problem down, assembles the right experts, and delivers a structured action plan — in minutes, not hours. And you get something you can go back to.
        </p>

        <div className="w-full max-w-sm">
          {!authEmailSent ? (
            <div className="space-y-3">
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && authEmail.trim() && onSendMagicLink()}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-border-subtle bg-forest-panel px-4 py-3.5 text-sm text-text-primary placeholder-text-dim focus:outline-none focus:border-emerald/50 transition-colors text-center"
              />
              <button
                onClick={onSendMagicLink}
                disabled={!authEmail.trim()}
                className="w-full rounded-xl border border-emerald/40 bg-emerald/15 px-4 py-3.5 text-sm font-semibold text-emerald transition-all hover:bg-emerald/25 hover:border-emerald/60 disabled:opacity-40"
                style={{ boxShadow: '0 0 20px rgb(var(--color-emerald) / 0.1)' }}
              >
                Start for free →
              </button>
              <p className="text-text-dim text-[11px]">Magic link only · No password · No card required</p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald/20 px-5 py-4 space-y-1" style={{ background: 'rgb(var(--color-emerald) / 0.08)' }}>
              <p className="text-emerald text-sm font-medium">Check your inbox</p>
              <p className="text-text-secondary text-xs">Magic link sent. Open it on this device — you'll land right back here.</p>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-border-subtle px-8 pt-12 pb-14">
        <p className="text-center text-[10px] uppercase tracking-widest text-text-dim mb-10">How it works</p>
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          {steps.map((step) => (
            <div key={step.num} className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl border border-emerald/20 flex items-center justify-center mb-4" style={{ background: 'rgb(var(--color-emerald) / 0.08)' }}>
                <span className="text-emerald text-xs font-bold font-mono">{step.num}</span>
              </div>
              <h3 className="text-text-primary text-sm font-semibold mb-2">{step.title}</h3>
              <p className="text-text-secondary text-xs leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Moat */}
      <div className="border-t border-border-subtle bg-forest-panel/30 px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] uppercase tracking-widest text-emerald mb-4">Why not just ChatGPT?</p>
          <p className="text-text-secondary text-sm leading-relaxed mb-3">
            ChatGPT gives you a conversation. Council OS gives you a <em>council</em> — a structured team of domain-specific agents that debate your problem, then hand you a concrete artifact you can act on. Not a transcript. A plan.
          </p>
          <p className="text-text-dim text-xs leading-relaxed">
            The gate flow forces problem refinement before any plan is generated. Each agent has a defined role and domain. The output is structured, exportable, and designed to be revisited — not lost in a chat window.
          </p>
        </div>
      </div>

      {/* Roadmap */}
      <div className="border-t border-border-subtle px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] uppercase tracking-widest text-text-dim mb-6">What's coming</p>
          <div className="grid grid-cols-2 gap-3">
            {roadmap.map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-xs text-text-secondary">
                <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-emerald/20 flex items-center justify-center" style={{ background: 'rgb(var(--color-emerald) / 0.08)' }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4h5M4 1.5L6.5 4 4 6.5" stroke="rgb(var(--color-emerald))" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border-subtle px-8 py-5 flex items-center justify-between">
        <p className="text-text-dim text-[10px]">Built by Jeff Rodriguez · Council OS v3</p>
        <button
          onClick={() => document.getElementById('policy-inline')?.classList.toggle('hidden')}
          className="text-text-dim text-[10px] underline hover:text-text-secondary transition-colors"
        >
          Refund Policy
        </button>
      </div>
      <div id="policy-inline" className="hidden border-t border-border-subtle px-8 py-5">
        <p className="text-text-dim text-xs leading-relaxed max-w-2xl mx-auto">
          <strong className="text-text-secondary">Session Credits:</strong> Credits are consumed when a session starts. If Atlas fails before meaningful output is generated, your credit is automatically restored. No partial refunds on completed sessions. Email the address from your magic link with any questions.
        </p>
      </div>
    </div>
  )
}

function WelcomeBanner({ onDismiss }) {
  return (
    <div className="rounded-xl border border-emerald/30 p-4 flex items-start gap-4" style={{ background: 'rgb(var(--color-emerald) / 0.06)' }}>
      <div className="flex-shrink-0 w-9 h-9 rounded-lg border border-emerald/20 flex items-center justify-center text-lg leading-none" style={{ background: 'rgb(var(--color-emerald) / 0.12)' }}>
        👋
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-emerald font-semibold text-sm mb-1">Welcome to Council OS</p>
        <p className="text-text-secondary text-xs leading-relaxed">
          You have <strong className="text-text-primary">2 free sessions</strong> loaded — no card needed. Start a session below to bring your first problem to the council.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-text-dim hover:text-text-secondary transition-colors text-xl leading-none mt-0.5 px-1"
        aria-label="Dismiss welcome banner"
      >
        ×
      </button>
    </div>
  )
}

function BillingGate({
  availableCredits,
  onStartSession,
  isStartingSession,
  isBuying,
  onCheckout,
  founderCode,
  setFounderCode,
  onRedeemFounderCode,
  isRedeemingFounderCode,
  nextCreditSource,
  checkoutState,
  viewerLoading,
}) {
  return (
    <GateCard
      title="Load access before Atlas runs"
      body="Payment or founder redemption happens before session bootstrap. If bootstrap fails before Atlas meaningfully starts, the consumed credit is restored."
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border-subtle bg-forest-mid/40 p-4">
          <p className="text-[10px] uppercase tracking-widest text-text-dim mb-2">Credits</p>
          <p className="text-2xl font-semibold text-text-primary">{viewerLoading ? '...' : availableCredits}</p>
          <p className="text-xs text-text-secondary mt-1">
            {availableCredits > 0
              ? nextCreditSource === 'founder'
                ? 'Founder credit will be consumed first.'
                : 'Purchased credit is ready to consume.'
              : 'No active session credits loaded yet.'}
          </p>
        </div>

        {checkoutState === 'success' && (
          <p className="rounded-lg border border-emerald/20 bg-emerald/10 px-3 py-2 text-xs text-emerald">
            Stripe returned successfully. Refreshing credits from the webhook source of truth.
          </p>
        )}

        {checkoutState === 'cancelled' && (
          <p className="rounded-lg border border-border-subtle bg-forest-panel px-3 py-2 text-xs text-text-secondary">
            Checkout was cancelled. No credit was consumed.
          </p>
        )}

        {availableCredits > 0 ? (
          <button
            onClick={onStartSession}
            disabled={isStartingSession}
            className="w-full rounded-xl border border-emerald/30 bg-emerald/15 px-4 py-3 text-sm font-medium text-emerald transition-colors hover:bg-emerald/25 disabled:opacity-40"
          >
            {isStartingSession ? 'Starting session…' : 'Start Credited Session'}
          </button>
        ) : (
          <>
            <button
              onClick={onCheckout}
              disabled={isBuying}
              className="w-full rounded-xl border border-emerald/30 bg-emerald/15 px-4 py-3 text-sm font-medium text-emerald transition-colors hover:bg-emerald/25 disabled:opacity-40"
            >
              {isBuying ? 'Opening Stripe…' : 'Buy 1 Session Credit - $7'}
            </button>

            <div className="rounded-xl border border-border-subtle bg-forest-panel p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-text-dim">Founder Code</p>
              <input
                value={founderCode}
                onChange={(event) => setFounderCode(event.target.value.toUpperCase())}
                placeholder="FOUNDER-CODE"
                className="w-full rounded-xl border border-border-subtle bg-forest-mid px-4 py-3 text-sm text-text-primary placeholder-text-dim focus:outline-none focus:border-emerald/40"
              />
              <button
                onClick={onRedeemFounderCode}
                disabled={!founderCode.trim() || isRedeemingFounderCode}
                className="w-full rounded-xl border border-border-subtle bg-forest-mid px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:border-emerald/30 hover:text-emerald disabled:opacity-40"
              >
                {isRedeemingFounderCode ? 'Redeeming…' : 'Redeem Founder Code'}
              </button>
            </div>
          </>
        )}
      </div>
    </GateCard>
  )
}

function GateCard({ title, body, children }) {
  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-border-subtle bg-forest-panel/80 p-6 space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-emerald mb-2">Access Gate</p>
        <h2 className="text-xl font-semibold text-text-primary mb-2">{title}</h2>
        <p className="text-sm leading-relaxed text-text-secondary">{body}</p>
      </div>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="mb-6 opacity-30">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <polygon points="26,2 48,14 48,38 26,50 4,38 4,14" fill="none" stroke="rgb(var(--color-emerald))" strokeWidth="1.5" />
          <polygon points="26,12 38,19 38,33 26,40 14,33 14,19" fill="rgb(var(--color-emerald))" opacity="0.12" />
          <circle cx="26" cy="26" r="4" fill="rgb(var(--color-emerald))" opacity="0.5" />
        </svg>
      </div>
      <h2 className="text-text-primary text-lg font-semibold mb-2">Bring your problem.</h2>
      <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
        Atlas will sharpen it, assemble the right team, and stop at each approval gate before moving forward.
      </p>
    </div>
  )
}

function Gate1ApprovalBanner({ team, rationale, onApprove, isLoading }) {
  return (
    <div className="rounded-xl border border-emerald/20 bg-emerald/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald flex-shrink-0" />
        <p className="text-xs uppercase tracking-widest text-emerald font-semibold">Council Assembled</p>
      </div>

      {rationale && (
        <div className="text-sm leading-relaxed text-text-secondary bg-forest-mid/50 p-3 rounded-lg border border-border-subtle">
          <span className="text-emerald font-medium block mb-1">Atlas's Rationale:</span>
          {rationale}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {team.map((agent, index) => (
          <div key={index} className="flex items-start gap-3 bg-forest-night p-3 rounded-lg border border-border-subtle">
            <span className="flex-shrink-0 w-8 h-8 rounded bg-emerald/10 border border-emerald/20 flex items-center justify-center text-xs font-bold font-mono text-emerald">
              {agent?.role?.charAt(0) ?? '?'}
            </span>
            <div className="min-w-0">
              <p className="text-text-primary text-sm font-semibold leading-tight mb-0.5">{agent?.role ?? 'Agent'}</p>
              <p className="text-text-dim text-[11px] leading-snug line-clamp-2">{agent?.domain ?? 'Unknown domain'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-emerald/10">
        <p className="text-text-dim text-xs leading-relaxed max-w-sm">
          Ask Atlas to adjust the roster, or approve the council to proceed to the action plan.
        </p>
        <button
          onClick={onApprove}
          disabled={isLoading}
          className="flex-shrink-0 py-2.5 px-6 rounded-xl bg-emerald hover:bg-emerald/90 text-forest-night text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(var(--color-emerald)/0.3)]"
        >
          {isLoading ? 'Generating plan…' : 'Approve Council'}
        </button>
      </div>
    </div>
  )
}

function Gate2ApprovalBanner({ plan, onApprove, isLoading }) {
  return (
    <div className="rounded-xl border border-emerald/20 bg-emerald/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald flex-shrink-0" />
        <p className="text-xs uppercase tracking-widest text-emerald font-semibold">Plan Generated</p>
      </div>

      <div className="text-sm leading-relaxed text-text-secondary bg-forest-mid/50 p-4 rounded-lg border border-border-subtle">
        <span className="text-emerald font-medium block mb-2">Executive Summary:</span>
        {plan.summary}
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-text-dim block text-[10px] uppercase tracking-widest mb-1">Estimated Cost</span>
          <span className="text-text-primary font-medium">{plan.cost_estimate}</span>
        </div>
        <div>
          <span className="text-text-dim block text-[10px] uppercase tracking-widest mb-1">Timeline</span>
          <span className="text-text-primary font-medium">{plan.timeline_total}</span>
        </div>
        <div>
          <span className="text-text-dim block text-[10px] uppercase tracking-widest mb-1">Tasks</span>
          <span className="text-text-primary font-medium">{plan.tasks?.length ?? 0}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-emerald/10">
        <p className="text-text-dim text-xs leading-relaxed max-w-sm">
          Ask Atlas for revisions, or approve the action plan to finalize the session.
        </p>
        <button
          onClick={onApprove}
          disabled={isLoading}
          className="flex-shrink-0 py-2.5 px-6 rounded-xl bg-emerald hover:bg-emerald/90 text-forest-night text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(var(--color-emerald)/0.3)]"
        >
          {isLoading ? 'Finalizing…' : 'Approve Plan'}
        </button>
      </div>
    </div>
  )
}

function FinalPlanDisplay({ plan, problemRefined }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-forest-panel p-6 space-y-6 mt-4 shadow-xl">
      <div className="pb-4 border-b border-border-subtle">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Final Action Plan</h2>
        <p className="text-text-secondary leading-relaxed">{plan.summary}</p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm bg-forest-night p-4 rounded-xl border border-border-subtle">
        <div className="flex-1 min-w-[120px]">
          <span className="text-emerald block text-[10px] uppercase tracking-widest font-medium mb-1">Estimated Cost</span>
          <span className="text-text-primary font-medium">{plan.cost_estimate}</span>
        </div>
        <div className="flex-1 min-w-[120px]">
          <span className="text-emerald block text-[10px] uppercase tracking-widest font-medium mb-1">Timeline</span>
          <span className="text-text-primary font-medium">{plan.timeline_total}</span>
        </div>
        <div className="flex-2 min-w-[200px]">
          <span className="text-emerald block text-[10px] uppercase tracking-widest font-medium mb-1">Tech Stack</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(plan.tech_stack ?? []).map((tech) => (
              <span key={tech} className="text-xs bg-emerald/10 text-emerald px-2 py-0.5 rounded border border-emerald/20">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm uppercase tracking-widest text-text-dim font-medium">Task Breakdown</h3>
        <div className="grid grid-cols-1 gap-3">
          {(plan.tasks ?? []).map((task, index) => (
            <div key={task?.id ?? index} className="bg-forest-mid/30 p-4 rounded-xl border border-border-subtle hover:border-emerald/30 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h4 className="text-text-primary font-medium">{task?.id ?? index + 1}. {task?.title ?? 'Task'}</h4>
                <span className="flex-shrink-0 text-[10px] bg-forest-night border border-border-subtle px-2 py-1 rounded text-text-dim whitespace-nowrap">
                  {task?.timeline ?? 'Unknown timeline'}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{task?.description ?? ''}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald/10 border border-emerald/20 flex items-center justify-center text-[9px] font-bold font-mono text-emerald">
                  {task?.owner?.charAt(0) ?? '?'}
                </span>
                <span className="text-xs text-emerald font-medium">{task?.owner ?? 'Unknown owner'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ExportBlock plan={plan} problemRefined={problemRefined} />
    </div>
  )
}

function ExportBlock({ plan, problemRefined }) {
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
        lines.push(`### ${task.id ?? ''}. ${task.title ?? 'Task'}`)
        lines.push(`**Owner:** ${task.owner ?? '—'} · **Timeline:** ${task.timeline ?? '—'}`)
        lines.push('')
        lines.push(task.description ?? '')
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
    if (meta.length > 0) {
      lines.push('## Summary')
      lines.push(meta.join('  \n'))
    }
    return lines.join('\n')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown())
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
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
    <div className="pt-4 border-t border-border-subtle space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-emerald font-semibold">Export Deliverable</p>
          <p className="text-text-dim text-[11px] mt-0.5">Paste into Notion, Linear, or any planning tool.</p>
        </div>
        <span className="text-[9px] bg-emerald/10 text-emerald border border-emerald/20 px-2 py-0.5 rounded font-mono">markdown</span>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200 ${
            copied
              ? 'border-emerald/50 bg-emerald/15 text-emerald'
              : 'border-border-subtle bg-forest-mid hover:border-emerald/40 hover:bg-emerald/10 hover:text-emerald text-text-secondary'
          }`}
        >
          {copied ? <CheckIcon /> : <ClipboardIcon />}
          {copied ? 'Copied!' : 'Copy Markdown'}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border-subtle bg-forest-mid hover:border-emerald/40 hover:bg-emerald/10 hover:text-emerald text-text-secondary text-sm font-medium transition-all duration-200"
        >
          <DownloadIcon />
          Download .md
        </button>
      </div>
    </div>
  )
}

function ClipboardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="4.5" y="1" width="7" height="9.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 3.5H2A1 1 0 0 0 1 4.5v7A1 1 0 0 0 2 12.5h6a1 1 0 0 0 1-1V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 6.5L5 9.5L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1v8M4 6.5L6.5 9 9 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 11h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function Message({ message }) {
  if (!message || typeof message.content !== 'string') return null

  const isUser = message.role === 'user'

  const displayContent = isUser
    ? message.content.replace(/\[TEAM_APPROVED\][\s\S]*/g, '').trim()
    : message.content.replace(/```json[\s\S]*?```/g, '').trim()

  if (!displayContent) return null

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Avatar label="A" color="emerald" />}
      <div className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser ? 'message-user text-text-primary' : 'message-atlas text-text-secondary'
      }`}>
        {displayContent}
      </div>
      {isUser && <Avatar label="J" color="dim" />}
    </div>
  )
}

function Avatar({ label, color }) {
  const styles = {
    emerald: 'bg-emerald/15 border-emerald/30 text-emerald',
    dim: 'bg-forest-panel border-border-subtle text-text-dim',
  }

  return (
    <div className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono font-bold ${styles[color]}`}>
      {label}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <Avatar label="A" color="emerald" />
      <div className="message-atlas px-4 py-3.5 flex items-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <span key={index} className="w-1.5 h-1.5 rounded-full bg-text-dim typing-dot" />
        ))}
      </div>
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M13 2L6.5 8.5M13 2L8.5 13L6.5 8.5M13 2L1.5 5.5L6.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
