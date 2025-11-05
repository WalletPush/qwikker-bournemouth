import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get franchise city for admin isolation
    const city = await getFranchiseCityFromRequest()
    
    const { offerId, confirmationText, adminUserId } = await request.json()

    if (!offerId || !adminUserId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: offerId, adminUserId'
      }, { status: 400 })
    }

    // Require confirmation text "DELETE" for safety
    if (confirmationText !== 'DELETE') {
      return NextResponse.json({
        success: false,
        error: 'Please type "DELETE" to confirm offer deletion'
      }, { status: 400 })
    }

    // Verify offer exists and belongs to this franchise
    const { data: offer, error: offerError } = await supabase
      .from('business_offers')
      .select(`
        *,
        business_profiles!inner(
          id,
          business_name,
          city,
          user_id
        )
      `)
      .eq('id', offerId)
      .eq('business_profiles.city', city)
      .single()

    if (offerError || !offer) {
      return NextResponse.json({
        success: false,
        error: 'Offer not found or not in your franchise area'
      }, { status: 404 })
    }

    // Check if offer has been claimed (prevent deletion of claimed offers)
    // Since the claims system may not be fully implemented yet, we'll make this non-blocking
    try {
      const { data: claims, error: claimsError } = await supabase
        .from('user_offer_claims')
        .select('id')
        .or(`offer_id.eq.${offerId},offer_id.eq."${offerId}"`)
        .limit(1)

      if (!claimsError && claims && claims.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Cannot delete offer that has been claimed by users. Contact support if deletion is necessary.'
        }, { status: 403 })
      }
      
      // If there's an error or no claims found, proceed with deletion
      if (claimsError) {
        console.warn('Claims verification failed, but proceeding with deletion:', claimsError.message)
      }
    } catch (error) {
      console.warn('Claims table check failed, proceeding with deletion:', error)
    }

    // Remove from knowledge base if approved
    if (offer.status === 'approved') {
      try {
        // Find and remove knowledge base entries for this offer
        const { data: knowledgeEntries, error: findError } = await supabase
          .from('knowledge_base')
          .select('id')
          .eq('city', city.toLowerCase())
          .eq('business_id', offer.business_id)
          .contains('metadata', { offerId })

        if (knowledgeEntries && knowledgeEntries.length > 0) {
          const entryIds = knowledgeEntries.map(entry => entry.id)
          const { error: deleteKnowledgeError } = await supabase
            .from('knowledge_base')
            .delete()
            .in('id', entryIds)

          if (deleteKnowledgeError) {
            console.error('Error removing offer from knowledge base:', deleteKnowledgeError)
          } else {
            console.log(`✅ Removed ${knowledgeEntries.length} knowledge base entries for offer`)
          }
        }
      } catch (error) {
        console.error('❌ Error cleaning up knowledge base:', error)
        // Continue with deletion even if knowledge base cleanup fails
      }
    }

    // Delete the offer
    const { error: deleteError } = await supabase
      .from('business_offers')
      .delete()
      .eq('id', offerId)

    if (deleteError) {
      console.error('Error deleting offer:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete offer'
      }, { status: 500 })
    }

    // Log the deletion for audit trail
    console.log(`🗑️ Admin ${adminUserId} deleted offer "${offer.offer_name}" from business "${offer.business_profiles.business_name}" in ${city}`)

    return NextResponse.json({
      success: true,
      message: `Offer "${offer.offer_name}" has been permanently deleted`,
      data: {
        offerId,
        offerName: offer.offer_name,
        businessName: offer.business_profiles.business_name
      }
    })

  } catch (error) {
    console.error('Offer deletion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
