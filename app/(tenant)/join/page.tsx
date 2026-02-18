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

export default async function JoinPage() {
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
      .select('display_name, currency_symbol, status')
      .eq('city', city)
      .single()
    
    console.log('🎫 [JOIN] City config:', cityConfig)
    console.log('🎫 [JOIN] Error:', configError)
    
    // If city not found or not active, redirect to global site
    if (!cityConfig || (cityConfig.status !== 'active' && cityConfig.status !== 'pending_setup')) {
      console.log('🎫 [JOIN] Redirecting to / - cityConfig not found or inactive')
      redirect('/')
    }
    
    return (
      <PassInstallerClient 
        city={city}
        displayName={cityConfig.display_name || city.charAt(0).toUpperCase() + city.slice(1)}
        currencySymbol={cityConfig.currency_symbol || '£'}
      />
    )
  } catch (error) {
    console.error('Error loading join page:', error)
    redirect('/')
  }
}
