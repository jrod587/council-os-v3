import { useCallback, useEffect, useMemo, useState } from 'react'
import LeftPanel from './components/LeftPanel.jsx'
import MiddlePanel from './components/MiddlePanel.jsx'
import RightPanel from './components/RightPanel.jsx'
import {
  apiFetch,
  getCurrentSession,
  onAuthStateChange,
  signInWithMagicLink,
  signOutUser,
} from './lib/supabase.js'

export const STAGES = {
  INTAKE: 'intake',
  TEAM_PROPOSED: 'team_proposed',
  TEAM_APPROVED: 'team_approved',
  PLAN_PROPOSED: 'plan_proposed',
  PLAN_APPROVED: 'plan_approved',
}

const SESSION_BUDGET_USD = 2.0

const costEstimate = (usage) =>
  ((usage.input * 0.000075 + usage.output * 0.0003) / 1000)

function mapSessionStatusToStage(status) {
  switch (status) {
    case 'team_proposed':
      return STAGES.TEAM_PROPOSED
    case 'team_approved':
      return STAGES.TEAM_APPROVED
    case 'plan_proposed':
      return STAGES.PLAN_PROPOSED
    case 'completed':
      return STAGES.PLAN_APPROVED
    default:
      return STAGES.INTAKE
  }
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [stage, setStage] = useState(STAGES.INTAKE)
  const [isLoading, setIsLoading] = useState(false)
  const [isStartingSession, setIsStartingSession] = useState(false)
  const [isBuying, setIsBuying] = useState(false)
  const [isRedeemingFounderCode, setIsRedeemingFounderCode] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [authSession, setAuthSession] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [problemRefined, setProblemRefined] = useState('')
  const [team, setTeam] = useState([])
  const [teamRationale, setTeamRationale] = useState(null)
  const [actionPlan, setActionPlan] = useState(null)
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 })
  const [sessionSaved, setSessionSaved] = useState(false)
  const [error, setError] = useState(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authEmailSent, setAuthEmailSent] = useState(false)
  const [founderCode, setFounderCode] = useState('')
  const [viewer, setViewer] = useState(null)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [checkoutState, setCheckoutState] = useState(null)

  const estimatedCostUSD = costEstimate(tokenUsage).toFixed(4)
  const budgetPercent = Math.min((costEstimate(tokenUsage) / SESSION_BUDGET_USD) * 100, 100)
  const availableCredits = viewer?.availableCredits ?? 0
  const nextCreditSource = viewer?.nextCreditSource ?? null
  const sessionReady = Boolean(authSession?.user && sessionId)

  const hydrateSession = useCallback((session) => {
    if (!session) return

    setSessionId(session.id)
    setStage(mapSessionStatusToStage(session.status))
    setProblemRefined(session.problem_refined ?? '')

    // Handle both legacy arrays and new object format for team
    if (Array.isArray(session.team)) {
      setTeam(session.team)
      setTeamRationale(null)
    } else if (session.team && typeof session.team === 'object') {
      setTeam(session.team.members ?? [])
      setTeamRationale(session.team.rationale ?? null)
    } else {
      setTeam([])
      setTeamRationale(null)
    }

    setActionPlan(session.action_plan ?? null)
    setSessionSaved(session.status === 'completed')
  }, [])

  const resetSessionState = useCallback(() => {
    setMessages([])
    setStage(STAGES.INTAKE)
    setSessionId(null)
    setProblemRefined('')
    setTeam([])
    setTeamRationale(null)
    setActionPlan(null)
    setTokenUsage({ input: 0, output: 0 })
    setSessionSaved(false)
    setError(null)
  }, [])

  const refreshViewer = useCallback(async ({ preserveExisting = true } = {}) => {
    const current = await getCurrentSession().catch(() => null)
    if (!current?.user) {
      setViewer(null)
      return null
    }

    setViewerLoading(true)
    try {
      const payload = await apiFetch('/api/me', { method: 'GET' })
      setViewer(payload)

      if (preserveExisting && !sessionId && payload.activeSession) {
        hydrateSession(payload.activeSession)
      }

      return payload
    } finally {
      setViewerLoading(false)
    }
  }, [hydrateSession, sessionId])

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme')

    let mounted = true

    getCurrentSession()
      .then((session) => {
        if (!mounted) return
        setAuthSession(session)
        setAuthReady(true)
      })
      .catch(() => {
        if (!mounted) return
        setAuthReady(true)
      })

    const { data } = onAuthStateChange((session) => {
      if (!mounted) return
      setAuthSession(session)
      setAuthEmailSent(false)
      if (!session) {
        setViewer(null)
        resetSessionState()
      }
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [resetSessionState])

  useEffect(() => {
    if (!authReady || !authSession?.user) return
    refreshViewer()
  }, [authReady, authSession, refreshViewer])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (checkout) {
      setCheckoutState(checkout)
      params.delete('checkout')
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
      window.history.replaceState({}, '', nextUrl)
    }
  }, [])

  const loadPastSession = useCallback(async (pastSessionId) => {
    setError(null)
    setIsLoading(true)
    try {
      const payload = await apiFetch(`/api/session?id=${pastSessionId}`, { method: 'GET' })
      hydrateSession(payload.session)
      setMessages(payload.session.messages ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [hydrateSession])

  const startSession = useCallback(async () => {
    setError(null)
    setCheckoutState(null)
    setIsStartingSession(true)

    try {
      const payload = await apiFetch('/api/start-session', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      resetSessionState()
      hydrateSession(payload.session)

      if (payload.reusedExisting && payload.session.status !== 'intake') {
        setError('An unfinished session was reopened. Finish or clear it before starting another.')
      }

      await refreshViewer({ preserveExisting: false })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsStartingSession(false)
    }
  }, [hydrateSession, refreshViewer, resetSessionState])

  const sendMessage = useCallback(async (userText, { silent = false } = {}) => {
    if (!userText.trim() || isLoading || !sessionId) return
    setError(null)

    const userMsg = { role: 'user', content: userText }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setIsLoading(true)

    try {
      const data = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          messages: nextMessages,
        }),
      })

      if (!silent) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.content }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.content }])
      }

      if (data.usage) {
        setTokenUsage((prev) => ({
          input: prev.input + (data.usage.input_tokens || 0),
          output: prev.output + (data.usage.output_tokens || 0),
        }))
      }

      if (data.stageTransition?.stage === 'intake_complete') {
        setProblemRefined(data.stageTransition.problem_refined ?? '')
        setTeam(data.stageTransition.team ?? [])
        setTeamRationale(data.stageTransition.team_rationale ?? null)
        setStage(STAGES.TEAM_PROPOSED)
      }

      if (data.stageTransition?.stage === 'plan_ready') {
        setActionPlan(data.stageTransition.action_plan ?? null)
        setStage(STAGES.PLAN_PROPOSED)
      }

      await refreshViewer({ preserveExisting: false })
    } catch (err) {
      setError(err.message)
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Something went wrong: ${err.message}`,
      }])
      await refreshViewer({ preserveExisting: false })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, refreshViewer, sessionId])

  const approveTeam = useCallback(async () => {
    if (!sessionId) return
    setError(null)

    try {
      await apiFetch('/api/session-progress', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          action: 'approve_team',
        }),
      })

      setStage(STAGES.TEAM_APPROVED)
      await sendMessage('[TEAM_APPROVED] The user has approved the council roster. Generate the structured action plan now based on the refined problem and the approved team composition.', {
        silent: true,
      })
    } catch (err) {
      setError(err.message)
    }
  }, [sendMessage, sessionId])

  const approvePlan = useCallback(async () => {
    if (!sessionId) return
    setError(null)

    try {
      await apiFetch('/api/session-progress', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          action: 'approve_plan',
        }),
      })

      setStage(STAGES.PLAN_APPROVED)
      setSessionSaved(true)
      await refreshViewer({ preserveExisting: false })
    } catch (err) {
      setError(err.message)
    }
  }, [refreshViewer, sessionId])

  const handleCheckout = useCallback(async () => {
    setError(null)
    setIsBuying(true)

    try {
      const payload = await apiFetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      window.location.assign(payload.checkoutUrl)
    } catch (err) {
      setError(err.message)
      setIsBuying(false)
    }
  }, [])

  const handleRedeemFounderCode = useCallback(async () => {
    setError(null)
    setIsRedeemingFounderCode(true)

    try {
      await apiFetch('/api/redeem-founder-code', {
        method: 'POST',
        body: JSON.stringify({ code: founderCode }),
      })
      setFounderCode('')
      await refreshViewer({ preserveExisting: false })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsRedeemingFounderCode(false)
    }
  }, [founderCode, refreshViewer])

  const handleSendMagicLink = useCallback(async () => {
    setError(null)
    try {
      await signInWithMagicLink(authEmail)
      setAuthEmailSent(true)
    } catch (err) {
      setError(err.message)
    }
  }, [authEmail])

  const handleSignOut = useCallback(async () => {
    await signOutUser()
    setCheckoutState(null)
  }, [])

  const sessionHistory = useMemo(() => (
    viewer?.recentSessions?.map((session) => ({
      id: session.id,
      preview: session.problem_refined || session.problem_raw || 'New session',
      stage: session.status,
      accessGrantType: session.access_grant_type,
    })) ?? []
  ), [viewer])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-forest-night">
      <LeftPanel
        sessions={sessionHistory}
        onNewSession={resetSessionState}
        onSelectSession={loadPastSession}
        currentSessionId={sessionId}
        userEmail={authSession?.user?.email ?? null}
        onSignOut={handleSignOut}
        availableCredits={availableCredits}
        nextCreditSource={nextCreditSource}
        authReady={authReady}
      />

      <MiddlePanel
        messages={messages}
        isLoading={isLoading}
        stage={stage}
        team={team}
        teamRationale={teamRationale}
        actionPlan={actionPlan}
        onApproveTeam={approveTeam}
        onApprovePlan={approvePlan}
        onSendMessage={sendMessage}
        error={error}
        authReady={authReady}
        isAuthenticated={Boolean(authSession?.user)}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        onSendMagicLink={handleSendMagicLink}
        authEmailSent={authEmailSent}
        sessionReady={sessionReady}
        availableCredits={availableCredits}
        onStartSession={startSession}
        isStartingSession={isStartingSession}
        isBuying={isBuying}
        onCheckout={handleCheckout}
        founderCode={founderCode}
        setFounderCode={setFounderCode}
        onRedeemFounderCode={handleRedeemFounderCode}
        isRedeemingFounderCode={isRedeemingFounderCode}
        nextCreditSource={nextCreditSource}
        checkoutState={checkoutState}
        viewerLoading={viewerLoading}
      />

      <RightPanel
        stage={stage}
        problemRefined={problemRefined}
        team={team}
        actionPlan={actionPlan}
        budgetPercent={budgetPercent}
        estimatedCostUSD={estimatedCostUSD}
        sessionSaved={sessionSaved}
        onApproveTeam={approveTeam}
        onApprovePlan={approvePlan}
        isLoading={isLoading}
        isAuthenticated={Boolean(authSession?.user)}
        account={viewer?.account ?? null}
        availableCredits={availableCredits}
        nextCreditSource={nextCreditSource}
        checkoutState={checkoutState}
      />
    </div>
  )
}
