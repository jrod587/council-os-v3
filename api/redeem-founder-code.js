import { getViewerContext, json, requireAuthUser, supabaseAdmin } from './_lib/server.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const { user } = await requireAuthUser(req)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const code = String(body.code || '').trim()

    if (!code) {
      return json(res, 400, { error: 'Founder code is required' })
    }

    const { data, error } = await supabaseAdmin
      .rpc('redeem_founder_code', {
        p_auth_user_id: user.id,
        p_email: user.email ?? null,
        p_code: code,
      })
      .single()

    if (error) {
      return json(res, 400, { error: error.message })
    }

    const viewer = await getViewerContext(user)

    return json(res, 200, {
      redemption: data,
      account: viewer.account,
      availableCredits: viewer.availableCredits,
      nextCreditSource: viewer.nextCreditSource,
    })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message })
  }
}
