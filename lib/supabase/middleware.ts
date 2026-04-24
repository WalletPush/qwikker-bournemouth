import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Persist wallet_pass_id from URL → cookie so identity survives across navigations.
  // cookies().set() only works in Route Handlers / Server Actions, NOT in page server
  // components, so the middleware is the only reliable place to do this.
  const urlWalletPassId = request.nextUrl.searchParams.get('wallet_pass_id')
  if (urlWalletPassId && urlWalletPassId.length >= 10) {
    const existingCookie = request.cookies.get('qwikker_wallet_pass_id')?.value
    if (existingCookie !== urlWalletPassId) {
      supabaseResponse.cookies.set({
        name: 'qwikker_wallet_pass_id',
        value: urlWalletPassId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
    }
  }
  
  // 🌍 MULTI-CITY: Detect city for ALL requests (needed for RLS)
  const hostname = request.headers.get('host') || ''
  let currentCity: string
  
  try {
    currentCity = await getCityFromHostname(hostname)
  } catch (error) {
    console.error('❌ Middleware: Failed to detect city from hostname:', hostname, error)
    // Allow request to continue without city context (emergency fallback)
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  
  // 🔒 SECURITY: Set city context for RLS policies (for ALL requests)
  // This ensures queries are scoped to the current subdomain's city
  try {
    await supabase.rpc('set_current_city', { city_name: currentCity })
  } catch (error) {
    // Function may not exist yet - that's okay during migration
    console.warn(`Could not set city context: ${error}`)
  }

  // 🎯 PUBLIC ROUTES: Allow access without Supabase auth session
  const publicPaths = [
    '/',            // Root landing page (marketing)
    '/for-business',// Business marketing page
    '/business-signup', // Business signup/onboarding page
    '/about',       // About page
    '/join',        // Pass installer page
    '/user',        // User dashboard (uses wallet_pass_id, not auth)
    '/admin',       // Admin routes handle their own authentication
    '/api',         // API routes handle their own authentication
    '/s/',          // Shortlinks
    '/c/',          // Chat shortlinks
    '/o/',          // Offer shortlinks
    '/n/',          // Push notification tracking links (cookie-free)
    '/claim',       // Business claim flow (creates account after verification)
    '/welcome',     // Welcome page
    '/onboarding',  // Onboarding flow
    '/wallet-pass', // Wallet pass pages
    '/loyalty',     // Loyalty flows (earn, join, start) -- uses wallet_pass_id cookie
    '/partners',    // City partner landing page (public)
    '/privacy-policy' // Privacy policy page
  ]
  
  // Check if current path matches any public path
  const isPublicPath = publicPaths.some(path => 
    path === '/' 
      ? request.nextUrl.pathname === '/'  // Root must match exactly
      : request.nextUrl.pathname.startsWith(path)
  )
  
  // Skip auth checks for public paths, but city context is already set above
  if (isPublicPath) {
    return supabaseResponse
  }

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  if (
    !user &&
    request.nextUrl.pathname !== '/' &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/hq-login') &&
    !request.nextUrl.pathname.startsWith('/hqadmin') && // HQ admin handles its own auth in layout
    !request.nextUrl.pathname.startsWith('/onboarding') &&
    !request.nextUrl.pathname.startsWith('/welcome')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 🔒 FRANCHISE ISOLATION: Validate business owner city matches subdomain
  // CRITICAL: Prevents London business from accessing bournemouth.qwikker.com dashboard
  // FAIL-CLOSED: If we can't verify, deny access (never fail-open)
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    try {
      // Get business profile to check city
      const { data: business, error } = await supabase
        .from('business_profiles')
        .select('city')
        .eq('owner_user_id', user.sub) // user.sub is the auth user ID
        .single()
      
      // FAIL-CLOSED: If fetch failed OR no business found, deny access
      if (error || !business) {
        console.error(`🚨 FRANCHISE ISOLATION - FAIL-CLOSED:`)
        console.error(`   Could not verify business for user: ${user.sub}`)
        console.error(`   Error: ${error?.message || 'No business found'}`)
        console.error(`   Denying access and forcing logout`)
        
        // Redirect to logout route (which will clear cookies server-side)
        const logoutUrl = new URL('/api/auth/logout', request.url)
        logoutUrl.searchParams.set('redirect', '/auth/login?error=verification_failed')
        return NextResponse.redirect(logoutUrl)
      }
      
      const businessCity = business.city.toLowerCase()
      const urlCity = currentCity.toLowerCase()
      
      if (businessCity !== urlCity) {
        // SECURITY VIOLATION: Business belongs to different city
        console.error(`🚨 FRANCHISE ISOLATION VIOLATION:`)
        console.error(`   User tried to access: ${urlCity}.qwikker.com`)
        console.error(`   Business belongs to: ${businessCity}`)
        console.error(`   User ID: ${user.sub}`)
        
        // Redirect to logout + correct city
        const logoutUrl = new URL('/api/auth/logout', request.url)
        logoutUrl.searchParams.set('redirect', `https://${businessCity}.qwikker.com/auth/login?error=wrong_city&correct_city=${businessCity}`)
        return NextResponse.redirect(logoutUrl)
      }
      
      // Verification passed - allow access
      
    } catch (error) {
      // FAIL-CLOSED: Any unexpected error = deny access
      console.error(`🚨 FRANCHISE ISOLATION - UNEXPECTED ERROR:`)
      console.error(`   User: ${user.sub}`)
      console.error(`   Error: ${error}`)
      console.error(`   Denying access and forcing logout`)
      
      const logoutUrl = new URL('/api/auth/logout', request.url)
      logoutUrl.searchParams.set('redirect', '/auth/login?error=system_error')
      return NextResponse.redirect(logoutUrl)
    }
  }

  return supabaseResponse
}
