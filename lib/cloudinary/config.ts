/**
 * Cloudinary configuration (GLOBAL - not per-franchise)
 * 
 * IMPORTANT: Cloudinary is shared across all franchises.
 * Multi-tenancy isolation is enforced at the API/database layer,
 * not at the Cloudinary account level.
 */

export function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const unsignedPreset = process.env.CLOUDINARY_UNSIGNED_PRESET
  
  if (!cloudName) {
    throw new Error('Missing CLOUDINARY_CLOUD_NAME environment variable')
  }
  
  if (!unsignedPreset) {
    throw new Error('Missing CLOUDINARY_UNSIGNED_PRESET environment variable')
  }
  
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  
  return {
    cloudName,
    unsignedPreset,
    uploadUrl
  }
}

/**
 * Get folder path for business assets
 * SECURITY: Server-derived only, never from client input
 */
export function getBusinessAssetFolder(city: string, businessId: string, assetType: 'logo' | 'hero') {
  return `qwikker/${city}/businesses/${businessId}/${assetType}`
}

