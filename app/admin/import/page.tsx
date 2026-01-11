import { headers } from 'next/headers'
import { getCityFromRequest } from '@/lib/utils/city-detection'
import { createServiceRoleClient } from '@/lib/supabase/server'
import AdminImportClient from './import-client'

export default async function AdminImportPage() {
  // Get city from subdomain
  const headersList = await headers()
  const city = await getCityFromRequest(headersList)
  
  // Fetch franchise config (currency, country, display name)
  const supabase = createServiceRoleClient()
  const { data: config } = await supabase
    .from('franchise_crm_configs')
    .select('currency, country_name, display_name')
    .eq('city', city.toLowerCase())
    .single()
  
  return <AdminImportClient 
    city={city} 
    currencyCode={config?.currency || 'GBP'}
    countryName={config?.country_name || 'United Kingdom'}
    displayName={config?.display_name || city.charAt(0).toUpperCase() + city.slice(1)}
  />
}
