/**
 * Slack notification helpers for the Contact Centre
 *
 * Sends concise Slack messages with deep links when:
 * - A business sends a new message/thread
 * - A task is marked "done" by a business
 * - A city admin escalates to HQ
 *
 * Bug-specific emoji per severity:
 *   critical -> skull, high -> fire, medium -> warning, low -> info
 */

import { loadFranchiseCRMConfigFromDB } from '@/lib/utils/franchise-crm-config'
import type { FranchiseCity } from '@/lib/utils/city-detection'

interface SlackContactNotification {
  city: FranchiseCity
  businessName: string
  category?: string
  subject?: string
  messagePreview: string
  threadId: string
  eventType: 'new_thread' | 'new_message' | 'task_complete' | 'escalation'
  /** Bug severity (critical/high/medium/low) for severity-based emoji */
  severity?: string
  /** Name of the admin who escalated (for escalation events) */
  adminName?: string
}

// Bug severity -> emoji mapping
const SEVERITY_EMOJI: Record<string, string> = {
  critical: '💀',
  high: '🔥',
  medium: '⚠️',
  low: 'ℹ️',
}

/**
 * Send a Contact Centre notification to the city's Slack channel.
 * For escalation events, also sends to the HQ Slack webhook if configured.
 */
export async function sendContactSlackNotification(
  notification: SlackContactNotification
): Promise<void> {
  try {
    const config = await loadFranchiseCRMConfigFromDB(notification.city)
    const cityWebhook = config?.slack_webhook_url
    const hqWebhook = process.env.HQ_SLACK_WEBHOOK_URL

    if (!cityWebhook && !hqWebhook) {
      console.log(`[Contact Slack] No Slack webhooks configured for ${notification.city}, skipping`)
      return
    }

    const subdomain = notification.city.toLowerCase()
    const adminDeepLink = `https://${subdomain}.qwikker.com/admin?tab=contact-centre&thread=${notification.threadId}`
    const hqDeepLink = `https://hq.qwikker.com/hqadmin/contact-centre?thread=${notification.threadId}`

    const isBug = notification.category === 'bug' || notification.category === 'app_issue' || notification.category === 'platform_issue'
    const severityEmoji = isBug && notification.severity
      ? (SEVERITY_EMOJI[notification.severity] || '🐛')
      : null

    let emoji = '💬'
    let title = 'New Contact Centre Message'

    switch (notification.eventType) {
      case 'new_thread':
        emoji = isBug ? (severityEmoji || '🐛') : '🆕'
        title = isBug
          ? `Bug Report (${notification.severity || 'medium'})`
          : 'New Support Thread'
        break
      case 'new_message':
        emoji = isBug ? (severityEmoji || '💬') : '💬'
        title = 'New Contact Centre Message'
        break
      case 'task_complete':
        emoji = '✅'
        title = 'Task Completed'
        break
      case 'escalation':
        emoji = '🚨'
        title = `Escalation from ${notification.city}`
        break
    }

    // Build severity line for bugs
    const severityLine = isBug && notification.severity
      ? `\n*Severity:* ${(SEVERITY_EMOJI[notification.severity] || '')} ${notification.severity.toUpperCase()}`
      : ''

    const bodyText = `${emoji} *${title}*\n*Business:* ${notification.businessName}${
      notification.category ? `\n*Category:* ${notification.category}` : ''
    }${severityLine}${
      notification.subject ? `\n*Subject:* ${notification.subject}` : ''
    }${
      notification.adminName ? `\n*Admin:* ${notification.adminName}` : ''
    }\n\n> ${notification.messagePreview.slice(0, 200)}${notification.messagePreview.length > 200 ? '...' : ''}`

    // Send to city admin Slack
    if (cityWebhook && notification.eventType !== 'escalation') {
      const cityBlocks = [
        { type: 'section', text: { type: 'mrkdwn', text: bodyText } },
        {
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'View in Admin Dashboard' },
            url: adminDeepLink,
          }],
        },
      ]

      const res = await fetch(cityWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: cityBlocks }),
      })

      if (!res.ok) {
        console.error(`[Contact Slack] City webhook failed for ${notification.city}:`, res.status)
      } else {
        console.log(`[Contact Slack] City notification sent for ${notification.city}: ${notification.eventType}`)
      }
    }

    // Send to HQ Slack (for escalations, or critical bugs)
    const shouldNotifyHQ = notification.eventType === 'escalation' ||
      (isBug && notification.severity === 'critical')
    if (hqWebhook && shouldNotifyHQ) {
      const hqBlocks = [
        { type: 'section', text: { type: 'mrkdwn', text: bodyText } },
        {
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'View in HQ Dashboard' },
            url: hqDeepLink,
          }],
        },
      ]

      const hqRes = await fetch(hqWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: hqBlocks }),
      })

      if (!hqRes.ok) {
        console.error(`[Contact Slack] HQ webhook failed:`, hqRes.status)
      } else {
        console.log(`[Contact Slack] HQ notification sent: ${notification.eventType}`)
      }
    }
  } catch (error) {
    console.error('[Contact Slack] Error sending notification:', error)
    // Non-critical - don't throw
  }
}
