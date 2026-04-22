import { getOwnedSession, json, requireAuthUser } from './_lib/server.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const { user } = await requireAuthUser(req)
    const { id } = req.query

    if (!id) {
      return json(res, 400, { error: 'Session ID is required' })
    }

    // getOwnedSession already ensures the session belongs to the user
    // We just need the user's account ID. requireAuthUser returns user (auth.user).
    // Let's get the user account using the same function `ensureUserAccount` used in chat.js
    const { ensureUserAccount } = await import('./_lib/server.js')
    const account = await ensureUserAccount(user)

    const session = await getOwnedSession(id, account.id)

    return json(res, 200, { session })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message })
  }
}
