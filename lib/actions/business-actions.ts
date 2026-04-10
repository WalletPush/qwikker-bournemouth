'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendBusinessUpdateNotification } from '@/lib/integrations'
import { revalidatePath } from 'next/cache'
import { getRequestCityFallback } from '@/lib/utils/city-detection'

/**
 * Add a secret menu item - now submits for admin approval instead of going live immediately
 */
export async function addSecretMenuItem(userId: string, itemData: {
  itemName: string
  description?: string
  price?: string
  image_url?: string
}) {
  const supabaseAdmin = createAdminClient()

  // Get user profile for notification context
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' }
  }

  const secretMenuData = {
    ...itemData,
    created_at: new Date().toISOString()
  }

  // Create pending change record instead of updating profile directly
  const { data: changeRecord, error: changeError } = await supabaseAdmin
    .from('business_changes')
    .insert({
      business_id: profile.id,
      change_type: 'secret_menu',
      change_data: secretMenuData,
      status: 'pending'
    })
    .select()
    .single()

  if (changeError) {
    console.error('Error creating secret menu change record:', changeError)
    return { success: false, error: 'Failed to submit secret menu item for review' }
  }

  // 📢 SEND SLACK NOTIFICATION: Secret menu item submitted
  const fallbackCity = await getRequestCityFallback()
  try {
    console.log(`📢 [SECRET MENU] Attempting to send Slack notification for: ${itemData.itemName}`)
    console.log(`📢 [SECRET MENU] Business: ${profile.business_name}, City: ${profile.city || fallbackCity}`)
    
    const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
    
    const notificationResult = await sendCitySlackNotification({
      title: `🤫 New Secret Menu Item: ${itemData.itemName}`,
      message: `${profile.business_name} has submitted a new secret menu item for admin approval.\n\n**Item Details:**\n• Name: ${itemData.itemName}\n• Description: ${itemData.description || 'Not provided'}\n• Price: ${itemData.price || 'Not provided'}\n\n🔗 View in admin: https://${(profile.city || fallbackCity).toLowerCase()}.qwikker.com/admin?tab=updates`,
      city: profile.city || fallbackCity,
      type: 'offer_created',
      data: { businessName: profile.business_name, itemName: itemData.itemName, changeId: changeRecord.id }
    })
    
    if (notificationResult.success) {
      console.log(`✅ [SECRET MENU] Slack notification sent successfully for: ${itemData.itemName}`)
    } else {
      console.error(`❌ [SECRET MENU] Slack notification failed:`, notificationResult.error)
    }
  } catch (error) {
    console.error('❌ [SECRET MENU] Slack notification exception:', error)
  }

  revalidatePath('/dashboard')
  return { 
    success: true, 
    data: secretMenuData,
    message: 'Secret menu item submitted for admin approval. You will be notified once it is reviewed.'
  }
}

/**
 * Create a new offer - now submits for admin approval instead of going live immediately
 */
