import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    console.log(`🔗 Shortlink redirect for code: ${code}`)
    
    if (!code) {
      return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
    }
    
    // Look up the wallet_pass_id from the code (last 8 characters)
    const supabase = createServiceRoleClient()
    
    const { data: user, error } = await supabase
      .from('app_users')
      .select('wallet_pass_id, name, first_visit_completed')
      .like('wallet_pass_id', `%${code}`)
      .single()
    
    if (error || !user) {
      console.error('❌ Could not find user for shortlink code:', code, error)
      return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
    }
    
    // SMART ROUTING: First visit vs returning user
    let redirectUrl
    
    if (!user.first_visit_completed) {
      // First time: Go to How It Works + mark as visited
      await supabase
        .from('app_users')
        .update({ first_visit_completed: true })
        .eq('wallet_pass_id', user.wallet_pass_id)
      
      redirectUrl = `https://qwikkerdashboard-theta.vercel.app/user/how-it-works?wallet_pass_id=${user.wallet_pass_id}`
      console.log(`✅ First visit: Redirecting ${user.name} (${code}) to How It Works`)
    } else {
      // Returning: Go straight to dashboard
      redirectUrl = `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${user.wallet_pass_id}`
      console.log(`✅ Returning visit: Redirecting ${user.name} (${code}) to Dashboard`)
    }
    
    console.log(`✅ Redirecting ${user.name} (${code}) to: ${redirectUrl}`)
    
    return NextResponse.redirect(redirectUrl, 302)
    
  } catch (error) {
    console.error('❌ Shortlink redirect error:', error)
    return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
  }
}
