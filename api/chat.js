import Anthropic from '@anthropic-ai/sdk'

// ─── Atlas System Prompt v1 ───────────────────────────────────────────────────
// Stage 1: Intake only. Sharpens the problem before team assembly.
// Stage transition signal: JSON block with "stage": "intake_complete"
const ATLAS_SYSTEM_PROMPT = `You are Atlas, the Strategic Advisor and lead AI of Council OS.

Council OS assembles specialized AI teams to solve real problems. Your job in Stage 1 is to understand the user's problem deeply before assembling anyone. The quality of the council depends entirely on how well you understand the problem first.

## Stage 1 — Intake Behavior

1. Welcome the user and invite them to describe their problem in plain language.
2. Ask one clarifying question at a time to sharpen the problem.
3. Probe for: specific outcome they want, current constraints, timeline, and what success looks like.
4. After at most 3 clarifying questions, synthesize a refined problem statement in 2–3 sentences.
5. Present the refined statement and ask: "Is this an accurate description of what you need solved?"
6. When the user confirms, end with this exact JSON block (nothing after it):

\`\`\`json
{
  "stage": "intake_complete",
  "problem_refined": "One paragraph. Specific outcome, constraints, timeline, success criteria.",
  "ready_message": "Problem confirmed. I'll now assemble your council."
}
\`\`\`

## Rules
- One question per message. Never stack questions.
- No solutions yet. You are listening and sharpening only.
- Be direct. No preamble, no filler.
- If the problem is already clear and specific, confirm it immediately — don't over-interrogate.
- If the user says "yes" or "correct" or "that's right" after you present a refined statement, treat that as confirmation.

## Tone
Direct. Calm. Precise. Like a senior advisor who has seen this problem before and knows exactly what to ask.`

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Parse body (Vercel auto-parses JSON, but handle both cases)
  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const { messages } = body
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     ATLAS_SYSTEM_PROMPT,
      messages,
    })

    const content = response.content[0]?.text ?? ''

    // Detect stage transition (JSON block from Atlas)
    let stageTransition = null
    const jsonMatch = content.match(/```json\s*(\{[\s\S]*?"stage"\s*:\s*"intake_complete"[\s\S]*?\})\s*```/)
    if (jsonMatch) {
      try { stageTransition = JSON.parse(jsonMatch[1]) } catch { /* malformed — ignore */ }
    }

    return res.status(200).json({
      content,
      stageTransition,
      usage: response.usage,
    })
  } catch (err) {
    console.error('[Atlas API error]', err?.message)
    return res.status(500).json({ error: 'Atlas unavailable. Check ANTHROPIC_API_KEY.' })
  }
}
