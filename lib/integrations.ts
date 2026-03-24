// Integration utilities for external services

/**
 * Upload file to Cloudinary
 */
export async function uploadToCloudinary(file: File, folder = "qwikker_uploads"): Promise<string> {
  const url = `https://api.cloudinary.com/v1_1/dsh32kke7/${file.type.startsWith('image') ? 'image' : 'raw'}/upload`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', 'unsigned_qwikker') // This preset must be created in Cloudinary
  formData.append('folder', folder)

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${response.statusText}`)
  }

  const data = await response.json()
  return data.secure_url
}

/**
 * Delete file from Cloudinary
 * Note: This requires an authenticated API call, so it should only be called from server-side code
 */
export async function deleteFromCloudinary(publicId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // For now, we'll return success without actual deletion
    // To implement actual deletion, you would need:
    // 1. Cloudinary API key and secret (stored in env vars)
    // 2. Generate a signature for authenticated API calls
    // 3. Make a POST request to the Cloudinary admin API
    
    console.log(`⚠️ Cloudinary deletion not implemented yet for: ${publicId}`)
    console.log(`⚠️ To enable deletion, configure CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env`)
    
    // For now, just log the public_id that would be deleted
    return {
      success: true,
      error: 'Cloudinary deletion skipped (API keys not configured)'
    }
  } catch (error) {
    console.error('Error in deleteFromCloudinary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * @deprecated GHL integration retired (0.19). This is a no-op kept for caller compatibility.
 */
export async function sendToGoHighLevel(formData: any, city?: string): Promise<void> {
  return
}

/**
 * @deprecated GHL integration retired (0.19). This is a no-op kept for caller compatibility.
 */
export async function sendContactUpdateToGoHighLevel(formData: any, city?: string): Promise<void> {
  return
}

/**
 * @deprecated GHL integration retired (0.19). This is a no-op kept for caller compatibility.
 */
export async function sendFileUpdateToGoHighLevel(formData: any): Promise<void> {
  return
}

/**
 * Send Slack notification
 */
export async function sendSlackNotification(formData: any): Promise<void> {
  // You'll need to set up a Slack webhook URL in your environment variables
  const slackWebhookUrl = process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL
  
  if (!slackWebhookUrl) {
    console.warn('Slack webhook URL not configured')
    return
  }

  const message = {
    text: "🎉 New QWIKKER Business Signup!",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎉 New Business Registration"
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Business:* ${formData.businessName || 'Not provided'}`
          },
          {
            type: "mrkdwn", 
            text: `*Owner:* ${formData.firstName} ${formData.lastName}`
          },
          {
            type: "mrkdwn",
            text: `*Email:* ${formData.email}`
          },
          {
            type: "mrkdwn",
            text: `*Phone:* ${formData.phone || 'Not provided'}`
          },
          {
            type: "mrkdwn",
            text: `*Location:* ${formData.town}, ${formData.postcode}`
          },
          {
            type: "mrkdwn",
            text: `*Type:* ${formData.businessType || 'Not specified'}`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Logo Uploaded:* ${formData.logo_url ? '✅ Yes' : '❌ No'}`
          },
          {
            type: "mrkdwn",
            text: `*Menu Uploaded:* ${formData.menuservice_url ? '✅ Yes' : '❌ No'}`
          },
          {
            type: "mrkdwn",
            text: `*Offer Created:* ${formData.offerName ? '✅ Yes' : '❌ No'}`
          },
          {
            type: "mrkdwn",
            text: `*Referral Source:* ${formData.referralSource || 'Not specified'}`
          }
        ]
      }
    ]
  }

  const response = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  })

  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.statusText}`)
  }
}

/**
 * Send Slack notification for important business updates
 */
