import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { GlobalHomepagePremium } from '@/components/marketing/global-homepage-premium'
import { CityLandingPage } from '@/components/marketing/city-landing-page'
import { CityComingSoonPage } from '@/components/marketing/city-coming-soon-page'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { resolveTheme, type LandingPageConfig } from '@/lib/constants/landing-templates'
import type { LiveOffer } from '@/components/marketing/live-offers-section'
import { isBusinessTrialActive, normalizeSubscription } from '@/lib/utils/trial-status'

export const dynamic = 'force-dynamic'

const ROOT_HOSTS = new Set(['qwikker.com', 'www.qwikker.com', 'localhost:3000', 'localhost'])

// Computed once on the server so the offer card label is identical at hydration
// (avoids locale/timezone mismatches between server and browser).
function formatOfferExpiry(dateStr: string | null, now: Date): string | null {
  if (!dateStr) return null
  const end = new Date(dateStr)
  if (isNaN(end.getTime())) return null
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return null
  if (days === 0) return 'Ends today'
  if (days === 1) return 'Ends tomorrow'
  if (days <= 14) return `Ends in ${days} days`
  return `Until ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })}`
}

const GLOBAL_METADATA: Metadata = {
  title: 'QWIKKER — Your city, curated',
  description: 'A city pass that lives in your phone wallet. Unlocks real local offers, Secret Menu items, and dish-level recommendations.',
}

// Per-city SEO + social share cards. Resolved from the request host so every
// city subdomain shares professionally on WhatsApp / iMessage / Instagram.
// Tenant-isolated: nothing here is cached across cities (force-dynamic).
export async function generateMetadata(): Promise<Metadata> {
  try {
    const headersList = await headers()
    const hostname = headersList.get('host') || ''
    if (ROOT_HOSTS.has(hostname)) return GLOBAL_METADATA

    const city = await getCityFromHostname(hostname)
    const supabase = await createClient()
    const { data: cityInfo } = await supabase
      .from('franchise_public_info')
      .select('city, display_name, status, landing_page_config')
      .eq('city', city)
      .single()

    if (!cityInfo || (cityInfo.status !== 'active' && cityInfo.status !== 'pending_setup')) {
      return GLOBAL_METADATA
    }

    const displayName = cityInfo.display_name || city.charAt(0).toUpperCase() + city.slice(1)
    const cfg = ((cityInfo as Record<string, unknown>).landing_page_config as LandingPageConfig) || {}
    const theme = resolveTheme(cfg)

    // Approximate count of current offers for the share badge (best-effort).
    let offerCount = 0
    if (cfg.offers_section?.enabled) {
      try {
        const svc = createServiceRoleClient()
        const { count } = await svc
          .from('business_offers')
          .select('id, business_profiles!inner(city, status)', { count: 'exact', head: true })
          .eq('status', 'approved')
          .eq('business_profiles.city', city)
          .in('business_profiles.status', ['approved', 'claimed_free'])
        offerCount = count || 0
      } catch {
        offerCount = 0
      }
    }

    const title = `QWIKKER ${displayName} — Local offers, secret menus & rewards`
    const description = cfg.hero_subtitle
      || `Discover exclusive local offers, loyalty rewards and secret menus in ${displayName} — straight to your phone wallet. No app required.`

    const baseUrl = `https://${hostname}`
    const ogUrl = `${baseUrl}/api/og?city=${encodeURIComponent(displayName)}&offers=${offerCount}&accent=${encodeURIComponent(theme.accent)}`

    return {
      title,
      description,
      metadataBase: new URL(baseUrl),
      openGraph: {
        title,
        description,
        url: baseUrl,
        siteName: 'QWIKKER',
        type: 'website',
        images: [{ url: ogUrl, width: 1200, height: 630, alt: `QWIKKER ${displayName}` }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogUrl],
      },
    }
  } catch (error) {
    console.error('generateMetadata error:', error)
    return GLOBAL_METADATA
  }
}

