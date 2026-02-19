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
import { hasValidCoords } from '@/lib/atlas/eligibility'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

// Expand common user search terms into DB-matching category synonyms
const SEARCH_SYNONYMS: Record<string, string[]> = {
  'food': ['restaurant', 'food', 'dining', 'eatery', 'grill', 'kitchen', 'bistro', 'diner'],
  'restaurants': ['restaurant', 'dining', 'eatery', 'grill', 'kitchen', 'bistro', 'diner'],
  'bars': ['bar', 'pub', 'tavern', 'lounge', 'cocktail', 'nightlife'],
  'bars and pubs': ['bar', 'pub', 'tavern', 'lounge', 'cocktail', 'nightlife'],
  'coffee': ['coffee', 'cafe', 'café', 'espresso', 'tea'],
  'cafes': ['cafe', 'café', 'coffee', 'bakery', 'tea'],
  'drinks': ['bar', 'pub', 'cocktail', 'wine', 'brewery'],
  'family': ['family', 'kid', 'children', 'play', 'pizza'],
  'cocktails': ['cocktail', 'bar', 'lounge', 'mixology'],
  'nightlife': ['bar', 'pub', 'nightclub', 'club', 'lounge', 'cocktail'],
  'things to do': ['entertainment', 'activity', 'attraction', 'museum', 'theatre', 'cinema'],
  'greek': ['greek', 'gyro', 'souvlaki', 'mediterranean'],
  'italian': ['italian', 'pizza', 'pasta', 'trattoria'],
  'indian': ['indian', 'curry', 'tandoori', 'masala'],
  'chinese': ['chinese', 'noodle', 'dim sum', 'wok'],
  'japanese': ['japanese', 'sushi', 'ramen', 'izakaya'],
  'mexican': ['mexican', 'taco', 'burrito', 'cantina'],
  'thai': ['thai', 'pad thai', 'satay'],
}

