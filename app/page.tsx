import { createClient } from '@/lib/supabase/server'
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
        .select('city, display_name, subdomain, status')
        .eq('city', city)
        .single()
      
      console.log('🔍 [app/page.tsx] cityInfo from DB:', cityInfo)
      
      // Show city landing page for BOTH pending_setup AND active
      // Reasoning: City is "live" to users as soon as HQ launches it
      // - pending_setup = City is public, admin still configuring backend
      // - active = Admin completed setup wizard (internal database marker)
      // - Users can try to install pass in both states (graceful errors if services incomplete)
      if (cityInfo && (cityInfo.status === 'pending_setup' || cityInfo.status === 'active')) {
        return (
          <CityLandingPage
            city={cityInfo.city}
            displayName={cityInfo.display_name}
            subdomain={cityInfo.subdomain}
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
