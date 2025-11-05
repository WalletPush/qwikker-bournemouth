'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendFileUpdateToGoHighLevel, sendBusinessUpdateNotification } from '@/lib/integrations'
import { ImageTransform } from '@/types/profiles'

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

  // 🎯 CORRECT LOGIC: Different behavior based on business status
  if (profile.status === 'incomplete' || profile.status === 'pending_review') {
    // INCOMPLETE/PENDING BUSINESSES: Update profile directly (no admin approval needed)
    let updateData: any = {}
    
    switch (fileType) {
      case 'logo':
        updateData = { logo: fileUrl }
        break
      case 'menu':
        updateData = { menu_url: fileUrl }
        break
      case 'offer':
        updateData = { offer_image: fileUrl }
        break
      case 'business_images':
        // For business images, replace or add to existing images
        const existingImages = profile.business_images || []
        const newImages = Array.isArray(existingImages) 
          ? [...existingImages, fileUrl] 
          : [fileUrl]
        updateData = { business_images: newImages }
        break
    }

    // Update the business profile directly
    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update(updateData)
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating business profile:', updateError)
      return { success: false, error: 'Failed to update profile' }
    }

    // Revalidate the dashboard and files pages
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/files')
    revalidatePath('/dashboard/action-items')

    return { 
      success: true, 
      data: updateData,
      message: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploaded successfully!`
    }

  } else if (profile.status === 'approved') {
    // APPROVED BUSINESSES: Create pending change for admin approval
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
        changeData = { new_business_image: fileUrl }
        break
    }

    // Create pending change record for admin approval
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

    // 📢 SEND SLACK NOTIFICATION: File submitted for approval
    try {
      const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
      
      const fileTypeLabels = {
        logo: 'Logo',
        menu: 'Menu',
        offer: 'Offer Image', 
        business_images: 'Business Image'
      }
      
      await sendCitySlackNotification({
        title: `New ${fileTypeLabels[fileType]} Submitted: ${profile.business_name}`,
        message: `${profile.business_name} has uploaded a new ${fileTypeLabels[fileType].toLowerCase()} for admin approval.`,
        city: profile.city || 'bournemouth',
        type: 'business_signup',
        data: { 
          businessName: profile.business_name, 
          fileType: fileTypeLabels[fileType],
          changeId: changeRecord.id 
        }
      })
      
      console.log(`📢 Slack notification sent for ${fileType} submission: ${profile.business_name}`)
    } catch (error) {
      console.error('⚠️ Slack notification error (non-critical):', error)
    }

    // Revalidate the dashboard and files pages
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/files')

    return { 
      success: true, 
      data: changeRecord,
      message: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} submitted for admin approval. You will be notified once it is reviewed.`
    }

  } else {
    return { success: false, error: 'Invalid business status for file upload' }
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

// Delete a specific business image
export async function deleteBusinessImage(userId: string, imageUrl: string, imageIndex: number) {
  const supabaseAdmin = createAdminClient()

  try {
    // Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('business_images, status')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' }
    }

    const currentImages = profile.business_images || []
    
    // Remove the image at the specified index
    const updatedImages = currentImages.filter((_, index) => index !== imageIndex)

    // Update the profile
    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({ business_images: updatedImages })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error deleting business image:', updateError)
      return { success: false, error: 'Failed to delete image' }
    }

    // Revalidate pages
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/files')

    return { 
      success: true, 
      data: { updatedImages },
      message: 'Image deleted successfully'
    }

  } catch (error) {
    console.error('Delete image error:', error)
    return { success: false, error: 'Failed to delete image' }
  }
}

// Reorder business images
export async function reorderBusinessImages(userId: string, fromIndex: number, toIndex: number) {
  const supabaseAdmin = createAdminClient()

  try {
    // Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('business_images, status')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' }
    }

    const currentImages = [...(profile.business_images || [])]
    
    // Reorder the images
    const [movedImage] = currentImages.splice(fromIndex, 1)
    currentImages.splice(toIndex, 0, movedImage)

    // Update the profile
    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({ business_images: currentImages })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error reordering business images:', updateError)
      return { success: false, error: 'Failed to reorder images' }
    }

    // Revalidate pages
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/files')

    return { 
      success: true, 
      data: { updatedImages: currentImages },
      message: 'Images reordered successfully'
    }

  } catch (error) {
    console.error('Reorder images error:', error)
    return { success: false, error: 'Failed to reorder images' }
  }
}

// Upload multiple business images
export async function uploadMultipleBusinessImages(userId: string, files: File[]) {
  const results = []
  
  for (const file of files) {
    try {
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(file, 'qwikker/business_images')
      
      if (uploadResult.success && uploadResult.data) {
        // Update profile with new image
        const updateResult = await updateProfileFile(userId, 'business_images', uploadResult.data.secure_url)
        
        if (updateResult.success) {
          results.push({
            success: true,
            fileName: file.name,
            url: uploadResult.data.secure_url
          })
        } else {
          results.push({
            success: false,
            fileName: file.name,
            error: updateResult.error
          })
        }
      } else {
        results.push({
          success: false,
          fileName: file.name,
          error: uploadResult.error
        })
      }
    } catch (error) {
      results.push({
        success: false,
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return {
    success: successCount > 0,
    results,
    message: `${successCount} images uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}`
  }
}

// Update image transform (position, scale) for a specific business image
export async function updateImageTransform(userId: string, imageIndex: number, transform: ImageTransform) {
  const supabaseAdmin = createAdminClient()

  try {
    // Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('business_images, business_image_transforms')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' }
    }

    const currentImages = profile.business_images || []
    const currentTransforms = profile.business_image_transforms || []

    // Validate image index
    if (imageIndex < 0 || imageIndex >= currentImages.length) {
      return { success: false, error: 'Invalid image index' }
    }

    // Update transforms array - ensure it matches the images array length
    const updatedTransforms = [...currentTransforms]
    
    // Pad with default transforms if needed
    while (updatedTransforms.length < currentImages.length) {
      updatedTransforms.push({ x: 0, y: 0, scale: 1 })
    }
    
    // Update the specific transform
    updatedTransforms[imageIndex] = transform

    // Update the profile
    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({ business_image_transforms: updatedTransforms })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating image transform:', updateError)
      return { success: false, error: 'Failed to update image position' }
    }

    // Revalidate pages
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/files')

    return { 
      success: true, 
      data: { updatedTransforms },
      message: 'Image position saved successfully'
    }

  } catch (error) {
    console.error('Update transform error:', error)
    return { success: false, error: 'Failed to update image position' }
  }
}
