import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import {
  mapGoogleTypesToSystemCategory,
  SYSTEM_CATEGORY_LABEL,
  isValidSystemCategory,
  type SystemCategory,
} from '@/lib/constants/system-categories'
import { validateCategoryMatch } from '@/lib/import/category-filters'
import { generateTagline } from '@/lib/import/tagline-generator'

interface ImportRequest {
  city?: string // DEPRECATED: Now derived from hostname server-side (ignored if provided)
  placeIds: string[]
  systemCategory: SystemCategory // Stable enum (e.g. 'restaurant', 'cafe')
  displayCategory: string // User-facing label (e.g. 'Restaurant', 'Cafe / Coffee Shop')
  skipDuplicates?: boolean // Skip already imported businesses
}

// Track active imports (in-memory, will reset on server restart)
const activeImports = new Map<string, boolean>()

/**
 * OPENING HOURS PARSER
 * 
 * FIX: business_hours_structured must match DB constraint:
 *  - NULL OR JSON containing keys monday..sunday
 *  - Each day: { open: "HH:MM", close: "HH:MM", closed: boolean }
 *
 * IMPORTANT:
 *  - Your table columns are business_hours and business_hours_structured
 *  - Do NOT insert into opening_hours (unless that column exists)
 */

type DayKey =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
  | 'friday' | 'saturday' | 'sunday'

const DAY_KEYS: DayKey[] = [
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
]

function parseWeekdayDescriptionsToStructured(
  weekdayDescriptions: string[] | undefined,
  timezone: string
): { structured: any | null; text: string | null } {
  if (!weekdayDescriptions || weekdayDescriptions.length < 7) {
    return { structured: null, text: null }
  }

  // Google commonly returns lines like:
  // "Monday: 9:00 AM – 6:00 PM" OR "Monday: Closed"
  // We'll parse conservatively. If anything looks off, we bail to null to satisfy constraint safely.
  const structured: any = {
    timezone,
    last_updated: new Date().toISOString()
  }

  const text = weekdayDescriptions.join('\n')

  // Map day label -> dayKey
  const dayMap: Record<string, DayKey> = {
    monday: 'monday',
    tuesday: 'tuesday',
    wednesday: 'wednesday',
    thursday: 'thursday',
    friday: 'friday',
    saturday: 'saturday',
    sunday: 'sunday'
  }

  for (const line of weekdayDescriptions) {
    const parts = line.split(':')
    if (parts.length < 2) return { structured: null, text } // unknown format

    const dayLabel = parts[0].trim().toLowerCase()
    const dayKey = dayMap[dayLabel]
    if (!dayKey) return { structured: null, text }

    const rest = parts.slice(1).join(':').trim()

    // Closed
    if (/closed/i.test(rest)) {
      structured[dayKey] = { open: null, close: null, closed: true }
      continue
    }

    // Try to parse "9:00 AM – 6:00 PM" (en dash or hyphen)
    const range = rest.split(/–|-|—/).map(s => s.trim())
    if (range.length < 2) return { structured: null, text }

    const open = normalizeTo24h(range[0])
    const close = normalizeTo24h(range[1])

    if (!open || !close) return { structured: null, text }

    structured[dayKey] = { open, close, closed: false }
  }

  // Ensure all 7 keys exist (DB constraint)
  for (const k of DAY_KEYS) {
    if (!structured[k]) return { structured: null, text }
  }

  return { structured, text }
}

/**
 * Normalize Place ID to Google Places API (New) resource name format
 * 
 * The New Places API expects resource names like "places/ChIJ..."
 * Search results return bare IDs like "ChIJ..." 
 * 
 * @param input - Raw place ID (e.g., "ChIJ...") or resource name (e.g., "places/ChIJ...")
 * @returns Normalized resource name (e.g., "places/ChIJ...")
 */
function normalizePlaceResourceName(input: string): string {
  const trimmed = input.trim()
  
  // Already in correct format
  if (trimmed.startsWith('places/')) {
    return trimmed
  }
  
  // Convert bare ID to resource name
  return `places/${trimmed}`
}

/**
 * Safely parse JSON response from Google Places API
 * Handles empty bodies, non-JSON responses, and provides detailed error info
 */
