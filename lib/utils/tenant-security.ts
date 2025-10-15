/**
 * Tenant Security Utilities
 * 
 * Provides city-based tenant isolation helpers that work alongside existing code
 * WITHOUT breaking current functionality.
 */

import { createClient } from '@/lib/supabase/client'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { headers } from 'next/headers'

/**
 * Creates a tenant-aware Supabase client for user-facing pages
 * This replaces createServiceRoleClient() in user pages for security
 */
export async function createTenantAwareClient() {
  const client = createClient()
  
  // Set the current city context for RLS policies
  try {
    const city = await getFranchiseCityFromRequest()
    await client.rpc('set_current_city', { city_name: city })
  } catch (error) {
    console.error('🚨 SECURITY: Could not set city context:', error)
    // SECURITY: Block request instead of falling back
    throw new Error('Tenant context required - access denied')
  }
  
  return client
}

/**
 * Creates a city-filtered service role client for admin operations
 * Use this when you need service role access but want city filtering
 */
export async function createCityFilteredServiceClient(city?: string) {
  const client = createServiceRoleClient()
  
  const targetCity = city || await getFranchiseCityFromRequest()
  
  // Set city context even for service role (for logging/audit)
  try {
    await client.rpc('set_current_city', { city_name: targetCity })
  } catch (error) {
    console.warn('Could not set city context for service client:', error)
  }
  
  return client
}

/**
 * Validates that a write operation is allowed for the current tenant
 * Use this before any create/update operations
 */
export async function validateTenantWrite(
  data: { city?: string; business_city?: string },
  allowedCity?: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const currentCity = allowedCity || await getFranchiseCityFromRequest()
    const dataCity = data.city || data.business_city
    
    if (!dataCity) {
      return { isValid: false, error: 'City is required for tenant validation' }
    }
    
    if (dataCity !== currentCity) {
      return { 
        isValid: false, 
        error: `Cannot write to city '${dataCity}' from '${currentCity}' tenant` 
      }
    }
    
    // Validate city exists in franchise system
    const client = createServiceRoleClient()
    const { data: franchise } = await client
      .from('franchise_crm_configs')
      .select('city')
      .eq('city', dataCity)
      .eq('status', 'active')
      .single()
    
    if (!franchise) {
      return { 
        isValid: false, 
        error: `City '${dataCity}' is not an active franchise` 
      }
    }
    
    return { isValid: true }
  } catch (error) {
    return { 
      isValid: false, 
      error: `Tenant validation failed: ${error}` 
    }
  }
}

/**
 * Adds city filter to existing queries (non-breaking helper)
 * Use this to gradually migrate existing service-role queries
 */
export function addCityFilter<T>(
  query: any,
  city?: string,
  cityColumn: string = 'city'
): any {
  if (city && city !== 'all') {
    return query.eq(cityColumn, city)
  }
  return query
}

/**
 * Safe city detection with fallback
 * Prevents unknown subdomains from accessing data
 */
export async function getSafeCurrentCity(): Promise<string> {
  try {
    const city = await getFranchiseCityFromRequest()
    
    // Validate city exists in franchise system using the new dynamic helper
    const { isValidFranchiseCity } = await import('./franchise-areas')
    const isValid = await isValidFranchiseCity(city)
    
    if (isValid) {
      return city
    } else {
      console.warn(`⚠️ Unknown city '${city}' detected, blocking access`)
      throw new Error(`Unauthorized city: ${city}`)
    }
  } catch (error) {
    console.error('🚨 SECURITY: City detection failed:', error)
    // SECURITY: Don't fall back to bournemouth - block the request
    throw new Error(`Access denied: Could not validate franchise city - ${error}`)
  }
}

/**
 * Middleware helper to set tenant context
 * Call this in middleware or page components
 */
export async function setTenantContext(city?: string) {
  try {
    const targetCity = city || await getFranchiseCityFromRequest()
    
    // This will be used by RLS policies
    if (typeof window === 'undefined') {
      // Server-side: set in environment
      process.env.CURRENT_TENANT_CITY = targetCity
    }
    
    return targetCity
  } catch (error) {
    console.warn('Could not set tenant context:', error)
    // SECURITY: No fallback - block unknown cities
    throw new Error(`Access denied: Unknown city '${city}'`)
  }
}

/**
 * Check if current request is from a valid franchise
 */
export async function isValidFranchiseRequest(): Promise<boolean> {
  try {
    await getSafeCurrentCity()
    return true
  } catch {
    return false
  }
}

/**
 * Get tenant-safe business profiles query
 * Replaces direct service-role queries in user pages
 */
export async function getTenantBusinessProfiles(city?: string) {
  const client = await createTenantAwareClient()
  const targetCity = city || await getFranchiseCityFromRequest()
  
  return client
    .from('business_profiles')
    .select('*')
    .eq('city', targetCity)
    .eq('status', 'approved')
}

/**
 * Get tenant-safe app users query
 */
export async function getTenantAppUsers(city?: string) {
  const client = await createTenantAwareClient()
  const targetCity = city || await getFranchiseCityFromRequest()
  
  return client
    .from('app_users')
    .select('*')
    .eq('city', targetCity)
}

/**
 * Migration helper: gradually replace service-role usage
 * This function logs usage to help identify where service-role is still used
 */
export function logServiceRoleUsage(location: string, reason: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`🔐 Service Role Usage: ${location} - ${reason}`)
  }
}
