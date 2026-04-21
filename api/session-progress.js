import { getOwnedSession, json, requireAuthUser, ensureUserAccount, supabaseAdmin } from './_lib/server.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const { user } = await requireAuthUser(req)
    const account = await ensureUserAccount(user)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { sessionId, action } = body

    if (!sessionId || !action) {
      return json(res, 400, { error: 'sessionId and action are required' })
    }

    const session = await getOwnedSession(sessionId, account.id)

    if (action === 'approve_team') {
      const { data, error } = await supabaseAdmin
        .from('sessions')
        .update({ status: 'team_approved' })
        .eq('id', session.id)
        .select()
        .single()

      if (error) return json(res, 400, { error: error.message })
      return json(res, 200, { session: data })
    }

    if (action === 'approve_plan') {
      const { data, error } = await supabaseAdmin
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', session.id)
        .select()
        .single()

      if (error) return json(res, 400, { error: error.message })
      return json(res, 200, { session: data })
    }

    return json(res, 400, { error: 'Unknown action' })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message })
  }
}