async function parseJsonResponseSafe(
  response: Response,
  label: string,
  placeId?: string
): Promise<any> {
  const contentType = response.headers.get('content-type') || ''
  const status = response.status
  const statusText = response.statusText
  
  // Read body as text first (only once)
  const rawBody = await response.text()
  
  // Check for empty body
  if (!rawBody.trim()) {
    const error = `${label} returned empty body (status=${status} ${statusText})`
    console.error(`❌ ${label} failed${placeId ? ` for ${placeId}` : ''}: ${error}`)
    throw new Error(error)
  }
  
  // Try to parse JSON
  let parsed: any
  try {
    parsed = JSON.parse(rawBody)
  } catch (parseError) {
    const bodySnippet = rawBody.substring(0, 300)
    const error = `${label} returned non-JSON response (status=${status} ${statusText}, contentType=${contentType})`
    console.error(`❌ ${label} failed${placeId ? ` for ${placeId}` : ''}:`, {
      status,
      statusText,
      contentType,
      bodySnippet,
      parseError: parseError instanceof Error ? parseError.message : String(parseError)
    })
    throw new Error(`${error}. Body snippet: ${bodySnippet}`)
  }
  
  // Check for HTTP error status
  if (!response.ok) {
    const bodySnippet = rawBody.substring(0, 300)
    const error = `${label} returned error status (status=${status} ${statusText}, contentType=${contentType})`
    console.error(`❌ ${label} failed${placeId ? ` for ${placeId}` : ''}:`, {
      status,
      statusText,
      contentType,
      bodySnippet,
      error: parsed.error || parsed
    })
    throw new Error(`${error}. ${parsed.error?.message || bodySnippet}`)
  }
  
  return parsed
}

function normalizeTo24h(input: string): string | null {
  // Handles:
  //  - "9:00 AM" / "09:00"
  //  - "9 AM"
  // If it looks weird, return null.
  const s = input.trim()

  // Already 24h?
  const m24 = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (m24) {
    const hh = m24[1].padStart(2,'0')
    return `${hh}:${m24[2]}`
  }

  // 12h with AM/PM
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (!m12) return null

  let h = parseInt(m12[1], 10)
  const min = (m12[2] ?? '00')
  const ap = m12[3].toUpperCase()

  if (h < 1 || h > 12) return null
  if (parseInt(min, 10) < 0 || parseInt(min, 10) > 59) return null

  if (ap === 'AM') {
    if (h === 12) h = 0
  } else {
    if (h !== 12) h += 12
  }

  return `${String(h).padStart(2,'0')}:${min}`
}

/**
 * Extract postcode from Google Places address components
 */
function extractPostcode(addressComponents: any[] | undefined): string | null {
  if (!addressComponents) return null
  
  const postcodeComponent = addressComponents.find(
    (comp: any) => comp.types?.includes('postal_code')
  )
  
  return postcodeComponent?.longText || postcodeComponent?.shortText || null
}

