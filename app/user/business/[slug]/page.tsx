import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserBusinessDetailPage } from '@/components/user/user-business-detail-page'
import { createTenantAwareClient } from '@/lib/utils/tenant-security'
import { categoryLabel } from '@/lib/utils/category-helpers'

export const dynamic = 'force-dynamic'
import { formatBusinessHours } from '@/lib/utils/business-hours-formatter'
import { getWalletPassCookie, setWalletPassCookie } from '@/lib/utils/wallet-session'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getBusinessVibeStats } from '@/lib/utils/vibes'
import { isBusinessTrialActive } from '@/lib/utils/trial-status'
import { getCurrencySymbolForCity } from '@/lib/utils/currency'

interface BusinessDetailPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

const BUSINESS_DETAIL_SELECT = `
  id,
  slug,
  business_name,
  business_type,
  system_category,
  display_category,
  business_category,
  business_town,
  business_address,
  business_tagline,
  business_description,
  business_hours,
  business_hours_structured,
  business_images,
  logo,
  phone,
  offer_name,
  offer_type,
  offer_value,
  offer_terms,
  offer_start_date,
  offer_end_date,
  offer_image,
  menu_preview,
  plan,
  rating,
  review_count,
  additional_notes,
  created_at,
  status,
  owner_user_id,
  latitude,
  longitude,
  google_primary_type,
  website_url,
  booking_url,
  booking_preference,
  google_place_id,
  placeholder_variant,
  placeholder_custom_url,
  auto_imported,
  business_offers!left(
    id,
    offer_name,
    offer_type,
    offer_value,
    offer_terms,
    offer_start_date,
    offer_end_date,
    offer_image,
    status
  ),
  business_subscriptions!business_subscriptions_business_id_fkey(
    is_in_free_trial,
    free_trial_end_date,
    status
  )
`

function slugifyBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function resolveBusinessSlug(business: { id: string; slug?: string | null; business_name?: string | null }): string {
  return business.slug || slugifyBusinessName(business.business_name || '') || business.id
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function transformBusiness(business: any, vibes: any) {
  let hasSecretMenu = false
  let secretMenuItems: { name: string; description?: string; price?: string; image_url?: string }[] = []
  if (business.additional_notes) {
    try {
      const notes = JSON.parse(business.additional_notes)
      if (notes.secret_menu_items && notes.secret_menu_items.length > 0) {
        hasSecretMenu = true
        secretMenuItems = notes.secret_menu_items
      }
    } catch (e) {
      console.error('Error parsing additional_notes for business:', business.business_name, e)
      hasSecretMenu = false
    }
  }

  const approvedOffers = (business.business_offers || []).filter((offer: any) => {
    if (offer.status !== 'approved') return false
    const now = new Date()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    if (offer.offer_end_date && new Date(offer.offer_end_date) < todayStart) return false
    if (offer.offer_start_date && new Date(offer.offer_start_date) > now) return false
    return true
  })

  return {
    id: business.id,
    name: business.business_name,
    category: categoryLabel(business),
    systemCategory: business.system_category,
    displayCategory: business.display_category,
    location: business.business_town,
    address: business.business_address,
    town: business.business_town,
    tagline: business.business_tagline || '',
    description: business.business_description || '',
    phone: business.phone || '',
    hours: formatBusinessHours(business.business_hours, business.business_hours_structured),
    fullSchedule: formatBusinessHours(business.business_hours, business.business_hours_structured, true),
    images: business.business_images || ['/placeholder-business.jpg'],
    logo: business.logo || '/placeholder-logo.jpg',
    slug: resolveBusinessSlug(business),
    offers: approvedOffers.map((offer: any) => ({
      id: offer.id,
      businessId: business.id,
      title: offer.offer_name,
      type: offer.offer_type,
      value: offer.offer_value,
      terms: offer.offer_terms || 'Terms and conditions apply',
      validUntil: offer.offer_end_date,
      expiryDate: offer.offer_end_date ? new Date(offer.offer_end_date).toLocaleDateString() : 'No expiry date',
      badge: offer.offer_value || 'OFFER',
      image: offer.offer_image || business.business_images?.[0]
    })),
    plan: (business.status === 'unclaimed' || business.status === 'claimed_free')
      ? null
      : (business.plan || 'starter'),
    rating: business.rating ?? null,
    reviewCount: business.review_count ?? null,
    vibes: vibes || null,
    website: business.website_url || null,
    booking_url: business.booking_url || null,
    booking_preference: business.booking_preference || null,
    google_primary_type: business.google_primary_type,
    google_place_id: business.google_place_id,
    placeholder_variant: business.placeholder_variant,
    placeholder_custom_url: business.placeholder_custom_url,
    auto_imported: business.auto_imported,
    tags: [
      business.display_category || business.business_category,
      business.business_type,
      business.business_town
    ].filter(Boolean),
    distance: null,
    latitude: business.latitude,
    longitude: business.longitude,
    activeOffers: approvedOffers.length,
    menuPreview: business.menu_preview || [],
    hasSecretMenu,
    secretMenu: hasSecretMenu ? { items: secretMenuItems } : null,
    tier: (business.status === 'unclaimed' || business.status === 'claimed_free')
      ? null
      : business.plan === 'spotlight'
        ? 'qwikker_picks'
        : business.plan === 'featured'
          ? 'featured'
          : 'recommended',
    status: business.status
  }
}

export default async function BusinessDetailPage({ params, searchParams }: BusinessDetailPageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams

  const currentCity = await getSafeCurrentCity()
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id

  const supabase = await createTenantAwareClient()

  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    console.log('Cookie read error (safe to ignore):', error)
  }

  const walletPassId = urlWalletPassId || cookieWalletPassId || null

  if (urlWalletPassId && urlWalletPassId !== cookieWalletPassId) {
    try { await setWalletPassCookie(urlWalletPassId) } catch {}
  }

  const { createServiceRoleClient } = await import('@/lib/supabase/server')
  const supabaseUser = createServiceRoleClient()

  // Resolve the single listing + user + currency in parallel (was: fetch every business + vibes)
  const [userResult, currencySymbol, matchedBusiness] = await Promise.all([
    walletPassId
      ? supabaseUser
          .from('app_users')
          .select('*')
          .eq('wallet_pass_id', walletPassId)
          .eq('wallet_pass_status', 'active')
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getCurrencySymbolForCity(currentCity),
    (async () => {
      const base = () =>
        supabase
          .from('business_profiles')
          .select(BUSINESS_DETAIL_SELECT)
          .eq('city', currentCity)
          .in('status', ['approved', 'unclaimed', 'claimed_free'])

      const { data: bySlug } = await base().eq('slug', slug).maybeSingle()
      if (bySlug && isBusinessTrialActive((bySlug as any).business_subscriptions)) {
        return bySlug
      }

      // Carousel previously linked by UUID — support that path without loading the whole city
      if (isUuid(slug)) {
        const { data: byId } = await base().eq('id', slug).maybeSingle()
        if (byId && isBusinessTrialActive((byId as any).business_subscriptions)) {
          return byId
        }
      }

      // Fallback for rows missing slug: light name scan, then one full fetch
      const { data: nameRows } = await supabase
        .from('business_profiles')
        .select('id, slug, business_name, status, business_subscriptions!business_subscriptions_business_id_fkey(is_in_free_trial, free_trial_end_date, status)')
        .eq('city', currentCity)
        .in('status', ['approved', 'unclaimed', 'claimed_free'])
        .not('business_name', 'is', null)

      const match = (nameRows || []).find((business) => {
        if (!isBusinessTrialActive((business as any).business_subscriptions)) return false
        return resolveBusinessSlug(business) === slug
      })
      if (!match) return null

      const { data: full } = await base().eq('id', match.id).maybeSingle()
      return full && isBusinessTrialActive((full as any).business_subscriptions) ? full : null
    })()
  ])

  let currentUser = null
  if (userResult.data) {
    const user = userResult.data
    currentUser = {
      id: user.id,
      wallet_pass_id: user.wallet_pass_id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || null,
      email: user.email,
      city: user.city,
      tier: user.tier,
      level: user.level
    }
  }

  const vibes = matchedBusiness ? await getBusinessVibeStats(matchedBusiness.id) : null
  const viewedBusiness = matchedBusiness ? transformBusiness(matchedBusiness, vibes) : null
  const allBusinesses = viewedBusiness ? [viewedBusiness] : []

  const trackingData = viewedBusiness
    ? {
        businessId: viewedBusiness.id,
        visitorName: currentUser?.name || 'Anonymous User',
        visitorWalletPassId: walletPassId || null
      }
    : null

  return (
    <UserDashboardLayout currentSection="discover" currentUser={currentUser} walletPassId={walletPassId}>
      <UserBusinessDetailPage
        slug={viewedBusiness?.slug || slug}
        businesses={allBusinesses}
        walletPassId={walletPassId}
        trackingData={trackingData}
        currencySymbol={currencySymbol}
      />
    </UserDashboardLayout>
  )
}
