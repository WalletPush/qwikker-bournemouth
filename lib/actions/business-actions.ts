'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendBusinessUpdateNotification } from '@/lib/integrations'
import { revalidatePath } from 'next/cache'

/**
 * Add a secret menu item and notify Slack
 */
export async function addSecretMenuItem(userId: string, itemData: {
  itemName: string
  description?: string
  price?: string
}) {
  const supabaseAdmin = createAdminClient()

  // Get user profile for notification context
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' }
  }

  // For now, store secret menu items in additional_notes or create a separate table
  // This is a placeholder - you might want a dedicated secret_menu_items table
  const secretMenuData = {
    ...itemData,
    created_at: new Date().toISOString()
  }

  // Update profile with secret menu item (stored as JSON in additional_notes for now)
  const currentNotes = profile.additional_notes || '{}'
  let notesData
  try {
    notesData = JSON.parse(currentNotes)
  } catch {
    notesData = {}
  }

  if (!notesData.secret_menu_items) {
    notesData.secret_menu_items = []
  }
  notesData.secret_menu_items.push(secretMenuData)

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ additional_notes: JSON.stringify(notesData) })
    .eq('user_id', userId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Send Slack notification
  try {
    await sendBusinessUpdateNotification(profile, 'secret_menu', itemData)
  } catch (error) {
    console.error('Slack notification failed (non-critical):', error)
  }

  revalidatePath('/dashboard')
  return { success: true, data: secretMenuData }
}

/**
 * Create a new offer and notify Slack
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
  const supabaseAdmin = createAdminClient()

  // Update profile with offer data
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update({
      offer_name: offerData.offerName,
      offer_type: offerData.offerType,
      offer_value: offerData.offerValue,
      offer_claim_amount: offerData.offerClaimAmount,
      offer_terms: offerData.offerTerms,
      offer_start_date: offerData.startDate,
      offer_end_date: offerData.endDate,
      offer_image: offerData.offerImage
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Send Slack notification with all offer details
  try {
    await sendBusinessUpdateNotification(profile, 'offer_created', {
      offerName: offerData.offerName,
      offerType: offerData.offerType,
      offerValue: offerData.offerValue,
      offerClaimAmount: offerData.offerClaimAmount,
      offerStartDate: offerData.startDate,
      offerEndDate: offerData.endDate,
      offerTerms: offerData.offerTerms,
      offerImage: offerData.offerImage
    })
  } catch (error) {
    console.error('Slack notification failed (non-critical):', error)
  }

  revalidatePath('/dashboard')
  return { success: true, data: profile }
}

/**
 * Update important business information and notify Slack
 */
export async function updateBusinessInfo(userId: string, updates: any) {
  const supabaseAdmin = createAdminClient()

  // Filter out routine contact updates that don't need notifications
  const routineFields = ['phone', 'email', 'first_name', 'last_name']
  const importantUpdates = Object.keys(updates).filter(key => !routineFields.includes(key))

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Only send notification if important fields were updated
  if (importantUpdates.length > 0) {
    try {
      await sendBusinessUpdateNotification(profile, 'business_info', { 
        updatedFields: importantUpdates 
      })
    } catch (error) {
      console.error('Slack notification failed (non-critical):', error)
    }
  }

  revalidatePath('/dashboard')
  return { success: true, data: profile }
}

/**
 * Delete an offer and notify Slack
 */
export async function deleteOffer(userId: string) {
  const supabaseAdmin = createAdminClient()

  // Get the current offer details for the notification
  const { data: currentProfile, error: fetchError } = await supabaseAdmin
    .from('profiles')
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
    .from('profiles')
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
    .from('profiles')
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
    .from('profiles')
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
