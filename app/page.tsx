import { createClient } from '@/lib/supabase/server'
import { GlobalHomepagePremium } from '@/components/marketing/global-homepage-premium'

export const metadata = {
  title: 'QWIKKER — Your city, curated',
  description: 'A city pass that lives in your phone wallet. Unlocks real local offers, Secret Menu items, and dish-level recommendations.',
}

export default async function HomePage() {
  // Fetch all cities (active + coming_soon) from safe public view
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
