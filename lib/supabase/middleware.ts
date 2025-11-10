import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // 🎯 PUBLIC ROUTES: Allow access without Supabase auth session
  const publicPaths = [
    '/user',       // User dashboard (uses wallet_pass_id, not auth)
    '/admin',      // Admin routes handle their own authentication
    '/api',        // API routes handle their own authentication
    '/s/',         // Shortlinks
    '/c/',         // Chat shortlinks
    '/welcome',    // Welcome page
    '/onboarding', // Onboarding flow
    '/wallet-pass' // Wallet pass pages
  ]
  
  // Check if current path matches any public path
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
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

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  if (
    !user &&
    request.nextUrl.pathname !== '/' &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/onboarding') &&
    !request.nextUrl.pathname.startsWith('/welcome')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
