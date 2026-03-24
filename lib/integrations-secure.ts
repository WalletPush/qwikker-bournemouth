/**
 * SECURE INTEGRATIONS - CLIENT-SAFE VERSION
 * 
 * This file replaces lib/integrations.ts with secure server-side API calls
 * No credentials are exposed to the client bundle
 */

/**
 * Upload file to Cloudinary (unchanged - no credentials exposed)
 */
export async function uploadToCloudinary(file: File, folder = "qwikker_uploads"): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", "qwikker_unsigned")
  formData.append("folder", folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  )

  if (!response.ok) {
    throw new Error("Failed to upload image")
  }

  const data = await response.json()
  return data.secure_url
}

/**
 * @deprecated GHL integration retired (0.19). No-op kept for caller compatibility.
 */
export async function sendToGoHighLevel(formData: any, city?: string): Promise<void> {
  return
}

/**
 * @deprecated GHL integration retired (0.19). No-op kept for caller compatibility.
 */
export async function sendContactUpdateToGoHighLevel(formData: any, city?: string): Promise<void> {
  return
}

/**
 * @deprecated GHL integration retired (0.19). No-op kept for caller compatibility.
 */
export async function updateContactInGoHighLevel(formData: any, city?: string): Promise<void> {
  return
}
