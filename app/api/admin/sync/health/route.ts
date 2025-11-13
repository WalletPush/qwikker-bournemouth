import { NextRequest, NextResponse } from 'next/server'
import { getSyncHealthMetrics } from '@/lib/sync/sync-monitor'
import { requireAdminAuth, createUnauthorizedResponse } from '@/lib/utils/admin-api-auth'

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authResult = await requireAdminAuth(request)
    if (!authResult.authenticated) {
      return createUnauthorizedResponse(authResult.error)
    }

    const metrics = await getSyncHealthMetrics()
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('❌ Sync health API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
