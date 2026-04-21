import { getFounderGrantCredits, getSessionPriceUsd, getViewerContext, json, requireAuthUser } from './_lib/server.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const { user } = await requireAuthUser(req)
    const viewer = await getViewerContext(user)

    return json(res, 200, {
      user: {
        id: user.id,
        email: user.email,
      },
      account: viewer.account,
      recentSessions: viewer.recentSessions,
      creditLedger: viewer.creditLedger,
      activeSession: viewer.activeSession,
      availableCredits: viewer.availableCredits,
      nextCreditSource: viewer.nextCreditSource,
      pricing: {
        sessionPriceUsd: getSessionPriceUsd(),
        founderGrantCredits: getFounderGrantCredits(),
      },
    })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message })
  }
}
