import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

interface FranchiseCRMRequest {
  businessData: Record<string, unknown>
  crmConfig: {
    city: string
    franchise_owner_email: string
    ghl_webhook_url: string
    ghl_api_key?: string
    slack_webhook_url?: string
    crm_type: string
  }
  city: string
  cityDisplayName: string
}

export async function POST(request: NextRequest) {
  try {
    const { businessData, crmConfig, city, cityDisplayName }: FranchiseCRMRequest = await request.json()
    
    // Validate required data
    if (!businessData || !crmConfig || !city) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      )
    }

    const results = []

    // 1. Send to Franchise Partner's Slack
    if (crmConfig.slack_webhook_url) {
      try {
        const slackPayload = {
          text: `🎉 New ${cityDisplayName} Business Signup!`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `🏢 New Business Signup - ${cityDisplayName}`,
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Business:*\n${businessData.business_name}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Type:*\n${businessData.business_type || 'Not specified'}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Contact:*\n${businessData.first_name} ${businessData.last_name}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Email:*\n${businessData.email}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Phone:*\n${businessData.phone}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Location:*\n${businessData.business_address}`
                }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Franchise Owner:* ${crmConfig.franchise_owner_email}\n*City:* ${cityDisplayName}\n*Signup Time:* ${new Date().toLocaleString()}`
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '🔍 View in Admin',
                    emoji: true
                  },
                  url: `https://${city}.qwikker.com/admin`,
                  style: 'primary'
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '📧 Contact Business',
                    emoji: true
                  },
                  url: `mailto:${businessData.email}?subject=${encodeURIComponent(`Welcome to ${cityDisplayName} Qwikker!`)}`
                }
              ]
            }
          ]
        }

        const slackResponse = await fetch(crmConfig.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload)
        })

        if (slackResponse.ok) {
          results.push({ service: 'Slack', status: 'success', city: cityDisplayName })
          console.log(`✅ Successfully sent ${businessData.business_name} to ${cityDisplayName} Slack`)
        } else {
          throw new Error(`Slack webhook failed: ${slackResponse.status}`)
        }
      } catch (error) {
        console.error(`❌ Slack sync failed for ${cityDisplayName}:`, error)
        results.push({ service: 'Slack', status: 'failed', error: error.message, city: cityDisplayName })
      }
    }

    // 3. Log the franchise CRM sync in database
    const supabase = createRouteHandlerClient({ cookies })
    await supabase
      .from('franchise_crm_sync_logs')
      .insert({
        business_name: businessData.business_name,
        business_email: businessData.email,
        franchise_city: city,
        franchise_owner: crmConfig.franchise_owner_email,
        sync_results: results,
        sync_timestamp: new Date().toISOString(),
        business_data: businessData
      })

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${businessData.business_name} to ${cityDisplayName} franchise CRM`,
      results: results,
      franchise_city: cityDisplayName,
      franchise_owner: crmConfig.franchise_owner_email
    })

  } catch (error) {
    console.error('Franchise CRM sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync with franchise CRM', details: error.message },
      { status: 500 }
    )
  }
}
