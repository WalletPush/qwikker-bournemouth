import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 🎯 TEMPORARY: Allow public access to user dashboard for demos
  if (request.nextUrl.pathname.startsWith('/user')) {
    return NextResponse.next()
  }

  // For now, allow all other routes too (temporary for demo)
  // TODO: Re-enable proper auth when ready for production
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
