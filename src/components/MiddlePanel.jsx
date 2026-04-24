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
  onApproveTeam,
  onApprovePlan,
  onSendMessage,
  error,
  authReady,
  isAuthenticated,
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
        ) : !isAuthenticated ? (
          <AuthGate
            authEmail={authEmail}
            setAuthEmail={setAuthEmail}
            onSendMagicLink={onSendMagicLink}
            authEmailSent={authEmailSent}
          />
        ) : !sessionReady ? (
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
              <FinalPlanDisplay plan={actionPlan} />
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

function AuthGate({ authEmail, setAuthEmail, onSendMagicLink, authEmailSent }) {
  return (
    <GateCard
      title="Sign in to unlock Council OS"
      body="Magic link only. No password flow. Sessions, credits, and purchases are tied to your real user account."
    >
      <div className="space-y-3">
        <input
          value={authEmail}
          onChange={(event) => setAuthEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-border-subtle bg-forest-panel px-4 py-3 text-sm text-text-primary placeholder-text-dim focus:outline-none focus:border-emerald/40"
        />
        <button
          onClick={onSendMagicLink}
          disabled={!authEmail.trim()}
          className="w-full rounded-xl border border-emerald/30 bg-emerald/15 px-4 py-3 text-sm font-medium text-emerald transition-colors hover:bg-emerald/25 disabled:opacity-40"
        >
          Send Magic Link
        </button>
        {authEmailSent && (
          <p className="text-xs text-text-secondary">
            Magic link sent. Open the email on this device and come back here after the redirect lands.
          </p>
        )}
      </div>
    </GateCard>
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

function FinalPlanDisplay({ plan }) {
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
    </div>
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
