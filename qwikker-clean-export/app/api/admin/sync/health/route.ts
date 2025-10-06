import { NextResponse } from 'next/server'
import { getSyncHealthMetrics } from '@/lib/sync/sync-monitor'

export async function GET() {
  try {
    const metrics = await getSyncHealthMetrics()
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('❌ Sync health API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
