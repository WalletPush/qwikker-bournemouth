import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /w/{shortCode}
 *
 * Loyalty "View my rewards" shortlink — same pattern as /c/ (chat) and /o/ (offers).
 * Resolves wallet_pass_id from the short code and redirects to /user/rewards.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    console.log(`🏆 Rewards shortlink redirect for code: ${code}`)

    const host = request.headers.get('host') || 'qwikker.com'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`

    if (!code) {
      return NextResponse.redirect(baseUrl, 302)
    }

    const supabase = createServiceRoleClient()

    const { data: user, error } = await supabase
      .from('app_users')
      .select('wallet_pass_id, name')
      .ilike('wallet_pass_id', `%${code}`)
      .single()

    if (error || !user) {
      console.error('❌ Could not find user for rewards shortlink code:', code, error)
      return NextResponse.redirect(
        `${baseUrl}/user/rewards?wallet_pass_id=${encodeURIComponent(code)}`,
        302
      )
    }

    const redirectUrl = `${baseUrl}/user/rewards?wallet_pass_id=${encodeURIComponent(user.wallet_pass_id)}`
    console.log(`🏆 REWARDS SHORTLINK: Rewards for ${user.name || 'User'} (${code})`)

    return NextResponse.redirect(redirectUrl, 302)
  } catch (error) {
    console.error('❌ Rewards shortlink redirect error:', error)
    const host = request.headers.get('host') || 'qwikker.com'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    return NextResponse.redirect(`${protocol}://${host}`, 302)
  }
}
