import { getOwnedSession, getViewerContext, json, requireAuthUser, supabaseAdmin } from './_lib/server.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const { user } = await requireAuthUser(req)
    const viewer = await getViewerContext(user)

    if (viewer.activeSession) {
      const hydrated = await getOwnedSession(viewer.activeSession.id, viewer.account.id)
      return json(res, 200, {
        session: hydrated,
        reusedExisting: true,
      })
    }

    const { data, error } = await supabaseAdmin
      .rpc('start_user_session', {
        p_auth_user_id: user.id,
      })
      .single()

    if (error) {
      return json(res, 400, { error: error.message })
    }

    return json(res, 200, {
      session: data,
      reusedExisting: false,
    })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message })
  }
}
