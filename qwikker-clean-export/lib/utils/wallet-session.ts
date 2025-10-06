import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const WALLET_PASS_COOKIE = 'qwikker_wallet_pass_id'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export async function setWalletPassCookie(walletPassId: string, response?: NextResponse) {
  const cookieStore = await cookies()
  
  const cookieOptions = {
    name: WALLET_PASS_COOKIE,
    value: walletPassId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  }

  if (response) {
    // For API routes - set cookie on response
    response.cookies.set(cookieOptions)
  } else {
    // For server components - set cookie directly
    cookieStore.set(cookieOptions)
  }
}

export async function getWalletPassCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(WALLET_PASS_COOKIE)
    return cookie?.value || null
  } catch {
    return null
  }
}

export async function clearWalletPassCookie(response?: NextResponse) {
  const cookieStore = await cookies()
  
  if (response) {
    response.cookies.delete(WALLET_PASS_COOKIE)
  } else {
    cookieStore.delete(WALLET_PASS_COOKIE)
  }
}

// For middleware usage
export function getWalletPassCookieFromRequest(request: NextRequest): string | null {
  return request.cookies.get(WALLET_PASS_COOKIE)?.value || null
}
