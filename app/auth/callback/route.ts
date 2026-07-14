import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Auth callback for links that arrive with a PKCE `code` (the default flow for
 * @supabase/ssr) — e.g. password-recovery and email-confirmation emails.
 *
 * Without this route the recovery link lands on /auth/update-password with no
 * session (the code is never exchanged), so updateUser() fails and the user sees
 * an error. We exchange the code (or verify a token_hash as a fallback) to
 * establish the session, then forward to `next` (e.g. /auth/update-password).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next')
  // Only allow same-origin relative redirects.
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/'

  // Redirect back to the ORIGINAL host (city subdomain). Behind the Vercel proxy
  // `origin` can be the internal deployment URL, so prefer the forwarded host.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`

  const redirectTo = (path: string) => NextResponse.redirect(`${base}${path}`)
  const errorRedirect = (message: string) =>
    redirectTo(`/auth/error?error=${encodeURIComponent(message)}`)

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return errorRedirect(error.message)
    return redirectTo(next)
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (error) return errorRedirect(error.message)
    return redirectTo(next)
  }

  return errorRedirect('Invalid or missing authentication code. Please request a new link.')
}
