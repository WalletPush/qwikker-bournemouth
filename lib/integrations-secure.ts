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
 * SECURE: Send data to GoHighLevel webhook (franchise-aware)
 * Uses server-side API to keep credentials secure
 */
export async function sendToGoHighLevel(formData: any, city?: string): Promise<void> {
  const response = await fetch('/api/internal/ghl-send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ formData, city })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`GoHighLevel webhook failed: ${errorData.error || response.statusText}`)
  }

  const result = await response.json()
  console.log('✅ GHL webhook sent successfully:', result.message)
}

/**
 * SECURE: Send contact update to GoHighLevel using franchise-specific webhooks
 * Uses server-side API to keep credentials secure
 */
export async function sendContactUpdateToGoHighLevel(formData: any, city?: string): Promise<void> {
  const response = await fetch('/api/internal/ghl-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ formData, city })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`GoHighLevel contact update failed: ${errorData.error || response.statusText}`)
  }

  const result = await response.json()
  console.log('✅ GHL contact update sent successfully:', result.message)
}

/**
 * Legacy function for backward compatibility - redirects to sendContactUpdateToGoHighLevel
 * @deprecated Use sendContactUpdateToGoHighLevel instead
 */
export async function updateContactInGoHighLevel(formData: any, city?: string): Promise<void> {
  return sendContactUpdateToGoHighLevel(formData, city)
}
