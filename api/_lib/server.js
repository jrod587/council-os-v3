import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Council OS API] Missing Supabase server env vars.')
}

export const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null

export function json(res, status, payload) {
  return res.status(status).json(payload)
}

export function getAppUrl(req) {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL
  if (configured) return configured.replace(/\/$/, '')

  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  return `${proto}://${host}`
}

export async function requireAuthUser(req) {
  if (!supabaseAdmin) {
    const error = new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
    error.statusCode = 500
    throw error
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    const error = new Error('Authentication required')
    error.statusCode = 401
    throw error
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    const authError = new Error('Invalid or expired session')
    authError.statusCode = 401
    throw authError
  }

  return { token, user: data.user }
}

export async function ensureUserAccount(authUser) {
  const { data, error } = await supabaseAdmin
    .rpc('upsert_user_account_from_auth', {
      p_auth_user_id: authUser.id,
      p_email: authUser.email ?? null,
    })
    .single()

  if (error) {
    throw new Error(`User account sync failed: ${error.message}`)
  }

  return data
}

export async function getViewerContext(authUser) {
  const account = await ensureUserAccount(authUser)

  const [{ data: recentSessions, error: sessionsError }, { data: ledger, error: ledgerError }] =
    await Promise.all([
      supabaseAdmin
        .from('sessions')
        .select('id, created_at, updated_at, status, problem_raw, problem_refined, access_grant_type, bootstrap_complete_at, credit_restored_at')
        .eq('user_account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('credit_ledger')
        .select('id, source_type, credit_delta, notes, created_at')
        .eq('user_account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

  if (sessionsError) throw new Error(`Session lookup failed: ${sessionsError.message}`)
  if (ledgerError) throw new Error(`Credit lookup failed: ${ledgerError.message}`)

  const activeSession = recentSessions?.find((session) =>
    ['intake', 'team_proposed', 'team_approved', 'plan_proposed'].includes(session.status) &&
    !session.credit_restored_at
  ) ?? null

  const availableCredits = (account.founder_credits_remaining ?? 0) + (account.purchased_credits_remaining ?? 0)
  const nextCreditSource = account.founder_credits_remaining > 0
    ? 'founder'
    : account.purchased_credits_remaining > 0
      ? 'purchased'
      : null

  return {
    account,
    recentSessions: recentSessions ?? [],
    creditLedger: ledger ?? [],
    activeSession,
    availableCredits,
    nextCreditSource,
  }
}

export async function getOwnedSession(sessionId, userAccountId) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_account_id', userAccountId)
    .single()

  if (error || !data) {
    const notFound = new Error('Session not found')
    notFound.statusCode = 404
    throw notFound
  }

  return data
}

export async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

export function getSessionPriceUsd() {
  const parsed = Number(process.env.COUNCIL_SESSION_PRICE_USD || 7)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7
}

export function getFounderGrantCredits() {
  const parsed = Number(process.env.FOUNDER_CODE_CREDITS || 3)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3
}

export function getPurchasedCreditsPerCheckout() {
  const parsed = Number(process.env.CHECKOUT_CREDITS || 1)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}
