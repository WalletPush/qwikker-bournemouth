'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface FranchiseTerritory {
  id: string
  franchise_code: string
  franchise_name: string
  country: string
  region: string
  is_active: boolean
  currency: string
  timezone: string
}

export interface GeographicArea {
  id: string
  area_name: string
  area_type: string
  franchise_territory_id: string
  country: string
  region: string
  postal_code_prefix: string
  is_active: boolean
}

/**
 * Get the franchise code for a given city/area name
 * This handles Google Places results like "Boscombe" -> "bournemouth"
 */
export async function getFranchiseForArea(areaName: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  
  try {
    const { data, error } = await supabase
      .rpc('get_franchise_for_area', { input_area: areaName })
    
    if (error) {
      console.error('Error getting franchise for area:', error)
      return null
    }
    
    return data || null
  } catch (error) {
    console.error('Error in getFranchiseForArea:', error)
    return null
  }
}

/**
 * Get all geographic areas covered by a franchise
 * Returns array like ['bournemouth', 'christchurch', 'poole', 'boscombe', ...]
 */
export async function getAreasForFranchise(franchiseCode: string): Promise<string[]> {
  const supabase = createServiceRoleClient()
  
  try {
    const { data, error } = await supabase
      .rpc('get_areas_for_franchise', { franchise_code: franchiseCode })
    
    if (error) {
      console.error('Error getting areas for franchise:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getAreasForFranchise:', error)
    return []
  }
}

/**
 * Get franchise territory details
 */
export async function getFranchiseTerritory(franchiseCode: string): Promise<FranchiseTerritory | null> {
  const supabase = createServiceRoleClient()
  
  try {
    const { data, error } = await supabase
      .from('franchise_territories')
      .select('*')
      .eq('franchise_code', franchiseCode)
      .eq('is_active', true)
      .single()
    
    if (error) {
      console.error('Error getting franchise territory:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in getFranchiseTerritory:', error)
    return null
  }
}

/**
 * Get all geographic areas for a franchise with full details
 */
export async function getGeographicAreasForFranchise(franchiseCode: string): Promise<GeographicArea[]> {
  const supabase = createServiceRoleClient()
  
  try {
    const { data, error } = await supabase
      .from('geographic_areas')
      .select(`
        *,
        franchise_territories!inner(
          franchise_code,
          franchise_name
        )
      `)
      .eq('franchise_territories.franchise_code', franchiseCode)
      .eq('is_active', true)
      .order('area_name')
    
    if (error) {
      console.error('Error getting geographic areas:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getGeographicAreasForFranchise:', error)
    return []
  }
}

/**
 * Legacy compatibility function - maps old hardcoded logic to new system
 * @deprecated Use getFranchiseForArea and getAreasForFranchise instead
 */
export async function getLegacyFranchiseAreas(franchiseCity: string): Promise<string[]> {
  console.warn('🚨 Using legacy franchise mapping - should migrate to geographic_areas table')
  
  // Try the new system first
  const areas = await getAreasForFranchise(franchiseCity)
  if (areas.length > 0) {
    return areas
  }
  
  // Fallback to old hardcoded logic
  const legacyMapping: Record<string, string[]> = {
    'bournemouth': ['bournemouth', 'christchurch', 'poole'],
    'calgary': ['calgary'],
    'london': ['london'],
  }
  
  return legacyMapping[franchiseCity.toLowerCase()] || [franchiseCity.toLowerCase()]
}

/**
 * Smart city resolver for Google Places integration
 * Handles cases where Google returns "Boscombe" but we need "bournemouth" franchise
 */
export async function resolveCityToFranchise(googlePlacesResult: string): Promise<{
  franchise: string
  displayCity: string
  allAreas: string[]
}> {
  const franchise = await getFranchiseForArea(googlePlacesResult)
  
  if (!franchise) {
    // Fallback - treat as its own franchise
    return {
      franchise: googlePlacesResult.toLowerCase(),
      displayCity: googlePlacesResult,
      allAreas: [googlePlacesResult.toLowerCase()]
    }
  }
  
  const allAreas = await getAreasForFranchise(franchise)
  const territory = await getFranchiseTerritory(franchise)
  
  return {
    franchise,
    displayCity: territory?.franchise_name || googlePlacesResult,
    allAreas
  }
}