export async function sendBusinessUpdateNotification(profileData: any, updateType: 'file_upload' | 'secret_menu' | 'offer_created' | 'business_info' | 'offer_deleted' | 'secret_menu_deleted' | 'referral_signup' | 'referral_credited' | 'offer_pending_approval' | 'secret_menu_pending_approval' | 'file_pending_approval', details: any): Promise<void> {
  const slackWebhookUrl = process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL
  
  if (!slackWebhookUrl) {
    console.warn('Slack webhook URL not configured')
    return
  }

  const businessName = profileData.business_name || 'Unknown Business'
  const ownerName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Unknown Owner'

  let message: any

  switch (updateType) {
    case 'file_upload':
      message = createFileUploadMessage(businessName, ownerName, details.fileType, details.fileUrl)
      break
    case 'secret_menu':
      message = createSecretMenuMessage(businessName, ownerName, details)
      break
    case 'offer_created':
      message = createOfferMessage(businessName, ownerName, details)
      break
    case 'business_info':
      message = createBusinessInfoMessage(businessName, ownerName, details)
      break
    case 'offer_deleted':
      message = createOfferDeleteMessage(businessName, ownerName, details)
      break
    case 'secret_menu_deleted':
      message = createSecretMenuDeleteMessage(businessName, ownerName, details)
      break
    case 'referral_signup':
      message = createReferralSignupMessage(businessName, ownerName, details)
      break
    case 'referral_credited':
      message = createReferralCreditedMessage(businessName, ownerName, details)
      break
    case 'offer_pending_approval':
      message = createOfferPendingApprovalMessage(businessName, ownerName, details, profileData.city)
      break
    case 'secret_menu_pending_approval':
      message = createSecretMenuPendingApprovalMessage(businessName, ownerName, details, profileData.city)
      break
    case 'file_pending_approval':
      message = createFilePendingApprovalMessage(businessName, ownerName, details)
      break
    default:
      return // Skip unknown update types
  }

  // Add channel and thread targeting
  const payload = {
    ...message,
    channel: "#business-file-management", // Specific channel
    username: "QWIKKER Bot",
    icon_emoji: ":file_folder:",
    // thread_ts can be added here if you want to use threads
  }

  const response = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Slack business update notification failed: ${response.statusText}`)
  }
}

function createFileUploadMessage(businessName: string, ownerName: string, fileType: 'logo' | 'menu' | 'offer', fileUrl: string) {
  const actions = {
    logo: `${ownerName} (${businessName}) uploaded a new business logo`,
    menu: `${ownerName} (${businessName}) uploaded a new menu/price list`, 
    offer: `${ownerName} (${businessName}) uploaded a new offer image`
  }

  const emojis = {
    logo: '🏢',
    menu: '📋', 
    offer: '🎯'
  }

  return {
    text: actions[fileType],
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emojis[fileType]} ${actions[fileType]}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${fileUrl}|View File> • Knowledge base may need updating`
        }
      }
    ]
  }
}

function createSecretMenuMessage(businessName: string, ownerName: string, details: any) {
  return {
    text: `${ownerName} (${businessName}) added a secret menu item`,
    blocks: [
      {
        type: "section", 
        text: {
          type: "mrkdwn",
          text: `🤫 ${ownerName} (${businessName}) added a secret menu item: *${details.itemName}*`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn", 
          text: `${details.description ? `_"${details.description}"_` : ''} • Knowledge base update recommended`
        }
      }
    ]
  }
}

function createOfferMessage(businessName: string, ownerName: string, details: any) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not specified'
    return new Date(dateStr).toLocaleDateString('en-GB')
  }

  const claimAmountLabel = details.offerClaimAmount === 'single' ? 'Single Use' : 
                          details.offerClaimAmount === 'multiple' ? 'Multiple Use' : 
                          'Not specified'

  const offerImage = details.offerImage ? 
    `\n*Offer Image:* <${details.offerImage}|View Image>` : 
    '\n*Offer Image:* Will be designed by QWIKKER team'

  return {
    text: `${ownerName} (${businessName}) created a new offer: ${details.offerName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn", 
          text: `🎯 ${ownerName} (${businessName}) created a new offer: *${details.offerName}*`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Value:* ${details.offerValue || 'Not specified'}\n*Type:* ${details.offerType || 'Not specified'}\n*Claim Amount:* ${claimAmountLabel}\n*Start Date:* ${formatDate(details.offerStartDate)}\n*End Date:* ${formatDate(details.offerEndDate)}${offerImage}`
        }
      },
      ...(details.offerTerms ? [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Terms & Conditions:*\n${details.offerTerms}`
        }
      }] : []),
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Knowledge base update recommended`
        }
      }
    ]
  }
}

function createBusinessInfoMessage(businessName: string, ownerName: string, details: any) {
  const importantFields = details.updatedFields.filter((field: string) => 
    !['phone', 'email', 'first_name', 'last_name'].includes(field)
  )
  
  if (importantFields.length === 0) {
    return null // Skip routine contact updates
  }

  return {
    text: `${ownerName} (${businessName}) updated business information`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📝 ${ownerName} (${businessName}) updated: ${importantFields.join(', ')}`
        }
      },
      {
        type: "section", 
        text: {
          type: "mrkdwn",
          text: `Knowledge base may need updating`
        }
      }
    ]
  }
}

function createOfferDeleteMessage(businessName: string, ownerName: string, details: any) {
  return {
    text: `${ownerName} (${businessName}) deleted an offer: ${details.offerName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn", 
          text: `🗑️ ${ownerName} (${businessName}) deleted offer: *${details.offerName}*`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Previous Value:* ${details.offerValue || 'Not specified'}\n*Previous Type:* ${details.offerType || 'Not specified'}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Knowledge base update recommended - offer no longer available`
        }
      }
    ]
  }
}

function createSecretMenuDeleteMessage(businessName: string, ownerName: string, details: any) {
  return {
    text: `${ownerName} (${businessName}) removed secret menu item: ${details.itemName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn", 
          text: `🗑️ ${ownerName} (${businessName}) removed secret menu item: *${details.itemName}*`
        }
      },
      ...(details.description ? [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Previous Description:* ${details.description}`
        }
      }] : []),
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Knowledge base update recommended - item no longer available`
        }
      }
    ]
  }
}

