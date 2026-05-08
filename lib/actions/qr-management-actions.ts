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
      // Fallback to legacy hardcoded mapping (includes districts)
      const legacyMapping: Record<string, string[]> = {
        'bournemouth': ['bournemouth', 'christchurch', 'poole', 'boscombe', 'westbourne', 'winton', 'charminster', 'southbourne', 'parkstone', 'canford cliffs', 'broadstone', 'highcliffe', 'mudeford'],
        'calgary': ['calgary'],
        'london': ['london'],
      }
      coveredCities = legacyMapping[franchiseCity.toLowerCase()] || [franchiseCity.toLowerCase()]
      console.log(`📍 Using LEGACY mapping for ${franchiseCity}:`, coveredCities)
    } else {
      coveredCities = areasData
      console.log(`📍 Franchise ${franchiseCity} covers cities (from geography system):`, coveredCities)
    }

    // Step 1: Get approved businesses (case-insensitive town match)
    // Use .or() with ilike filters since .in() is case-sensitive
    const townFilters = coveredCities.map(c => `business_town.ilike.${c}`).join(',')
    let { data, error } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_tier, business_town, status')
      .eq('status', 'approved')
      .or(townFilters)
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

/**
 * Fetch all active QR codes for admin dashboard display (bypasses RLS)
 * Includes scan count breakdowns (7d, 30d, 60d)
 */
export async function fetchQRCodesForAdmin(city: string) {
  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('city', city.toLowerCase())
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching QR codes:', error)
      return []
    }

    if (!data || data.length === 0) return []

    // Calculate scan counts per QR code from qr_code_scans
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

    const qrIds = data.map(qr => qr.id)

    // Get all scans in the last 60 days for these QR codes
    const { data: scans } = await supabase
      .from('qr_code_scans')
      .select('qr_code_id, scanned_at')
      .in('qr_code_id', qrIds)
      .gte('scanned_at', sixtyDaysAgo)

    // Build count maps
    const scanCounts: Record<string, { d7: number; d30: number; d60: number }> = {}
    for (const qr of data) {
      scanCounts[qr.id] = { d7: 0, d30: 0, d60: 0 }
    }

    for (const scan of scans || []) {
      const counts = scanCounts[scan.qr_code_id]
      if (!counts) continue
      counts.d60++
      if (scan.scanned_at >= thirtyDaysAgo) counts.d30++
      if (scan.scanned_at >= sevenDaysAgo) counts.d7++
    }

    // Look up business names for codes linked to a business
    const businessIds = [...new Set(data.filter(qr => qr.business_id).map(qr => qr.business_id))]
    let businessNames: Record<string, string> = {}

    if (businessIds.length > 0) {
      const { data: businesses } = await supabase
        .from('business_profiles')
        .select('id, business_name')
        .in('id', businessIds)

      if (businesses) {
        businessNames = Object.fromEntries(businesses.map(b => [b.id, b.business_name]))
      }
    }

    // Attach counts and business names to QR code records
    return data.map(qr => ({
      ...qr,
      business_name: qr.business_id ? businessNames[qr.business_id] || null : null,
      scans_7d: scanCounts[qr.id]?.d7 || 0,
      scans_30d: scanCounts[qr.id]?.d30 || 0,
      scans_60d: scanCounts[qr.id]?.d60 || 0
    }))

  } catch (error) {
    console.error('❌ Error in fetchQRCodesForAdmin:', error)
    return []
  }
}

export interface CreateQRCodeInput {
  qr_code: string
  qr_type: 'marketing' | 'business_static' | 'business_dynamic'
  name: string
  description: string
  category: string
  current_target_url: string
  default_target_url: string
  business_id: string | null
  city: string
}

/**
 * Create a new QR code record (server-side, bypasses RLS)
 */
export async function createQRCode(input: CreateQRCodeInput) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('qr_codes')
    .insert({
      ...input,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to create QR code:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Update QR code destination (server-side, bypasses RLS)
 */
export async function updateQRCodeTarget(id: string, newTargetUrl: string) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('qr_codes')
    .update({
      current_target_url: newTargetUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('❌ Failed to update QR code:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Delete a QR code (server-side, bypasses RLS)
 */
export async function deleteQRCode(id: string) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('qr_codes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('❌ Failed to delete QR code:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
