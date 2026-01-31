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

    // 🔧 ATLAS FIX: Query database directly instead of KB search
    // Reason: Triangle GYROSS and other businesses may have no KB content
    // Solution: Search by display_category and business_name directly
    console.log(`🗺️ Atlas: Querying database for "${message}"`)
    
    const searchTerm = `%${message}%`
    const { data: businessesRaw, error: dbError } = await supabase
      .from('business_profiles_chat_eligible')
      .select('id, business_name, rating, latitude, longitude, business_tier, display_category')
      .eq('city', city)
      .gte('rating', minRating)
      .or(`display_category.ilike.${searchTerm},business_name.ilike.${searchTerm}`)
      .limit(maxResults * 2)
    
    if (dbError || !businessesRaw || businessesRaw.length === 0) {
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
