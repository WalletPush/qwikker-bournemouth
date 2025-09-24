'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendBusinessUpdateNotification } from '@/lib/integrations'
import { revalidatePath } from 'next/cache'

/**
 * Add a secret menu item - now submits for admin approval instead of going live immediately
 */
export async function addSecretMenuItem(userId: string, itemData: {
  itemName: string
  description?: string
  price?: string
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

  // Send Slack notification for ADMIN APPROVAL
  try {
    await sendBusinessUpdateNotification(profile, 'secret_menu_pending_approval', {
      ...itemData,
      changeId: changeRecord.id
    })
  } catch (error) {
    console.error('Slack notification failed (non-critical):', error)
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

  // Send Slack notification for ADMIN APPROVAL (not live offer)
  try {
    await sendBusinessUpdateNotification(profile, 'offer_pending_approval', {
      offerName: offerData.offerName,
      offerType: offerData.offerType,
      offerValue: offerData.offerValue,
      offerClaimAmount: offerData.offerClaimAmount,
      offerStartDate: offerData.startDate,
      offerEndDate: offerData.endDate,
      offerTerms: offerData.offerTerms,
      offerImage: offerData.offerImage,
      changeId: changeRecord.id
    })
  } catch (error) {
    console.error('Slack notification failed (non-critical):', error)
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
 * Update business information with automatic GHL sync and notifications
 */
export async function updateBusinessInfo(userId: string, updates: any) {
  const supabaseAdmin = createAdminClient()

  // Filter out routine contact updates that don't need Slack notifications
  const routineFields = ['phone', 'email', 'first_name', 'last_name']
  const importantUpdates = Object.keys(updates).filter(key => !routineFields.includes(key))

  // Update the profile with timestamp (skip GHL sync fields if they don't exist)
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString()
    // Note: last_ghl_sync field might not exist yet in database
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

  // 🔥 ALWAYS SYNC TO GHL FOR CONTACT UPDATES
  try {
    const { sendContactUpdateToGoHighLevel } = await import('@/lib/integrations')
    
    // Prepare GHL data with updated information
    const ghlData = {
      // Personal info
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      
      // Business info
      businessName: profile.business_name || '',
      businessType: profile.business_type || '',
      businessCategory: profile.business_category || '',
      businessAddress: profile.business_address || '',
      town: profile.business_town || '',
      postcode: profile.business_postcode || '',
      
      // Optional fields
      website: profile.website || '',
      instagram: profile.instagram || '',
      facebook: profile.facebook || '',
      
      // File URLs
      logo_url: profile.logo || '',
      menu_url: profile.menu_url || '',
      offer_image_url: profile.offer_image || '',
      
      // Offer data
      offerName: profile.offer_name || '',
      offerType: profile.offer_type || '',
      offerValue: profile.offer_value || '',
      offerTerms: profile.offer_terms || '',
      offerStartDate: profile.offer_start_date || '',
      offerEndDate: profile.offer_end_date || '',
      
      // Additional data
      referralSource: profile.referral_source || '',
      goals: profile.goals || '',
      notes: profile.additional_notes || '',
      
      // Update metadata
      contactSync: true,
      syncType: 'business_dashboard_update',
      updatedAt: new Date().toISOString(),
      qwikkerContactId: profile.id,
      city: profile.city,
      status: profile.status,
      
      // Track what fields were updated
      updatedFields: Object.keys(updates),
      isUpdate: true,
      updateSource: 'business_dashboard'
    }
    
    await sendContactUpdateToGoHighLevel(ghlData, profile.city)
    console.log(`✅ Business info updated and synced to ${profile.city} GHL: ${profile.business_name}`)
    
  } catch (ghlError) {
    console.error('GHL sync failed after business update:', ghlError)
    // Don't fail the request, but log the error
  }

  // Only send Slack notification if important fields were updated (not routine contact changes)
  if (importantUpdates.length > 0) {
    try {
      await sendBusinessUpdateNotification(profile, 'business_info', { 
        updatedFields: importantUpdates 
      })
    } catch (error) {
      console.error('Slack notification failed (non-critical):', error)
    }
  }

  // 🔥 REFRESH ALL AFFECTED SYSTEMS IMMEDIATELY
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/personal') 
  revalidatePath('/dashboard/business')
  revalidatePath('/admin')
  revalidatePath('/admin/contacts')
  revalidatePath('/admin/live')
  
  console.log(`🔄 All systems refreshed for business: ${profile.business_name}`)
  
  return { success: true, data: profile }
}

/**
 * Delete an offer and notify Slack
 */
export async function deleteOffer(userId: string) {
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
    // Update status to pending_review
    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({ 
        status: 'pending_review'
      })
      .eq('user_id', userId)

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

    // Send notification to admin (you can implement this later)
    try {
      await sendBusinessUpdateNotification({
        businessName: profile.business_name || 'New Business',
        businessType: profile.business_type || 'Business',
        action: 'SUBMITTED_FOR_REVIEW',
        userId: userId,
        email: profile.email || 'No email',
        town: profile.business_town || 'Unknown location'
      })
    } catch (notificationError) {
      console.error('Notification failed:', notificationError)
      // Don't fail the whole operation if notification fails
    }

    revalidatePath('/dashboard')
    return { success: true, message: 'Successfully submitted for review!' }

  } catch (error) {
    console.error('Submit for review error:', error)
    return { success: false, error: 'Failed to submit for review' }
  }
}
