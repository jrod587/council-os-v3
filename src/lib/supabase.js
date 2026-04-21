import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Council OS] Supabase env vars missing.')
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export async function getCurrentSession() {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  return data.session
}

export function onAuthStateChange(callback) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe() {} } } }
  }

  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
}

export async function signInWithMagicLink(email) {
  if (!supabase) throw new Error('Supabase client unavailable')
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw new Error(error.message)
}

export async function signOutUser() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function apiFetch(path, options = {}) {
  const session = await getCurrentSession()
  if (!session?.access_token) {
    throw new Error('You must be signed in to continue.')
  }

  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${session.access_token}`)
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`)
  }

  return payload
}
