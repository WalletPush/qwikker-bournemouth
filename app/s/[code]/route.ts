import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    console.log(`🔗 Shortlink redirect for code: ${code} (length: ${code.length})`)
    console.log(`🔗 Request URL: ${request.url}`)
    
    // Debug: Show all wallet_pass_ids that end with this code
    const supabaseDebug = createServiceRoleClient()
    const { data: allUsers } = await supabaseDebug
      .from('app_users')
      .select('wallet_pass_id, name, first_visit_completed')
      .ilike('wallet_pass_id', `%${code}`)
    
    console.log(`🔍 Found ${allUsers?.length || 0} users matching code "${code}":`, allUsers)
    
    if (!code) {
      console.log(`❌ No code provided, redirecting to home`)
      const host = request.headers.get('host') || 'qwikker.com'
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      return NextResponse.redirect(`${protocol}://${host}`, 302)
    }
    
    // Look up the wallet_pass_id from the code (last 8 characters)
    const supabase = createServiceRoleClient()
    
    // Look up user by matching the end of wallet_pass_id with the code
    const { data: user, error } = await supabase
      .from('app_users')
      .select('wallet_pass_id, name, created_at')
      .ilike('wallet_pass_id', `%${code}`)
      .single()
    
    if (error || !user) {
      console.error('❌ Could not find user for shortlink code:', code, error)
      console.log('🔄 Falling back to user dashboard with code as wallet_pass_id')
      // Fallback: Use the full code as a potential wallet_pass_id
      const host = request.headers.get('host') || 'qwikkerdashboard-theta.vercel.app'
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const fallbackUrl = `${protocol}://${host}/user/dashboard?wallet_pass_id=${code}`
      return NextResponse.redirect(fallbackUrl, 302)
    }
    
    // SMART ROUTING: First visit = Welcome, Returning = Dashboard
    const userName = user.name || 'User'
    let redirectUrl
    
    // Get the current domain dynamically
    const host = request.headers.get('host') || 'qwikkerdashboard-theta.vercel.app'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    // SIMPLE LOGIC: Check if URL has ?new=1 parameter (from GHL form)
    const url = new URL(request.url)
    const isFromGHLForm = url.searchParams.get('new') === '1'
    
    if (isFromGHLForm) {
      // NEW USER FROM GHL FORM: Show welcome page
      redirectUrl = `${baseUrl}/welcome?wallet_pass_id=${user.wallet_pass_id}&name=${encodeURIComponent(userName)}`
      console.log(`🎉 NEW USER FROM GHL: Welcome flow for ${userName} (${code})`)
    } else {
      // EXISTING USER SHORTLINKS: Direct to dashboard
      redirectUrl = `${baseUrl}/user/dashboard?wallet_pass_id=${user.wallet_pass_id}`
      console.log(`🔗 EXISTING USER SHORTLINK: Dashboard for ${userName} (${code})`)
    }
    
    console.log(`✅ Redirecting ${user.name} (${code}) to: ${redirectUrl}`)
    console.log(`🎯 FINAL REDIRECT: ${redirectUrl}`)
    
    const response = NextResponse.redirect(redirectUrl, 302)
    console.log(`📤 Response status: ${response.status}`)
    console.log(`📤 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    return response
    
  } catch (error) {
    console.error('❌ Shortlink redirect error:', error)
    const host = request.headers.get('host') || 'qwikker.com'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    return NextResponse.redirect(`${protocol}://${host}`, 302)
  }
}
