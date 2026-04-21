import {
  getPurchasedCreditsPerCheckout,
  json,
  readRawBody,
  stripe,
  supabaseAdmin,
} from './_lib/server.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (!stripe) {
    return json(res, 500, { error: 'STRIPE_SECRET_KEY not configured' })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return json(res, 500, { error: 'STRIPE_WEBHOOK_SECRET not configured' })
  }

  try {
    const rawBody = await readRawBody(req)
    const signature = req.headers['stripe-signature']
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const checkoutSession = event.data.object

      if (checkoutSession.payment_status === 'paid') {
        const authUserId = checkoutSession.metadata?.auth_user_id || checkoutSession.client_reference_id
        const creditsGranted = Number(
          checkoutSession.metadata?.credits_granted || getPurchasedCreditsPerCheckout()
        )

        if (!authUserId) {
          throw new Error('checkout.session.completed missing auth_user_id metadata')
        }

        const customerDetailsEmail = checkoutSession.customer_details?.email
          || checkoutSession.customer_email
          || null

        const { error } = await supabaseAdmin.rpc('grant_purchased_credits', {
          p_auth_user_id: authUserId,
          p_email: customerDetailsEmail,
          p_checkout_session_id: checkoutSession.id,
          p_payment_intent_id: checkoutSession.payment_intent || null,
          p_stripe_customer_id: checkoutSession.customer || null,
          p_amount_total: checkoutSession.amount_total || 0,
          p_currency: checkoutSession.currency || 'usd',
          p_credits: creditsGranted,
          p_metadata: checkoutSession.metadata || {},
        })

        if (error) {
          throw new Error(error.message)
        }
      }
    }

    return json(res, 200, { received: true })
  } catch (error) {
    console.error('[stripe-webhook]', error)
    return json(res, 400, { error: error.message })
  }
}
