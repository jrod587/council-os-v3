import {
  ensureUserAccount,
  getAppUrl,
  getPurchasedCreditsPerCheckout,
  getSessionPriceUsd,
  json,
  requireAuthUser,
  stripe,
} from './_lib/server.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (!stripe) {
    return json(res, 500, { error: 'STRIPE_SECRET_KEY not configured' })
  }

  try {
    const { user } = await requireAuthUser(req)
    const account = await ensureUserAccount(user)
    const appUrl = getAppUrl(req)
    const unitAmountUsd = getSessionPriceUsd()
    const creditsGranted = getPurchasedCreditsPerCheckout()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: user.id,
      customer: account.stripe_customer_id || undefined,
      customer_creation: account.stripe_customer_id ? undefined : 'always',
      customer_email: user.email ?? undefined,
      success_url: `${appUrl}?checkout=success`,
      cancel_url: `${appUrl}?checkout=cancelled`,
      payment_method_types: ['card'],
      metadata: {
        auth_user_id: user.id,
        user_account_id: account.id,
        credits_granted: String(creditsGranted),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(unitAmountUsd * 100),
            product_data: {
              name: 'Council OS Session Credit',
              description: `${creditsGranted} guided session credit`,
            },
          },
        },
      ],
    })

    return json(res, 200, {
      checkoutUrl: session.url,
      checkoutSessionId: session.id,
    })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message })
  }
}
