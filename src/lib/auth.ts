import { sb } from './supabase'

export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/ledger-os/` }
  })
  if (error) throw error
}

export async function handleHashTokens(): Promise<boolean> {
  const raw = location.hash
  if (!raw) return false

  // Supabase with implicit flow may produce ##access_token=... (double hash)
  const hash = raw.startsWith('##') ? raw.slice(2) : raw.slice(1)
  const params = new URLSearchParams(hash)

  const access_token  = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return false

  const { error } = await sb.auth.setSession({ access_token, refresh_token })
  if (error) throw error

  history.replaceState(null, '', location.pathname + location.search)
  return true
}

export async function signOut(): Promise<void> {
  await sb.auth.signOut()
}
