/**
 * Client-side city detection utilities
 * Safe to use in client components
 */

export type FranchiseCity = string

// Known franchise cities (client-side list)
export const KNOWN_FRANCHISE_CITIES = [
  'bournemouth',
  'calgary', 
  'london',
  'paris'
] as const

/**
 * Get city from hostname (client-side only)
 * This is a simplified version that works in the browser
 */
export function getCityFromHostnameClient(hostname: string): string {
  // Remove www. prefix if present
  const cleanHostname = hostname.replace(/^www\./, '')
  
  // Extract subdomain
  const parts = cleanHostname.split('.')
  
  // Handle different hostname patterns
  if (parts.length >= 3) {
    // subdomain.qwikker.com format
    const subdomain = parts[0]
    
    // Map known subdomains to cities
    const cityMap: Record<string, string> = {
      'bournemouth': 'bournemouth',
      'calgary': 'calgary',
      'london': 'london',
      'paris': 'paris'
    }
    
    // SECURITY: Block unknown subdomains instead of defaulting
    if (cityMap[subdomain]) {
      return cityMap[subdomain]
    } else {
      throw new Error(`Access denied: Unknown franchise subdomain '${subdomain}'`)
    }
  }
  
  // Handle localhost and development
  if (cleanHostname.includes('localhost') || cleanHostname.includes('127.0.0.1')) {
    return 'bournemouth' // Default for development
  }
  
  // Default fallback
  return 'bournemouth'
}

/**
 * Get city display name
 */
export function getCityDisplayName(city: string): string {
  const displayNames: Record<string, string> = {
    'bournemouth': 'Bournemouth',
    'calgary': 'Calgary',
    'london': 'London',
    'paris': 'Paris'
  }
  
  return displayNames[city] || city.charAt(0).toUpperCase() + city.slice(1)
}
