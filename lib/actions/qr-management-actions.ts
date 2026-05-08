'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface QRBusiness {
  id: string
  business_name: string
  business_tier: string
  business_town: string
  status: string
}

/**
 * Get approved businesses for QR code generation (franchise-specific)
 * Uses the new franchise geography system
 */
export async function getApprovedBusinessesForQR(franchiseCity: string): Promise<QRBusiness[]> {
  const supabase = createServiceRoleClient()

  try {
    console.log(`🔍 Fetching businesses for QR generation in franchise: ${franchiseCity}`)

    // Get covered areas using the new franchise geography system
    const { data: areasData, error: areasError } = await supabase
      .rpc('get_areas_for_franchise', { franchise_code: franchiseCity.toLowerCase() })

    let coveredCities: string[] = []
    
    if (areasError || !areasData) {
      console.warn(`⚠️ Could not get areas from franchise geography system:`, areasError)
      // Fallback to legacy hardcoded mapping
      const legacyMapping: Record<string, string[]> = {
        'bournemouth': ['bournemouth', 'christchurch', 'poole'],
        'calgary': ['calgary'],
        'london': ['london'],
      }
      coveredCities = legacyMapping[franchiseCity.toLowerCase()] || [franchiseCity.toLowerCase()]
      console.log(`📍 Using LEGACY mapping for ${franchiseCity}:`, coveredCities)
    } else {
      coveredCities = areasData
      console.log(`📍 Franchise ${franchiseCity} covers cities (from geography system):`, coveredCities)
    }

    const { data, error } = await supabase
      .from('business_profiles')
      .select(`
        id, business_name, business_tier, business_town, status,
        business_subscriptions!business_subscriptions_business_id_fkey(
          is_in_free_trial,
          free_trial_end_date,
          status
        )
      `)
      .eq('status', 'approved')
      .in('business_town', coveredCities)
      .order('business_name')

    if (error) {
      console.error('❌ Database error in getApprovedBusinessesForQR:', error)
      return []
    }

    // Filter out expired free trials
    const activeBusinesses = (data || []).filter(business => {
      if (!business.business_subscriptions || business.business_subscriptions.length === 0) {
        return true
      }
      const sub = business.business_subscriptions[0]
      if (!sub.is_in_free_trial) return true
      if (sub.free_trial_end_date) {
        return new Date(sub.free_trial_end_date) >= new Date()
      }
      return true
    })

    console.log(`✅ Found ${activeBusinesses.length} active businesses (filtered from ${data?.length || 0}) across ${coveredCities.join(', ')}`)
    return activeBusinesses.map(b => ({
      id: b.id,
      business_name: b.business_name,
      business_tier: b.business_tier,
      business_town: b.business_town,
      status: b.status
    }))

  } catch (error) {
    console.error('❌ Error in getApprovedBusinessesForQR:', error)
    return []
  }
}

/**
 * Get existing QR codes for a city
 */
export async function getQRCodesForCity(city: string) {
  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase
      .from('qr_code_templates')
      .select('*')
      .eq('city', city.toLowerCase())
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching QR codes:', error)
      return []
    }

    return data || []

  } catch (error) {
    console.error('❌ Error in getQRCodesForCity:', error)
    return []
  }
}
