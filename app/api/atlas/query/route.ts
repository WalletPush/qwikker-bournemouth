import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { resolveRequestCity } from '@/lib/utils/tenant-city'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { 
  ATLAS_SYSTEM_PROMPT, 
  validateAtlasResponse, 
  createFallbackAtlasResponse,
  type AtlasResponse 
} from '@/lib/ai/prompts/atlas'
import { isAtlasEligible, getTierPriority } from '@/lib/atlas/eligibility'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

/**
 * Atlas Query Endpoint
 * 
 * Handles spatial queries in Atlas mode with strict, minimal responses.
 * Returns ephemeral HUD bubble content, not chat messages.
 */
export async function POST(request: NextRequest) {
  if (!openai) {
    return NextResponse.json(
      createFallbackAtlasResponse('AI service temporarily unavailable'),
      { status: 503 }
    )
  }

  try {
    const { message, userLocation, viewport } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        createFallbackAtlasResponse('Query is required'),
        { status: 400 }
      )
    }

    // 🔒 SECURITY: Derive city server-side from hostname
    const cityResult = await resolveRequestCity(request)
    if (!cityResult.ok) {
      return NextResponse.json(
        createFallbackAtlasResponse('City could not be determined'),
        { status: cityResult.status }
      )
    }
    const city = cityResult.city
    console.log(`🗺️ Atlas query for city: ${city}`)

    // Get tenant Atlas config
    const supabase = createServiceRoleClient()
    const { data: config } = await supabase
      .from('franchise_crm_configs')
      .select('atlas_min_rating, atlas_max_results')
      .eq('city', city)
      .single()

    const minRating = config?.atlas_min_rating || 4.4
    const maxResults = config?.atlas_max_results || 5

    // 🔧 ATLAS FIX: Use SAME logic as chat - query ALL columns from tier views
    // This matches lib/ai/hybrid-chat.ts line 250-254
    console.log(`🗺️ Atlas: Querying database for "${message}" in city: ${city}`)
    console.log(`🗺️ Atlas: Min rating: ${minRating}, Max results: ${maxResults}`)
    
    // ✅ FIX: PostgREST uses * as wildcard, not %
    // ✅ Search across display_category, google_primary_type, business_name
    // ✅ Tier 1 also searches system_category (only available in that view)
    const searchTerm = `*${message}*`
    console.log(`🗺️ Atlas: Search term: ${searchTerm}`)
    
    // Query all three tier views (same as chat does)
    const [tier1Response, tier2Response, tier3Response] = await Promise.all([
      supabase
        .from('business_profiles_chat_eligible')
        .select('*')
        .eq('city', city)
        .gte('rating', minRating)
        .or(`display_category.ilike.${searchTerm},system_category.ilike.${searchTerm},google_primary_type.ilike.${searchTerm},business_name.ilike.${searchTerm}`),
      
      supabase
        .from('business_profiles_lite_eligible')
        .select('*')
        .eq('city', city)
        .gte('rating', minRating)
        .or(`display_category.ilike.${searchTerm},google_primary_type.ilike.${searchTerm},business_name.ilike.${searchTerm}`),
      
      supabase
        .from('business_profiles_ai_fallback_pool')
        .select('*')
        .eq('city', city)
        .gte('rating', minRating)
        .or(`display_category.ilike.${searchTerm},google_primary_type.ilike.${searchTerm},business_name.ilike.${searchTerm}`)
    ])
    
    console.log(`🗺️ Atlas: Query results - T1: ${tier1Response.data?.length || 0}, T2: ${tier2Response.data?.length || 0}, T3: ${tier3Response.data?.length || 0}`)
    if (tier1Response.error) console.error('🗺️ Atlas: Tier 1 error:', tier1Response.error)
    if (tier2Response.error) console.error('🗺️ Atlas: Tier 2 error:', tier2Response.error)
    if (tier3Response.error) console.error('🗺️ Atlas: Tier 3 error:', tier3Response.error)
    
    // Tag each result with its simplified tier for pin coloring (match chat's mapPins format)
    const tier1 = (tier1Response.data || []).map(b => ({ ...b, business_tier: 'paid' as const }))
    const tier2 = (tier2Response.data || []).map(b => ({ ...b, business_tier: 'claimed_free' as const }))
    const tier3 = (tier3Response.data || []).map(b => ({ ...b, business_tier: 'unclaimed' as const }))
    
    // Combine and deduplicate by business ID (paid businesses win)
    const allResults = [...tier1, ...tier2, ...tier3]
    console.log(`🗺️ Atlas: Combined ${allResults.length} total results before deduplication`)
    
    const businessMap = new Map()
    allResults.forEach(b => {
      if (!businessMap.has(b.id)) {
        businessMap.set(b.id, b)
      }
    })
    
    const businessesRaw = Array.from(businessMap.values()).slice(0, maxResults * 3)
    
    if (businessesRaw.length === 0) {
      console.log(`🗺️ Atlas: No businesses found for "${message}"`)
      return NextResponse.json({
        summary: 'No high-rated matches nearby. Try a broader search.',
        businessIds: [],
        primaryBusinessId: null,
        ui: {
          focus: 'pins',
          autoDismissMs: 3500
        }
      } as AtlasResponse)
    }

    console.log(`🗺️ Atlas: Found ${businessesRaw.length} businesses`)
    
    // 🔒 RUNTIME GUARD: Verify no tier leakage
    const leaked = businessesRaw.filter(b => !isAtlasEligible({
      business_tier: b.business_tier,
      latitude: b.latitude,
      longitude: b.longitude
    }))
    
    if (leaked.length > 0) {
      console.error('🚨 CRITICAL: Tier/coord leakage in Atlas query!', leaked)
    }
    
    // Filter out any ineligible businesses
    const businesses = businessesRaw.filter(b => isAtlasEligible({
      business_tier: b.business_tier,
      latitude: b.latitude,
      longitude: b.longitude
    }))
    
    // Sort by tier priority, then rating
    businesses.sort((a, b) => {
      const tierA = getTierPriority(a.business_tier)
      const tierB = getTierPriority(b.business_tier)
      if (tierA !== tierB) return tierA - tierB
      
      const ratingA = a.rating || 0
      const ratingB = b.rating || 0
      if (ratingA !== ratingB) return ratingB - ratingA
      
      return 0
    })

    // Take top results
    const topBusinesses = businesses.slice(0, maxResults)
    const businessIds = topBusinesses.map(b => b.id)

    // Call OpenAI for summary
    const systemPrompt = ATLAS_SYSTEM_PROMPT.replace('{CITY}', city)
    
    const userPrompt = `User query: "${message}"

Found ${topBusinesses.length} businesses:
${topBusinesses.map((b, i) => `${i + 1}. ${b.business_name} (${b.display_category || 'Business'}, ${b.rating}★)`).join('\n')}

Generate a SHORT, helpful summary.`

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 200
      })

      const rawResponse = completion.choices[0].message.content
      if (!rawResponse) {
        throw new Error('Empty response from OpenAI')
      }

      const parsedResponse = JSON.parse(rawResponse)
      const validated = validateAtlasResponse(parsedResponse)

      return NextResponse.json({
        ...validated,
        businessIds,
        primaryBusinessId: businessIds[0] || null
      } as AtlasResponse)

    } catch (aiError) {
      console.error('❌ Atlas AI error:', aiError)
      
      // Fallback to simple summary
      const firstBusiness = topBusinesses[0]
      return NextResponse.json({
        summary: `Found ${topBusinesses.length} ${message} spots. Check out ${firstBusiness.business_name}!`,
        businessIds,
        primaryBusinessId: businessIds[0] || null,
        ui: {
          focus: 'pins',
          autoDismissMs: 5000
        }
      } as AtlasResponse)
    }

  } catch (error) {
    console.error('❌ Atlas query error:', error)
    return NextResponse.json(
      createFallbackAtlasResponse('Something went wrong'),
      { status: 500 }
    )
  }
}
