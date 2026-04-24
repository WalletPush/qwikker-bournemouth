import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/email-service'
import { createPartnerClaimEmail } from '@/lib/email/templates/partner-emails'

export async function POST(request: NextRequest) {
  try {
    const { city_name, city_slug, country, place_id, full_name, email } = await request.json()

    if (!city_name || !city_slug || !full_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const slug = city_slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Check if city is already live or reserved
    const { data: existingFranchise } = await supabase
      .from('franchise_crm_configs')
      .select('city, status')
      .eq('city', slug)
      .maybeSingle()

    if (existingFranchise) {
      const label = existingFranchise.status === 'active' ? 'live' : 'reserved'
      return NextResponse.json(
        { error: `This city is already ${label}` },
        { status: 409 }
      )
    }

    // Check for active (non-expired) claim on this city
    const { data: existingClaim } = await supabase
      .from('partner_claims')
      .select('id, full_name, email, expires_at')
      .eq('city_slug', slug)
      .eq('status', 'claimed')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existingClaim) {
      return NextResponse.json(
        { error: 'This city has already been claimed', waitlist: true },
        { status: 409 }
      )
    }

    // Check for duplicate claim by same email (any city)
    const { data: emailClaim } = await supabase
      .from('partner_claims')
      .select('id, city_name')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'claimed')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle()

    if (emailClaim) {
      return NextResponse.json(
        { error: `You already have an active claim on ${emailClaim.city_name}` },
        { status: 409 }
      )
    }

    const claimedAt = new Date()
    const expiresAt = new Date(claimedAt.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { data: claim, error } = await supabase
      .from('partner_claims')
      .insert({
        city_name,
        city_slug: slug,
        country: country || null,
        place_id: place_id || null,
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        status: 'claimed',
        claimed_at: claimedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create partner claim:', error)
      return NextResponse.json(
        { error: 'Failed to create claim' },
        { status: 500 }
      )
    }

    // Send confirmation email (non-blocking)
    sendEmail({
      to: email.toLowerCase().trim(),
      template: createPartnerClaimEmail({ full_name, city_name }),
      tags: [{ name: 'type', value: 'partner-claim' }]
    }).catch(err => console.error('Failed to send claim confirmation email:', err))

    // Send Slack notification (non-blocking)
    sendPartnerSlackNotification({
      type: 'claim',
      city_name,
      full_name,
      email,
    }).catch(err => console.error('Failed to send Slack notification:', err))

    return NextResponse.json({
      success: true,
      claim: {
        id: claim.id,
        city_name: claim.city_name,
        expires_at: claim.expires_at,
      }
    })
  } catch (error) {
    console.error('Partner claim API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendPartnerSlackNotification(data: {
  type: 'claim' | 'waitlist'
  city_name: string
  full_name: string
  email: string
}) {
  const webhookUrl = process.env.HQ_SLACK_WEBHOOK_URL || process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const emoji = data.type === 'claim' ? ':cityscape:' : ':hourglass_flowing_sand:'
  const action = data.type === 'claim' ? 'claimed' : 'joined the waitlist for'

  const message = {
    text: `${emoji} ${data.full_name} ${action} *${data.city_name}*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *New Partner ${data.type === 'claim' ? 'Claim' : 'Waitlist'}*\n\n*City:* ${data.city_name}\n*Name:* ${data.full_name}\n*Email:* ${data.email}`
        }
      }
    ]
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })
}
