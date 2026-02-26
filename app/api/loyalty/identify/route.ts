import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/loyalty/identify
 *
 * Looks up an existing Qwikker Pass user by email and sets the
 * wallet_pass_id cookie so the loyalty flow can proceed without
 * asking them to reinstall.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalised = email.trim().toLowerCase()

    const supabase = createServiceRoleClient()
    const { data: user } = await supabase
      .from('app_users')
      .select('wallet_pass_id')
      .eq('email', normalised)
      .single()

    if (!user?.wallet_pass_id) {
      return NextResponse.json({ found: false })
    }

    const response = NextResponse.json({
      found: true,
      walletPassId: user.wallet_pass_id,
    })

    response.cookies.set({
      name: 'qwikker_wallet_pass_id',
      value: user.wallet_pass_id,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[loyalty/identify]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
