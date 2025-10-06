import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    console.log('🧪 Test endpoint called')
    const body = await request.json()
    console.log('🧪 Test request body:', body)
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🧪 Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test endpoint GET working',
    timestamp: new Date().toISOString()
  })
}
