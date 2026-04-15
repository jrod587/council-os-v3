import { useState, useRef, useEffect } from 'react'

const STAGE_LABELS = {
  intake:        'Stage 1 — Intake',
  team_proposed: 'Gate 1 — Approve Team',
  team_approved: 'Stage 3 — Council Session',
  planning:      'Stage 3 — Planning',
  plan_approved: 'Gate 2 — Approve Plan',
}

export default function MiddlePanel({ messages, isLoading, stage, onSendMessage, error }) {
  const [input,      setInput]      = useState('')
  const messagesEndRef              = useRef(null)
  const inputRef                    = useRef(null)
  const isEmpty                     = messages.length === 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    onSendMessage(text)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-forest-night">

      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isLoading ? 'bg-gold animate-pulse' : 'bg-emerald'
          }`} />
          <span className="text-text-secondary text-sm font-medium">
            {STAGE_LABELS[stage] ?? 'Council OS'}
          </span>
        </div>
        <span className="text-text-dim text-xs font-mono">Atlas · Lead AI</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {isEmpty && <EmptyState />}

        {messages.map((msg, i) => (
          <Message key={i} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}

        {error && (
          <div className="text-xs text-red-400/70 text-center py-2">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border-subtle">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your problem..."
            rows={1}
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            className="w-full bg-forest-panel border border-border-subtle rounded-xl px-4 py-3 pr-12 text-text-primary text-sm placeholder-text-dim resize-none focus:outline-none focus:border-emerald/40 transition-colors leading-relaxed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-emerald/15 hover:bg-emerald/25 disabled:opacity-25 disabled:cursor-not-allowed text-emerald transition-all"
          >
            <SendIcon />
          </button>
        </form>
        <p className="text-text-dim text-[10px] mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="mb-6 opacity-30">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <polygon points="26,2 48,14 48,38 26,50 4,38 4,14"
            fill="none" stroke="#22D365" strokeWidth="1.5"/>
          <polygon points="26,12 38,19 38,33 26,40 14,33 14,19"
            fill="#22D365" opacity="0.12"/>
          <circle cx="26" cy="26" r="4" fill="#22D365" opacity="0.5"/>
        </svg>
      </div>
      <h2 className="text-text-primary text-lg font-semibold mb-2">
        Bring your problem.
      </h2>
      <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
        Atlas will ask a few questions to understand it,
        then assemble the right team to solve it.
      </p>
    </div>
  )
}

function Message({ message }) {
  const isUser = message.role === 'user'

  // Strip JSON stage-transition blocks from display
  const displayContent = isUser
    ? message.content
    : message.content
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/\{[\s\S]*?"stage"\s*:\s*"intake_complete"[\s\S]*?\}/g, '')
        .trim()

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
    dim:     'bg-forest-panel border-border-subtle text-text-dim',
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
        {[0,1,2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-text-dim typing-dot" />
        ))}
      </div>
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M13 2L6.5 8.5M13 2L8.5 13L6.5 8.5M13 2L1.5 5.5L6.5 8.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
