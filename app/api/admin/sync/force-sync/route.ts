import { NextResponse } from 'next/server'
import { forceSyncToGHL } from '@/lib/sync/sync-monitor'

export async function POST(request: Request) {
  try {
    const { businessId } = await request.json()
    
    if (!businessId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Business ID is required' 
      }, { status: 400 })
    }
    
    console.log(`🔄 Force sync request for business: ${businessId}`)
    
    const result = await forceSyncToGHL(businessId)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Force sync API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
