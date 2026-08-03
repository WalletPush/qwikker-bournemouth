import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createPartnerVerifyEmail } from '@/lib/email/templates/partner-emails'
import { Resend } from 'resend'
import { sendWithRetry } from '@/lib/email/send-franchise-email'
import { slugifyCityName } from '@/lib/partners/availability'
import { writeClaimAudit } from '@/lib/partners/claim-transitions'
import { checkCityAvailability } from '@/app/api/partners/cities/route'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const claimSchema = z.object({
  city_name: z.string().min(2).max(120),
  city_slug: z.string().min(2).max(120).optional(),
  country: z.string().max(120).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  place_id: z.string().max(256).optional().nullable(),
  full_name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  marketing_opt_in: z.boolean().optional().default(false),
  enquiry_consent: z.literal(true),
  website: z.string().max(0).optional(), // honeypot — must be empty
  place_types: z.array(z.string()).optional(),
})

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 8
const rateMap = new Map<string, { count: number; reset: number }>()

function rateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(key)
  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_MAX) return false
  entry.count += 1
  return true
}

function looksLikeLocality(placeTypes?: string[]): boolean {
  if (!placeTypes || placeTypes.length === 0) return true // text fallback — validated elsewhere
  const allowed = new Set([
    'locality',
    'postal_town',
    'administrative_area_level_1',
    'administrative_area_level_2',
    'colloquial_area',
    'political',
  ])
  const blocked = ['establishment', 'point_of_interest', 'premise', 'street_address', 'route', 'subpremise']
  if (placeTypes.some((t) => blocked.includes(t))) return false
  return placeTypes.some((t) => allowed.has(t))
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!rateLimit(`claim:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = claimSchema.safeParse(body)
    if (!parsed.success) {
      // Generic — avoid leaking field details that enable enumeration tricks
      return NextResponse.json({ error: 'Invalid enquiry details' }, { status: 400 })
    }

    const data = parsed.data
    if (data.website) {
      // Honeypot tripped — pretend success
      return NextResponse.json({ success: true, verification_required: true })
    }

    if (!looksLikeLocality(data.place_types)) {
      return NextResponse.json(
        { error: 'Please select a city or region, not a business or address.' },
        { status: 400 }
      )
    }

    const cityName = data.city_name.trim()
    const slug = (data.city_slug || slugifyCityName(cityName)).toLowerCase()
    if (slug.length < 2 || /\d{4,}/.test(cityName)) {
      return NextResponse.json({ error: 'Please enter a valid city name.' }, { status: 400 })
    }

    const email = data.email.toLowerCase().trim()
    const supabase = createServiceRoleClient()

    const availability = await checkCityAvailability(slug)

    if (availability === 'owned' || availability === 'waitlist_only') {
      return NextResponse.json(
        { error: 'This territory is not available for reservation', waitlist: true },
        { status: 409 }
      )
    }
    if (availability === 'reserved') {
      return NextResponse.json(
        { error: 'This territory is already reserved', waitlist: true },
        { status: 409 }
      )
    }

    const { data: emailClaims } = await supabase
      .from('partner_claims')
      .select('city_slug, status, email')
      .eq('email', email)

    const activeForEmail = (emailClaims || []).filter((h) =>
      ['submitted', 'email_verified', 'held', 'claimed'].includes(h.status)
    )
    if (activeForEmail.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active territory enquiry' },
        { status: 409 }
      )
    }

    // Same-city rejected block until HQ releases
    const { data: rejectedSame } = await supabase
      .from('partner_claims')
      .select('id')
      .eq('city_slug', slug)
      .eq('email', email)
      .eq('status', 'rejected')
      .limit(1)
      .maybeSingle()

    if (rejectedSame) {
      return NextResponse.json(
        { error: 'This territory enquiry cannot be resubmitted at this time' },
        { status: 409 }
      )
    }

    const token = randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: claim, error } = await supabase
      .from('partner_claims')
      .insert({
        city_name: cityName,
        city_slug: slug,
        country: data.country || null,
        region: data.region || null,
        place_id: data.place_id || null,
        full_name: data.full_name.trim(),
        email,
        status: 'submitted',
        claimed_at: new Date().toISOString(),
        expires_at: null,
        marketing_opt_in: !!data.marketing_opt_in,
        verification_token: token,
        verification_expires_at: verificationExpires,
        is_founding_eligible: true,
      })
      .select('id, city_name')
      .single()

    if (error) {
      console.error('Failed to create partner claim:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An active enquiry already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to submit enquiry' }, { status: 500 })
    }

    await writeClaimAudit({
      claimId: claim.id,
      actor: 'public',
      fromStatus: null,
      toStatus: 'submitted',
      note: 'Enquiry submitted — awaiting email verification',
    })

    const partnersOrigin =
      process.env.NEXT_PUBLIC_PARTNERS_URL ||
      (process.env.VERCEL_ENV === 'production'
        ? 'https://partners.qwikker.com'
        : request.headers.get('origin') || 'http://localhost:3000')
    const verifyPath =
      partnersOrigin.includes('partners.qwikker.com') || partnersOrigin.includes('partners.localhost')
        ? '/verify'
        : '/partners/verify'
    const verifyUrl = `${partnersOrigin.replace(/\/$/, '')}${verifyPath}?token=${token}`

    try {
      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        const resendClient = new Resend(resendApiKey)
        const template = createPartnerVerifyEmail({
          full_name: data.full_name.trim(),
          city_name: cityName,
          verifyUrl,
        })
        const fromAddress = process.env.EMAIL_FROM || 'QWIKKER <no-reply@qwikker.com>'
        await sendWithRetry(resendClient, {
          from: fromAddress,
          to: email,
          subject: template.subject,
          html: template.html,
          text: template.text,
          tags: [
            { name: 'service', value: 'qwikker' },
            { name: 'type', value: 'partner-verify' },
          ],
        })
      }
    } catch (err) {
      console.error('Failed to send verify email:', err)
    }

    return NextResponse.json({
      success: true,
      verification_required: true,
      // Do not echo email for enumeration safety beyond what user typed
    })
  } catch (error) {
    console.error('Partner claim API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
