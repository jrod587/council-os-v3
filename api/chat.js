import { GoogleGenerativeAI } from '@google/generative-ai'
import { ensureUserAccount, getOwnedSession, json, requireAuthUser, supabaseAdmin } from './_lib/server.js'

const ATLAS_SYSTEM_PROMPT = `You are Atlas, the Strategic Advisor and lead AI of Council OS.

Council OS assembles specialized AI agent teams to solve real problems. You have ALL capabilities - agents are skill profiles you dynamically compose based on what you learn during intake. The intake conversation IS the team assembly.

## Stage 1 - Intake Behavior

1. Welcome the user and invite them to describe their problem in plain language.
2. Ask one clarifying question at a time to sharpen the problem.
3. Probe for: specific outcome they want, current constraints, timeline, and what success looks like.
4. After at most 3 clarifying questions, synthesize a refined problem statement in 2-3 sentences.
5. Present the refined statement and ask: "Is this an accurate description of what you need solved?"
6. When the user confirms, assemble a council of 3-5 specialist agents tailored to this specific problem.
7. End your Stage 1 response with this exact JSON block (nothing after it):

\`\`\`json
{
  "stage": "intake_complete",
  "problem_refined": "One paragraph. Specific outcome, constraints, timeline, success criteria.",
  "ready_message": "Problem confirmed. Assembling your council now.",
  "team_rationale": "1-2 sentences explaining exactly why this specific mix of agents was chosen to solve the problem.",
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
- 3-5 agents maximum. Quality over quantity.
- Role names are functional, not persona names.
- Domain is specific to THIS problem - not generic.
- Tools are drawn from: analysis, research, web_search, code, github, supabase, notion, design, summarize, planning.
- Every team needs at least one Researcher and one Strategist.
- Don't assemble agents for capabilities the problem doesn't need.
- IMPORTANT: Provide a compelling \`team_rationale\` explaining why this council composition is the perfect fit.

## Stage 2 - Plan Generation Behavior

When you receive [TEAM_APPROVED], generate a comprehensive, specific action plan.
Use the refined problem and approved team. Write as a senior advisor presenting
a real engagement plan — not a generic template.

### Plan requirements:
- 5-8 phases. Each phase is a named deliverable, not a vague activity.
- Each phase has a clear Owner (the agent best suited), Timeline (hours or days),
  Deliverable (exactly what exists at the end of this phase), and a Description
  (2-3 sentences, plain prose — no markdown syntax, no bullet points inside description).
- Include the agent's reasoning: one sentence explaining why THIS agent owns this phase.
- Timeline should be realistic for autonomous AI execution (hours to a few days).
- Cost should be honest API compute costs ($50-$500 range, not thousands).
- Be specific to the user's actual problem — no generic filler phases.

### Prompt template per task:
For each phase, generate a prompt_template: a copy-paste prompt a human can use
in any LLM to execute that specific phase manually. Format:
"You are [role]. Context: [1-2 sentence problem summary]. Your task: [what to do].
Deliver: [specific output format]."

Keep prompt_template under 200 words. It should be immediately usable.

End your Stage 2 response with this JSON (nothing after it):

\`\`\`json
{
  "stage": "plan_ready",
  "action_plan": {
    "problem_statement": "Full restatement of the refined problem in 2-3 sentences.",
    "summary": "2-3 sentence executive summary of what this council will execute and the outcome.",
    "tasks": [
      {
        "id": 1,
        "title": "Phase title — specific and outcome-named",
        "owner": "Role Name",
        "agent_rationale": "One sentence: why this agent owns this phase.",
        "timeline": "Day 1",
        "deliverable": "The specific artifact or output that exists when this phase is done.",
        "description": "2-3 sentences of plain prose. What happens, how, and why it matters. No markdown syntax.",
        "prompt_template": "You are [role]. Context: [problem]. Your task: [action]. Deliver: [output]."
      }
    ],
    "tech_stack": ["Technology 1", "Technology 2"],
    "cost_estimate": "$50 - $150",
    "timeline_total": "3 days"
  }
}
\`\`\`

## Stage 1.5 — Team Revision

If the conversation history shows you've already emitted an \`intake_complete\` block and the user asks to change the team (swap an agent, add a role, remove someone), you are in revision mode.

- Acknowledge the change briefly (1-2 sentences max).
- Re-emit a complete updated \`intake_complete\` JSON block using the same \`problem_refined\` unless the user has clarified something new about the problem.
- The user controls when to finalize — never push them to approve. Just present the revised team.
- If the user asks a question about the team (e.g., "Why did you pick a Researcher?"), answer conversationally without re-emitting JSON.
- Only re-emit the JSON block when the user explicitly requests a change to the roster.

## Rules
- One question per message during intake.
- No solutions during intake.
- Be direct. No preamble, no filler.
- If the problem is already clear and specific during intake, confirm it immediately.
- If the user says "yes" or "correct" or "that's right" after a refined statement, treat that as confirmation.
- In Stage 2, be concrete and actionable.

## Tone
Direct. Calm. Precise. Like a senior advisor who has seen this problem before and knows exactly what to ask.`

