import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { loadFranchiseCRMConfigFromDB } from '@/lib/utils/franchise-crm-config'

export async function POST(request: NextRequest) {
  try {
    const { walletPassId, city, category, subject, message } = await request.json()

    if (!city || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('user_support_requests')
      .insert({
        wallet_pass_id: walletPassId || 'anonymous',
        city,
        category: category || 'general',
        subject: subject.slice(0, 120),
        message: message.slice(0, 1000),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating support request:', error)
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
    }

    // Fire-and-forget Slack notifications
    notifyCitySlack(city, subject, category, message, data.id).catch(() => {})
    notifyHQSlack(city, subject, category, message).catch(() => {})

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('User support API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function notifyCitySlack(
  city: string,
  subject: string,
  category: string,
  message: string,
  requestId: string
) {
  try {
    const config = await loadFranchiseCRMConfigFromDB(city)
    const webhook = config?.slack_webhook_url
    if (!webhook) return

    const subdomain = city.toLowerCase()
    const adminLink = `https://${subdomain}.qwikker.com/admin?tab=contact-centre`

    const categoryLabel = {
      general: 'General question',
      business_issue: 'Issue with a business',
      pass_problem: 'Problem with my pass',
      feedback: 'Feedback / suggestion',
    }[category] || category

    const bodyText = `🙋 *User Help Request*\n*Category:* ${categoryLabel}\n*Subject:* ${subject}\n\n> ${message.slice(0, 200)}${message.length > 200 ? '...' : ''}`

    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: bodyText } },
          {
            type: 'actions',
            elements: [{
              type: 'button',
              text: { type: 'plain_text', text: 'View in Admin Dashboard' },
              url: adminLink,
            }],
          },
        ],
      }),
    })
  } catch (error) {
    console.error('Slack notification failed for user support:', error)
  }
}

async function notifyHQSlack(city: string, subject: string, category: string, message: string) {
  const { sendHQSlackNotification } = await import('@/lib/utils/dynamic-notifications')
  const categoryLabel = {
    general: 'General question',
    business_issue: 'Issue with a business',
    pass_problem: 'Problem with my pass',
    feedback: 'Feedback / suggestion',
  }[category] || category

  await sendHQSlackNotification({
    title: `🙋 User Support: ${subject}`,
    message: `*Category:* ${categoryLabel}\n*City:* ${city}\n\n> ${message.slice(0, 200)}${message.length > 200 ? '...' : ''}`,
    city,
    type: 'user_support',
  })
}
