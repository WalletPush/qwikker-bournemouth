import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderSuiteTemplate } from '@/lib/email/suite-templates'
import { isCityEmailConfigured } from '@/lib/email/suite-config'
import { loadSuiteOfferIdeas } from '@/lib/email/suite-offers'

const bodySchema = z.object({
  templateKey: z.string().min(1),
  businessId: z.string().uuid().optional(),
  customSubject: z.string().optional(),
  customText: z.string().optional(),
  customHtml: z.string().optional(),
  trialDays: z.number().optional(),
  missingItems: z.array(z.string()).optional(),
  loyaltyUrl: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const config = await isCityEmailConfigured(auth.city)
  if (!config.configured) {
    return NextResponse.json({ error: 'Email not configured for this city' }, { status: 400 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: e }, { status: 400 })
  }

  const supabase = createAdminClient()
  let businessName = 'Sample Business'
  let firstName: string | null = 'Alex'
  let email = `preview@${auth.city}.qwikker.com`
  let businessId = body.businessId
  let offersSource: 'enrichment' | 'none' | 'sample' = 'sample'
  let offers = [
    {
      name: 'Weekday lunch special',
      value: '20% off mains Mon–Thu',
      rationale: 'Fills quieter weekday covers',
    },
    {
      name: 'First-visit welcome',
      value: 'Free drink with any main',
      rationale: 'Converts new discoverers',
    },
  ]

  if (body.businessId) {
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('id, business_name, email, first_name')
      .eq('city', auth.city)
      .eq('id', body.businessId)
      .maybeSingle()

    if (!biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    businessName = biz.business_name
    firstName = biz.first_name
    email = biz.email || email
    businessId = biz.id

    if (body.templateKey === 'offer_suggestions') {
      const loaded = await loadSuiteOfferIdeas(biz.id)
      offers = loaded.offers
      offersSource = loaded.source
    }
  }

  try {
    const template = renderSuiteTemplate(body.templateKey, {
      city: auth.city,
      businessName,
      firstName,
      email,
      businessId,
      customSubject: body.customSubject,
      customText: body.customText,
      customHtml: body.customHtml,
      trialDays: body.trialDays,
      missingItems: body.missingItems,
      loyaltyUrl: body.loyaltyUrl,
      offers: body.templateKey === 'offer_suggestions' ? offers : undefined,
      stats: { profileViews: 12, offerClaims: 3, saves: 2, periodDays: 7 },
    })

    return NextResponse.json({
      preview: true,
      to: email,
      from: config.fromEmail,
      fromName: config.fromName,
      replyTo: `hello@${auth.city}.qwikker.com`,
      subject: template.subject,
      html: template.html,
      text: template.text,
      offersSource: body.templateKey === 'offer_suggestions' ? offersSource : undefined,
      offersCount: body.templateKey === 'offer_suggestions' ? offers.length : undefined,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Preview failed' },
      { status: 400 }
    )
  }
}
