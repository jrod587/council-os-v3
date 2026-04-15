import { useState, useCallback } from 'react'
import LeftPanel from './components/LeftPanel.jsx'
import MiddlePanel from './components/MiddlePanel.jsx'
import RightPanel from './components/RightPanel.jsx'
import { createSession, updateSession, writeSessionSummary } from './lib/supabase.js'

export const STAGES = {
  INTAKE:         'intake',
  TEAM_PROPOSED:  'team_proposed',
  TEAM_APPROVED:  'team_approved',
  PLAN_PROPOSED:  'plan_proposed',
  PLAN_APPROVED:  'plan_approved',
}

const SESSION_BUDGET_USD = 2.00
// Gemini 2.5 Flash pricing (per 1K tokens): effectively $0 on free tier
// Paid tier: input $0.000075, output $0.0003 — keeping tracker for when billing kicks in
const costEstimate = (usage) =>
  ((usage.input * 0.000075 + usage.output * 0.0003) / 1000)

export default function App() {
  const [messages,        setMessages]        = useState([])
  const [stage,           setStage]           = useState(STAGES.INTAKE)
  const [isLoading,       setIsLoading]       = useState(false)
  const [sessionId,       setSessionId]       = useState(null)
  const [problemRefined,  setProblemRefined]  = useState('')
  const [team,            setTeam]            = useState([])
  const [actionPlan,      setActionPlan]      = useState(null)
  const [tokenUsage,      setTokenUsage]      = useState({ input: 0, output: 0 })
  const [sessionHistory,  setSessionHistory]  = useState([])
  const [error,           setError]           = useState(null)
  const [sessionSaved,    setSessionSaved]    = useState(false)

  const estimatedCostUSD = costEstimate(tokenUsage).toFixed(4)
  const budgetPercent    = Math.min((costEstimate(tokenUsage) / SESSION_BUDGET_USD) * 100, 100)

  // ─── Core send function ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (userText, { silent = false } = {}) => {
    if (!userText.trim() || isLoading) return
    setError(null)

    const userMsg      = { role: 'user', content: userText }
    const nextMessages = [...messages, userMsg]
    if (!silent) setMessages(nextMessages)
    else setMessages(prev => [...prev, userMsg]) // still track in history
    setIsLoading(true)

    try {
      // Create Supabase session on first message.
      let currentSessionId = sessionId
      if (!currentSessionId) {
        const session = await createSession(userText)
        if (session) {
          currentSessionId = session.id
          setSessionId(currentSessionId)
          setSessionHistory(prev => [{
            id:      currentSessionId,
            preview: userText.slice(0, 42) + (userText.length > 42 ? '…' : ''),
            stage:   'intake',
          }, ...prev])
        }
      }

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])

      if (data.usage) {
        setTokenUsage(prev => ({
          input:  prev.input  + (data.usage.input_tokens  || 0),
          output: prev.output + (data.usage.output_tokens || 0),
        }))
      }

      // ─── Stage: intake_complete → team_proposed ──────────────────────────
      if (data.stageTransition?.stage === 'intake_complete') {
        const refined  = data.stageTransition.problem_refined
        const newTeam  = data.stageTransition.team ?? []
        if (currentSessionId) {
          await updateSession(currentSessionId, {
            problem_refined: refined,
            status:          'team_proposed',
          })
        }
        setProblemRefined(refined)
        setTeam(newTeam)
        setStage(STAGES.TEAM_PROPOSED)
        setSessionHistory(prev =>
          prev.map(s => s.id === currentSessionId ? { ...s, stage: 'team_proposed' } : s)
        )
      }

      // ─── Stage: plan_ready → plan_proposed ──────────────────────────────
      if (data.stageTransition?.stage === 'plan_ready') {
        const plan = data.stageTransition.action_plan
        if (currentSessionId) {
          await updateSession(currentSessionId, { status: 'plan_proposed' })
        }
        setActionPlan(plan)
        setStage(STAGES.PLAN_PROPOSED)
        setSessionHistory(prev =>
          prev.map(s => s.id === currentSessionId ? { ...s, stage: 'plan_proposed' } : s)
        )
      }

    } catch (err) {
      setError(err.message)
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: `Something went wrong: ${err.message}`,
      }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, sessionId])

  // ─── Gate 1: Approve Team ───────────────────────────────────────────────────
  const approveTeam = useCallback(async () => {
    if (!sessionId) {
      setError('Session not initialized yet. Send the first message again to restore persistence.')
      return
    }

    try {
      await updateSession(sessionId, { status: 'team_approved' })
      setStage(STAGES.TEAM_APPROVED)
      setSessionHistory(prev =>
        prev.map(s => s.id === sessionId ? { ...s, stage: 'team_approved' } : s)
      )
      await sendMessage('[TEAM_APPROVED] The user has approved the council roster. Generate the structured action plan now based on the refined problem and the approved team composition.')
    } catch (err) {
      setError(err.message)
    }
  }, [sessionId, sendMessage])

  // ─── Gate 2: Approve Plan ───────────────────────────────────────────────────
  const approvePlan = useCallback(async () => {
    if (!sessionId) {
      setError('No persisted session found. Approval is blocked until Supabase is available.')
      return
    }

    try {
      await writeSessionSummary(sessionId, { team, actionPlan })
      setStage(STAGES.PLAN_APPROVED)
      setSessionSaved(true)
      setSessionHistory(prev =>
        prev.map(s => s.id === sessionId ? { ...s, stage: 'plan_approved' } : s)
      )
    } catch (err) {
      setError(err.message)
      setSessionSaved(false)
    }
  }, [sessionId, team, actionPlan])

  // ─── New session ────────────────────────────────────────────────────────────
  const startNewSession = useCallback(() => {
    setMessages([])
    setStage(STAGES.INTAKE)
    setSessionId(null)
    setProblemRefined('')
    setTeam([])
    setActionPlan(null)
    setTokenUsage({ input: 0, output: 0 })
    setError(null)
    setSessionSaved(false)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-forest-night">
      {/* Left — 240px fixed */}
      <LeftPanel
        sessions={sessionHistory}
        onNewSession={startNewSession}
        currentSessionId={sessionId}
      />

      {/* Middle — flex-1 */}
      <MiddlePanel
        messages={messages}
        isLoading={isLoading}
        stage={stage}
        onSendMessage={sendMessage}
        error={error}
      />

      {/* Right — 340px fixed */}
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
      />
    </div>
  )
}