export async function createOffer(userId: string, offerData: {
  offerName: string
  offerType: string
  offerValue: string
  offerClaimAmount?: string
  offerDescription?: string
  offerTerms?: string
  startDate?: string
  endDate?: string
  offerImage?: string | null
}) {
  try {
    // Use regular client for user operations, admin client for admin operations
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Get user profile using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup error for createOffer:', profileError)
      return { success: false, error: `Profile not found: ${profileError?.message || 'Unknown error'}` }
    }

    // Create pending change record using admin client (bypasses RLS)
    const { data: changeRecord, error: changeError } = await supabaseAdmin
      .from('business_changes')
      .insert({
        business_id: profile.id,
        change_type: 'offer',
        change_data: {
          offer_name: offerData.offerName,
          offer_type: offerData.offerType,
          offer_value: offerData.offerValue,
          offer_claim_amount: offerData.offerClaimAmount,
          offer_description: offerData.offerDescription,
          offer_terms: offerData.offerTerms,
          offer_start_date: offerData.startDate && offerData.startDate.trim() !== '' ? offerData.startDate : null,
          offer_end_date: offerData.endDate && offerData.endDate.trim() !== '' ? offerData.endDate : null,
          offer_image: offerData.offerImage
        },
        status: 'pending'
      })
      .select()
      .single()

  if (changeError) {
    console.error('Error creating change record:', changeError)
    console.error('Change error details:', JSON.stringify(changeError, null, 2))
    return { success: false, error: `Failed to submit offer for review: ${changeError.message || changeError.code || 'Unknown error'}` }
  }

  // 📢 SEND SLACK NOTIFICATION: Offer submitted for approval
  const fallbackCity = await getRequestCityFallback()
  try {
    console.log(`📢 [OFFER] Attempting to send Slack notification for: ${offerData.offerName}`)
    console.log(`📢 [OFFER] Business: ${profile.business_name}, City: ${profile.city || fallbackCity}`)
    
    const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
    
    const notificationResult = await sendCitySlackNotification({
      title: `💰 New Offer Submitted: ${offerData.offerName}`,
      message: `${profile.business_name} has submitted a new offer for admin approval.\n\n**Offer Details:**\n• Value: ${offerData.offerValue}\n• Type: ${offerData.offerType}\n• Claims: ${offerData.offerClaimAmount}\n\n🔗 View in admin: https://${(profile.city || fallbackCity).toLowerCase()}.qwikker.com/admin?tab=updates`,
      city: profile.city || fallbackCity,
      type: 'offer_created',
      data: { businessName: profile.business_name, offerName: offerData.offerName, changeId: changeRecord.id }
    })
    
    if (notificationResult.success) {
      console.log(`✅ [OFFER] Slack notification sent successfully for: ${offerData.offerName}`)
    } else {
      console.error(`❌ [OFFER] Slack notification failed:`, notificationResult.error)
    }

  } catch (error) {
    console.error('⚠️ Slack notification error (non-critical):', error)
  }

    revalidatePath('/dashboard')
    return { 
      success: true, 
      data: changeRecord,
      message: 'Offer submitted for admin approval. You will be notified once it is reviewed.'
    }
  } catch (error) {
    console.error('Unexpected error in createOffer:', error)
    return { 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Update an existing offer - submits changes for admin approval
 */
export async function updateOffer(userId: string, offerId: string, offerData: {
  offerName?: string
  offerType?: string
  offerValue?: string
  offerClaimAmount?: string
  offerTerms?: string
  startDate?: string
  endDate?: string
  offerImage?: string | null
}) {
  try {
    const supabaseAdmin = createAdminClient()

    // Get user profile using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup error for updateOffer:', profileError)
      return { success: false, error: `Profile not found: ${profileError?.message || 'Unknown error'}` }
    }

    // Get the existing offer to check if it exists
    const { data: existingOffer, error: offerError } = await supabaseAdmin
      .from('business_offers')
      .select('*')
      .eq('id', offerId)
      .eq('business_id', profile.id)
      .single()

    if (offerError || !existingOffer) {
      console.error('Offer lookup error:', offerError)
      return { success: false, error: 'Offer not found or access denied' }
    }

    // ✅ CLAIMED_FREE EDIT LIMIT: Enforce 1 edit maximum for claimed_free businesses
    if (profile.status === 'claimed_free' && existingOffer.edit_count >= 1) {
      return { 
        success: false, 
        error: 'Edit limit reached. Free tier offers can only be edited once. Upgrade for unlimited edits.',
        requiresUpgrade: true
      }
    }

    // Create pending change record for the update
    const { data: changeRecord, error: changeError } = await supabaseAdmin
      .from('business_changes')
      .insert({
        business_id: profile.id,
        change_type: 'offer_update',
        change_data: {
          offer_id: offerId, // Include the offer ID being updated
          offer_name: offerData.offerName || existingOffer.offer_name,
          offer_type: offerData.offerType || existingOffer.offer_type,
          offer_value: offerData.offerValue || existingOffer.offer_value,
          offer_claim_amount: offerData.offerClaimAmount || existingOffer.offer_claim_amount,
          offer_description: offerData.offerDescription || existingOffer.offer_description,
          offer_terms: offerData.offerTerms || existingOffer.offer_terms,
          offer_start_date: offerData.startDate && offerData.startDate.trim() !== '' ? offerData.startDate : existingOffer.offer_start_date,
          offer_end_date: offerData.endDate && offerData.endDate.trim() !== '' ? offerData.endDate : existingOffer.offer_end_date,
          offer_image: offerData.offerImage !== undefined ? offerData.offerImage : existingOffer.offer_image
        },
        status: 'pending'
      })
      .select()
      .single()

    if (changeError) {
      console.error('Error creating update change record:', changeError)
      return { success: false, error: `Failed to submit offer update for review: ${changeError.message || 'Unknown error'}` }
    }

    // 📢 SEND SLACK NOTIFICATION: Offer update submitted
    const fallbackCity = await getRequestCityFallback()
    try {
      const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
      
      await sendCitySlackNotification({
        title: `Offer Update Submitted: ${existingOffer.offer_name}`,
        message: `${profile.business_name} has submitted updates to their offer "${existingOffer.offer_name}" for admin approval.`,
        city: profile.city || fallbackCity,
        type: 'offer_updated',
        data: { businessName: profile.business_name, offerName: existingOffer.offer_name, offerId }
      })
      
      console.log(`📢 Slack notification sent for offer update: ${existingOffer.offer_name}`)
    } catch (error) {
      console.error('⚠️ Slack notification error (non-critical):', error)
    }

    revalidatePath('/dashboard')
    return { 
      success: true, 
      data: changeRecord,
      message: 'Offer update submitted for admin approval. You will be notified once it is reviewed.'
    }
  } catch (error) {
    console.error('Unexpected error in updateOffer:', error)
    return { 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Update business information with notifications
 * IMPORTANT: If email is being changed, also updates auth.users email
 */
export async function updateBusinessInfo(userId: string, updates: any) {
  const supabaseAdmin = createAdminClient()

  // Filter out routine contact updates that don't need Slack notifications
  const routineFields = ['phone', 'email', 'first_name', 'last_name']
  const importantUpdates = Object.keys(updates).filter(key => !routineFields.includes(key))

  // 🔥 CRITICAL: If email is being changed, update auth.users table too!
  if (updates.email) {
    console.log('🔐 Email change detected - updating auth.users table...')
    
    // Update the auth email using admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        email: updates.email,
        email_confirm: true // Skip email verification for business users
      }
    )
    
    if (authError) {
      console.error('❌ Failed to update auth email:', authError)
      return { 
        success: false, 
        error: `Failed to update login email: ${authError.message}. Your profile email was NOT changed.` 
      }
    }
    
    console.log('✅ Auth email updated successfully - user can now log in with:', updates.email)
  }

  const updateData = {
    ...updates,
    updated_at: new Date().toISOString()
  }

  const { data: profile, error } = await supabaseAdmin
    .from('business_profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Only send Slack notification if:
  // 1. Important fields were updated (not routine contact changes)
  // 2. Business is already approved (not during initial setup/onboarding)
  const isApproved = profile.status === 'approved' || profile.status === 'live'
  
  if (importantUpdates.length > 0 && isApproved) {
    try {
      await sendBusinessUpdateNotification(profile, 'business_info', { 
        updatedFields: importantUpdates 
      })
      console.log(`📢 Slack notification sent for approved business update: ${profile.business_name}`)
    } catch (error) {
      console.error('Slack notification failed (non-critical):', error)
    }
  } else if (importantUpdates.length > 0 && !isApproved) {
    console.log(`🔕 Skipping Slack notification (business not approved yet): ${profile.business_name}`)
  }

  // 🔥 SYNC TO KNOWLEDGE BASE if description/details changed
  const knowledgeFields = ['business_name', 'business_description', 'business_tagline', 'business_address', 
    'business_town', 'business_postcode', 'phone', 'website_url', 'instagram_handle', 'facebook_url', 
    'business_hours', 'business_hours_structured', 'display_category', 'business_type']
  const needsKnowledgeSync = Object.keys(updates).some(key => knowledgeFields.includes(key))
  
  if (needsKnowledgeSync && profile?.id) {
    try {
      const { syncBusinessProfileToKnowledgeBase } = await import('@/lib/ai/embeddings')
      const syncResult = await syncBusinessProfileToKnowledgeBase(profile.id)
      if (syncResult.success) {
        console.log(`✅ Knowledge base synced for: ${profile.business_name}`)
      } else {
        console.error(`⚠️ Knowledge base sync failed: ${syncResult.error}`)
      }
    } catch (error) {
      console.error('Knowledge base sync error (non-critical):', error)
    }
  }

  // 🔥 REFRESH ALL AFFECTED SYSTEMS IMMEDIATELY
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/personal')
  revalidatePath('/dashboard/business')
  revalidatePath('/dashboard/profile')
  revalidatePath('/admin')
  revalidatePath('/admin/contacts')
  revalidatePath('/admin/live')
  
  console.log(`🔄 All systems refreshed for business: ${profile.business_name}`)
  
  return { success: true, data: profile }
}

/**
 * Delete a specific business offer from the business_offers table
 */
export async function deleteBusinessOffer(userId: string, offerId: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' }
    }

    // Get the offer details before deletion
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('business_offers')
      .select('*')
      .eq('id', offerId)
      .eq('business_id', profile.id)
      .single()

    if (offerError || !offer) {
      return { success: false, error: 'Offer not found or access denied' }
    }

    // Check if offer has been claimed (prevent deletion of claimed offers)
    // Since the claims system may not be fully implemented yet, we'll make this non-blocking
    try {
      const { data: claims, error: claimsError } = await supabaseAdmin
        .from('user_offer_claims')
        .select('id')
        .or(`offer_id.eq.${offerId},offer_id.eq."${offerId}"`)
        .limit(1)

      if (!claimsError && claims && claims.length > 0) {
        return { success: false, error: 'Cannot delete offer that has been claimed by users. Contact admin support if deletion is necessary.' }
      }
      
      // If there's an error or no claims found, proceed with deletion
      if (claimsError) {
        console.warn('Claims verification failed, but proceeding with deletion:', claimsError.message)
      }
    } catch (error) {
      console.warn('Claims table check failed, proceeding with deletion:', error)
    }

    // Delete the offer
    const { error: deleteError } = await supabaseAdmin
      .from('business_offers')
      .delete()
      .eq('id', offerId)
      .eq('business_id', profile.id) // Extra security check

    if (deleteError) {
      console.error('Error deleting offer:', deleteError)
      return { success: false, error: 'Failed to delete offer' }
    }

    // Archive the offer in knowledge base (prevent it from appearing in chat)
    try {
      const { archiveOfferInKnowledgeBase } = await import('@/lib/ai/embeddings')
      const archiveResult = await archiveOfferInKnowledgeBase(offerId)
      
      if (archiveResult.success) {
        console.log(`📚 ${archiveResult.message}`)
      } else {
        console.error(`⚠️ KB archive warning: ${archiveResult.message}`)
      }
    } catch (kbError) {
      console.error('⚠️ Knowledge base archive error (non-critical):', kbError)
    }

    // Send Slack notification about deletion
    try {
      await sendBusinessUpdateNotification(profile, 'offer_deleted', {
        offerName: offer.offer_name,
        offerType: offer.offer_type,
        offerValue: offer.offer_value,
      })
    } catch (error) {
      console.error('Slack notification failed (non-critical):', error)
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/offers')
    return { success: true, message: 'Offer deleted successfully' }

  } catch (error) {
    console.error('Error in deleteBusinessOffer:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Delete legacy offer from business_profiles table (for backward compatibility)
 */
export async function deleteLegacyOffer(userId: string) {
  const supabaseAdmin = createAdminClient()

  // Get the current offer details for the notification
  const { data: currentProfile, error: fetchError } = await supabaseAdmin
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (fetchError || !currentProfile) {
    return { success: false, error: 'Profile not found' }
  }

  // Store offer details before deletion for notification
  const deletedOffer = {
    offerName: currentProfile.offer_name,
    offerType: currentProfile.offer_type,
    offerValue: currentProfile.offer_value,
  }

  // Clear offer data from profile
  const { data: profile, error } = await supabaseAdmin
    .from('business_profiles')
    .update({
      offer_name: null,
      offer_type: null,
      offer_value: null,
      offer_claim_amount: null,
      offer_terms: null,
      offer_start_date: null,
      offer_end_date: null,
      offer_image: null
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Send Slack notification about deletion
  try {
    await sendBusinessUpdateNotification(profile, 'offer_deleted', deletedOffer)
  } catch (error) {
    console.error('Slack notification failed (non-critical):', error)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/offers')
  return { success: true, data: profile }
}

/**
 * Delete a secret menu item and notify Slack
 */
export async function deleteSecretMenuItem(userId: string, itemId: string) {
  const supabaseAdmin = createAdminClient()

  // Get current profile data
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' }
  }

  // Parse current secret menu items
  const currentNotes = profile.additional_notes || '{}'
  let notesData
  try {
    notesData = JSON.parse(currentNotes)
  } catch {
    notesData = {}
  }

  if (!notesData.secret_menu_items || !Array.isArray(notesData.secret_menu_items)) {
    return { success: false, error: 'No secret menu items found' }
  }

  // Find the item to delete
  const itemIndex = notesData.secret_menu_items.findIndex((item: any) => 
    item.created_at === itemId || item.itemName === itemId
  )

  if (itemIndex === -1) {
    return { success: false, error: 'Secret menu item not found' }
  }

  // Store deleted item details for notification
  const deletedItem = notesData.secret_menu_items[itemIndex]

  // Remove the item
  notesData.secret_menu_items.splice(itemIndex, 1)

  // Update profile with modified secret menu items
  const { error: updateError } = await supabaseAdmin
    .from('business_profiles')
    .update({ additional_notes: JSON.stringify(notesData) })
    .eq('user_id', userId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Archive the secret menu item in knowledge base (prevent it from appearing in chat)
  // Use created_at timestamp as stable ID (deterministic archiving)
  try {
    const { archiveSecretMenuItemInKnowledgeBase } = await import('@/lib/ai/embeddings')
    const archiveResult = await archiveSecretMenuItemInKnowledgeBase(deletedItem.created_at, profile.id)
    
    if (archiveResult.success) {
      console.log(`📚 ${archiveResult.message}`)
    } else {
      console.error(`⚠️ KB archive warning: ${archiveResult.message}`)
    }
  } catch (kbError) {
    console.error('⚠️ Knowledge base archive error (non-critical):', kbError)
  }

  // Send Slack notification about deletion
  try {
    await sendBusinessUpdateNotification(profile, 'secret_menu_deleted', deletedItem)
  } catch (error) {
    console.error('Slack notification failed (non-critical):', error)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/secret-menu')
  return { success: true, data: deletedItem }
}

/**
 * Submit business listing for admin review
 */
export async function submitBusinessForReview(userId: string) {
  const supabaseAdmin = createAdminClient()

  try {
    console.log('🔧 SERVER ACTION: submitBusinessForReview called with userId:', userId)
    console.log('🔧 SERVER ACTION: Using admin client to bypass RLS')
    
    // First check if the profile exists and what fields it has
    const { data: existingProfile, error: checkError} = await supabaseAdmin
      .from('business_profiles')
      .select('user_id, status, business_name, business_hours, business_hours_structured, business_description, business_tagline, logo, business_images, business_address, business_town, display_category, system_category, verification_method, google_place_id')
      .eq('user_id', userId)
      .single()
    
    console.log('🔧 SERVER ACTION: Existing profile found:', {
      userId: existingProfile?.user_id,
      businessName: existingProfile?.business_name,
      currentStatus: existingProfile?.status
    })
    console.log('🔧 SERVER ACTION: Check error:', checkError)
    
    if (checkError) {
      console.error('🔧 SERVER ACTION: Error fetching profile:', checkError)
      return { success: false, error: 'Profile not found' }
    }
    
    // Check what fields are missing
    const missingFields = []
    if (!existingProfile?.business_name) missingFields.push('business_name')
    if (!existingProfile?.business_hours && !existingProfile?.business_hours_structured) missingFields.push('business_hours')
    if (!existingProfile?.business_description) missingFields.push('business_description') 
    if (!existingProfile?.business_tagline) missingFields.push('business_tagline')
    if (!existingProfile?.business_address || !existingProfile?.business_town) missingFields.push('business_address/town')
    if (!existingProfile?.display_category && !existingProfile?.system_category) missingFields.push('category')
    if (!existingProfile?.logo) missingFields.push('logo')
    if (!existingProfile?.business_images || (Array.isArray(existingProfile.business_images) && existingProfile.business_images.length === 0)) missingFields.push('business_images')
    
    console.log('🔧 SERVER ACTION: Missing required fields:', missingFields)
    
    // VERIFICATION GATE: check if verification satisfied
    if (existingProfile?.verification_method === 'google' && !existingProfile?.google_place_id) {
      console.error('🔧 SERVER ACTION: Google verification required but google_place_id missing')
      return { 
        success: false, 
        error: 'Verify your business on Google or switch to Manual Listing before submitting for review.' 
      }
    }
    
    // Update status to pending_review and fix empty business_hours if structured hours exist
    const updateFields: any = { 
      status: 'pending_review',
      updated_at: new Date().toISOString()
    }
    
    // Fix legacy empty business_hours field if structured hours exist
    // Convert structured hours to readable string for user dashboard display
    if (existingProfile?.business_hours_structured && (!existingProfile?.business_hours || existingProfile?.business_hours === '')) {
      try {
        // Import the formatter function and use it to properly format hours
        const { formatBusinessHours } = await import('@/lib/utils/business-hours-formatter')
        const formattedHours = formatBusinessHours(null, existingProfile.business_hours_structured)
        updateFields.business_hours = formattedHours
        console.log('🔧 SERVER ACTION: Setting formatted business_hours:', formattedHours)
      } catch (error) {
        console.error('🔧 SERVER ACTION: Error formatting hours:', error)
        updateFields.business_hours = 'See full schedule'
      }
    }
    
    // FIRST: Update business_hours if needed to satisfy the trigger
    if (existingProfile?.business_hours_structured && (!existingProfile?.business_hours || existingProfile?.business_hours === '')) {
      console.log('🔧 SERVER ACTION: Pre-updating business_hours to satisfy trigger')
      
      try {
        const { formatBusinessHours } = await import('@/lib/utils/business-hours-formatter')
        const formattedHours = formatBusinessHours(null, existingProfile.business_hours_structured)
        
        const { error: hoursError } = await supabaseAdmin
          .from('business_profiles')
          .update({ business_hours: formattedHours })
          .eq('user_id', userId)
        
        if (hoursError) {
          console.error('🔧 SERVER ACTION: Error updating business_hours:', hoursError)
        } else {
          console.log('🔧 SERVER ACTION: Business hours updated successfully to:', formattedHours)
        }
      } catch (error) {
        console.error('🔧 SERVER ACTION: Error formatting hours for pre-update:', error)
        // Fallback to a generic message
        const { error: hoursError } = await supabaseAdmin
          .from('business_profiles')
          .update({ business_hours: 'See full schedule' })
          .eq('user_id', userId)
      }
    }
    
    console.log('🔧 SERVER ACTION: About to update status to pending_review for userId:', userId)
    console.log('🔧 SERVER ACTION: Update fields:', updateFields)
    
    // FORCE completion percentage to 100% if all required fields are present
    // This bypasses the trigger issue with business_hours_structured
    if (missingFields.length === 0) {
      updateFields.profile_completion_percentage = 100
      console.log('🔧 SERVER ACTION: Forcing completion to 100% since all required fields present')
    }
    
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update(updateFields)
      .eq('user_id', userId)
      .select()

    console.log('🔧 SERVER ACTION: Update completed!')
    console.log('🔧 SERVER ACTION: Update data:', updateData)
    console.log('🔧 SERVER ACTION: Update error:', updateError)

    if (updateError) {
      console.error('Error updating profile status:', updateError)
      return { success: false, error: 'Failed to submit for review' }
    }

    // Get profile data for notification
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return { success: false, error: 'Profile not found' }
    }
    
    // If manual listing, append admin note
    if (profile.verification_method === 'manual') {
      const existingNotes = profile.admin_notes || ''
      const manualNote = 'Manual listing submitted; requires manual override to go live.'
      
      if (!existingNotes.includes(manualNote)) {
        await supabaseAdmin
          .from('business_profiles')
          .update({
            admin_notes: existingNotes ? `${existingNotes}\n\n${manualNote}` : manualNote
          })
          .eq('user_id', userId)
      }
    }

    // 📢 SEND SLACK NOTIFICATION: Business submitted for review
    const fallbackCity = await getRequestCityFallback()
    try {
      const { sendCitySlackNotification, sendHQSlackNotification } = await import('@/lib/utils/dynamic-notifications')

      const slackPayload = {
        title: `🎉 New Business Submitted: ${profile.business_name}`,
        message: `${profile.business_name} has completed onboarding and submitted their listing for review!\n\n**Business Details:**\n• Owner: ${profile.first_name} ${profile.last_name}\n• Type: ${profile.business_type}\n• Location: ${profile.business_town}, ${profile.business_postcode}\n• Email: ${profile.email}\n• Phone: ${profile.phone}`,
        city: profile.city || fallbackCity,
        type: 'business_signup' as const,
        data: { 
          businessName: profile.business_name,
          ownerName: `${profile.first_name} ${profile.last_name}`,
          email: profile.email
        }
      }

      await sendCitySlackNotification(slackPayload)
      sendHQSlackNotification(slackPayload).catch(() => {})
      
      console.log(`📢 Slack notification sent for business submission: ${profile.business_name}`)
    } catch (notificationError) {
      console.error('⚠️ Slack notification error (non-critical):', notificationError)
    }

    // 📧 SEND "UNDER REVIEW" EMAIL (non-blocking)
    try {
      const { sendBusinessSubmittedNotification } = await import('@/lib/notifications/email-notifications')
      const { getFranchiseSupportEmail } = await import('@/lib/email/send-franchise-email')
      const city = profile.city || fallbackCity
      const supportEmail = await getFranchiseSupportEmail(city)

      sendBusinessSubmittedNotification(profile.email, {
        firstName: profile.first_name || 'there',
        businessName: profile.business_name,
        city,
        supportEmail,
      }).catch(err => console.error('⚠️ Submitted email error (non-critical):', err))
    } catch (error) {
      console.error('⚠️ Submitted email import error (non-critical):', error)
    }

    console.log('🔧 SERVER ACTION: SUCCESS! Business status updated to pending_review')
    console.log('🔧 SERVER ACTION: Business should now appear in admin dashboard pending section')
    console.log('🔧 SERVER ACTION: Business details:', {
      userId: profile.user_id,
      businessName: profile.business_name,
      email: profile.email,
      status: 'pending_review'
    })
    
    revalidatePath('/dashboard')
    return { success: true, message: 'Successfully submitted for review!' }

  } catch (error) {
    console.error('Submit for review error:', error)
    return { success: false, error: 'Failed to submit for review' }
  }
}
