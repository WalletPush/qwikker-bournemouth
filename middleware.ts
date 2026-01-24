import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Supabase session handling
  return await updateSession(request)
}

export const config = {
  matcher: '/:path*', // Match ALL routes
}
