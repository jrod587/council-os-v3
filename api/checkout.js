import {
  ensureUserAccount,
  getAppUrl,
  getPurchasedCreditsPerCheckout,
  getSessionPriceUsd,
  json,
  requireAuthUser,
  stripe,
  supabaseAdmin,
} from './_lib/server.js'

function buildSessionParams({ account, user, appUrl, unitAmountUsd, creditsGranted, forceNew = false }) {
  const hasExistingCustomer = !forceNew && Boolean(account.stripe_customer_id)
  return {
    mode: 'payment',
    client_reference_id: user.id,
    customer: hasExistingCustomer ? account.stripe_customer_id : undefined,
    customer_creation: hasExistingCustomer ? undefined : 'always',
    // Only pass customer_email for new customers — Stripe rejects both fields together
    customer_email: hasExistingCustomer ? undefined : (user.email ?? undefined),
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
  }
}

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

    let session
    try {
      session = await stripe.checkout.sessions.create(
        buildSessionParams({ account, user, appUrl, unitAmountUsd, creditsGranted })
      )
    } catch (stripeErr) {
      // Stale test-mode customer ID used against live-mode key — clear it and retry as new customer
      if (stripeErr?.code === 'resource_missing' && account.stripe_customer_id) {
        console.warn('[checkout] Stale stripe_customer_id detected, clearing and retrying:', account.stripe_customer_id)
        await supabaseAdmin
          .from('user_accounts')
          .update({ stripe_customer_id: null })
          .eq('id', account.id)
        account.stripe_customer_id = null

        session = await stripe.checkout.sessions.create(
          buildSessionParams({ account, user, appUrl, unitAmountUsd, creditsGranted, forceNew: true })
        )
      } else {
        throw stripeErr
      }
    }

    return json(res, 200, {
      checkoutUrl: session.url,
      checkoutSessionId: session.id,
    })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message })
  }
}
