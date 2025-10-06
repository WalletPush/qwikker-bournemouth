import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to see what GHL is sending
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: GHL Request received')
    console.log('📨 Headers:', Object.fromEntries(request.headers.entries()))
    
    const body = await request.json()
    console.log('📥 Raw body:', JSON.stringify(body, null, 2))
    
    return NextResponse.json({
      success: true,
      debug: {
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
