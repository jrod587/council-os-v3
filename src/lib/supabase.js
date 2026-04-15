import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Council OS] Supabase env vars missing — session persistence disabled.')
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function createSession(problemRaw = '') {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('sessions')
    .insert({ problem_raw: problemRaw, status: 'intake' })
    .select()
    .single()
  if (error) { console.error('[createSession]', error); return null }
  return data
}

export async function updateSession(id, updates) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('[updateSession]', error); return null }
  return data
}

/**
 * Gate 2 approval: write the completed session summary to Supabase.
 * Stores team roster (JSONB) + action plan (JSONB) + marks session completed.
 */
export async function writeSessionSummary(id, { team, actionPlan }) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('sessions')
    .update({
      team:        team        ?? null,
      action_plan: actionPlan  ?? null,
      status:      'completed',
      updated_at:  new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('[writeSessionSummary]', error); return null }
  return data
}
