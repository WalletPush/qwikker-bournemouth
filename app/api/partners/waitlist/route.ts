import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/email-service'
import { createPartnerWaitlistEmail } from '@/lib/email/templates/partner-emails'

export async function POST(request: NextRequest) {
  try {
    const { city_slug, city_name, full_name, email } = await request.json()

    if (!city_slug || !city_name || !full_name || !email) {
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
    const normalizedEmail = email.toLowerCase().trim()

    // Check for duplicate waitlist entry
    const { data: existing } = await supabase
      .from('partner_waitlist')
      .select('id')
      .eq('city_slug', city_slug)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'You are already on the waitlist for this city' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('partner_waitlist')
      .insert({
        city_slug,
        city_name,
        full_name: full_name.trim(),
        email: normalizedEmail,
      })

    if (error) {
      console.error('Failed to join waitlist:', error)
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    // Send confirmation email (non-blocking)
    sendEmail({
      to: normalizedEmail,
      template: createPartnerWaitlistEmail({ full_name, city_name }),
      tags: [{ name: 'type', value: 'partner-waitlist' }]
    }).catch(err => console.error('Failed to send waitlist confirmation email:', err))

    // Send Slack notification (non-blocking)
    const webhookUrl = process.env.HQ_SLACK_WEBHOOK_URL || process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `:hourglass_flowing_sand: ${full_name} joined the waitlist for *${city_name}*`,
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:hourglass_flowing_sand: *New Waitlist Entry*\n\n*City:* ${city_name}\n*Name:* ${full_name}\n*Email:* ${normalizedEmail}`
            }
          }]
        }),
      }).catch(err => console.error('Failed to send Slack notification:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Partner waitlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
