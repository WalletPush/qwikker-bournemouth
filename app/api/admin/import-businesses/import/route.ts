import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { mapGoogleTypesToSystemCategory, SYSTEM_CATEGORY_LABEL, isValidSystemCategory, type SystemCategory } from '@/lib/constants/system-categories'

interface ImportRequest {
  city: string
  placeIds: string[]
  systemCategory: SystemCategory // Stable enum (e.g. 'restaurant', 'cafe')
  displayCategory: string // User-facing label (e.g. 'Restaurant', 'Cafe / Coffee Shop')
  skipDuplicates?: boolean // Skip already imported businesses
}

// Track active imports (in-memory, will reset on server restart)
const activeImports = new Map<string, boolean>()

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body: ImportRequest = await request.json()
        const { city, placeIds, systemCategory, displayCategory, skipDuplicates = true } = body

        if (!city || !placeIds || placeIds.length === 0) {
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
            const detailsUrl = `https://places.googleapis.com/v1/${placeId}`
            
            const detailsResponse = await fetch(detailsUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,types,location,businessStatus,regularOpeningHours,photos'
              }
            })
            
            const place = await detailsResponse.json()

            if (detailsResponse.status !== 200 || place.error) {
              console.error(`❌ Failed to get details for ${placeId}:`, place.error?.message || detailsResponse.statusText)
              failed++
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total,
                imported,
                skipped,
                failed,
                currentBusiness: place.displayName?.text || `Failed: ${placeId}`,
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

            // Parse opening hours from NEW API format
            const openingHours = place.regularOpeningHours?.weekdayDescriptions?.reduce((acc: any, day: string) => {
              const [dayName, hours] = day.split(': ')
              acc[dayName.toLowerCase()] = hours || 'Closed'
              return acc
            }, {}) || null

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

            // Create business profile (use systemCategory from admin form)
            const { error: insertError } = await supabase
              .from('business_profiles')
              .insert({
                business_name: place.displayName?.text || 'Unknown',
                system_category: systemCategory, // Use category selected in import form
                display_category: displayCategory, // Use display label from import form
                google_types: googleTypes, // Store raw Google types for reference
                business_type: systemCategory, // Map system_category to business_type (legacy field)
                business_town: city.charAt(0).toUpperCase() + city.slice(1),
                city: city.toLowerCase(),
                address: place.formattedAddress || '',
                phone: place.nationalPhoneNumber || null,
                website: place.websiteUri || null,
                rating: place.rating || null,
                review_count: place.userRatingCount || null,
                opening_hours: openingHours,
                google_place_id: placeId,
                google_photo_name: place.photos?.[0]?.name || null,
                placeholder_variant: 0, // 🔒 CRITICAL: Always use neutral default (variant 0) on import
                status: 'unclaimed',
                visibility: 'discover_only',
                auto_imported: true,
                user_id: null,
                owner_user_id: null
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
            console.error(`❌ Error processing ${placeId}:`, error)
            failed++
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              current: i + 1,
              total,
              imported,
              skipped,
              failed,
              currentBusiness: `Error: ${placeId}`,
              status: 'failed'
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

