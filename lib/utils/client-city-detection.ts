/**
 * Client-side city detection utilities
 * DB-driven validation with aggressive caching (no hardcoded city lists!)
 * 
 * Architecture:
 * - Fetches valid cities from /api/franchise/cities (backed by franchise_public_info view)
 * - Two-layer cache: memory (fast) + localStorage (persists across reloads)
 * - Fails gracefully: if validation can't complete, returns null and lets server be authoritative
 */

export type FranchiseCity = string

// Cache configuration
const LS_KEY = 'qwikker_franchise_public_v2' // v2 = new format (array of objects, not strings)
const TTL_MS = 5 * 60 * 1000 // 5 minutes

// In-memory cache (fastest, session-scoped)
export interface FranchisePublic {
  subdomain: string
  display_name: string
  status: 'active' | 'coming_soon'
}

interface CachePayload {
  v: 2 // Version flag (prevents old format from being read)
  franchises: FranchisePublic[]
  ts: number
}

let memCache: CachePayload | null = null

/**
 * Fetch valid franchises from API
 * Let browser/CDN handle caching naturally (endpoint sets Cache-Control headers)
 */
async function fetchFranchises(): Promise<FranchisePublic[]> {
  try {
    // Don't fight with CDN caching - endpoint already sets Cache-Control
    const res = await fetch('/api/franchise/cities')
    
    if (!res.ok) {
      console.warn('Failed to fetch franchises:', res.status)
      return []
    }
    
    const json = await res.json()
    return Array.isArray(json?.franchises) ? json.franchises : []
  } catch (error) {
    console.warn('Error fetching franchises:', error)
    return []
  }
}

/**
 * Get valid franchise data with two-layer caching
 * Returns empty array if fetch fails (fail open - let server validate)
 */
async function getValidFranchises(): Promise<FranchisePublic[]> {
  const now = Date.now()

  // 1) Check memory cache (fastest)
  if (memCache && memCache.v === 2 && (now - memCache.ts) < TTL_MS) {
    return memCache.franchises
  }

  // 2) Check localStorage cache (persists across reloads)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as CachePayload
        // ✅ Version check: only use v2 format (prevents old string[] format from being used)
        if (parsed?.v === 2 && Array.isArray(parsed?.franchises) && typeof parsed?.ts === 'number') {
          if ((now - parsed.ts) < TTL_MS) {
            // Restore memory cache from localStorage
            memCache = parsed
            return parsed.franchises
          }
        }
      }
    } catch (error) {
      // Ignore localStorage errors (private browsing, quota, etc.)
    }
  }

  // 3) Fetch from API (cache miss)
  const franchises = await fetchFranchises()

  // Dev-mode warning: empty franchises array could indicate config issue
  if (process.env.NODE_ENV === 'development' && franchises.length === 0) {
    console.warn(
      '[FRANCHISE CACHE] No franchises returned. Server will still validate, but check:',
      '\n  - /api/franchise/cities endpoint',
      '\n  - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars',
      '\n  - franchise_public_info view has active/coming_soon rows'
    )
  }

  const payload: CachePayload = { v: 2, franchises, ts: now }
  memCache = payload

  // Update localStorage for next reload
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload))
    } catch (error) {
      // Ignore localStorage write errors
    }
  }

  return franchises
}

/**
 * Get valid franchise subdomains only
 * Returns empty array if fetch fails (fail open - let server validate)
 */
export async function getValidClientFranchiseSubdomains(): Promise<string[]> {
  const franchises = await getValidFranchises()
  return franchises.map(f => f.subdomain)
}

/**
 * @deprecated Use getValidClientFranchiseSubdomains() instead
 * Kept for backward compatibility with existing components
 */
export async function getValidClientFranchiseCities(): Promise<string[]> {
  return getValidClientFranchiseSubdomains()
}

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string | null {
  const cleanHostname = hostname.replace(/^www\./, '')
  const parts = cleanHostname.split('.')
  
  // subdomain.qwikker.com format
  if (parts.length >= 3) {
    return parts[0].toLowerCase()
  }
  
  return null
}

/**
 * Get city from hostname (client-side only)
 * 
 * IMPORTANT: This fails gracefully!
 * - If validation can't complete (cold start, API down), returns 'bournemouth' fallback
 * - Server-side validation is always authoritative
 * - Client-side validation is UX optimization only (instant feedback, no flash)
 */
export function getCityFromHostnameClient(hostname: string): string {
  // Handle localhost and development (synchronous)
  const cleanHostname = hostname.replace(/^www\./, '')
  if (cleanHostname.includes('localhost') || cleanHostname.includes('127.0.0.1')) {
    return 'bournemouth' // Default for development
  }
  
  // Extract subdomain
  const subdomain = extractSubdomain(hostname)
  
  if (!subdomain) {
    return 'bournemouth' // Default fallback
  }
  
  // NOTE: This function is synchronous but validation is async
  // We return the subdomain and rely on server-side validation as the source of truth
  // The async validation (below) is for preloading/warming the cache
  return subdomain
}

/**
 * Resolve client city from hostname with async validation
 * 
 * Use this when you can await (e.g., useEffect, async functions)
 * Returns null if subdomain is invalid (let server decide)
 */
export async function resolveClientCityFromHostname(hostname: string): Promise<string | null> {
  // Handle localhost and development
  const cleanHostname = hostname.replace(/^www\./, '')
  if (cleanHostname.includes('localhost') || cleanHostname.includes('127.0.0.1')) {
    return 'bournemouth'
  }
  
  const subdomain = extractSubdomain(hostname)
  if (!subdomain) {
    return null
  }

  const validSubdomains = await getValidClientFranchiseSubdomains()

  // If fetch failed, fail open (return subdomain, let server validate)
  if (!validSubdomains.length) {
    console.warn('Client subdomain validation unavailable - allowing', subdomain)
    return subdomain
  }

  // Validate subdomain against DB list
  return validSubdomains.includes(subdomain) ? subdomain : null
}

/**
 * Get city display name
 * Priority: API data > local overrides > auto-capitalize
 */
export function getCityDisplayName(city: string): string {
  const normalized = city.toLowerCase()
  
  // 1) Check API cache first (if available)
  if (memCache && memCache.franchises) {
    const match = memCache.franchises.find(f => f.subdomain === normalized)
    if (match?.display_name) {
      return match.display_name
    }
  }
  
  // 2) Local override map (for when API hasn't been fetched yet)
  const overrides: Record<string, string> = {
    'bcp': 'Bournemouth, Christchurch & Poole',
    'st-ives': 'St Ives',
    'st-albans': 'St Albans',
    'new-york': 'New York',
    'los-angeles': 'Los Angeles',
    'san-francisco': 'San Francisco',
  }
  
  if (overrides[normalized]) {
    return overrides[normalized]
  }
  
  // 3) Default: capitalize each word, handle dashes and spaces
  return normalized
    .split(/[\s-]+/) // Split on spaces or dashes
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Preload/warm the franchise cache
 * Call this early in app lifecycle (layout, root component, etc.)
 * Also warms display name map for getCityDisplayName()
 */
export async function preloadFranchiseCities(): Promise<void> {
  await getValidFranchises()
}
