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

    // Step 1: Get approved businesses (try business_town first, fallback to city)
    let { data, error } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_tier, business_town, status')
      .eq('status', 'approved')
      .in('business_town', coveredCities)
      .order('business_name')

    if (error) {
      console.error('❌ Database error in getApprovedBusinessesForQR:', error)
      return []
    }

    if (!data || data.length === 0) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('business_profiles')
        .select('id, business_name, business_tier, business_town, status')
        .eq('status', 'approved')
        .eq('city', franchiseCity.toLowerCase())
        .order('business_name')

      if (fallbackError) {
        console.error('❌ Fallback query error:', fallbackError)
        return []
      }
      data = fallbackData
    }

    if (!data || data.length === 0) return []

    // Step 2: Filter out expired trials by checking subscriptions
    const businessIds = data.map(b => b.id)
    const { data: subscriptions } = await supabase
      .from('business_subscriptions')
      .select('business_id, is_in_free_trial, free_trial_end_date')
      .in('business_id', businessIds)

    const expiredIds = new Set(
      (subscriptions || [])
        .filter(sub => sub.is_in_free_trial && sub.free_trial_end_date && new Date(sub.free_trial_end_date) < new Date())
        .map(sub => sub.business_id)
    )

    const activeBusinesses = data.filter(b => !expiredIds.has(b.id))
    console.log(`✅ Found ${activeBusinesses.length} active businesses (${expiredIds.size} expired trials filtered out)`)
    return activeBusinesses

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