/**
 * Atlas Query Endpoint
 * 
 * Uses the same three-tier system as chat (hybrid-chat.ts):
 *   Tier 1: business_profiles_chat_eligible (paid/trial)
 *   Tier 2: business_profiles_lite_eligible (claimed-free with menu items)
 *   Tier 3: business_profiles_ai_fallback_pool (admin-approved unclaimed)
 * 
 * Never queries raw business_profiles -- views enforce eligibility at DB level.
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

    const cityResult = await resolveRequestCity(request, { allowQueryOverride: true })
    if (!cityResult.ok) {
      return NextResponse.json(
        createFallbackAtlasResponse('City could not be determined'),
        { status: cityResult.status }
      )
    }
    const city = cityResult.city
    console.log(`🗺️ Atlas query for city: ${city}`)

    const supabase = createServiceRoleClient()
    const { data: config } = await supabase
      .from('franchise_crm_configs')
      .select('atlas_min_rating, atlas_max_results')
      .eq('city', city)
      .single()

    const maxResults = config?.atlas_max_results || 5

    console.log(`🗺️ Atlas: Querying for "${message}" in city: ${city}, maxResults: ${maxResults}`)
    
    const cleanMessage = message.replace(/[?!.,;:'"()]/g, '').trim().toLowerCase()
    const expandedTerms = SEARCH_SYNONYMS[cleanMessage] || [cleanMessage]
    const orConditions = expandedTerms.flatMap(term => [
      `display_category.ilike.*${term}*`,
      `system_category.ilike.*${term}*`,
      `google_primary_type.ilike.*${term}*`,
      `business_name.ilike.*${term}*`,
    ]).join(',')
    
    console.log(`🗺️ Atlas: Search "${cleanMessage}" → ${expandedTerms.length} terms: [${expandedTerms.join(', ')}]`)
    
    // Query all three tier views in parallel (same as hybrid-chat.ts)
    // Views already enforce: eligible tier + valid coords + valid city
    const [tier1Response, tier2Response, tier3Response] = await Promise.all([
      supabase
        .from('business_profiles_chat_eligible')
        .select('*')
        .eq('city', city)
        .or(orConditions)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(maxResults),
      supabase
        .from('business_profiles_lite_eligible')
        .select('*')
        .eq('city', city)
        .or(orConditions)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(maxResults),
      supabase
        .from('business_profiles_ai_fallback_pool')
        .select('*')
        .eq('city', city)
        .or(orConditions)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(maxResults),
    ])
    
    if (tier1Response.error) console.error('🗺️ Atlas: Tier 1 error:', tier1Response.error)
    if (tier2Response.error) console.error('🗺️ Atlas: Tier 2 error:', tier2Response.error)
    if (tier3Response.error) console.error('🗺️ Atlas: Tier 3 error:', tier3Response.error)
    
    // Tag each tier for pin coloring
    const tier1 = (tier1Response.data || []).map(b => ({ ...b, business_tier: 'paid' as const }))
    const tier2 = (tier2Response.data || []).map(b => ({ ...b, business_tier: 'claimed_free' as const }))
    const tier3 = (tier3Response.data || []).map(b => ({ ...b, business_tier: 'unclaimed' as const }))
    
    console.log(`🗺️ Atlas: T1 (paid): ${tier1.length}, T2 (claimed-free): ${tier2.length}, T3 (fallback): ${tier3.length}`)
    
    // Combine with tier priority: paid > claimed_free > unclaimed
    // Deduplicate by business ID (higher tier wins)
    const businessMap = new Map<string, any>()
    ;[...tier1, ...tier2, ...tier3].forEach(b => {
      if (!businessMap.has(b.id)) {
        businessMap.set(b.id, b)
      }
    })
    
    // Defense-in-depth: only include businesses with valid coords
    const allResults = Array.from(businessMap.values())
      .filter(b => hasValidCoords(b.latitude, b.longitude))
    
    console.log(`🗺️ Atlas: ${allResults.length} combined results after dedup + coord check`)
    
    if (allResults.length === 0) {
      console.log(`🗺️ Atlas: No eligible businesses found for "${message}"`)
      return NextResponse.json({
        summary: `No results for "${message}" — try a different search.`,
        businessIds: [],
        primaryBusinessId: null,
        ui: { focus: 'pins', autoDismissMs: 3500 }
      } as AtlasResponse)
    }

    // Sort: paid first, then by rating descending
    allResults.sort((a, b) => {
      const tierOrder: Record<string, number> = { paid: 0, claimed_free: 1, unclaimed: 2 }
      const tierA = tierOrder[a.business_tier] ?? 2
      const tierB = tierOrder[b.business_tier] ?? 2
      if (tierA !== tierB) return tierA - tierB
      return (b.rating || 0) - (a.rating || 0)
    })
    
    // Respect maxResults -- never dump all at once
    const businesses = allResults.slice(0, maxResults)
    const businessIds = businesses.map(b => b.id)
    
    console.log(`🗺️ Atlas: Returning ${businesses.length} businesses:`, businesses.map(b => ({
      name: b.business_name,
      tier: b.business_tier,
      rating: b.rating,
      category: b.display_category
    })))

    // Call OpenAI for summary
    const systemPrompt = ATLAS_SYSTEM_PROMPT.replace('{CITY}', city)
    
    const userPrompt = `User query: "${message}"

Found ${businesses.length} businesses:
${businesses.map((b, i) => `${i + 1}. ${b.business_name} (${b.display_category || 'Business'}, ${b.rating}★)`).join('\n')}

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

      if (validateAtlasResponse(parsedResponse)) {
        return NextResponse.json({
          summary: parsedResponse.summary,
          businessIds,
          primaryBusinessId: businessIds[0] || null,
          ui: parsedResponse.ui
        } satisfies AtlasResponse)
      }

      return NextResponse.json({
        summary: parsedResponse.summary || `Found ${businesses.length} places.`,
        businessIds,
        primaryBusinessId: businessIds[0] || null,
        ui: { focus: 'pins' as const, autoDismissMs: 4200 }
      } satisfies AtlasResponse)

    } catch (aiError) {
      console.error('❌ Atlas AI error:', aiError)
      
      const firstBusiness = businesses[0]
      return NextResponse.json({
        summary: `Found ${businesses.length} ${message} spots. Check out ${firstBusiness.business_name}!`,
        businessIds,
        primaryBusinessId: businessIds[0] || null,
        ui: { focus: 'pins', autoDismissMs: 5000 }
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
