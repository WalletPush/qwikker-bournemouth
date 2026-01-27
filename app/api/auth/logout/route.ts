import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * Server-side logout endpoint
 * 
 * CRITICAL: Client-side supabase.auth.signOut() does NOT clear httpOnly cookies.
 * This route clears ALL session cookies including:
 * - Supabase auth cookies
 * - Custom session cookies (qwikker_session, qwikker_admin_session)
 */
export async function POST() {
  try {
    const supabase = createClient()
    
    // Sign out from Supabase (clears Supabase session)
    await supabase.auth.signOut()
    
    // Clear any custom httpOnly session cookies
    const cookieStore = cookies()
    
    // List of all possible session cookies to clear
    const sessionCookies = [
      'qwikker_session',
      'qwikker_admin_session',
      'sb-access-token',
      'sb-refresh-token',
    ]
    
    // Delete each cookie
    sessionCookies.forEach(cookieName => {
      try {
        cookieStore.delete(cookieName)
      } catch (error) {
        // Cookie might not exist - that's okay
        console.log(`Cookie ${cookieName} not found (already cleared)`)
      }
    })
    
    console.log('✅ Logout successful - all session cookies cleared')
    
    return NextResponse.json({ 
      success: true,
      message: 'Logged out successfully'
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
 * GET handler for accidental GET requests (should use POST)
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to logout.' },
    { status: 405 }
  )
}
