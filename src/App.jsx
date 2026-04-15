import { useState, useCallback } from 'react'
import LeftPanel from './components/LeftPanel.jsx'
import MiddlePanel from './components/MiddlePanel.jsx'
import RightPanel from './components/RightPanel.jsx'
import { createSession, updateSession } from './lib/supabase.js'

export const STAGES = {
  INTAKE:        'intake',
  TEAM_PROPOSED: 'team_proposed',
  TEAM_APPROVED: 'team_approved',
  PLANNING:      'planning',
  PLAN_APPROVED: 'plan_approved',
}

const SESSION_BUDGET_USD = 2.00
// Sonnet pricing (per 1K tokens): input $0.003, output $0.015
const costEstimate = (usage) =>
  ((usage.input * 0.003 + usage.output * 0.015) / 1000)

export default function App() {
  const [messages,        setMessages]        = useState([])
  const [stage,           setStage]           = useState(STAGES.INTAKE)
  const [isLoading,       setIsLoading]       = useState(false)
  const [sessionId,       setSessionId]       = useState(null)
  const [problemRefined,  setProblemRefined]  = useState('')
  const [tokenUsage,      setTokenUsage]      = useState({ input: 0, output: 0 })
  const [sessionHistory,  setSessionHistory]  = useState([])
  const [error,           setError]           = useState(null)

  const estimatedCostUSD = costEstimate(tokenUsage).toFixed(4)
  const budgetPercent    = Math.min((costEstimate(tokenUsage) / SESSION_BUDGET_USD) * 100, 100)

  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim() || isLoading) return
    setError(null)

    const userMsg      = { role: 'user', content: userText }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setIsLoading(true)

    // Create Supabase session on first message
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

    try {
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

      // Stage transition: intake complete → team assembly
      if (data.stageTransition?.stage === 'intake_complete') {
        const refined = data.stageTransition.problem_refined
        setProblemRefined(refined)
        setStage(STAGES.TEAM_PROPOSED)
        if (currentSessionId) {
          await updateSession(currentSessionId, {
            problem_refined: refined,
            status:          'team_proposed',
          })
        }
        setSessionHistory(prev =>
          prev.map(s => s.id === currentSessionId ? { ...s, stage: 'team_proposed' } : s)
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

  const startNewSession = useCallback(() => {
    setMessages([])
    setStage(STAGES.INTAKE)
    setSessionId(null)
    setProblemRefined('')
    setTokenUsage({ input: 0, output: 0 })
    setError(null)
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
        budgetPercent={budgetPercent}
        estimatedCostUSD={estimatedCostUSD}
      />
    </div>
  )
}