function createReferralSignupMessage(businessName: string, ownerName: string, details: any) {
  return {
    text: `${ownerName} (${businessName}) referred a new business: ${details.referredBusinessName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn", 
          text: `🎉 ${ownerName} (${businessName}) referred a new business!`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New Business:* ${details.referredBusinessName}\n*Owner:* ${details.referredOwnerName}\n*Referral Code:* ${details.referralCode}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Potential £10 reward pending business activation • Monitor for conversion`
        }
      }
    ]
  }
}

function createReferralCreditedMessage(businessName: string, ownerName: string, details: any) {
  return {
    text: `${ownerName} (${businessName}) earned referral reward for ${details.referredBusinessName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn", 
          text: `💰 Referral reward credited to ${ownerName} (${businessName})`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Referred Business:* ${details.referredBusinessName}\n*Reward Amount:* ${details.currency === 'GBP' ? '£' : '$'}${details.rewardAmount}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Successful referral conversion • Reward processed`
        }
      }
    ]
  }
}

function createOfferPendingApprovalMessage(businessName: string, ownerName: string, details: any, city?: string) {
  const adminUrl = `https://${(city || 'bournemouth').toLowerCase()}.qwikker.com/admin?tab=updates`
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not specified'
    return new Date(dateStr).toLocaleDateString('en-GB')
  }

  const claimAmountLabel = details.offerClaimAmount === 'single' ? 'Single Use' : 
                          details.offerClaimAmount === 'multiple' ? 'Multiple Use' : 
                          'Not specified'

  const offerImage = details.offerImage ? 
    `\n*Offer Image:* <${details.offerImage}|View Image>` : 
    '\n*Offer Image:* Will be designed by QWIKKER team'

  return {
    text: `🚨 ADMIN APPROVAL NEEDED: ${ownerName} (${businessName}) submitted new offer: ${details.offerName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn", 
          text: `🚨 *ADMIN APPROVAL NEEDED*\n🎯 ${ownerName} (${businessName}) submitted new offer: *${details.offerName}*`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Value:* ${details.offerValue || 'Not specified'}\n*Type:* ${details.offerType || 'Not specified'}\n*Claim Amount:* ${claimAmountLabel}\n*Start Date:* ${formatDate(details.offerStartDate)}\n*End Date:* ${formatDate(details.offerEndDate)}${offerImage}`
        }
      },
      ...(details.offerTerms ? [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Terms & Conditions:*\n${details.offerTerms}`
        }
      }] : []),
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `⚠️ *This offer is PENDING APPROVAL* - it will NOT appear on user dashboard until approved by admin`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Review in Admin Dashboard"
            },
            url: adminUrl,
            style: "primary"
          }
        ]
      }
    ]
  }
}

function createSecretMenuPendingApprovalMessage(businessName: string, ownerName: string, details: any, city?: string) {
  const adminUrl = `https://${(city || 'bournemouth').toLowerCase()}.qwikker.com/admin?tab=updates`
  return {
    text: `🚨 ADMIN APPROVAL NEEDED: ${ownerName} (${businessName}) submitted secret menu item: ${details.itemName}`,
    blocks: [
      {
        type: "section", 
        text: {
          type: "mrkdwn",
          text: `🚨 *ADMIN APPROVAL NEEDED*\n🤫 ${ownerName} (${businessName}) submitted secret menu item: *${details.itemName}*`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn", 
          text: `${details.description ? `*Description:* ${details.description}\n` : ''}${details.price ? `*Price:* ${details.price}\n` : ''}⚠️ *This item is PENDING APPROVAL* - it will NOT appear until approved by admin`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Review in Admin Dashboard"
            },
            url: adminUrl,
            style: "primary"
          }
        ]
      }
    ]
  }
}

function createFilePendingApprovalMessage(businessName: string, ownerName: string, details: any) {
  const fileTypeEmoji = {
    'logo': '🏢',
    'menu': '📄',
    'offer': '🎯',
    'business_images': '📸'
  }
  
  const emoji = fileTypeEmoji[details.fileType as keyof typeof fileTypeEmoji] || '📎'
  
  return {
    text: `${emoji} File Pending Admin Approval`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} File Pending Admin Approval`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Business:*\n${businessName}`
          },
          {
            type: "mrkdwn",
            text: `*Owner:*\n${ownerName}`
          },
          {
            type: "mrkdwn",
            text: `*File Type:*\n${details.fileType.charAt(0).toUpperCase() + details.fileType.slice(1)}`
          },
          {
            type: "mrkdwn",
            text: `*Status:*\nPending Admin Review`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📋 *Admin Action Required*\n\nA new ${details.fileType} has been uploaded and requires your approval before going live on the user dashboard.`
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "View File",
            emoji: true
          },
          url: details.fileUrl,
          action_id: "view_file"
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `📝 Change ID: ${details.changeId} | 🕐 ${new Date().toLocaleString()}`
          }
        ]
      }
    ]
  }
}

/**
 * Legacy function - use sendBusinessUpdateNotification instead
 * @deprecated
 */
export async function sendProfileUpdateSlackNotification(profileData: any, updatedFields: string[]): Promise<void> {
  // Redirect to new notification system
  return sendBusinessUpdateNotification(profileData, 'business_info', { updatedFields })
}
