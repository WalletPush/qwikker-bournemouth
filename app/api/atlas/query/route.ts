import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { searchBusinessKnowledge } from '@/lib/ai/embeddings'
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
    const city = await resolveRequestCity(request)
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

    // Search knowledge base (same as chat, but stricter limits)
    const businessResults = await searchBusinessKnowledge(message, city, { 
      matchCount: maxResults 
    })

    if (!businessResults.success || businessResults.results.length === 0) {
      return NextResponse.json({
        summary: 'No matches nearby. Try a broader search.',
        businessIds: [],
        primaryBusinessId: null,
        ui: {
          focus: 'pins',
          autoDismissMs: 3500
        }
      } as AtlasResponse)
    }

    // Dedupe by business_id (KB returns multiple rows per business)
    // Keep best similarity score per business
    const businessScoreMap = new Map<string, number>()
    for (const result of businessResults.results) {
      if (!result.business_id) continue
      const currentScore = businessScoreMap.get(result.business_id) || 0
      const newScore = (result as any).similarity || 0
      if (newScore > currentScore) {
        businessScoreMap.set(result.business_id, newScore)
      }
    }
    
    const uniqueBusinessIds = Array.from(businessScoreMap.keys()).slice(0, maxResults * 2) // Fetch more, filter later

    // 🔒 CRITICAL: Fetch from AI-safe view (excludes free_tier automatically)
    const { data: businessesRaw, error: fetchError } = await supabase
      .from('business_profiles_ai_eligible')
      .select('id, business_name, rating, latitude, longitude, business_tier')
      .in('id', uniqueBusinessIds)
      .gte('rating', minRating)

    if (fetchError) {
      console.error('❌ Atlas query: Failed to fetch businesses:', fetchError)
      return NextResponse.json(
        createFallbackAtlasResponse('Failed to fetch businesses'),
        { status: 500 }
      )
    }

    if (!businessesRaw || businessesRaw.length === 0) {
      return NextResponse.json({
        summary: 'No high-rated matches nearby.',
        businessIds: [],
        primaryBusinessId: null,
        ui: {
          focus: 'pins',
          autoDismissMs: 3500
        }
      } as AtlasResponse)
    }
    
    // 🔒 RUNTIME GUARD: Verify no tier leakage (should be impossible via view)
    const leaked = businessesRaw.filter(b => !isAtlasEligible({
      business_tier: b.business_tier,
      latitude: b.latitude,
      longitude: b.longitude
    }))
    
    if (leaked.length > 0) {
      console.error('🚨 CRITICAL: Tier/coord leakage in Atlas query!', leaked.map(b => ({
        id: b.id,
        name: b.business_name,
        tier: b.business_tier,
        lat: b.latitude,
        lng: b.longitude
      })))
    }
    
    // Filter out any ineligible businesses as safety net
    const businesses = businessesRaw.filter(b => isAtlasEligible({
      business_tier: b.business_tier,
      latitude: b.latitude,
      longitude: b.longitude
    }))
    
    // Sort by tier priority, then rating, then similarity
    businesses.sort((a, b) => {
      const tierA = getTierPriority(a.business_tier)
      const tierB = getTierPriority(b.business_tier)
      if (tierA !== tierB) return tierA - tierB
      
      const ratingA = a.rating || 0
      const ratingB = b.rating || 0
      if (ratingB !== ratingA) return ratingB - ratingA
      
      const scoreA = businessScoreMap.get(a.id) || 0
      const scoreB = businessScoreMap.get(b.id) || 0
      return scoreB - scoreA
    })
    
    // Take top N after sorting
    const finalBusinesses = businesses.slice(0, maxResults)

    // Build context for AI (minimal, spatial focus)
    const businessContext = finalBusinesses.map(b => 
      `${b.business_name} (${b.rating}★, ${b.business_tier})`
    ).join(', ')

    // Call OpenAI with Atlas prompt + JSON mode
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ATLAS_SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `User query: "${message}"\n\nAvailable businesses: ${businessContext}\n\nProvide a brief spatial response (JSON only).` 
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 150
    })

    const rawResponse = completion.choices[0]?.message?.content
    if (!rawResponse) {
      return NextResponse.json(
        createFallbackAtlasResponse(),
        { status: 500 }
      )
    }

    let atlasResponse: AtlasResponse
    try {
      atlasResponse = JSON.parse(rawResponse)
    } catch (parseError) {
      console.error('❌ Failed to parse Atlas AI response:', rawResponse)
      return NextResponse.json(
        createFallbackAtlasResponse(),
        { status: 500 }
      )
    }

    // Validate response structure
    if (!validateAtlasResponse(atlasResponse)) {
      console.error('❌ Invalid Atlas response structure:', atlasResponse)
      return NextResponse.json(
        createFallbackAtlasResponse(),
        { status: 500 }
      )
    }

    // Override businessIds with actual IDs (don't trust AI)
    atlasResponse.businessIds = finalBusinesses.map(b => b.id)
    
    // Set primaryBusinessId to highest-priority business (already sorted)
    atlasResponse.primaryBusinessId = finalBusinesses[0]?.id || null

    console.log(`🗺️ Atlas response: "${atlasResponse.summary}" (${atlasResponse.businessIds.length} businesses)`)

    return NextResponse.json(atlasResponse)

  } catch (error) {
    console.error('❌ Atlas query error:', error)
    return NextResponse.json(
      createFallbackAtlasResponse(),
      { status: 500 }
    )
  }
}
