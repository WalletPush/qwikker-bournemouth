import { NextRequest, NextResponse } from 'next/server'

/**
 * LEGACY WEBHOOK ENDPOINT
 * 
 * This endpoint is deprecated and redirects to the secure version.
 * It's kept for backward compatibility during the transition period.
 * 
 * @deprecated Use /api/ghl-webhook/user-creation-secure instead
 */
export async function POST(request: NextRequest) {
  console.log('⚠️ DEPRECATED: Legacy webhook called - redirecting to secure endpoint')
  
  try {
    // Get the request body
    const body = await request.text()
    
    // Forward to secure endpoint
    const secureUrl = new URL('/api/ghl-webhook/user-creation-secure', request.url)
    
    const response = await fetch(secureUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authentication headers
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')!
        }),
        ...(request.headers.get('x-webhook-signature') && {
          'x-webhook-signature': request.headers.get('x-webhook-signature')!
        }),
        ...(request.headers.get('x-ghl-signature') && {
          'x-ghl-signature': request.headers.get('x-ghl-signature')!
        })
      },
      body: body
    })
    
    const result = await response.json()
    
    console.log('✅ Forwarded to secure endpoint:', result)
    
    return NextResponse.json(result, { status: response.status })
    
  } catch (error) {
    console.error('❌ Error forwarding to secure endpoint:', error)
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      deprecated: true,
      message: 'Please update to use /api/ghl-webhook/user-creation-secure'
    }, { status: 500 })
  }
}
