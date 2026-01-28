import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import { getBusinessVibeStats } from '@/lib/utils/vibes'

/**
 * 💚 POST /api/vibes/submit
 * 
 * Submit or update a user's vibe for a business.
 * Uses UPSERT logic with UNIQUE(business_id, vibe_user_key) constraint.
 * 
 * Security: Validates wallet pass ID before accepting vibe submission.
 * All writes use service role to bypass RLS (RLS is read-only by design).
 * 
 * @body businessId - UUID of the business
 * @body vibeRating - 'loved_it' | 'it_was_good' | 'not_for_me'
 * @body vibeUserKey - Stable user key (persists across reinstalls)
 * @body walletPassId - Wallet pass ID for validation
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId, vibeRating, vibeUserKey, walletPassId } = await request.json()
    
    // ✅ Validate required fields
    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      )
    }
    
    if (!vibeRating || !['loved_it', 'it_was_good', 'not_for_me'].includes(vibeRating)) {
      return NextResponse.json(
        { success: false, error: 'Valid vibe rating is required (loved_it, it_was_good, not_for_me)' },
        { status: 400 }
      )
    }
    
    if (!vibeUserKey || typeof vibeUserKey !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Vibe user key is required' },
        { status: 400 }
      )
    }
    
    if (!walletPassId || typeof walletPassId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Wallet pass ID is required' },
        { status: 400 }
      )
    }
    
    // 🔒 SECURITY: Validate wallet pass ownership
    const { user, isValid } = await getValidatedUser(walletPassId)
    
    if (!isValid || !user) {
      console.warn(`🚨 Security Alert: Invalid wallet pass in vibe submission: ${walletPassId}`)
      return NextResponse.json(
        { success: false, error: 'Invalid wallet pass ID' },
        { status: 403 }
      )
    }
    
    // ✅ Use service role client (bypasses RLS for write)
    const supabase = createServiceRoleClient()
    
    // Verify business exists
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .eq('id', businessId)
      .single()
    
    if (businessError || !business) {
      console.error(`❌ Business not found: ${businessId}`, businessError)
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }
    
    // 💾 UPSERT: Insert or update vibe
    // UNIQUE(business_id, vibe_user_key) ensures one vibe per user per business
    const { data: vibeData, error: vibeError } = await supabase
      .from('qwikker_vibes')
      .upsert(
        {
          business_id: businessId,
          user_id: user.id, // FK to app_users (for analytics)
          vibe_user_key: vibeUserKey, // The REAL unique identity
          vibe_rating: vibeRating,
          created_at: new Date().toISOString() // Update timestamp on change
        },
        {
          onConflict: 'business_id,vibe_user_key',
          ignoreDuplicates: false // Update existing vibe if changed
        }
      )
      .select()
      .single()
    
    if (vibeError) {
      console.error(`❌ Error upserting vibe:`, vibeError)
      return NextResponse.json(
        { success: false, error: 'Failed to save vibe' },
        { status: 500 }
      )
    }
    
    console.log(`💚 Vibe submitted: ${user.name} → ${business.business_name} (${vibeRating})`)
    
    // 📊 Get updated aggregate stats for this business
    const stats = await getBusinessVibeStats(businessId)
    
    return NextResponse.json({
      success: true,
      vibe: vibeData,
      stats: stats || undefined,
      message: 'Vibe submitted successfully'
    })
    
  } catch (error) {
    console.error('❌ Error in POST /api/vibes/submit:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
