import { headers } from 'next/headers'
import { getCityFromRequest } from '@/lib/utils/city-detection'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PassInstallerClient } from '@/components/wallet/pass-installer-client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Get Your Pass | QWIKKER',
  description: 'Join your local QWIKKER community and start discovering exclusive offers'
}

interface JoinPageProps {
  searchParams: Promise<{ returnTo?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { returnTo } = await searchParams
  try {
    // 🌍 Get city from hostname (server-side, secure)
    const headersList = await headers()
    const host = headersList.get('host') || ''
    
    // 🛠️ DEV: Allow localhost testing
    const city = host.includes('localhost')
      ? 'bournemouth' // Default for localhost
      : await getCityFromRequest(headersList)
    
    console.log('🎫 [JOIN] Host:', host, '→ City:', city)
    
    // 🎨 Get city branding (safe fields only, server-side with service role)
    const supabase = createServiceRoleClient()
    const { data: cityConfig, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('display_name, currency_symbol, status, landing_page_config')
      .eq('city', city)
      .single()
    
    console.log('🎫 [JOIN] City config:', cityConfig)
    console.log('🎫 [JOIN] Error:', configError)
    
    // If city not found or not active, redirect to global site
    if (!cityConfig || (cityConfig.status !== 'active' && cityConfig.status !== 'pending_setup')) {
      console.log('🎫 [JOIN] Redirecting to / - cityConfig not found or inactive')
      redirect('/')
    }

    // 🔒 COMING SOON GATE: a city in coming-soon mode must not take pass installs.
    // Mirrors the publish logic in app/page.tsx (admin switch wins; existing
    // `active` cities without an explicit switch stay live).
    const cfg = (cityConfig.landing_page_config as { publish_status?: 'live' | 'coming_soon' } | null) || {}
    const publiclyLive = cfg.publish_status === 'live' || (cfg.publish_status !== 'coming_soon' && cityConfig.status === 'active')
    if (!publiclyLive) {
      console.log('🎫 [JOIN] Redirecting to / - city is in coming-soon mode')
      redirect('/')
    }
    
    return (
      <PassInstallerClient 
        city={city}
        displayName={cityConfig.display_name || city.charAt(0).toUpperCase() + city.slice(1)}
        currencySymbol={cityConfig.currency_symbol || '£'}
        returnTo={returnTo}
      />
    )
  } catch (error) {
    console.error('Error loading join page:', error)
    redirect('/')
  }
}
