import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // ============================================================================
  // 🚨 EMERGENCY KILL SWITCH - Maintenance Mode
  // ============================================================================
  // Set MAINTENANCE_MODE=true in Vercel env vars to lock the site instantly
  // Optional: Add ?bypass=YOUR_TOKEN to access (set MAINTENANCE_BYPASS_TOKEN)
  
  // Explicit boolean parsing - only true if env var is exactly string 'true'
  const maintenanceOn = process.env.MAINTENANCE_MODE === 'true'
  
  if (maintenanceOn) {
    const url = request.nextUrl
    
    // Allow static assets (Next.js needs these to render the maintenance page)
    if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/favicon')) {
      return NextResponse.next()
    }

    // Optional bypass for admin access
    const bypassToken = process.env.MAINTENANCE_BYPASS_TOKEN
    const providedToken = url.searchParams.get('bypass') || request.cookies.get('qwikker_bypass')?.value
    
    if (bypassToken && providedToken === bypassToken) {
      // Allow access and set cookie for convenience
      const res = await updateSession(request)
      res.cookies.set('qwikker_bypass', bypassToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      return res
    }

    // Block everyone else
    return new NextResponse(
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>QWIKKER - Coming Soon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;
      background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
      color: #fff;
      padding: 24px;
    }
    .container {
      text-align: center;
      max-width: 520px;
      animation: fadeIn 0.6s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 700;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #00d083 0%, #00ff9f 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p {
      font-size: 1.125rem;
      line-height: 1.6;
      opacity: 0.85;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 24px;
      color: #00d083;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">QWIKKER</div>
    <h1>Coming Soon</h1>
    <p>We're doing some final work behind the scenes. Check back soon!</p>
  </div>
</body>
</html>`,
      {
        status: 503,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'retry-after': '3600',
        },
      }
    )
  }

  // ============================================================================
  // Normal operation: Supabase session handling
  // ============================================================================
  return await updateSession(request)
}

export const config = {
  matcher: '/:path*', // Match ALL routes (simpler, more reliable)
}
