import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/email-service'
import { createCityLiveEmail } from '@/lib/email/templates/city-request-notifications'

const notifySchema = z.object({
  cityNameNormalized: z.string().min(1),
  cityUrl: z.string().url(),
  cityDisplayName: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = await requireHQAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const parsed = notifySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { cityNameNormalized, cityUrl, cityDisplayName } = parsed.data
    const supabase = createServiceRoleClient()

    // Fetch all un-notified voters for this city
    const { data: voters, error: fetchErr } = await supabase
      .from('city_requests')
      .select('id, email')
      .eq('city_name_normalized', cityNameNormalized)
      .is('notified_at', null)

    if (fetchErr) {
      console.error('Failed to fetch voters:', fetchErr)
      return NextResponse.json({ error: 'Failed to fetch voters' }, { status: 500 })
    }

    if (!voters || voters.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No un-notified voters' })
    }

    const template = createCityLiveEmail({ cityName: cityDisplayName, cityUrl })

    let sent = 0
    let failed = 0
    const voterIds: string[] = []

    for (const voter of voters) {
      try {
        const result = await sendEmail({ to: voter.email, template })
        if (result.success) {
          sent++
          voterIds.push(voter.id)
        } else {
          failed++
          console.error(`Failed to email ${voter.email}:`, result.error)
        }
      } catch (err) {
        failed++
        console.error(`Error emailing ${voter.email}:`, err)
      }
    }

    // Mark notified voters
    if (voterIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('city_requests')
        .update({ notified_at: new Date().toISOString() })
        .in('id', voterIds)

      if (updateErr) {
        console.error('Failed to update notified_at:', updateErr)
      }
    }

    console.log(`City notification for "${cityDisplayName}": ${sent} sent, ${failed} failed`)

    return NextResponse.json({
      success: true,
      sent,
      failed,
      message: `Notified ${sent} voter${sent === 1 ? '' : 's'}`,
    })
  } catch (err) {
    console.error('City notify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
