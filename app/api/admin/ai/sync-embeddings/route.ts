import { NextRequest, NextResponse } from 'next/server'
import { syncAllBusinessEmbeddings, cleanupOrphanedEmbeddings, getEmbeddingsStats } from '@/lib/ai/sync-embeddings'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'

export async function POST(request: NextRequest) {
  try {
    const { action, city } = await request.json()

    // Get franchise city from request (for admin isolation)
    const franchiseCity = city || await getFranchiseCityFromRequest()
    console.log(`🔧 Admin AI sync request: ${action} for ${franchiseCity}`)

    switch (action) {
      case 'sync_all':
        const syncResult = await syncAllBusinessEmbeddings(franchiseCity)
        return NextResponse.json({
          success: syncResult.success,
          message: syncResult.success 
            ? `Successfully synced ${syncResult.synced}/${syncResult.total} businesses`
            : `Sync failed: ${syncResult.error}`,
          data: syncResult
        })

      case 'cleanup':
        const cleanupResult = await cleanupOrphanedEmbeddings()
        return NextResponse.json({
          success: cleanupResult.success,
          message: cleanupResult.success
            ? `Cleaned up ${cleanupResult.cleaned} orphaned embeddings`
            : `Cleanup failed: ${cleanupResult.error}`,
          data: cleanupResult
        })

      case 'stats':
        const statsResult = await getEmbeddingsStats(franchiseCity)
        return NextResponse.json({
          success: statsResult.success,
          message: statsResult.success
            ? 'Retrieved embeddings statistics'
            : `Stats failed: ${statsResult.error}`,
          data: statsResult.stats
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: sync_all, cleanup, or stats' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Admin AI sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get embeddings stats for the current franchise
    const franchiseCity = await getFranchiseCityFromRequest()
    const statsResult = await getEmbeddingsStats(franchiseCity)

    if (!statsResult.success) {
      return NextResponse.json(
        { error: statsResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      city: franchiseCity,
      stats: statsResult.stats
    })

  } catch (error) {
    console.error('❌ Admin AI stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
