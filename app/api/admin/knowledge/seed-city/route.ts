import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { storeKnowledgeWithEmbedding } from '@/lib/ai/embeddings'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'
import OpenAI from 'openai'

const AREA_MAPPING: Record<string, string[]> = {
  bournemouth: ['Bournemouth', 'Christchurch', 'Poole'],
  calgary: ['Calgary'],
  london: ['London'],
}

// Always generated for every city
const CORE_CATEGORIES = [
  { title: 'Getting Around', slug: 'getting_around' },
  { title: 'Parking', slug: 'parking' },
  { title: 'Areas and Neighbourhoods', slug: 'areas_neighbourhoods' },
  { title: 'Nightlife and Entertainment', slug: 'nightlife_entertainment' },
  { title: 'Practical Tips', slug: 'practical_tips' },
  { title: 'Local Culture', slug: 'local_culture' },
]

// LLM picks 2-4 of these based on what's actually relevant to the territory
const OPTIONAL_CATEGORIES = [
  { title: 'Beaches and Coastline', slug: 'beaches_coastline' },
  { title: 'Parks and Green Spaces', slug: 'parks_green_spaces' },
  { title: 'Shopping', slug: 'shopping' },
  { title: 'Outdoor Activities', slug: 'outdoor_activities' },
  { title: 'Markets and Street Food', slug: 'markets_street_food' },
  { title: 'Seasonal Events and Weather', slug: 'seasonal_events_weather' },
  { title: 'Day Trips and Surroundings', slug: 'day_trips' },
  { title: 'Food and Dining Scene', slug: 'food_dining_scene' },
  { title: 'History and Heritage', slug: 'history_heritage' },
]

/**
 * POST /api/admin/knowledge/seed-city
 *
 * Generate city-level knowledge drafts using an LLM.
 * Stores each category as a separate KB entry with status='draft'.
 *
 * Body: { city: string, areas?: string }
 *   - city: franchise city slug
 *   - areas: comma-separated coverage areas (optional, falls back to mapping)
 */
