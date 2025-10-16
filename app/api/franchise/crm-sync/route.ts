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

    // 1. Send to Franchise Partner's CRM (GoHighLevel)
    if (crmConfig.ghl_webhook_url) {
      try {
        const ghlPayload = {
          // Business Information
          firstName: businessData.first_name,
          lastName: businessData.last_name,
          email: businessData.email,
          phone: businessData.phone,
          
          // Business Details
          businessName: businessData.business_name,
          businessType: businessData.business_type,
          businessCategory: businessData.business_category,
          businessAddress: businessData.business_address,
          businessPostcode: businessData.business_postcode,
          businessCity: businessData.business_city,
          website: businessData.website || '',
          instagram: businessData.instagram || '',
          facebook: businessData.facebook || '',
          
          // Location Data
          latitude: businessData.latitude,
          longitude: businessData.longitude,
          
          // Franchise Information
          franchiseCity: cityDisplayName,
          franchiseOwner: crmConfig.franchise_owner_email,
          signupSource: `${cityDisplayName} Qwikker Onboarding`,
          leadSource: 'Qwikker Business Signup',
          
          // Timestamps
          signupDate: new Date().toISOString(),
          
          // Tags for segmentation
          tags: [
            'Qwikker Business',
            `${cityDisplayName} Franchise`,
            'New Business Lead',
            businessData.business_type || 'Unspecified'
          ],
          
          // Custom Fields
          customFields: {
            qwikker_profile_id: businessData.profile_id,
            business_coordinates: `${businessData.latitude},${businessData.longitude}`,
            franchise_location: cityDisplayName,
            onboarding_completion: 'Pending'
          }
        }

        const ghlResponse = await fetch(crmConfig.ghl_webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(crmConfig.ghl_api_key && { 'Authorization': `Bearer ${crmConfig.ghl_api_key}` })
          },
          body: JSON.stringify(ghlPayload)
        })

        if (ghlResponse.ok) {
          results.push({ service: 'GHL', status: 'success', city: cityDisplayName })
          console.log(`✅ Successfully sent ${businessData.business_name} to ${cityDisplayName} GHL`)
        } else {
          throw new Error(`GHL webhook failed: ${ghlResponse.status}`)
        }
      } catch (error) {
        console.error(`❌ GHL sync failed for ${cityDisplayName}:`, error)
        results.push({ service: 'GHL', status: 'failed', error: error.message, city: cityDisplayName })
      }
    }

    // 2. Send to Franchise Partner's Slack
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
