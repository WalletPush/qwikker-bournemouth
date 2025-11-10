import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'
import { formatBusinessHours } from '@/lib/utils/business-hours-formatter'

interface BusinessOfferRecord {
  id: string
  offer_name: string | null
  offer_type: string | null
  offer_value: string | null
  offer_terms: string | null
  offer_start_date: string | null
  offer_end_date: string | null
  offer_image: string | null
  status: string | null
}

function slugifyName(name?: string | null, fallback: string = 'preview'): string {
  if (!name) return fallback
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || fallback
}

function buildPreviewData(profile: any) {
  const heroImage = Array.isArray(profile.business_images) && profile.business_images.length > 0
    ? profile.business_images[0]
    : '/placeholder-business.jpg'

  const logo = profile.logo || null
  const slug = slugifyName(profile.business_name, profile.id)

  const fullSchedule = formatBusinessHours(profile.business_hours, profile.business_hours_structured, true)
  const scheduleLines = fullSchedule.split('\n')

  const featuredItems = Array.isArray(profile.menu_preview) ? profile.menu_preview : []

  const rawOffers: BusinessOfferRecord[] = Array.isArray(profile.business_offers)
    ? profile.business_offers
    : []

  const normalizedOffers = rawOffers
    .filter(offer => offer?.offer_name)
    .map(offer => ({
      id: offer.id,
      title: offer.offer_name ?? 'Untitled offer',
      value: offer.offer_value,
      terms: offer.offer_terms,
      status: offer.status ?? 'draft'
    }))

  if (profile.offer_name) {
    normalizedOffers.unshift({
      id: 'primary-offer',
      title: profile.offer_name,
      value: profile.offer_value,
      terms: profile.offer_terms,
      status: 'primary'
    })
  }

  const planLabel = profile.plan === 'spotlight'
    ? 'Qwikker Pick (Spotlight)'
    : profile.plan === 'featured'
      ? 'Featured Listing'
      : 'Starter Listing'

  return {
    slug,
    name: profile.business_name || 'Your Business',
    tagline: profile.business_tagline || '',
    description: profile.business_description || '',
    town: profile.business_town || '',
    address: profile.business_address || '',
    category: profile.business_category || profile.business_type || 'Local Business',
    planLabel,
    heroImage,
    logo,
    tags: [profile.business_type, profile.business_category, profile.business_town]
      .filter(Boolean)
      .map((tag: string) => tag as string),
    scheduleLines,
    featuredItems,
    offers: normalizedOffers
  }
}

export default async function DashboardProfilePreviewPage() {
  const supabase = await createClient()

  const { data: claimsResult, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError || !claimsResult?.claims) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('business_profiles')
    .select(`
      *,
      business_offers (
        id,
        offer_name,
        offer_type,
        offer_value,
        offer_terms,
        offer_start_date,
        offer_end_date,
        offer_image,
        status
      )
    `)
    .eq('user_id', claimsResult.claims.sub)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  const actionItemsCount = calculateActionItemsCount(profile)
  const preview = buildPreviewData(profile)

  // 🔍 DEBUG: Log image URLs for troubleshooting
  console.log('🖼️ PREVIEW PAGE: Image URLs', {
    heroImage: preview.heroImage,
    logo: preview.logo,
    businessImages: profile.business_images,
    rawHeroImage: Array.isArray(profile.business_images) ? profile.business_images[0] : 'N/A'
  })

  return (
    <DashboardLayout currentSection="profile" profile={profile} actionItemsCount={actionItemsCount}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Preview your listing</h1>
            <p className="text-sm text-slate-400">
              This is how Qwikker members will see your business once it goes live. Double-check everything looks spot on.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700">
              <Link href="/dashboard/profile">Back to editing</Link>
            </Button>
            <Button asChild className="bg-[#00d083] hover:bg-[#00b86f] text-black">
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-slate-700 bg-slate-800/70">
          <div className="relative h-60 w-full bg-slate-900">
            {preview.heroImage && preview.heroImage !== '/placeholder-business.jpg' ? (
              <Image
                src={preview.heroImage}
                alt={`${preview.name} cover`}
                fill
                sizes="100vw"
                className="object-cover"
                priority
                unoptimized={!preview.heroImage.includes('cloudinary')}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No hero image uploaded yet</p>
                </div>
              </div>
            )}
            {preview.logo && (
              <div className="absolute bottom-5 left-5 h-16 w-16 rounded-2xl border border-white/20 bg-white/95 p-2 shadow-lg">
                <Image
                  src={preview.logo}
                  alt={`${preview.name} logo`}
                  width={56}
                  height={56}
                  className="h-full w-full object-contain"
                  unoptimized={!preview.logo.includes('cloudinary')}
                />
              </div>
            )}
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#00d083]">
                {preview.category}
              </span>
              <h2 className="text-2xl font-semibold text-white">{preview.name}</h2>
              {preview.tagline && <p className="text-slate-200">{preview.tagline}</p>}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-200">
              {preview.town && <span className="rounded-full bg-slate-700/60 px-3 py-1">📍 {preview.town}</span>}
              <span className="rounded-full bg-slate-700/60 px-3 py-1">{preview.planLabel}</span>
              {preview.tags.map(tag => (
                <span key={tag} className="rounded-full bg-slate-700/60 px-3 py-1">
                  {tag}
                </span>
              ))}
            </div>
            {preview.description && (
              <p className="text-slate-200 leading-relaxed">{preview.description}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white text-lg">Business details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-200">
              <div>
                <p className="font-semibold text-slate-300">Address</p>
                <p>{preview.address || 'Address not provided yet'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-300">Town / Area</p>
                <p>{preview.town || 'Not set'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white text-lg">Opening hours</CardTitle>
            </CardHeader>
            <CardContent>
              {preview.scheduleLines.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-200">
                  {preview.scheduleLines.map((line, index) => (
                    <li key={`${line}-${index}`} className="flex items-center justify-between gap-3">
                      <span>{line.split(':')[0] ?? ''}</span>
                      <span className="text-slate-300">{line.split(':').slice(1).join(':').trim() || 'Closed'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-300">Hours not available yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white text-lg">Featured items</CardTitle>
          </CardHeader>
          <CardContent>
            {preview.featuredItems && preview.featuredItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {preview.featuredItems.map((item: any, idx: number) => (
                  <div key={`${item.name}-${idx}`} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{item.name}</p>
                        {item.description && <p className="text-sm text-slate-300 mt-1">{item.description}</p>}
                      </div>
                      {item.price && <span className="text-[#00d083] font-semibold">{item.price}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300">Add your hero dishes or services in the profile tab to show them off here.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white text-lg">Current offers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {preview.offers.length > 0 ? (
              preview.offers.map(offer => (
                <div key={offer.id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-white font-semibold">{offer.title}</p>
                    {offer.value && <span className="text-[#00d083] font-medium">{offer.value}</span>}
                    {offer.terms && <p className="text-xs text-slate-300">{offer.terms}</p>}
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Status: {offer.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">Add offers in the Offers tab to display them here before you go live.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

