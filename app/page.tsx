import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { GlobalHomepagePremium } from '@/components/marketing/global-homepage-premium'
import { CityLandingPage } from '@/components/marketing/city-landing-page'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'QWIKKER — Your city, curated',
  description: 'A city pass that lives in your phone wallet. Unlocks real local offers, Secret Menu items, and dish-level recommendations.',
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
      
      if (cityInfo && (cityInfo.status === 'pending_setup' || cityInfo.status === 'active')) {
        const landingConfig = (cityInfo as Record<string, unknown>).landing_page_config as Record<string, unknown> || {}

        const serviceClient = createServiceRoleClient()

        let foundingMemberSpotsLeft = 0
        if (landingConfig.show_founding_counter && landingConfig.founding_member_total_spots > 0) {
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
              const subs = (biz as Record<string, unknown>).business_subscriptions as Array<{ is_in_free_trial: boolean; free_trial_end_date: string | null; status: string }> | null
              if (!subs || subs.length === 0) return true
              const sub = subs[0]
              if (!sub) return true
              if (sub.status === 'cancelled') return false
              if (!sub.is_in_free_trial) return true
              if (sub.free_trial_end_date) return new Date(sub.free_trial_end_date) >= now
              return true
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
