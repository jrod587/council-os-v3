import { getFounderGrantCredits, getSessionPriceUsd, getViewerContext, json, requireAuthUser, supabaseAdmin } from './_lib/server.js'

const SIGNUP_CREDITS = 2

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const { user } = await requireAuthUser(req)
    let viewer = await getViewerContext(user)

    // New user: no ledger entries, no credits, no sessions ever
    const isNewUser = (
      viewer.creditLedger.length === 0 &&
      (viewer.account.founder_credits_remaining ?? 0) === 0 &&
      (viewer.account.purchased_credits_remaining ?? 0) === 0 &&
      viewer.recentSessions.length === 0
    )

    if (isNewUser) {
      await supabaseAdmin
        .from('user_accounts')
        .update({ founder_credits_remaining: SIGNUP_CREDITS })
        .eq('id', viewer.account.id)

      await supabaseAdmin
        .from('credit_ledger')
        .insert({
          user_account_id: viewer.account.id,
          source_type: 'manual_adjustment',
          credit_delta: SIGNUP_CREDITS,
          notes: `Welcome bonus — ${SIGNUP_CREDITS} free starter credits on signup`,
        })

      // Re-fetch so the response reflects the granted credits
      viewer = await getViewerContext(user)
    }

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
      isNewUser,
      pricing: {
        sessionPriceUsd: getSessionPriceUsd(),
        founderGrantCredits: getFounderGrantCredits(),
      },
    })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message })
  }
}
