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
 * Send data to GoHighLevel webhook
 */
export async function sendToGoHighLevel(formData: any): Promise<void> {
  const webhookUrl = "https://services.leadconnectorhq.com/hooks/IkBldqzvQG4XkoSxkCq8/webhook-trigger/582275ed-27fe-4374-808b-9f8403f820e3"
  
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(formData)
  })

  if (!response.ok) {
    throw new Error(`GoHighLevel webhook failed: ${response.statusText}`)
  }
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
