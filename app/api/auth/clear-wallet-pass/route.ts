import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/clear-wallet-pass
 *
 * Clears a stale qwikker_wallet_pass_id cookie and redirects to /join.
 * Called by the /user/* layout when the cookie references a deleted or
 * inactive pass (DB validation fails but cookie still exists).
 * Cookies can only be modified in Route Handlers, not Server Components.
 */
export function GET(request: NextRequest) {
  const joinUrl = new URL('/join', request.url)
  const response = NextResponse.redirect(joinUrl)

  response.cookies.set({
    name: 'qwikker_wallet_pass_id',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}
