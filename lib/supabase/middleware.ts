import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  
  // 🌍 MULTI-CITY: Detect city for ALL requests (needed for RLS)
  const hostname = request.headers.get('host') || ''
  const currentCity = await getCityFromHostname(hostname)

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
    '/',           // Root landing page (marketing)
    '/user',       // User dashboard (uses wallet_pass_id, not auth)
    '/admin',      // Admin routes handle their own authentication
    '/api',        // API routes handle their own authentication
    '/s/',         // Shortlinks
    '/c/',         // Chat shortlinks
    '/claim',      // Business claim flow (creates account after verification)
    '/welcome',    // Welcome page
    '/onboarding', // Onboarding flow
    '/wallet-pass' // Wallet pass pages
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

  return supabaseResponse
}
