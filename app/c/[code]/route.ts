import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    console.log(`💬 Chat shortlink redirect for code: ${code}`)
    
    if (!code) {
      console.log(`❌ No code provided, redirecting to home`)
      return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
    }
    
    // Look up the wallet_pass_id from the code (last 8 characters)
    const supabase = createServiceRoleClient()
    
    // Look up user by matching the end of wallet_pass_id with the code
    const { data: user, error } = await supabase
      .from('app_users')
      .select('wallet_pass_id, name')
      .ilike('wallet_pass_id', `%${code}`)
      .single()
    
    if (error || !user) {
      console.error('❌ Could not find user for chat shortlink code:', code, error)
      // Fallback: Use the full code as a potential wallet_pass_id
      const host = request.headers.get('host') || 'qwikkerdashboard-theta.vercel.app'
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const fallbackUrl = `${protocol}://${host}/user/chat?wallet_pass_id=${code}`
      return NextResponse.redirect(fallbackUrl, 302)
    }
    
    // Get the current domain dynamically
    const host = request.headers.get('host') || 'qwikkerdashboard-theta.vercel.app'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    // CHAT SHORTLINK: Direct to AI Chat
    const redirectUrl = `${baseUrl}/user/chat?wallet_pass_id=${user.wallet_pass_id}`
    const userName = user.name || 'User'
    
    console.log(`💬 CHAT SHORTLINK: AI Chat for ${userName} (${code})`)
    console.log(`✅ Redirecting ${user.name} (${code}) to: ${redirectUrl}`)
    
    return NextResponse.redirect(redirectUrl, 302)
    
  } catch (error) {
    console.error('❌ Chat shortlink redirect error:', error)
    return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
  }
}