export async function POST(request: NextRequest) {
  try {
    const { city, areas: areasInput } = await request.json()

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'city is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Check for existing drafts to prevent duplicate generation
    const { data: existingDrafts } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('city', city.toLowerCase())
      .is('business_id', null)
      .eq('status', 'draft')
      .contains('tags', ['city_knowledge'])
      .limit(1)

    if (existingDrafts && existingDrafts.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Draft city knowledge already exists. Approve or discard existing drafts first.' },
        { status: 409 }
      )
    }

    // Get franchise config for country context
    const { data: config } = await supabase
      .from('franchise_crm_configs')
      .select('display_name, country_name, country_code')
      .eq('city', city.toLowerCase())
      .single()

    const displayName = config?.display_name || city.charAt(0).toUpperCase() + city.slice(1)
    const country = config?.country_name || 'Unknown'

    // Resolve coverage areas
    let areaList: string
    if (areasInput && areasInput.trim()) {
      areaList = areasInput.trim()
    } else {
      const mapped = AREA_MAPPING[city.toLowerCase()]
      areaList = mapped ? mapped.join(', ') : displayName
    }

    // Get franchise OpenAI key
    const franchiseKeys = await getFranchiseApiKeys(city)
    if (!franchiseKeys.openai_api_key) {
      return NextResponse.json(
        { success: false, error: `No OpenAI API key configured for ${city}` },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey: franchiseKeys.openai_api_key })

    console.log(`🌍 Generating city knowledge for ${displayName} covering: ${areaList} (${country})`)

    const coreList = CORE_CATEGORIES.map((c, i) => `${i + 1}. ${c.title} (slug: ${c.slug})`).join('\n')
    const optionalList = OPTIONAL_CATEGORIES.map((c) => `- ${c.title} (slug: ${c.slug})`).join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 16384,
      messages: [
        {
          role: 'system',
          content: `You are a factual city guide writer. You are generating structured knowledge for the ${displayName} franchise area to be used by an AI concierge.

TERRITORY COVERAGE:
- Franchise: ${displayName}
- Country: ${country}
- Areas covered: ${areaList}
- IMPORTANT: Your content MUST cover ALL of these areas, not just the main city. When discussing transport, parking, neighbourhoods etc., include information relevant to each area in the territory.

STRICT RULES:
1. DO NOT mention any specific business names, restaurant names, bar names, club names, hotel names, shop names, or brand names. EVER. Not even well-known chains. The AI concierge recommends businesses from its own curated database — your job is everything AROUND that.
2. You CAN and SHOULD name public infrastructure: car parks, train stations, bus stations, bus routes/numbers, parks, gardens, piers, beaches, promenades, libraries, council buildings, leisure centres (by their public name), road names, and landmarks. These are not businesses.
3. DO NOT invent facts. If you are not confident about something, omit it.
4. DO NOT include specific prices, ticket costs, or fees -- these change. Instead say "paid parking available" or "bus services operate regularly".
5. DO NOT rely on or repeat encyclopaedic claims, historical trivia, or population statistics that may be outdated or disputed. Stick to practical, on-the-ground knowledge that a local resident would confirm.
6. DO include: geography, neighbourhoods, transport infrastructure, general vibes, practical tips, cultural context, seasonal patterns.
7. Prefix any seasonal or time-sensitive information with [SEASONAL] so the reviewer knows to verify.
8. Each category must be 500-800 words. This is important — the AI concierge needs DEPTH, not summaries.
9. Write as a knowledgeable local friend, not a tourism brochure or Wikipedia article.

DEPTH REQUIREMENTS:
- Break each category into clear sub-sections covering different areas in the territory separately.
- Include specific street names, road names, landmarks (public ones like parks, piers, beaches — NOT businesses), and area boundaries where relevant.
- For transport: mention actual bus/train routes, key stations/stops, cycling infrastructure, walking distances between areas, taxi availability.
- For parking: cover each area individually — where to find spaces, park-and-ride options, seafront vs town centre differences, residential zones.
- For neighbourhoods: describe the character and vibe of EACH area — who lives there, what it feels like, walkability, what it's known for.
- For nightlife/entertainment: describe the general scene in each area (e.g. "the triangle area around X road is the main late-night strip"), venue types, typical crowd, safety considerations. NO venue names.
- For practical tips: real insider knowledge — best times to visit, what to avoid, local customs, weather patterns, mobile signal, tap water, tipping norms.
- Think: "what would a knowledgeable local tell a friend who just moved here?" — not "what would a tourism website say?"`
        },
        {
          role: 'user',
          content: `Generate a city knowledge guide for ${displayName} (${areaList}).

REQUIRED categories (generate ALL of these):
${coreList}

OPTIONAL categories (pick 2-4 that are GENUINELY relevant to ${displayName} — skip any that don't apply):
${optionalList}

For example: a coastal city should include "Beaches and Coastline" but NOT "Outdoor Activities" if there's nothing notable. A landlocked city should skip beaches entirely but might include "Parks and Green Spaces".

CRITICAL: Each category MUST be 500-800 words. Short paragraphs are NOT acceptable. If a category has less than 400 words you have failed. Break content into sub-sections per area. Be detailed and specific.

Respond as JSON: { "categories": [{ "title": "...", "slug": "...", "content": "..." }] }
Include the slug exactly as shown above.`
        }
      ]
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'LLM returned empty response' },
        { status: 500 }
      )
    }

    let parsed: { categories: Array<{ title: string; slug: string; content: string }> }
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error('Failed to parse LLM response:', raw.substring(0, 500))
      return NextResponse.json(
        { success: false, error: 'Failed to parse LLM response as JSON' },
        { status: 500 }
      )
    }

    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      return NextResponse.json(
        { success: false, error: 'LLM response missing categories array' },
        { status: 500 }
      )
    }

    // Validate and store each category as a draft KB entry
    const results: Array<{ title: string; success: boolean; warning?: string }> = []

    for (const category of parsed.categories) {
      const content = (category.content || '').trim()
      const title = (category.title || '').trim()

      // Reject thin sections
      if (content.split(/\s+/).length < 50) {
        results.push({ title, success: false, warning: 'Too short (under 50 words), skipped' })
        continue
      }

      // Flag potential business name mentions (simple heuristic)
      const hasProperNouns = /\b(?:The |at |visit )[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3}\b/.test(content)

      const slug = category.slug || title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

      const result = await storeKnowledgeWithEmbedding({
        city: city.toLowerCase(),
        businessId: null,
        knowledgeType: 'custom_knowledge',
        title: `${displayName} - ${title}`,
        content,
        metadata: {
          source: 'city_seed_v1',
          generated_by: 'gpt-4o',
          generated_at: new Date().toISOString(),
          category_slug: slug,
          coverage_areas: areaList,
          reviewed_by: null,
          reviewed_at: null,
          city_version: 1,
          ...(hasProperNouns ? { warning: 'possible_business_mention' } : {}),
        },
        tags: ['city_knowledge', 'auto_generated', slug],
        status: 'draft',
      })

      results.push({
        title,
        success: result.success,
        ...(hasProperNouns ? { warning: 'May contain business name references -- review carefully' } : {}),
      })
    }

    const successCount = results.filter(r => r.success).length

    console.log(`✅ Generated ${successCount}/${parsed.categories.length} city knowledge drafts for ${displayName}`)

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount} draft entries for ${displayName}`,
      coverageAreas: areaList,
      results,
    })
  } catch (error: unknown) {
    console.error('Error in seed-city:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    )
  }
}
