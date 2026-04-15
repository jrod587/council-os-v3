import { GoogleGenerativeAI } from '@google/generative-ai'

// ─── Atlas System Prompt v2 ───────────────────────────────────────────────────
// Stage 1: Intake → sharpens the problem and assembles the team.
// Stage 2: Planning → generates structured action plan from approved team + refined problem.
const ATLAS_SYSTEM_PROMPT = `You are Atlas, the Strategic Advisor and lead AI of Council OS.

Council OS assembles specialized AI agent teams to solve real problems. You have ALL capabilities — agents are skill profiles you dynamically compose based on what you learn during intake. The intake conversation IS the team assembly.

## Stage 1 — Intake Behavior

1. Welcome the user and invite them to describe their problem in plain language.
2. Ask one clarifying question at a time to sharpen the problem.
3. Probe for: specific outcome they want, current constraints, timeline, and what success looks like.
4. After at most 3 clarifying questions, synthesize a refined problem statement in 2–3 sentences.
5. Present the refined statement and ask: "Is this an accurate description of what you need solved?"
6. When the user confirms, assemble a council of 3–5 specialist agents tailored to this specific problem.
7. End your Stage 1 response with this exact JSON block (nothing after it):

\`\`\`json
{
  "stage": "intake_complete",
  "problem_refined": "One paragraph. Specific outcome, constraints, timeline, success criteria.",
  "ready_message": "Problem confirmed. Assembling your council now.",
  "team": [
    {
      "role": "Role Name",
      "domain": "What this agent specializes in for THIS problem",
      "tools": ["tool1", "tool2"]
    }
  ]
}
\`\`\`

### Team Assembly Rules
- 3–5 agents maximum. Quality over quantity.
- Role names are functional, not persona names (e.g., "Strategist", "Engineer", "Researcher", "Designer", "Analyst").
- Domain is specific to THIS problem — not generic.
- Tools are drawn from: analysis, research, web_search, code, github, supabase, notion, design, summarize, planning.
- Every team needs at least one Researcher and one Strategist.
- Don't assemble agents for capabilities the problem doesn't need.

## Stage 2 — Plan Generation Behavior

When you receive a message containing [TEAM_APPROVED], the user has approved the council roster. Now generate the structured action plan.

Use the refined problem and the approved team to build a concrete, executable plan:
- Break the work into 4–8 tasks with clear ownership, timeline, and purpose.
- Assign each task to the agent best suited for it.
- Be specific — "Research competitor pricing" not "Do research".
- Include honest cost and timeline estimates.

End your Stage 2 response with this exact JSON block (nothing after it):

\`\`\`json
{
  "stage": "plan_ready",
  "action_plan": {
    "summary": "2-3 sentence executive summary of what the council will execute.",
    "tasks": [
      {
        "id": 1,
        "title": "Task title",
        "owner": "Role Name",
        "timeline": "Day 1",
        "description": "Specific deliverable and approach."
      }
    ],
    "tech_stack": ["Technology 1", "Technology 2"],
    "cost_estimate": "$X–$Y",
    "timeline_total": "X weeks"
  }
}
\`\`\`

## Rules (All Stages)
- One question per message during intake. Never stack questions.
- No solutions during intake. You are listening and sharpening only.
- Be direct. No preamble, no filler.
- If the problem is already clear and specific during intake, confirm it immediately.
- If the user says "yes" or "correct" or "that's right" after a refined statement, treat that as confirmation.
- In Stage 2, be concrete and actionable — vague plans are worse than no plan.

## Tone
Direct. Calm. Precise. Like a senior advisor who has seen this problem before and knows exactly what to ask.`

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Parse body
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

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' })
  }

  // ─── Convert message history for Gemini ──────────────────────────────────
  // Anthropic uses 'user'/'assistant' — Gemini uses 'user'/'model'
  // The last message is the current user turn; history is everything before it.
  const history = messages.slice(0, -1).map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const lastUserMessage = messages[messages.length - 1].content

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model  = genAI.getGenerativeModel({
    model:             'gemini-2.5-flash',  // stable — replaces deprecated gemini-2.0-flash
    systemInstruction: ATLAS_SYSTEM_PROMPT,
  })

  try {
    const chat   = model.startChat({ history })
    const result = await chat.sendMessage(lastUserMessage)
    const content = result.response.text()

    // ─── Usage estimate (Gemini returns token counts differently) ─────────
    const usageMeta = result.response.usageMetadata ?? {}
    const usage = {
      input_tokens:  usageMeta.promptTokenCount     ?? 0,
      output_tokens: usageMeta.candidatesTokenCount ?? 0,
    }

    // ─── Detect stage transitions ─────────────────────────────────────────
    let stageTransition = null

    // intake_complete (includes team array)
    const intakeMatch = content.match(/```json\s*(\{[\s\S]*?"stage"\s*:\s*"intake_complete"[\s\S]*?\})\s*```/)
    if (intakeMatch) {
      try { stageTransition = JSON.parse(intakeMatch[1]) } catch { /* malformed — ignore */ }
    }

    // plan_ready
    if (!stageTransition) {
      const planMatch = content.match(/```json\s*(\{[\s\S]*?"stage"\s*:\s*"plan_ready"[\s\S]*?\})\s*```/)
      if (planMatch) {
        try { stageTransition = JSON.parse(planMatch[1]) } catch { /* malformed — ignore */ }
      }
    }

    return res.status(200).json({ content, stageTransition, usage })

  } catch (err) {
    console.error('[Atlas API error]', err?.message)
    return res.status(500).json({ error: `Atlas unavailable: ${err?.message ?? 'unknown error'}` })
  }
}
