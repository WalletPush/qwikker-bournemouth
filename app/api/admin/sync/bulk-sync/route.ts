import { NextResponse } from 'next/server'
import { bulkSyncToGHL } from '@/lib/sync/sync-monitor'

export async function POST() {
  try {
    console.log('🔄 Bulk sync request received')
    
    const result = await bulkSyncToGHL()
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Bulk sync API error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
