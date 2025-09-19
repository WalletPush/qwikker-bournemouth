'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendFileUpdateToGoHighLevel, sendBusinessUpdateNotification } from '@/lib/integrations'

export async function updateProfileFile(userId: string, fileType: 'logo' | 'menu' | 'offer' | 'business_images', fileUrl: string) {
  const supabaseAdmin = createAdminClient()

  const updateData: any = {}
  
  // Map file types to profile fields
  switch (fileType) {
    case 'logo':
      updateData.logo = fileUrl
      break
    case 'menu':
      updateData.menu_url = fileUrl
      break
    case 'offer':
      updateData.offer_image = fileUrl
      break
    case 'business_images':
      // Get existing business images
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('business_images')
        .eq('user_id', userId)
        .single()
      
      const existingImages = existingProfile?.business_images || []
      const newImages = Array.isArray(existingImages) ? [...existingImages, fileUrl] : [fileUrl]
      updateData.business_images = newImages
      break
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile file:', error)
    return { success: false, error: error.message }
  }

  // Revalidate the dashboard and files pages to show updated data
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/files')

  // Send Slack notification for knowledge base updates (non-blocking)
  // Note: GHL sync temporarily disabled to prevent false signup notifications
  sendBusinessUpdateNotification(data, 'file_upload', { fileType, fileUrl }).catch(error => 
    console.error('Slack notification failed (non-critical):', error)
  )

  return { success: true, data }
}

export async function uploadToCloudinary(file: File, folder: string = 'qwikker_uploads') {
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
    throw new Error('Upload failed')
  }

  const data = await response.json()
  
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
