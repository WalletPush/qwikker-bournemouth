import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * Server-side logout endpoint
 * 
 * CRITICAL: Client-side supabase.auth.signOut() does NOT clear httpOnly cookies.
 * This route clears ALL session cookies including:
 * - ALL Supabase auth cookies (sb-*)
 * - Custom session cookies (qwikker_*)
 * - Handles chunked cookies (large JWT split across multiple cookies)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Sign out from Supabase (clears Supabase session)
    await supabase.auth.signOut()
    
    // Get ALL cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Delete ALL Supabase cookies (sb-*) AND custom cookies (qwikker_*)
    // This is future-proof across different Supabase setups and handles chunked cookies
    let deletedCount = 0
    
    allCookies.forEach(cookie => {
      const name = cookie.name
      
      // Delete if it's a Supabase cookie OR a custom Qwikker cookie
      if (name.startsWith('sb-') || name.startsWith('qwikker_')) {
        try {
          cookieStore.delete(name)
          deletedCount++
          console.log(`🗑️  Deleted cookie: ${name}`)
        } catch (error) {
          console.warn(`⚠️  Failed to delete cookie ${name}:`, error)
        }
      }
    })
    
    console.log(`✅ Logout successful - ${deletedCount} session cookies cleared`)
    
    // Check for redirect parameter from middleware
    const url = new URL(request.url)
    const redirectUrl = url.searchParams.get('redirect')
    
    if (redirectUrl) {
      // Redirect to specified URL (e.g., correct city subdomain)
      return NextResponse.redirect(redirectUrl)
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Logged out successfully',
      cookiesCleared: deletedCount
    })
    
  } catch (error) {
    console.error('❌ Logout error:', error)
    
    // Even if logout fails, return success to prevent stuck sessions
    return NextResponse.json({ 
      success: true,
      message: 'Session cleared'
    })
  }
}

/**
 * GET handler - supports redirects from middleware (e.g., franchise isolation fail-closed)
 * Performs the same logout as POST, then redirects to the specified URL or login page
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()

    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    let deletedCount = 0
    allCookies.forEach(cookie => {
      const name = cookie.name
      if (name.startsWith('sb-') || name.startsWith('qwikker_')) {
        try {
          cookieStore.delete(name)
          deletedCount++
          console.log(`🗑️  Deleted cookie: ${name}`)
        } catch (error) {
          console.warn(`⚠️  Failed to delete cookie ${name}:`, error)
        }
      }
    })

    console.log(`✅ GET Logout successful - ${deletedCount} session cookies cleared`)

    // Check for redirect parameter
    const url = new URL(request.url)
    const redirectPath = url.searchParams.get('redirect') || '/auth/login'
    
    // Build absolute redirect URL
    const redirectUrl = new URL(redirectPath, url.origin)
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('❌ GET Logout error:', error)
    // Fallback: redirect to login even on error
    const url = new URL(request.url)
    return NextResponse.redirect(new URL('/auth/login', url.origin).toString())
  }
}
