import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; path?: string[] }> }
) {
  try {
    const { code, path } = await params
    const destination = path?.[0] || 'dashboard' // Default to dashboard
    
    console.log(`🔗 Shortlink redirect for code: ${code} to ${destination}`)
    
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
      console.error('❌ Could not find user for shortlink code:', code, error)
      // Fallback: Use the full code as a potential wallet_pass_id
      const host = request.headers.get('host') || 'qwikkerdashboard-theta.vercel.app'
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const fallbackUrl = `${protocol}://${host}/user/dashboard?wallet_pass_id=${code}`
      return NextResponse.redirect(fallbackUrl, 302)
    }
    
    // Get the current domain dynamically
    const host = request.headers.get('host') || 'qwikkerdashboard-theta.vercel.app'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    // Route to different destinations based on path
    let redirectUrl
    const userName = user.name || 'User'
    const passQs = `wallet_pass_id=${encodeURIComponent(user.wallet_pass_id)}`

    switch (destination) {
      case 'chat':
        redirectUrl = `${baseUrl}/user/chat?${passQs}`
        console.log(`💬 CHAT SHORTLINK: AI Chat for ${userName} (${code})`)
        break
      case 'offers':
        redirectUrl = `${baseUrl}/user/offers?${passQs}`
        console.log(`🎁 OFFERS SHORTLINK: Offers for ${userName} (${code})`)
        break
      case 'vibe': {
        // /s/{last8}/vibe/{business-slug} → business page with vibe sheet open
        const rawSlug = path?.[1] || ''
        const slug = rawSlug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        if (!slug || slug.length > 120) {
          redirectUrl = `${baseUrl}/user/dashboard?${passQs}`
          console.log(`⚠️ VIBE SHORTLINK: bad slug, dashboard fallback (${code})`)
        } else {
          redirectUrl = `${baseUrl}/user/business/${slug}?vibe=1&${passQs}`
          console.log(`💚 VIBE SHORTLINK: ${slug} for ${userName} (${code})`)
        }
        break
      }
      case 'dashboard':
      default:
        redirectUrl = `${baseUrl}/user/dashboard?${passQs}`
        console.log(`🏠 DASHBOARD SHORTLINK: Dashboard for ${userName} (${code})`)
        break
    }
    
    console.log(`✅ Redirecting ${user.name} (${code}) to: ${redirectUrl}`)
    
    return NextResponse.redirect(redirectUrl, 302)
    
  } catch (error) {
    console.error('❌ Shortlink redirect error:', error)
    return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
  }
}
