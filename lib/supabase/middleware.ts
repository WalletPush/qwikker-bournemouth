import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  
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
    '/about',       // About page
    '/join',        // Pass installer page
    '/user',        // User dashboard (uses wallet_pass_id, not auth)
    '/admin',       // Admin routes handle their own authentication
    '/api',         // API routes handle their own authentication
    '/s/',          // Shortlinks
    '/c/',          // Chat shortlinks
    '/claim',       // Business claim flow (creates account after verification)
    '/welcome',     // Welcome page
    '/onboarding',  // Onboarding flow
    '/wallet-pass'  // Wallet pass pages
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
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    try {
      // Get business profile to check city
      const { data: business, error } = await supabase
        .from('business_profiles')
        .select('city')
        .eq('owner_user_id', user.sub) // user.sub is the auth user ID
        .single()
      
      if (error) {
        console.error('❌ Franchise isolation check failed:', error)
        // Allow request to continue (fail-open for emergency access)
      } else if (business) {
        const businessCity = business.city.toLowerCase()
        const urlCity = currentCity.toLowerCase()
        
        if (businessCity !== urlCity) {
          // SECURITY VIOLATION: Business belongs to different city
          console.error(`🚨 FRANCHISE ISOLATION VIOLATION:`)
          console.error(`   User tried to access: ${urlCity}.qwikker.com`)
          console.error(`   Business belongs to: ${businessCity}`)
          console.error(`   User ID: ${user.sub}`)
          
          // Sign out user (clear their session)
          await supabase.auth.signOut()
          
          // Redirect to correct city with error message
          const correctUrl = `https://${businessCity}.qwikker.com/auth/login?error=wrong_city&correct_city=${businessCity}`
          return NextResponse.redirect(correctUrl)
        }
      }
    } catch (error) {
      console.error('❌ Franchise isolation check error:', error)
      // Allow request to continue (fail-open for emergency access)
    }
  }

  return supabaseResponse
}
