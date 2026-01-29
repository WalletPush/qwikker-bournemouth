import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/dashboard/welcome-modal-shown
 * 
 * Mark the claim welcome modal as shown for a business
 * This ensures users only see it once on their first login
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update the business profile to mark modal as shown
    const { error } = await supabase
      .from('business_profiles')
      .update({
        claim_welcome_modal_shown: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (error) {
      console.error('Error marking welcome modal as shown:', error)
      return NextResponse.json(
        { error: 'Failed to update modal status' },
        { status: 500 }
      )
    }

    console.log(`✅ Claim welcome modal marked as shown for business ${businessId}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in POST /api/dashboard/welcome-modal-shown:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
