'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendContactUpdateToGoHighLevel } from '@/lib/integrations'
import { revalidatePath } from 'next/cache'

/**
 * 🔥 SEAMLESS UPDATE SYSTEM - NO BREAKS ALLOWED!
 * 
 * This system ensures EVERY update flows through ALL systems:
 * Business Dashboard → Supabase → GHL → Admin Dashboard → User Dashboard
 */

export interface UpdateResult {
  success: boolean
  message: string
  data?: any
  errors?: string[]
  ghlSyncSuccess?: boolean
}

/**
 * Universal contact update that touches ALL systems
 */
export async function updateContactEverywhere(
  contactId: string, 
  updates: any, 
  source: 'business' | 'admin' = 'admin'
): Promise<UpdateResult> {
  const errors: string[] = []
  let ghlSyncSuccess = false
  
  try {
    console.log(`🔄 Starting seamless contact update from ${source}:`, { contactId, updates })
    
    const supabaseAdmin = createAdminClient()
    
    // 1. 🎯 UPDATE SUPABASE FIRST (only with fields that exist in the current schema)
    const safeUpdates = {
      // Core contact fields that definitely exist
      ...(updates.first_name !== undefined && { first_name: updates.first_name }),
      ...(updates.last_name !== undefined && { last_name: updates.last_name }),
      ...(updates.email !== undefined && { email: updates.email }),
      ...(updates.phone !== undefined && { phone: updates.phone }),
      ...(updates.business_name !== undefined && { business_name: updates.business_name }),
      ...(updates.business_type !== undefined && { business_type: updates.business_type }),
      ...(updates.business_category !== undefined && { business_category: updates.business_category }),
      ...(updates.business_address !== undefined && { business_address: updates.business_address }),
      ...(updates.business_town !== undefined && { business_town: updates.business_town }),
      ...(updates.business_postcode !== undefined && { business_postcode: updates.business_postcode }),
      
      // Always update timestamp
      updated_at: new Date().toISOString()
    }
    
    console.log('🔄 Safe updates to apply:', safeUpdates)
    
    const { data: updatedContact, error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update(safeUpdates)
      .eq('id', contactId)
      .select('*')
      .single()
    
    if (updateError || !updatedContact) {
      throw new Error(`Supabase update failed: ${updateError?.message || 'No contact found with ID: ' + contactId}`)
    }
    
    console.log(`✅ Supabase updated: ${updatedContact.business_name}`)
    
    // 2. 🎯 SYNC TO GHL IMMEDIATELY
    try {
      const ghlData = {
        firstName: updatedContact.first_name || '',
        lastName: updatedContact.last_name || '',
        email: updatedContact.email || '',
        phone: updatedContact.phone || '',
        businessName: updatedContact.business_name || '',
        businessType: updatedContact.business_type || '',
        businessCategory: updatedContact.business_category || '',
        businessAddress: updatedContact.business_address || '',
        town: updatedContact.business_town || '',
        postcode: updatedContact.business_postcode || '',
        // Optional social media fields - only include if they exist in DB
        ...(updatedContact.website && { website: updatedContact.website }),
        ...(updatedContact.instagram && { instagram: updatedContact.instagram }),
        ...(updatedContact.facebook && { facebook: updatedContact.facebook }),
        ...(updatedContact.referral_source && { referralSource: updatedContact.referral_source }),
        ...(updatedContact.goals && { goals: updatedContact.goals }),
        notes: updatedContact.additional_notes || '',
        
        // Update metadata
        contactSync: true,
        syncType: `${source}_contact_update`,
        updatedAt: new Date().toISOString(),
        qwikkerContactId: updatedContact.id,
        city: updatedContact.city,
        status: updatedContact.status,
        updatedFields: Object.keys(updates),
        isUpdate: true,
        updateSource: source
      }
      
      await sendContactUpdateToGoHighLevel(ghlData, updatedContact.city)
      ghlSyncSuccess = true
      
      // Update sync timestamps after successful sync
      try {
        await supabaseAdmin
          .from('business_profiles')
          .update({ 
            last_ghl_sync: new Date().toISOString(),
            last_crm_sync: new Date().toISOString(),
            crm_sync_status: 'synced'
          })
          .eq('id', contactId)
      } catch (syncUpdateError) {
        console.warn('⚠️ Could not update sync timestamps:', syncUpdateError)
        // Continue anyway - the main sync was successful
      }
      
      console.log(`✅ GHL synced: ${updatedContact.business_name}`)
      
    } catch (ghlError) {
      console.error('❌ GHL sync failed:', ghlError)
      errors.push(`GHL sync failed: ${ghlError instanceof Error ? ghlError.message : 'Unknown error'}`)
    }
    
    // 3. 🎯 REFRESH ALL AFFECTED PAGES
    try {
      const pathsToRefresh = [
        '/admin',
        '/admin/contacts',
        '/admin/live',
        '/dashboard',
        '/dashboard/personal',
        '/dashboard/business'
      ]
      
      pathsToRefresh.forEach(path => {
        revalidatePath(path)
      })
      
      console.log(`✅ All pages refreshed for: ${updatedContact.business_name}`)
      
    } catch (revalidateError) {
      console.error('❌ Page revalidation failed:', revalidateError)
      errors.push('Page refresh failed - changes may not appear immediately')
    }
    
    // 4. 🎯 RETURN SUCCESS WITH FULL DATA
    return {
      success: true,
      message: `Contact updated successfully${ghlSyncSuccess ? ' and synced to GHL' : ' (GHL sync failed)'}`,
      data: {
        contact: updatedContact,
        updatedFields: Object.keys(updates),
        source,
        timestamp: new Date().toISOString()
      },
      ghlSyncSuccess,
      errors: errors.length > 0 ? errors : undefined
    }
    
  } catch (error) {
    console.error('💥 Seamless update failed:', error)
    
    return {
      success: false,
      message: 'Contact update failed',
      errors: [
        error instanceof Error ? error.message : 'Unknown error',
        ...errors
      ]
    }
  }
}

/**
 * Business profile update that flows through all systems
 */
export async function updateBusinessEverywhere(
  userId: string,
  updates: any,
  isImportantUpdate: boolean = false
): Promise<UpdateResult> {
  
  if (isImportantUpdate) {
    // Important updates go through approval workflow
    return await createPendingUpdate(userId, updates)
  } else {
    // Routine updates go directly through
    return await applyBusinessUpdate(userId, updates)
  }
}

/**
 * Create pending update for important changes (menu, offers, etc.)
 */
async function createPendingUpdate(userId: string, updates: any): Promise<UpdateResult> {
  try {
    const supabaseAdmin = createAdminClient()
    
    // Save to business_changes table for admin approval
    const { data: pendingChange, error } = await supabaseAdmin
      .from('business_changes')
      .insert({
        user_id: userId,
        change_type: 'business_update',
        changes: updates,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error || !pendingChange) {
      throw new Error(`Failed to create pending update: ${error?.message || 'No data returned'}`)
    }
    
    // Refresh admin dashboard to show pending update
    revalidatePath('/admin')
    revalidatePath('/admin/updates')
    
    return {
      success: true,
      message: 'Update submitted for admin approval',
      data: { pendingChange }
    }
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to submit update for approval',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Apply business update directly (for routine changes)
 */
async function applyBusinessUpdate(userId: string, updates: any): Promise<UpdateResult> {
  try {
    const supabaseAdmin = createAdminClient()
    
    // Get current profile
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (profileError || !currentProfile) {
      throw new Error('Business profile not found')
    }
    
    // Use the seamless contact update system
    return await updateContactEverywhere(currentProfile.id, updates, 'business')
    
  } catch (error) {
    return {
      success: false,
      message: 'Business update failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Approve pending update and apply to all systems
 */
export async function approvePendingUpdate(changeId: string): Promise<UpdateResult> {
  try {
    const supabaseAdmin = createAdminClient()
    
    // Get pending change
    const { data: pendingChange, error: fetchError } = await supabaseAdmin
      .from('business_changes')
      .select('*')
      .eq('id', changeId)
      .single()
    
    if (fetchError || !pendingChange) {
      throw new Error('Pending change not found')
    }
    
    // Get business profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', pendingChange.user_id)
      .single()
    
    if (profileError || !profile) {
      throw new Error('Business profile not found')
    }
    
    // Apply changes using seamless update system
    const updateResult = await updateContactEverywhere(
      profile.id, 
      pendingChange.changes, 
      'admin'
    )
    
    if (updateResult.success) {
      // Mark change as approved
      await supabaseAdmin
        .from('business_changes')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', changeId)
      
      // Refresh user dashboard so they see the changes
      revalidatePath('/user')
      revalidatePath('/user/dashboard')
    }
    
    return updateResult
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to approve update',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * 🚨 EMERGENCY: Force refresh all systems
 */
export async function forceRefreshAllSystems(): Promise<void> {
  console.log('🚨 EMERGENCY: Force refreshing all systems...')
  
  const allPaths = [
    '/admin',
    '/admin/contacts', 
    '/admin/live',
    '/admin/pending',
    '/admin/updates',
    '/dashboard',
    '/dashboard/personal',
    '/dashboard/business',
    '/dashboard/offers',
    '/dashboard/secret-menu',
    '/user',
    '/user/dashboard'
  ]
  
  allPaths.forEach(path => {
    try {
      revalidatePath(path)
    } catch (error) {
      console.error(`Failed to refresh ${path}:`, error)
    }
  })
  
  console.log('✅ All systems force refreshed')
}
