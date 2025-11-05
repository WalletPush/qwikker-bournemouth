import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBusinessTierInfo } from '@/lib/utils/subscription-helpers'

/**
 * GET /api/user/feature-access - Check if current user has access to specific features
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feature = searchParams.get('feature') // analytics, advanced_qr, push_notifications

    if (!feature) {
      return NextResponse.json({
        success: false,
        error: 'Feature parameter is required'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // Get user's business profile
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('id, plan')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({
        success: false,
        error: 'Business profile not found'
      }, { status: 404 })
    }

    // Get tier information
    const tierInfo = await getBusinessTierInfo(profile.id)

    // Check feature access
    let hasAccess = false
    switch (feature) {
      case 'analytics':
        hasAccess = tierInfo.hasAnalyticsAccess
        break
      case 'advanced_qr':
        hasAccess = tierInfo.hasAdvancedQR
        break
      case 'push_notifications':
        hasAccess = tierInfo.hasPushNotifications
        break
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid feature'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      hasAccess,
      tierInfo: {
        tier: tierInfo.tier,
        displayName: tierInfo.displayName,
        isInTrial: tierInfo.isInTrial,
        trialEndsAt: tierInfo.trialEndsAt
      }
    })

  } catch (error) {
    console.error('Feature access API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
