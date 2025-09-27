import { NextRequest, NextResponse } from 'next/server'
import { createShortUrl } from '@/lib/actions/short-url-actions'

// This endpoint replaces the vippassbot.com short link service
// Called by GHL workflow during wallet pass creation
export async function POST(request: NextRequest) {
  try {
    console.log('📎 Creating short link for GHL workflow')
    
    const data = await request.json()
    console.log('📥 Received data:', data)
    
    // Extract contact data from GHL
    const {
      contact_id,
      first_name,
      last_name,
      email,
      serial_number,
      link_type = 'offers' // 'offers' or 'chat'
    } = data
    
    if (!serial_number) {
      return NextResponse.json({
        success: false,
        error: 'Missing serial_number'
      }, { status: 400 })
    }
    
    // Determine target URL based on link type
    let targetUrl: string
    let urlType: 'offers' | 'chat' | 'dashboard'
    
    if (link_type === 'chat' || link_type === 'ai_chat') {
      targetUrl = `https://qwikkerdashboard-theta.vercel.app/user/chat?user_id=${serial_number}`
      urlType = 'chat'
    } else if (link_type === 'offers' || link_type === 'offers_gallery') {
      targetUrl = `https://qwikkerdashboard-theta.vercel.app/user/offers?user_id=${serial_number}`
      urlType = 'offers'
    } else {
      targetUrl = `https://qwikkerdashboard-theta.vercel.app/user?user_id=${serial_number}`
      urlType = 'dashboard'
    }
    
    // Create the short URL
    const result = await createShortUrl({
      targetUrl,
      userId: serial_number,
      urlType
    })
    
    if (!result.success) {
      console.error('Failed to create short URL:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
    
    console.log('✅ Short URL created:', result.shortUrl)
    
    // Return in the format GHL expects
    return NextResponse.json({
      success: true,
      short_url: result.shortUrl,
      short_id: result.shortId,
      target_url: targetUrl,
      user_id: serial_number,
      link_type: urlType
    })
    
  } catch (error) {
    console.error('❌ Error creating short link:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const serial_number = searchParams.get('serial_number')
  const link_type = searchParams.get('link_type') || 'offers'
  
  if (!serial_number) {
    return NextResponse.json({
      error: 'Missing serial_number parameter'
    }, { status: 400 })
  }
  
  // Create a test short URL
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      serial_number,
      link_type,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com'
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  }))
}
