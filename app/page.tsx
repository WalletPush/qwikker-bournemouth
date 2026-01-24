import { createClient } from '@/lib/supabase/server'
import { GlobalHomepagePremium } from '@/components/marketing/global-homepage-premium'

export const metadata = {
  title: 'QWIKKER — Your city, curated',
  description: 'A city pass that lives in your phone wallet. Unlocks real local offers, Secret Menu items, and dish-level recommendations.',
}

export default async function HomePage() {
  // Fetch live cities from safe public view
  const supabase = await createClient()
  
  const { data: cities, error } = await supabase
    .from('franchise_public_info')
    .select('city, display_name, subdomain, country_name')
    .eq('status', 'active')
    .order('display_name')

  if (error) {
    console.error('Error fetching live cities:', error)
  }

  return <GlobalHomepagePremium cities={cities || []} />
}