export async function POST(request: NextRequest) {
  // 🔒 SECURITY: Require admin authentication BEFORE starting stream
  const cookieStore = await cookies()
  const adminSessionCookie = cookieStore.get('qwikker_admin_session')

  if (!adminSessionCookie?.value) {
    return new Response(JSON.stringify({ error: 'Admin authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let adminSession
  try {
    adminSession = JSON.parse(adminSessionCookie.value)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid admin session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 🔒 SECURITY: Derive city from hostname (never trust client)
  const hostname = request.headers.get('host') || ''
  const requestCity = await getCityFromHostname(hostname)

  // Verify admin exists and has permission for this city
  const admin = await getAdminById(adminSession.adminId)
  if (!admin || !await isAdminForCity(adminSession.adminId, requestCity)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const encoder = new TextEncoder()
  
  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body: ImportRequest = await request.json()
        const { placeIds, systemCategory, displayCategory, skipDuplicates = true } = body

        // Use requestCity (from hostname), ignore body.city if provided
        const city = requestCity

        if (!placeIds || placeIds.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Invalid import parameters'
          })}\n\n`))
          controller.close()
          return
        }

        // Validate systemCategory
        if (!isValidSystemCategory(systemCategory)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: `Invalid systemCategory: ${systemCategory}`
          })}\n\n`))
          controller.close()
          return
        }

        const importId = `${city}-${Date.now()}`
        activeImports.set(importId, true)

        console.log(`🚀 Starting import: ${placeIds.length} businesses for ${city} (category: ${systemCategory})`)

        // Get Google Places API key
        const supabase = createServiceRoleClient()

        // If skipDuplicates, fetch existing google_place_ids
        let existingPlaceIds = new Set<string>()
        if (skipDuplicates) {
          const { data: existingBusinesses } = await supabase
            .from('business_profiles')
            .select('google_place_id')
            .in('google_place_id', placeIds)
            .not('google_place_id', 'is', null)
          
          if (existingBusinesses) {
            existingPlaceIds = new Set(existingBusinesses.map(b => b.google_place_id).filter(Boolean))
            console.log(`📋 Found ${existingPlaceIds.size} duplicates to skip`)
          }
        }

        const { data: franchiseConfig } = await supabase
          .from('franchise_crm_configs')
          .select('google_places_api_key')
          .eq('city', city.toLowerCase())
          .single()

        if (!franchiseConfig?.google_places_api_key) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Google Places API key not configured'
          })}\n\n`))
          controller.close()
          return
        }

        const apiKey = franchiseConfig.google_places_api_key
        
        let imported = 0
        let skipped = 0
        let failed = 0
        const total = placeIds.length

        // Process each place
        for (let i = 0; i < placeIds.length; i++) {
          // Check if import was cancelled
          if (!activeImports.get(importId)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'cancelled',
              imported,
              skipped,
              failed,
              total
            })}\n\n`))
            controller.close()
            return
          }

          const placeId = placeIds[i]

          try {
            // Get Place Details from Google using Places API (New)
            // IMPORTANT: Search returns bare IDs like "ChIJ...", but Details API expects "places/ChIJ..."
            const placeResource = normalizePlaceResourceName(placeId)
            const detailsUrl = `https://places.googleapis.com/v1/${placeResource}`
            
            // DEV LOGGING: Track exact URL being called
            if (process.env.NODE_ENV === 'development') {
              console.log('🔎 Place Details request:', {
                rawPlaceId: placeId,
                placeResource,
                detailsUrl
              })
            }
            
            const detailsResponse = await fetch(detailsUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                // IMPORTANT: Include regularOpeningHours.weekdayDescriptions to get hours data
                // ENRICHMENT: Include primaryType and addressComponents for richer categorization
                'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,websiteUri,rating,userRatingCount,types,primaryType,location,businessStatus,regularOpeningHours.weekdayDescriptions,photos'
              }
            })
            
            // 🔒 SAFE JSON PARSING: Handle empty bodies, non-JSON, and error responses
            const place = await parseJsonResponseSafe(detailsResponse, 'Google Place Details', placeId)

            // 🔍 DEV LOGGING: See what Google actually returns
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 Google response for ${place.displayName?.text}:`, {
                hasWebsiteUri: !!place.websiteUri,
                websiteUri: place.websiteUri,
                hasPhone: !!place.nationalPhoneNumber,
                phone: place.nationalPhoneNumber,
                hasAddress: !!place.formattedAddress,
                fields: Object.keys(place).slice(0, 10) // First 10 fields returned
              })
            }

            if (place.error) {
              console.error(`❌ Failed to get details for ${placeId}:`, place.error.message)
              failed++
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total,
                imported,
                skipped,
                failed,
                currentBusiness: `Failed: ${placeId}`,
                status: 'failed'
              })}\n\n`))
              
              continue
            }

            // Final validation
            if (place.businessStatus === 'CLOSED_PERMANENTLY') {
              console.log(`⚠️ Skipping ${place.displayName?.text}: Permanently closed`)
              skipped++
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total,
                imported,
                skipped,
                failed,
                currentBusiness: place.displayName?.text || placeId,
                status: 'skipped',
                reason: 'Permanently closed'
              })}\n\n`))
              
              continue
            }

            // 🔒 TWO-STAGE CATEGORY FILTERING (ENFORCED - prevents bypassing via UI bugs)
            // This is the same validation as preview, ensuring no mismatched businesses slip through
            const categoryValidation = validateCategoryMatch(
              {
                name: place.displayName?.text || '',
                types: place.types,
                primary_type: place.types?.[0],
              },
              systemCategory
            )

            if (!categoryValidation.valid) {
              console.log(`❌ CATEGORY MISMATCH: ${place.displayName?.text} - ${categoryValidation.reason}`)
              skipped++

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total,
                imported,
                skipped,
                failed,
                currentBusiness: place.displayName?.text || placeId,
                status: 'skipped',
                reason: `Category mismatch: ${categoryValidation.reason}`
              })}\n\n`))

              continue
            }

            // Check for duplicates using pre-fetched set
            if (skipDuplicates && existingPlaceIds.has(placeId)) {
              console.log(`⚠️ Skipping ${place.displayName?.text}: Already imported`)
              skipped++
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total,
                imported,
                skipped,
                failed,
                currentBusiness: place.displayName?.text || placeId,
                status: 'skipped',
                reason: 'Already imported'
              })}\n\n`))
              
              continue
            }

            // Parse opening hours using safe parser
            const timezone = 'Europe/London' // Default to UK timezone (could be franchise-specific later)
            const { structured: businessHoursStructured, text: businessHoursText } = 
              parseWeekdayDescriptionsToStructured(
                place.regularOpeningHours?.weekdayDescriptions,
                timezone
              )

            // 🐛 DEBUG: Verify hours structure before insert (only in development)
            if (process.env.NODE_ENV !== 'production') {
              console.log('hours_structured_keys', businessHoursStructured ? Object.keys(businessHoursStructured) : null)
            }

            // Map Google types to system_category
            const googleTypes = place.types || []
            const system_category = mapGoogleTypesToSystemCategory(googleTypes)
            const display_category = SYSTEM_CATEGORY_LABEL[system_category]

            // Sanity check: Ensure system_category is valid before insert
            if (!isValidSystemCategory(system_category)) {
              console.error(`⚠️ Invalid system_category detected: "${system_category}" for ${place.displayName?.text}`)
              failed++
              continue
            }

            // Extract richer Google data for better labeling
            const googlePrimaryType = place.primaryType || null
            const businessPostcode = extractPostcode(place.addressComponents)

            // Generate deterministic tagline for Discover card
            // For restaurants, this creates cuisine-specific taglines like:
            // "Italian dining in Bournemouth" instead of generic "Comfort food, done right"
            const generatedTagline = generateTagline(
              placeId,                     // businessId (stable, deterministic)
              place.displayName?.text || '', // businessName (for specialty detection)
              systemCategory,              // category (e.g., "restaurant")
              city,                        // city (e.g., "bournemouth")
              displayCategory              // displayCategory (e.g., "Italian Restaurant")
            )

            // Create business profile (use systemCategory from admin form)
            const { error: insertError } = await supabase
              .from('business_profiles')
              .insert({
                business_name: place.displayName?.text || 'Unknown',
                system_category: systemCategory, // Use category selected in import form
                display_category: displayCategory, // Use display label from import form
                google_types: googleTypes, // Store raw Google types for reference (includes cuisine types like 'nepalese_restaurant')
                google_primary_type: googlePrimaryType, // Primary type from Google (e.g., 'nepalese_restaurant', 'coffee_shop')
                business_type: systemCategory, // Map system_category to business_type (legacy field)
                business_town: city.charAt(0).toUpperCase() + city.slice(1),
                city: city.toLowerCase(),
                business_address: place.formattedAddress || '', // ✅ FIXED: Use correct column name
                business_postcode: businessPostcode, // Extract postcode from address components
                phone: place.nationalPhoneNumber || null,
                website_url: place.websiteUri || null, // ✅ FIXED: Use correct column name (website_url, not website)
                rating: place.rating || null,
                review_count: place.userRatingCount || null,
                business_hours: businessHoursText, // Human-readable text
                business_hours_structured: businessHoursStructured, // Structured JSON (all days or null)
                latitude: place.location?.latitude || null, // For distance calculations and maps
                longitude: place.location?.longitude || null,
                google_place_id: placeId,
                google_photo_name: place.photos?.[0]?.name || null,
                business_tagline: generatedTagline, // Auto-generated tagline (owner can overwrite when claiming)
                tagline_source: 'generated', // Mark as auto-generated
                placeholder_variant: 0, // 🔒 CRITICAL: Always use neutral default (variant 0) on import
                status: 'unclaimed',
                visibility: 'discover_only',
                auto_imported: true,
                user_id: null,
                owner_user_id: null
                // NOTE: plan and trial fields are NOT set here - the trigger will normalize them to free/null
              })

            if (insertError) {
              console.error(`❌ Failed to insert ${place.displayName?.text}:`, insertError)
              failed++
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total,
                imported,
                skipped,
                failed,
                currentBusiness: place.displayName?.text || placeId,
                status: 'failed'
              })}\n\n`))
              
              continue
            }

            imported++
            console.log(`✅ Imported: ${place.displayName?.text}`)

            // Send progress update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              current: i + 1,
              total,
              imported,
              skipped,
              failed,
              currentBusiness: place.displayName?.text || placeId,
              status: 'success'
            })}\n\n`))

            // Rate limiting: wait 100ms between requests to avoid hitting API limits
            await new Promise(resolve => setTimeout(resolve, 100))

          } catch (error: any) {
            // Enhanced error logging with details
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error(`❌ Error processing ${placeId}:`, errorMessage)
            if (error.stack) {
              console.error('Stack trace:', error.stack)
            }
            failed++
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              current: i + 1,
              total,
              imported,
              skipped,
              failed,
              currentBusiness: `Error: ${placeId}`,
              status: 'failed',
              errorMessage: errorMessage.substring(0, 100) // Include brief error in progress
            })}\n\n`))
          }
        }

        // Send completion message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          imported,
          skipped,
          failed,
          total
        })}\n\n`))

        console.log(`✅ Import complete: ${imported} imported, ${skipped} skipped, ${failed} failed`)

        // Cleanup
        activeImports.delete(importId)
        controller.close()

      } catch (error: any) {
        console.error('❌ Import error:', error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error.message || 'Import failed'
        })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

