import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { sendContactUpdateToGoHighLevel } from '@/lib/integrations'

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 APPROVE-CHANGE API CALLED')
    const { changeId, action } = await request.json()
    console.log('📝 Request data:', { changeId, action })
    
    if (!changeId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get admin session from cookie
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json(
        { error: 'Invalid admin session' },
        { status: 401 }
      )
    }

    // Verify admin exists and get city from request
    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)
    
    if (!admin || !await isAdminForCity(adminSession.adminId, requestCity)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const supabaseAdmin = createAdminClient()
    
    // Get the change record
    console.log('📊 Fetching change record for ID:', changeId)
    const { data: change, error: changeError } = await supabaseAdmin
      .from('business_changes')
      .select(`
        *,
        business:business_id (
          id,
          business_name,
          city,
          offer_name,
          offer_type,
          offer_value,
          offer_terms,
          offer_start_date,
          offer_end_date,
          offer_image
        )
      `)
      .eq('id', changeId)
      .single()
    
    if (changeError || !change) {
      console.error('❌ Error fetching change record:', changeError)
      return NextResponse.json(
        { error: 'Change record not found' },
        { status: 404 }
      )
    }
    
    console.log('✅ Change record found:', change.change_type, change.business?.business_name)
    
    // Verify the change belongs to the admin's city
    if (change.business?.city !== requestCity) {
      return NextResponse.json(
        { error: 'Unauthorized access to this change' },
        { status: 403 }
      )
    }
    
    if (action === 'approve') {
      // Apply the change to the business profile
      let updateData = {}
      
      if (change.change_type === 'offer') {
        // 🚨 CRITICAL FIX: Create NEW offer in business_offers table (supports multiple offers)
        const { data: currentBusiness } = await supabaseAdmin
          .from('business_profiles')
          .select('id, user_id, plan, status, business_name')
          .eq('id', change.business_id)
          .single()
        
        // Check current ACTIVE offer count for this business (exclude expired offers)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const { data: activeOffers } = await supabaseAdmin
          .from('business_offers')
          .select('id, offer_end_date')
          .eq('business_id', change.business_id)
          .eq('status', 'approved')
        
        // Count only offers that are NOT expired (no end date OR end date >= today)
        const currentOfferCount = (activeOffers || []).filter(offer => 
          !offer.offer_end_date || new Date(offer.offer_end_date) >= today
        ).length
        
        // ✅ FIX: Use business's plan, not user's plan!
        const businessPlan = currentBusiness?.plan || 'starter'
        
        // ✅ CRITICAL: claimed_free businesses get 1 offer limit regardless of plan
        const isClaimedFree = currentBusiness?.status === 'claimed_free'
        
        // Check tier limits (updated to match database function)
        let maxOffers = 3 // Default starter
        if (isClaimedFree) {
          maxOffers = 1
        } else if (businessPlan === 'featured') {
          maxOffers = 5
        } else if (businessPlan === 'spotlight') {
          maxOffers = 25
        }
        
        console.log(`📊 Offer Limit Check:`, {
          business: currentBusiness?.business_name,
          plan: businessPlan,
          status: currentBusiness?.status,
          isClaimedFree,
          currentActive: currentOfferCount,
          maxAllowed: maxOffers,
          wouldBlock: currentOfferCount >= maxOffers
        })
        
        if (currentOfferCount >= maxOffers) {
          console.error(`❌ Offer limit exceeded: ${businessPlan} plan ${isClaimedFree ? '(claimed_free)' : ''} allows ${maxOffers} offers, business has ${currentOfferCount} active`)
          return NextResponse.json(
            { error: `Offer limit exceeded. ${isClaimedFree ? 'Free tier' : businessPlan} allows maximum ${maxOffers} active offers.` },
            { status: 400 }
          )
        }
        
        // Create NEW offer in business_offers table
        const { data: newOffer, error: offerError } = await supabaseAdmin
          .from('business_offers')
          .insert({
            business_id: change.business_id,
            offer_name: change.change_data.offer_name,
            offer_type: change.change_data.offer_type || 'other',
            offer_value: change.change_data.offer_value,
            offer_claim_amount: change.change_data.offer_claim_amount || 'multiple',
            offer_description: change.change_data.offer_description,
            offer_terms: change.change_data.offer_terms,
            offer_start_date: change.change_data.offer_start_date && change.change_data.offer_start_date.trim() !== '' ? change.change_data.offer_start_date : null,
            offer_end_date: change.change_data.offer_end_date && change.change_data.offer_end_date.trim() !== '' ? change.change_data.offer_end_date : null,
            offer_image: change.change_data.offer_image,
            status: 'approved',
            approved_at: new Date().toISOString(),
            display_order: currentOfferCount + 1
          })
          .select()
          .single()
        
        if (offerError || !newOffer) {
          console.error('Error creating new offer:', offerError)
          return NextResponse.json(
            { error: 'Failed to create new offer' },
            { status: 500 }
          )
        }
        
        console.log(`✅ NEW OFFER CREATED: ${change.change_data.offer_name} for ${change.business?.business_name} (${currentOfferCount + 1}/${maxOffers})`)
        
        // 📚 ADD OFFER TO KNOWLEDGE BASE with embeddings (so AI chat can see it!)
        try {
          const { syncOfferToKnowledgeBase } = await import('@/lib/ai/embeddings')
          const syncResult = await syncOfferToKnowledgeBase(newOffer.id)
          
          if (syncResult.success) {
            console.log(`📚 ${syncResult.message}`)
          } else {
            console.error(`⚠️ KB sync warning: ${syncResult.message}`)
          }
        } catch (kbError) {
          console.error('⚠️ Knowledge base sync error (non-critical):', kbError)
        }
        
        // 📧 SEND EMAIL NOTIFICATION: Offer approved
        try {
          const { sendOfferApprovalNotification } = await import('@/lib/notifications/email-notifications')
          
          if (change.business?.email) {
            // Use deployment URL (Vercel preview) until custom domains are live
            const deploymentUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qwikkerdashboard-theta.vercel.app'
            const emailResult = await sendOfferApprovalNotification({
              firstName: change.business.first_name || 'Business Owner',
              businessName: change.business.business_name || 'Your Business',
              offerName: change.change_data.offer_name,
              offerValue: change.change_data.offer_value,
              city: change.business.city || 'bournemouth',
              dashboardUrl: `${deploymentUrl}/dashboard`
            })
            
            if (emailResult.success) {
              console.log(`📧 Offer approval email sent to ${change.business.email}`)
            } else {
              console.error(`❌ Failed to send offer approval email: ${emailResult.error}`)
            }
          }
        } catch (error) {
          console.error('⚠️ Offer approval email error (non-critical):', error)
        }
        
        // Update business_profiles with the FIRST offer for backward compatibility
        if (currentOfferCount === 0) {
          updateData = {
            offer_name: change.change_data.offer_name,
            offer_type: change.change_data.offer_type || 'other',
            offer_value: change.change_data.offer_value,
            offer_claim_amount: change.change_data.offer_claim_amount || 'multiple',
            offer_terms: change.change_data.offer_terms,
            offer_start_date: change.change_data.offer_start_date && change.change_data.offer_start_date.trim() !== '' ? change.change_data.offer_start_date : null,
            offer_end_date: change.change_data.offer_end_date && change.change_data.offer_end_date.trim() !== '' ? change.change_data.offer_end_date : null,
            offer_image: change.change_data.offer_image
          }
        } else {
          // Don't update business_profiles for additional offers
          updateData = {}
        }
      } else if (change.change_type === 'offer_update') {
        // ✅ OFFER UPDATE: Update existing offer in business_offers table
        const offerId = change.change_data.offer_id
        
        if (!offerId) {
          return NextResponse.json(
            { error: 'Offer ID missing in change data' },
            { status: 400 }
          )
        }
        
        // Get the existing offer and business info
        const { data: existingOffer, error: offerFetchError } = await supabaseAdmin
          .from('business_offers')
          .select('*, business:business_id!inner(status)')
          .eq('id', offerId)
          .eq('business_id', change.business_id)
          .single()
        
        if (offerFetchError || !existingOffer) {
          return NextResponse.json(
            { error: 'Offer not found' },
            { status: 404 }
          )
        }
        
        // Prepare update data
        const offerUpdateData: any = {
          offer_name: change.change_data.offer_name || existingOffer.offer_name,
          offer_type: change.change_data.offer_type || existingOffer.offer_type,
          offer_value: change.change_data.offer_value || existingOffer.offer_value,
          offer_claim_amount: change.change_data.offer_claim_amount || existingOffer.offer_claim_amount,
          offer_terms: change.change_data.offer_terms !== undefined ? change.change_data.offer_terms : existingOffer.offer_terms,
          offer_start_date: change.change_data.offer_start_date !== undefined ? (change.change_data.offer_start_date && change.change_data.offer_start_date.trim() !== '' ? change.change_data.offer_start_date : null) : existingOffer.offer_start_date,
          offer_end_date: change.change_data.offer_end_date !== undefined ? (change.change_data.offer_end_date && change.change_data.offer_end_date.trim() !== '' ? change.change_data.offer_end_date : null) : existingOffer.offer_end_date,
          offer_image: change.change_data.offer_image !== undefined ? change.change_data.offer_image : existingOffer.offer_image,
          updated_at: new Date().toISOString()
        }
        
        // ✅ CLAIMED_FREE EDIT COUNT: Increment edit_count for claimed_free businesses
        if (existingOffer.business?.status === 'claimed_free') {
          offerUpdateData.edit_count = (existingOffer.edit_count || 0) + 1
        }
        
        // Update the offer
        const { error: offerUpdateError } = await supabaseAdmin
          .from('business_offers')
          .update(offerUpdateData)
          .eq('id', offerId)
        
        if (offerUpdateError) {
          console.error('Error updating offer:', offerUpdateError)
          return NextResponse.json(
            { error: 'Failed to update offer' },
            { status: 500 }
          )
        }
        
        console.log(`✅ OFFER UPDATED: ${change.change_data.offer_name || existingOffer.offer_name} for ${change.business?.business_name}${existingOffer.business?.status === 'claimed_free' ? ` (edit_count: ${offerUpdateData.edit_count})` : ''}`)
        
        // Don't update business_profiles for offer updates
        updateData = {}
      } else if (change.change_type === 'secret_menu') {
        // For secret menu, we need to append to existing additional_notes
        const { data: currentProfile } = await supabaseAdmin
          .from('business_profiles')
          .select('additional_notes')
          .eq('id', change.business_id)
          .single()
        
        let existingNotes = {}
        if (currentProfile?.additional_notes) {
          try {
            existingNotes = JSON.parse(currentProfile.additional_notes)
          } catch {
            existingNotes = {}
          }
        }
        
        const secretMenuItems = (existingNotes as Record<string, unknown>).secret_menu_items as unknown[] || []
        secretMenuItems.push(change.change_data)
        
        updateData = {
          additional_notes: JSON.stringify({
            ...existingNotes,
            secret_menu_items: secretMenuItems
          })
        }
      } else if (change.change_type === 'logo') {
        // Approve logo upload
        updateData = {
          logo: change.change_data.logo_url
        }
      } else if (change.change_type === 'menu_url') {
        // Approve menu PDF upload
        updateData = {
          menu_url: change.change_data.menu_url
        }
      } else if (change.change_type === 'business_images') {
        // Approve business image - add to existing images
        const { data: currentProfile } = await supabaseAdmin
          .from('business_profiles')
          .select('business_images')
          .eq('id', change.business_id)
          .single()
        
        const existingImages = currentProfile?.business_images || []
        const newImages = Array.isArray(existingImages) 
          ? [...existingImages, change.change_data.new_business_image] 
          : [change.change_data.new_business_image]
        
        updateData = {
          business_images: newImages
        }
      }
      
      // Update the business profile (only if there's data to update)
      let updateError = null
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabaseAdmin
          .from('business_profiles')
          .update(updateData)
          .eq('id', change.business_id)
        updateError = error
      }
      
      if (updateError) {
        console.error('Error updating business profile:', updateError)
        return NextResponse.json(
          { error: 'Failed to apply changes to business profile' },
          { status: 500 }
        )
      }
      
      // Mark the change as approved
      const { error: approveError } = await supabaseAdmin
        .from('business_changes')
        .update({
          status: 'approved',
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', changeId)
      
      if (approveError) {
        console.error('Error marking change as approved:', approveError)
        return NextResponse.json(
          { error: 'Failed to mark change as approved' },
          { status: 500 }
        )
      }
      
      console.log(`✅ Change ${changeId} approved by ${admin.username} - ${change.change_type} for ${change.business?.business_name}`)
      
      // 📚 ADD SECRET MENU TO KNOWLEDGE BASE (after status is approved!)
      if (change.change_type === 'secret_menu') {
        try {
          console.log(`🔍 Syncing approved secret menu item to knowledge base (changeId: ${changeId})`)
          const { syncSecretMenuItemToKnowledgeBase } = await import('@/lib/ai/embeddings')
          const syncResult = await syncSecretMenuItemToKnowledgeBase(changeId)
          
          if (syncResult.success) {
            console.log(`📚 ✅ ${syncResult.message}`)
          } else {
            console.error(`⚠️ KB sync FAILED: ${syncResult.message}`)
            console.error(`⚠️ Error details:`, syncResult.error)
          }
        } catch (kbError) {
          console.error('⚠️ Knowledge base sync error (non-critical):', kbError)
          console.error('⚠️ Stack trace:', (kbError as Error).stack)
        }
      }
      
      // 📞 SYNC APPROVALS TO GHL (offers and files, skip secret menu items)
      if (change.change_type === 'offer' || change.change_type === 'logo' || change.change_type === 'menu_url' || change.change_type === 'business_images') {
        try {
          // Get the updated business profile for GHL sync
          const { data: updatedBusiness } = await supabaseAdmin
            .from('business_profiles')
            .select('*')
            .eq('id', change.business_id)
            .single()
          
          if (updatedBusiness) {
            const ghlData = {
              // Personal info
              firstName: updatedBusiness.first_name || '',
              lastName: updatedBusiness.last_name || '',
              email: updatedBusiness.email || '',
              phone: updatedBusiness.phone || '',
              
              // Business info
              businessName: updatedBusiness.business_name || '',
              businessType: updatedBusiness.business_type || '',
              businessCategory: updatedBusiness.business_category || '',
              businessAddress: updatedBusiness.business_address || '',
              town: updatedBusiness.business_town || '',
              postcode: updatedBusiness.business_postcode || '',
              
              // Optional fields
              website: updatedBusiness.website || '',
              instagram: updatedBusiness.instagram || '',
              facebook: updatedBusiness.facebook || '',
              
              // File URLs
              logo_url: updatedBusiness.logo || '',
              menu_url: updatedBusiness.menu_url || '',
              offer_image_url: updatedBusiness.offer_image || '',
              
              // 🎯 NEWLY APPROVED OFFER DATA
              offerName: updatedBusiness.offer_name || '',
              offerType: updatedBusiness.offer_type || '',
              offerValue: updatedBusiness.offer_value || '',
              offerClaimAmount: updatedBusiness.offer_claim_amount || '',
              offerTerms: updatedBusiness.offer_terms || '',
              offerStartDate: updatedBusiness.offer_start_date || '',
              offerEndDate: updatedBusiness.offer_end_date || '',
              
              // Sync metadata
              contactSync: true,
              syncType: `${change.change_type}_approval`,
              isUpdate: true,
              updateSource: 'admin_change_approval',
              adminAction: `approve_${change.change_type}`,
              adminName: admin.username,
              changeId: changeId,
              qwikkerContactId: updatedBusiness.id,
              city: updatedBusiness.city,
              updatedAt: new Date().toISOString()
            }
            
            await sendContactUpdateToGoHighLevel(ghlData, updatedBusiness.city)
            console.log(`📞 Approved ${change.change_type} synced to ${updatedBusiness.city} GHL: ${updatedBusiness.business_name}`)
            
            // ✅ UPDATE last_ghl_sync timestamp
            await supabaseAdmin
              .from('business_profiles')
              .update({ last_ghl_sync: new Date().toISOString() })
              .eq('id', change.business_id)
          }
          
        } catch (ghlError) {
          console.error(`⚠️ GHL sync failed after ${change.change_type} approval (non-critical):`, ghlError)
          // Don't fail the approval if GHL sync fails
        }
      }
      
    } else if (action === 'reject') {
      // Mark the change as rejected
      const { error: rejectError } = await supabaseAdmin
        .from('business_changes')
        .update({
          status: 'rejected',
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', changeId)
      
      if (rejectError) {
        console.error('Error marking change as rejected:', rejectError)
        return NextResponse.json(
          { error: 'Failed to mark change as rejected' },
          { status: 500 }
        )
      }
      
      console.log(`❌ Change ${changeId} rejected by ${admin.username} - ${change.change_type} for ${change.business?.business_name}`)
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `Change ${action}d successfully`
    })
    
  } catch (error) {
    console.error('Admin approve-change API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
