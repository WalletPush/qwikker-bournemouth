/**
 * Location detection utilities for franchise model
 */

export interface LocationInfo {
  city: string
  displayName: string
  availableTowns: string[]
  defaultTown: string
  subdomain: string
}

// Franchise location mapping
const FRANCHISE_LOCATIONS: Record<string, LocationInfo> = {
  bournemouth: {
    city: 'bournemouth',
    displayName: 'Bournemouth',
    availableTowns: ['bournemouth', 'poole', 'christchurch', 'wimborne', 'ferndown', 'ringwood', 'new_milton'],
    defaultTown: 'bournemouth',
    subdomain: 'bournemouth'
  },
  london: {
    city: 'london',
    displayName: 'London',
    availableTowns: ['london', 'westminster', 'camden', 'islington', 'hackney', 'tower_hamlets', 'southwark'],
    defaultTown: 'london',
    subdomain: 'london'
  },
  manchester: {
    city: 'manchester',
    displayName: 'Manchester',
    availableTowns: ['manchester', 'salford', 'stockport', 'oldham', 'rochdale', 'bury', 'bolton'],
    defaultTown: 'manchester',
    subdomain: 'manchester'
  },
  // Add more franchise locations as needed
}

/**
 * Detect location from subdomain
 */
export async function detectLocationFromSubdomain(hostname: string): Promise<LocationInfo> {
  // Use the dynamic city detection system
  const { getFranchiseFromHostname } = await import('./franchise-areas')
  
  try {
    const city = await getFranchiseFromHostname(hostname)
    
    // Return location info for the detected city
    // Use hardcoded info if available, otherwise generate generic info
    if (FRANCHISE_LOCATIONS[city]) {
      console.log(`🌍 Subdomain detected: ${city} (using stored config)`)
      return FRANCHISE_LOCATIONS[city]
    }
    
    // Generate generic location info for cities not in hardcoded list
    console.log(`🌍 Subdomain detected: ${city} (using generic config)`)
    return {
      city,
      displayName: city.charAt(0).toUpperCase() + city.slice(1),
      availableTowns: [city],
      defaultTown: city,
      subdomain: city
    }
  } catch (error) {
    console.error('City detection failed:', error)
    // Fallback to Bournemouth
    return FRANCHISE_LOCATIONS.bournemouth
  }
}

/**
 * Detect location from IP address (using a geolocation API)
 * This is a fallback when subdomain detection fails
 */
export async function detectLocationFromIP(): Promise<LocationInfo> {
  try {
    // Use a free geolocation API (you might want to upgrade to a paid one for production)
    const response = await fetch('https://ipapi.co/json/')
    const data = await response.json()
    
    const city = data.city?.toLowerCase()
    const region = data.region?.toLowerCase()
    
    // Try to match the detected location to our franchise areas
    for (const [, locationInfo] of Object.entries(FRANCHISE_LOCATIONS)) {
      if (
        locationInfo.availableTowns.some(town => 
          city?.includes(town) || region?.includes(town)
        )
      ) {
        return locationInfo
      }
    }
    
    // If no match found, default to Bournemouth
    return FRANCHISE_LOCATIONS.bournemouth
  } catch (error) {
    console.error('IP-based location detection failed:', error)
    return FRANCHISE_LOCATIONS.bournemouth
  }
}

/**
 * Get location info for the current request
 * Tries subdomain first, then IP detection as fallback
 */
export async function getCurrentLocation(hostname?: string, devLocationOverride?: string, urlLocation?: string): Promise<LocationInfo> {
  // URL parameter override (e.g., ?location=london)
  if (urlLocation) {
    const urlLocationInfo = FRANCHISE_LOCATIONS[urlLocation.toLowerCase()]
    if (urlLocationInfo) {
      console.log(`🔗 URL parameter override: using ${urlLocation} location`)
      return urlLocationInfo
    }
  }
  
  // Development override for testing different locations
  if (devLocationOverride) {
    const overrideLocation = FRANCHISE_LOCATIONS[devLocationOverride.toLowerCase()]
    if (overrideLocation) {
      console.log(`🧪 Environment override: using ${devLocationOverride} location`)
      return overrideLocation
    }
  }
  
  if (hostname) {
    const subdomainLocation = await detectLocationFromSubdomain(hostname)
    
    // Always use subdomain detection result (includes localhost handling)
    return subdomainLocation
  }
  
  // Fallback to IP detection only if no hostname
  return await detectLocationFromIP()
}

/**
 * Map form town selection to database city value
 */
export function mapTownToCity(town: string, locationInfo: LocationInfo): string {
  const normalizedTown = town.toLowerCase().trim()
  
  // If the selected town is in the current location's available towns, use the location's city
  if (locationInfo.availableTowns.includes(normalizedTown)) {
    return locationInfo.city
  }
  
  // Otherwise, try to map to the closest franchise location
  for (const [, location] of Object.entries(FRANCHISE_LOCATIONS)) {
    if (location.availableTowns.includes(normalizedTown)) {
      return location.city
    }
  }
  
  // Default fallback
  return locationInfo.city
}

/**
 * Get available towns for a location (for populating dropdowns)
 */
export function getAvailableTownsForLocation(locationInfo: LocationInfo): Array<{value: string, label: string}> {
  return locationInfo.availableTowns.map(town => ({
    value: town,
    label: town.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }))
}