function extractStageTransition(content) {
  const intakeMatch = content.match(/```json\s*(\{[\s\S]*?"stage"\s*:\s*"intake_complete"[\s\S]*?\})\s*```/)
  if (intakeMatch) {
    try { return JSON.parse(intakeMatch[1]) } catch { /* noop */ }
  }

  const planMatch = content.match(/```json\s*(\{[\s\S]*?"stage"\s*:\s*"plan_ready"[\s\S]*?\})\s*```/)
  if (planMatch) {
    try { return JSON.parse(planMatch[1]) } catch { /* noop */ }
  }

  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return json(res, 500, { error: 'GEMINI_API_KEY not configured on server' })
  }

  try {
    const { user } = await requireAuthUser(req)
    const account = await ensureUserAccount(user)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { messages, sessionId } = body

    if (!sessionId) {
      return json(res, 400, { error: 'sessionId is required' })
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json(res, 400, { error: 'messages array required' })
    }

    const session = await getOwnedSession(sessionId, account.id)

    if (session.credit_restored_at) {
      return json(res, 400, { error: 'This session credit was already restored. Start a new session.' })
    }

    if (session.status === 'completed') {
      return json(res, 400, { error: 'This session is already completed.' })
    }

    const history = messages.slice(0, -1).map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))
    const lastUserMessage = messages[messages.length - 1]?.content

    if (!lastUserMessage) {
      return json(res, 400, { error: 'Last user message missing' })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: ATLAS_SYSTEM_PROMPT,
    })

    try {
      const chat = model.startChat({ history })
      const result = await chat.sendMessage(lastUserMessage)
      const content = result.response.text()
      const usageMeta = result.response.usageMetadata ?? {}
      const usage = {
        input_tokens: usageMeta.promptTokenCount ?? 0,
        output_tokens: usageMeta.candidatesTokenCount ?? 0,
      }
      const stageTransition = extractStageTransition(content)

      const sessionUpdates = {}
      if (!session.bootstrap_complete_at) {
        sessionUpdates.bootstrap_complete_at = new Date().toISOString()
      }

      if (stageTransition?.stage === 'intake_complete') {
        sessionUpdates.problem_refined = stageTransition.problem_refined ?? null
        sessionUpdates.team = {
          members: stageTransition.team ?? [],
          rationale: stageTransition.team_rationale ?? null,
        }
        sessionUpdates.status = 'team_proposed'
      }

      if (stageTransition?.stage === 'plan_ready') {
        sessionUpdates.action_plan = stageTransition.action_plan ?? null
        sessionUpdates.status = 'plan_proposed'
      }

      if (messages.length === 1) {
        sessionUpdates.problem_raw = lastUserMessage
      }

      sessionUpdates.messages = [...messages, { role: 'assistant', content }]

      if (Object.keys(sessionUpdates).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('sessions')
          .update(sessionUpdates)
          .eq('id', session.id)

        if (updateError) {
          throw new Error(updateError.message)
        }
      }

      return json(res, 200, { content, stageTransition, usage })
    } catch (modelError) {
      if (!session.bootstrap_complete_at) {
        await supabaseAdmin.rpc('restore_session_credit', {
          p_session_id: session.id,
          p_reason: modelError?.message ?? 'Atlas bootstrap failed',
        })
      }

      console.error('[Atlas API error]', modelError?.message)
      return json(res, 500, {
        error: `Atlas unavailable: ${modelError?.message ?? 'unknown error'}`,
      })
    }
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message })
  }
}
