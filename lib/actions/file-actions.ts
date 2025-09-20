'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendFileUpdateToGoHighLevel, sendBusinessUpdateNotification } from '@/lib/integrations'

export async function updateProfileFile(userId: string, fileType: 'logo' | 'menu' | 'offer' | 'business_images', fileUrl: string) {
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

  // 🚨 NEW LOGIC: ALL FILES REQUIRE ADMIN APPROVAL
  let changeData: any = {}
  let changeType: string = ''
  
  switch (fileType) {
    case 'logo':
      changeType = 'logo'
      changeData = { logo_url: fileUrl }
      break
    case 'menu':
      changeType = 'menu_url'
      changeData = { menu_url: fileUrl }
      break
    case 'offer':
      changeType = 'offer'
      changeData = { offer_image: fileUrl }
      break
    case 'business_images':
      changeType = 'business_images'
      // For business images, we'll store the new image URL to be added
      changeData = { new_business_image: fileUrl }
      break
  }

  // Create pending change record instead of updating profile directly
  const { data: changeRecord, error: changeError } = await supabaseAdmin
    .from('business_changes')
    .insert({
      business_id: profile.id,
      change_type: changeType,
      change_data: changeData,
      status: 'pending'
    })
    .select()
    .single()

  if (changeError) {
    console.error('Error creating file change record:', changeError)
    return { success: false, error: 'Failed to submit file for admin approval' }
  }

  // Revalidate the dashboard and files pages
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/files')

  // Send Slack notification for ADMIN APPROVAL (not live file)
  try {
    await sendBusinessUpdateNotification(profile, 'file_pending_approval', {
      fileType,
      fileUrl,
      changeId: changeRecord.id
    })
  } catch (error) {
    console.error('Slack notification failed (non-critical):', error)
  }

  return { 
    success: true, 
    data: changeRecord,
    message: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} submitted for admin approval. You will be notified once it is reviewed.`
  }
}

export async function uploadToCloudinary(file: File, folder: string = 'qwikker_uploads') {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'unsigned_qwikker') // This preset must be created in Cloudinary
    formData.append('folder', folder)

    const url = `https://api.cloudinary.com/v1_1/dsh32kke7/${file.type.startsWith('image') ? 'image' : 'raw'}/upload`

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Cloudinary upload error:', errorData)
      return {
        success: false,
        error: `Upload failed: ${response.status} ${response.statusText}`,
        data: null
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      error: null,
      data: data
    }
  } catch (error) {
    console.error('Cloudinary upload exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
      data: null
    }
  }
  
  // Optional: Also backup to Supabase Storage for redundancy
  // Note: This requires the userId to be passed, for now we'll skip the backup
  // The backup can be implemented when we have access to the user context
  try {
    // await backupToSupabaseStorage(file, folder, data.public_id, userId)
    console.log('Supabase backup skipped - requires user context')
  } catch (error) {
    console.warn('Supabase backup failed (non-critical):', error)
  }
  
  return data.secure_url
}

async function backupToSupabaseStorage(file: File, folder: string, publicId: string, userId: string) {
  const supabaseAdmin = createAdminClient()
  
  // Create a user-specific folder structure for RLS compliance
  const fileName = `${publicId}_${file.name}`
  const filePath = `${userId}/${folder}/${fileName}`
  
  const { error } = await supabaseAdmin.storage
    .from('business-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) {
    throw error
  }
  
  console.log(`File backed up to Supabase Storage: ${filePath}`)
}

async function syncFileUpdateWithGHL(profileData: any, fileType: 'logo' | 'menu' | 'offer', fileUrl: string) {
  // Prepare GHL data structure matching the onboarding form format
  const ghlData = {
    // Basic profile info
    firstName: profileData.first_name || '',
    lastName: profileData.last_name || '',
    email: profileData.email || '',
    phone: profileData.phone || '',
    businessName: profileData.business_name || '',
    businessType: profileData.business_type || '',
    businessCategory: profileData.business_category || '',
    town: profileData.business_town || '',
    postcode: profileData.business_postcode || '',
    
    // File URLs - update the specific file that was uploaded
    logo_url: fileType === 'logo' ? fileUrl : profileData.logo || '',
    menuservice_url: fileType === 'menu' ? fileUrl : profileData.menu_url || '',
    offer_image_url: fileType === 'offer' ? fileUrl : profileData.offer_image || '',
    
    // Offer data if available
    offerName: profileData.offer_name || '',
    offerType: profileData.offer_type || '',
    offerValue: profileData.offer_value || '',
    
    // Additional context
    updateType: 'file_upload',
    updatedField: fileType,
    updatedAt: new Date().toISOString()
  }

  // Send to GHL using the file update function (won't trigger signup notifications)
  await sendFileUpdateToGoHighLevel(ghlData)
}
