import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    console.log(`🎁 Offers shortlink redirect for code: ${code}`)
    
    if (!code) {
      const host = request.headers.get('host') || 'qwikker.com'
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      return NextResponse.redirect(`${protocol}://${host}`, 302)
    }
    
    const supabase = createServiceRoleClient()
    
    const { data: user, error } = await supabase
      .from('app_users')
      .select('wallet_pass_id, name')
      .ilike('wallet_pass_id', `%${code}`)
      .single()
    
    if (error || !user) {
      console.error('❌ Could not find user for offers shortlink code:', code, error)
      const host = request.headers.get('host') || 'qwikker.com'
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      return NextResponse.redirect(`${protocol}://${host}/user/offers?wallet_pass_id=${code}`, 302)
    }
    
    const host = request.headers.get('host') || 'qwikker.com'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    const redirectUrl = `${baseUrl}/user/offers?wallet_pass_id=${user.wallet_pass_id}`
    const userName = user.name || 'User'
    
    console.log(`🎁 OFFERS SHORTLINK: Offers for ${userName} (${code})`)
    
    return NextResponse.redirect(redirectUrl, 302)
    
  } catch (error) {
    console.error('❌ Offers shortlink redirect error:', error)
    const host = request.headers.get('host') || 'qwikker.com'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    return NextResponse.redirect(`${protocol}://${host}`, 302)
  }
}
