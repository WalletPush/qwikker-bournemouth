import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    console.log(`🔗 Shortlink redirect for code: ${code}`)
    console.log(`🔗 Request URL: ${request.url}`)
    console.log(`🔗 Request headers:`, Object.fromEntries(request.headers.entries()))
    
    if (!code) {
      console.log(`❌ No code provided, redirecting to home`)
      return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
    }
    
    // Look up the wallet_pass_id from the code (last 8 characters)
    const supabase = createServiceRoleClient()
    
    const { data: user, error } = await supabase
      .from('app_users')
      .select('wallet_pass_id, name')
      .like('wallet_pass_id', `%${code}`)
      .single()
    
    if (error || !user) {
      console.error('❌ Could not find user for shortlink code:', code, error)
      console.log('🔄 Falling back to user dashboard with code as wallet_pass_id')
      // Fallback: Use the full code as a potential wallet_pass_id
      const fallbackUrl = `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${code}`
      return NextResponse.redirect(fallbackUrl, 302)
    }
    
    // ONBOARDING FLOW: Redirect to welcome page with user's name
    const userName = user.name || 'User'
    const redirectUrl = `https://qwikkerdashboard-theta.vercel.app/welcome?wallet_pass_id=${user.wallet_pass_id}&name=${encodeURIComponent(userName)}`
    console.log(`🎉 Onboarding redirect for ${userName} (${code}) to Welcome: ${redirectUrl}`)
    
    console.log(`✅ Redirecting ${user.name} (${code}) to: ${redirectUrl}`)
    console.log(`🎯 FINAL REDIRECT: ${redirectUrl}`)
    
    const response = NextResponse.redirect(redirectUrl, 302)
    console.log(`📤 Response status: ${response.status}`)
    console.log(`📤 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    return response
    
  } catch (error) {
    console.error('❌ Shortlink redirect error:', error)
    return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
  }
}
