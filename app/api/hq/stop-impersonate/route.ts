import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('qwikker_admin_session')

  let wasImpersonating = false
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value)
      wasImpersonating = !!session.hq_impersonating
      if (wasImpersonating) {
        console.log(`🔑 HQ impersonation ended: ${session.hq_user_email} was viewing as ${session.username} (${session.city})`)
      }
    } catch {
      // malformed cookie, clear it anyway
    }
  }

  const isLocal = request.headers.get('host')?.includes('localhost') || request.headers.get('host')?.includes('127.0.0.1')

  const response = NextResponse.json({
    success: true,
    wasImpersonating,
  })

  const cookieOptions: Parameters<typeof response.cookies.set>[2] = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  }

  if (!isLocal) {
    cookieOptions.domain = '.qwikker.com'
  }

  response.cookies.set('qwikker_admin_session', '', cookieOptions)

  return response
}