export default async function HomePage() {
  // Detect if we're on root domain or city subdomain
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  
  console.log('🔍 [app/page.tsx] hostname:', hostname)
  
  // Check if this is the root domain (qwikker.com or www.qwikker.com or localhost:3000)
  const isRootDomain = hostname === 'qwikker.com' || 
                       hostname === 'www.qwikker.com' || 
                       hostname === 'localhost:3000' ||
                       hostname === 'localhost' // Plain localhost without port
  
  console.log('🔍 [app/page.tsx] isRootDomain:', isRootDomain)
  
  // If it's a city subdomain, show city landing page
  if (!isRootDomain) {
    try {
      const city = await getCityFromHostname(hostname)
      console.log('🔍 [app/page.tsx] detected city:', city)
      
      // Fetch city info from database
      const supabase = await createClient()
      const { data: cityInfo } = await supabase
        .from('franchise_public_info')
        .select('city, display_name, subdomain, status, landing_page_config')
        .eq('city', city)
        .single()
      
      console.log('🔍 [app/page.tsx] cityInfo from DB:', cityInfo)
      
      const knownCity = cityInfo && ['pending_setup', 'active', 'coming_soon'].includes(cityInfo.status)
      const onboarded = cityInfo && (cityInfo.status === 'pending_setup' || cityInfo.status === 'active')

      // Effective public publish state: the city admin's switch wins. For backward
      // compatibility, an onboarded city with no explicit switch defaults to live
      // only if it's already `active` (existing live cities), otherwise coming-soon.
      const cfgForGate = (cityInfo ? ((cityInfo as Record<string, unknown>).landing_page_config as LandingPageConfig) : null) || {}
      const explicitComingSoon = cfgForGate.publish_status === 'coming_soon'
      const publiclyLive = !!onboarded && (cfgForGate.publish_status === 'live' || (!explicitComingSoon && cityInfo!.status === 'active'))

      // Coming-soon: onboarded-but-not-published, OR an HQ coming_soon city that
      // hasn't been onboarded yet. Either way show a branded, install-free page.
      if (knownCity && !publiclyLive) {
        return (
          <CityComingSoonPage
            city={cityInfo!.city}
            displayName={cityInfo!.display_name || city.charAt(0).toUpperCase() + city.slice(1)}
            landingConfig={cfgForGate}
          />
        )
      }

      if (cityInfo && publiclyLive) {
        const landingConfig = ((cityInfo as Record<string, unknown>).landing_page_config as LandingPageConfig) || {}

        const serviceClient = createServiceRoleClient()

        let foundingMemberSpotsLeft = 0
        if (landingConfig.show_founding_counter && (landingConfig.founding_member_total_spots ?? 0) > 0) {
          const { count } = await serviceClient
            .from('claim_requests')
            .select('id', { count: 'exact', head: true })
            .ilike('city', city)
            .eq('is_founding_member', true)
            .in('status', ['pending', 'approved'])

          foundingMemberSpotsLeft = Math.max(0, (landingConfig.founding_member_total_spots as number) - (count || 0))
        }

        let featuredBusinesses: { business_name: string; id: string; business_tagline: string | null; business_images: string[] | null }[] = []
        if (landingConfig.show_featured_businesses && (landingConfig.featured_business_ids as string[] | null)?.length) {
          const { data: bizData } = await serviceClient
            .from('business_profiles')
            .select('id, business_name, business_tagline, business_images, business_subscriptions!business_subscriptions_business_id_fkey(is_in_free_trial, free_trial_end_date, status)')
            .in('id', landingConfig.featured_business_ids as string[])
            .in('status', ['approved', 'claimed_free'])

          const now = new Date()
          featuredBusinesses = (bizData || []).filter(biz => {
            if (!biz) return false
            try {
              // Shared helper normalises object/array embed shape (UNIQUE(business_id))
              // and hides expired trials. Preserve this surface's prior extra rule
              // of also hiding explicitly-cancelled featured businesses.
              const sub = normalizeSubscription((biz as Record<string, unknown>).business_subscriptions as any)
              if (sub?.status === 'cancelled') return false
              return isBusinessTrialActive(sub, now)
            } catch {
              return true
            }
          }).map(b => ({ id: b.id, business_name: b.business_name, business_tagline: b.business_tagline, business_images: b.business_images }))
        }

        let passHolderCount = 0
        if (landingConfig.show_pass_count) {
          const { count } = await serviceClient
            .from('app_users')
            .select('id', { count: 'exact', head: true })
            .ilike('city', city)
          passHolderCount = count || 0
        }

        // Public live offers (approved + date-valid) from eligible businesses in this city.
        let liveOffers: LiveOffer[] = []
        if (landingConfig.offers_section?.enabled) {
          const max = landingConfig.offers_section?.max ?? 6
          const { data: offerRows } = await serviceClient
            .from('business_offers')
            .select('id, offer_name, offer_value, offer_image, offer_start_date, offer_end_date, business_id, business_profiles!inner(business_name, business_images, city, status, business_subscriptions!business_subscriptions_business_id_fkey(is_in_free_trial, free_trial_end_date, status))')
            .eq('status', 'approved')
            .eq('business_profiles.city', city)
            .in('business_profiles.status', ['approved', 'claimed_free'])
            .limit(60)

          const now = new Date()
          liveOffers = (offerRows || [])
            .map((o) => {
              const raw = (o as Record<string, unknown>).business_profiles
              const bp = (Array.isArray(raw) ? raw[0] : raw) as { business_name?: string; business_images?: string[] | null; business_subscriptions?: unknown } | undefined
              return { o, bp }
            })
            .filter(({ o, bp }) => {
              const startOk = !o.offer_start_date || new Date(o.offer_start_date) <= now
              const endOk = !o.offer_end_date || new Date(o.offer_end_date) >= now
              // Hide offers from expired-trial businesses (shared helper normalises embed shape)
              const businessActive = isBusinessTrialActive(bp?.business_subscriptions as any, now)
              return startOk && endOk && businessActive
            })
            .sort((a, b) => {
              // soonest-ending first; evergreen (no end date) last
              const ae = a.o.offer_end_date ? new Date(a.o.offer_end_date).getTime() : Infinity
              const be = b.o.offer_end_date ? new Date(b.o.offer_end_date).getTime() : Infinity
              return ae - be
            })
            .slice(0, max)
            .map(({ o, bp }) => ({
              id: o.id,
              offer_name: o.offer_name,
              offer_value: o.offer_value,
              offer_image: o.offer_image,
              offer_end_date: o.offer_end_date,
              business_id: o.business_id,
              business_name: bp?.business_name || 'Local business',
              business_image: bp?.business_images?.[0] || null,
              expiry_label: formatOfferExpiry(o.offer_end_date, now),
            }))
        }

        let trialEnabled = false
        const { data: crmConfig } = await serviceClient
          .from('franchise_crm_configs')
          .select('founding_member_trial_days')
          .eq('city', city)
          .single()
        if (crmConfig?.founding_member_trial_days && crmConfig.founding_member_trial_days > 0) {
          trialEnabled = true
        }

        return (
          <CityLandingPage
            city={cityInfo.city}
            displayName={cityInfo.display_name}
            subdomain={cityInfo.subdomain}
            landingConfig={landingConfig}
            foundingMemberSpotsLeft={foundingMemberSpotsLeft}
            featuredBusinesses={featuredBusinesses}
            passHolderCount={passHolderCount}
            trialEnabled={trialEnabled}
            liveOffers={liveOffers}
          />
        )
      }
    } catch (error) {
      console.error('Error loading city landing page:', error)
      // Fall through to global homepage
    }
  }
  
  // Root domain or error → show global homepage
  const supabase = await createClient()
  
  const { data: cities, error } = await supabase
    .from('franchise_public_info')
    .select('city, display_name, subdomain, country_name, status')
    .in('status', ['active', 'coming_soon'])
    .order('country_name')
    .order('display_name')

  if (error) {
    console.error('Error fetching cities:', error)
  }

  return <GlobalHomepagePremium cities={cities || []} />
}
