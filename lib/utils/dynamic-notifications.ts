'use server'

import { getFranchiseConfig } from '@/lib/utils/franchise-config'

export interface NotificationData {
  title: string
  message: string
  city: string
  type: 'business_signup' | 'offer_created' | 'user_signup' | 'error' | 'info'
  data?: Record<string, unknown>
}

/**
 * Send city-specific Slack notification
 * Each franchise can have their own Slack webhook
 */
export async function sendCitySlackNotification(notification: NotificationData) {
  try {
    // Try CRM config first (supports environment variables)
    const { getFranchiseCRMConfigWithEnvOverrides } = await import('./franchise-crm-config')
    const crmConfig = await getFranchiseCRMConfigWithEnvOverrides(notification.city)
    
    let config = null
    let webhookUrl = crmConfig?.slack_webhook_url
    
    // Fallback to franchise config if no CRM config
    if (!webhookUrl) {
      config = await getFranchiseConfig(notification.city)
      webhookUrl = config?.slack_webhook_url
    }
    
    if (!webhookUrl) {
      console.warn(`No Slack webhook configured for ${notification.city}`)
      return { success: false, error: 'No Slack webhook configured' }
    }

    const slackMessage = {
      text: `<!channel> 🎯 ${notification.city.toUpperCase()} - ${notification.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🏙️ ${crmConfig?.displayName || config?.display_name || notification.city.charAt(0).toUpperCase() + notification.city.slice(1)} Alert`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `<!channel>\n*${notification.title}*\n${notification.message}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Type: ${notification.type} | City: ${notification.city} | Time: ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage)
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`)
    }

    console.log(`✅ Slack notification sent to ${notification.city}`)
    return { success: true }

  } catch (error) {
    console.error(`❌ Error sending Slack notification to ${notification.city}:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send GHL webhook notification (city-specific)
 */
export async function sendCityGHLWebhook(city: string, data: Record<string, unknown>) {
  try {
    const config = await getFranchiseConfig(city)
    
    if (!config?.ghl_webhook_url) {
      console.warn(`No GHL webhook configured for ${city}`)
      return { success: false, error: 'No GHL webhook configured' }
    }

    const response = await fetch(config.ghl_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        city: city,
        franchise: config.display_name,
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      throw new Error(`GHL webhook error: ${response.status}`)
    }

    console.log(`✅ GHL webhook sent to ${city}`)
    return { success: true }

  } catch (error) {
    console.error(`❌ Error sending GHL webhook to ${city}:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
