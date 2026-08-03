import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

function cleanHost(request: NextRequest): string {
  return (request.headers.get('host') || '').split(':')[0].toLowerCase()
}

function isPartnersHost(host: string): boolean {
  return (
    host === 'partners.qwikker.com' ||
    host === 'partners.localhost' ||
    host.endsWith('.partners.localhost')
  )
}

/**
 * partners.qwikker.com serves the territory opportunity page at `/`
 * (rewrites to /partners). Apex /partners permanently redirects to the subdomain.
 */
export async function middleware(request: NextRequest) {
  const host = cleanHost(request)
  const { pathname } = request.nextUrl

  // Production cutover: qwikker.com/partners → partners.qwikker.com
  if (
    process.env.VERCEL_ENV === 'production' &&
    (host === 'qwikker.com' || host === 'www.qwikker.com') &&
    (pathname === '/partners' || pathname.startsWith('/partners/'))
  ) {
    const url = request.nextUrl.clone()
    url.protocol = 'https:'
    url.host = 'partners.qwikker.com'
    if (pathname === '/partners') {
      url.pathname = '/'
    } else {
      url.pathname = pathname.replace(/^\/partners/, '') || '/'
    }
    return NextResponse.redirect(url, 308)
  }

  // partners.qwikker.com/ → /partners, /verify → /partners/verify
  if (isPartnersHost(host)) {
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone()
      url.pathname = '/partners'
      return NextResponse.rewrite(url)
    }
    if (pathname === '/verify' || pathname.startsWith('/verify/')) {
      const url = request.nextUrl.clone()
      url.pathname = `/partners${pathname}`
      return NextResponse.rewrite(url)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)',
  ],
}
