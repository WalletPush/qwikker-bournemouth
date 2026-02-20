/**
 * Hybrid AI Chat System
 * Routes queries to GPT-4o-mini (cheap) or GPT-4o (smart) based on complexity
 */

import OpenAI from 'openai'
import { searchBusinessKnowledge, searchCityKnowledge } from './embeddings'
import { classifyQueryIntent, logClassification } from './intent-classifier'
import { detectIntent } from './intent-detector'
import { scoreBusinessRelevance } from './relevance-scorer'
import { detectFacet } from './facets'
import { getReasonTag, getReasonMeta } from './reason-tagger'
import { 
  ConversationState, 
  createInitialState, 
  updateConversationState, 
  generateStateContext 
} from './conversation-state'
import { createTenantAwareServerClient } from '@/lib/utils/tenant-security'
import { isFreeTier, isAiEligibleTier, getTierPriority } from '@/lib/atlas/eligibility'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'
import { normalizeLocation, calculateDistance, isValidUUID } from '@/lib/utils/location'
import { getBusinessVibeStats } from '@/lib/utils/vibes'
import { getOpenStatusForToday } from '@/lib/utils/opening-hours'

// DO NOT instantiate OpenAI globally - must be per-franchise to use their API key
// Each franchise pays for their own AI usage via franchise_crm_configs.openai_api_key

// Relevance score thresholds (single source of truth)
const CONTEXT_MIN = 1   // Include in AI context (let the model decide)
const INJECT_MIN = 2    // Inject Tier 2/3 as supplemental text
const CAROUSEL_MIN = 3  // Show in carousel (Tier 1 only, high confidence)

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatContext {
  city: string
  userName?: string
  walletPassId?: string
  userLocation?: {
    latitude: number
    longitude: number
  }
}

interface ChatResponse {
  success: boolean
  response?: string
  sources?: any[]
  error?: string
  modelUsed?: 'gpt-4o-mini' | 'gpt-4o'
  classification?: any
  uiMode?: 'conversational' | 'suggestions' | 'map' // Explicit UI mode for carousel gating
  hasBusinessResults?: boolean // For Atlas "earned moment" without carousel spam
  businessCarousel?: Array<{
    id: string
    business_name: string
    business_tagline?: string
    system_category?: string // Stable enum for filtering
    display_category?: string // User-friendly label
    business_tier: string // ✅ effective_tier from subscription-based view (spotlight, featured, starter)
    tier_priority?: number // ✅ Sort priority from view (1=spotlight, 2=featured/trial, 3=starter)
    vibes_positive_percentage?: number // 💚 Qwikker Vibes (only if 5+ vibes)
    vibes_total?: number // 💚 Total vibes count
    business_address?: string
    business_town?: string
    logo?: string
    business_images?: string[]
    rating?: number
    review_count?: number // ✅ ATLAS: For review count display
    offers_count?: number
    latitude?: number // ✅ ATLAS: For map pins
    longitude?: number // ✅ ATLAS: For map pins
    phone?: string // ✅ ATLAS: For contact info
    website_url?: string // ✅ ATLAS: For website link
    google_place_id?: string // ✅ ATLAS: For Google reviews link
  }>
  walletActions?: Array<{
    type: 'add_to_wallet'
    offerId: string
    offerName: string
    offerDescription: string | null
    offerType: string | null
    offerValue: string
    offerTerms: string | null
    offerStartDate: string | null
    offerEndDate: string | null
    offerImage: string | null
    businessName: string
    businessId: string
  }>
  eventCards?: Array<{
    id: string
    title: string
    description: string
    event_type: string
    start_date: string
    start_time?: string
    end_date?: string
    end_time?: string
    location: string
    ticket_url?: string
    image_url?: string
    business_name: string
    business_id: string
  }>
  googleReviewSnippets?: {
    businessName: string
    businessId: string
    google_place_id?: string
    snippets: Array<{
      text: string
      author: string
      rating: number
    }>
  }
  mapPins?: Array<{
    // ✅ ATLAS: ALL businesses for map (paid + unclaimed + claimed_free)
    id: string
    business_name: string
    latitude: number
    longitude: number
    rating?: number
    review_count?: number
    display_category?: string
    business_tier: 'paid' | 'unclaimed' | 'claimed_free' // For pin coloring
    phone?: string
    website_url?: string
    google_place_id?: string
    reason?: {
      type: string
      label: string
      emoji: string
    }
    reasonMeta?: {
      isOpenNow: boolean
      distanceMeters: number | null
      ratingBadge: string | null
    }
  }>
  queryCategories?: string[] // ✅ ATLAS: Categories detected in query (for filtering businesses)
  queryKeywords?: string[] // ✅ ATLAS: Keywords detected in query (for filtering businesses)
  metadata?: {
    atlasAvailable?: boolean // Server-computed: true if 2+ relevant businesses have valid coords
    coordsCandidateCount?: number // Number of candidates with valid coordinates
    currentBusinessId?: string | number | null // Current business ID for state-aware footer
    currentBusinessSlug?: string | null // Current business slug for detail-mode fetch
  }
}

/**
 * Vocabulary built from actual business inventory (all tiers)
 */
type InventoryVocabulary = {
  categories: Set<string>
  types: Set<string>
  terms: Set<string>
}

/**
 * Build vocabulary from actual business inventory (dynamic, not hardcoded)
 * 
 * NOTES:
 * - Vocabulary is only as good as the structured data (categories, types, menu_preview, KB)
 * - If a business serves cocktails but has no evidence in category/menu/KB, it won't match
 * - This is CORRECT behavior: system is evidence-driven, not inference-driven
 * 
 * TODO: For large cities, consider caching this per city for ~5-15 minutes:
 * - In-memory: globalThis.__qwikkerVocabCache = { [city]: { vocab, timestamp } }
 * - Invalidate on timestamp > 15 min
 * - Helps serverless warm instances avoid rebuilding on every request
 */
function buildInventoryVocabulary(businesses: any[]): InventoryVocabulary {
  const categories = new Set<string>()
  const types = new Set<string>()
  const terms = new Set<string>()

  const addPhrase = (raw?: string | null) => {
    if (!raw) return
    const s = String(raw).toLowerCase().trim()
    if (!s) return
    categories.add(s)
    // split into tokens (keep 3+ so "bar", "pub", "thai" work, but avoid tiny noise)
    s.split(/[^a-z0-9]+/g).filter(Boolean).forEach(tok => {
      if (tok.length >= 3) terms.add(tok)
    })
  }

  const addType = (raw?: string | null) => {
    if (!raw) return
    const s = String(raw).toLowerCase().trim()
    if (!s) return
    types.add(s)
    s.split(/[^a-z0-9]+/g).filter(Boolean).forEach(tok => {
      if (tok.length >= 3) terms.add(tok)
    })
  }

  for (const b of businesses || []) {
    addPhrase(b.display_category)
    addPhrase(b.system_category)
    addType(b.google_primary_type)
  }

  return { categories, types, terms }
}

/**
 * Helper: Force each business mention to start a new paragraph
 * MECHANICAL FIX: Handles both linked and unlinked bold business names
 * Pattern matches: **[Name](/link)** OR **Name** (when model forgets links)
 */
/**
 * Helper: Validate business coordinates
 * Robust check that coordinates are valid numbers within Earth's bounds
 */
function hasValidCoords(b: any): boolean {
  const lat = Number(b?.latitude)
  const lng = Number(b?.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

/**
 * Detect if user is asking for more details about a specific business
 * Used to trigger FACT DELIVERY MODE for claimed businesses
 */
function isDetailFollowup(userMessage: string, state?: ConversationState): boolean {
  if (!state?.currentBusiness) return false
  
  const msg = userMessage.toLowerCase().trim()
  
  // Short affirmative responses
  if (msg.length <= 10 && /^(yes|yeah|yep|yup|sure|okay|ok|go ahead|perfect|great)!?$/i.test(msg)) {
    return true
  }
  
  // Explicit detail requests
  const detailPhrases = [
    'tell me more',
    'more details',
    'more info',
    'what about',
    'show me',
    'pull up',
    'get me',
    'details',
    'hours',
    'phone',
    'address',
    'location',
    'directions',
    'contact'
  ]
  
  return detailPhrases.some(phrase => msg.includes(phrase))
}

/**
 * Build deterministic fact block for claimed businesses
 * NO vagueness, NO hedging - just verified owner data
 */
function buildOwnerFactBlock(business: any): string | null {
  // Only for claimed businesses with structured data
  const isClaimed = business.business_tier === 'paid' || 
                    business.business_tier === 'spotlight' || 
                    business.business_tier === 'featured'
  
  if (!isClaimed) return null
  
  const slug = getBusinessSlug(business)
  const lines: string[] = []
  
  lines.push(`Here's what you need to know about **[${business.business_name}](/user/business/${slug})**:`)
  lines.push('') // blank line
  
  // Rating (only if has reviews)
  if (business.rating && business.review_count > 0) {
    lines.push(`**Rating:** ${business.rating}★ from ${business.review_count} Google reviews`)
  }
  
  // Category
  if (business.display_category) {
    lines.push(`**Category:** ${business.display_category}`)
  }
  
  // Address
  if (business.business_address) {
    lines.push(`**Address:** ${business.business_address}`)
  }
  
  // Phone
  if (business.phone) {
    lines.push(`**Phone:** ${business.phone}`)
  }
  
  // Website
  if (business.website_url) {
    lines.push(`**Website:** ${business.website_url}`)
  }
  
  // Hours (structured if available, fallback to text)
  const hours = business.business_hours_structured || business.business_hours
  if (hours) {
    if (typeof hours === 'object' && !Array.isArray(hours)) {
      // Structured hours object
      lines.push(`**Opening Hours:**`)
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      days.forEach(day => {
        const dayData = hours[day]
        if (dayData) {
          const dayName = day.charAt(0).toUpperCase() + day.slice(1)
          if (dayData.closed) {
            lines.push(`  ${dayName}: Closed`)
          } else if (dayData.open && dayData.close) {
            lines.push(`  ${dayName}: ${dayData.open} - ${dayData.close}`)
          }
        }
      })
    } else if (typeof hours === 'string') {
      // Text hours
      lines.push(`**Opening Hours:** ${hours}`)
    }
  }
  
  return lines.length > 2 ? lines.join('\n') : null
}

/**
 * Helper: Slugify a business name (single source of truth for slug generation)
 * Used everywhere we need to derive a slug from business_name
 */
function slugifyBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '') // Remove apostrophes (normal ' + curly ') before slugifying
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Helper: Get business slug (DB slug > generated from name > ID fallback)
 * CRITICAL: Use this everywhere you format business links or build slug lookups
 * Ensures deterministic slug matching across AI response parsing and Tier2/3 injection
 */
function getBusinessSlug(b: any): string {
  const slug = typeof b?.slug === 'string' ? b.slug.trim() : ''
  if (slug) return slug
  
  const bn = typeof b?.business_name === 'string' ? b.business_name.trim() : ''
  if (bn) {
    const s = slugifyBusinessName(bn)
    if (s) return s
  }
  
  return String(b?.id ?? '')
}

/**
 * Helper: Append a sentence with smart punctuation handling
 * Prevents edge cases like "..", "!.", "**." by detecting existing punctuation
 * at the end of base string (including closing quotes/brackets/markdown after punctuation)
 */
function appendSentence(base: string, sentence: string): string {
  let out = (base ?? '').replace(/\s+$/g, '')
  let s = (sentence ?? '').trim()
  if (!s) return out

  // If base already ends with end punctuation (optionally followed by closing quotes/brackets/markdown)
  // Examples: "text!", "text!**", "text!)", "text!\"", "text!**)", etc.
  const endsWithPunct = /[.!?:](?:["')\]\}*_`~]+)?$/.test(out)

  // If the sentence itself starts with punctuation, don't force an extra period.
  const sentenceStartsWithPunct = /^[.!?:,]/.test(s)

  if (endsWithPunct) return `${out} ${s}`
  if (sentenceStartsWithPunct) {
    // Attach directly for . and , (prevents "text . Also"), space for others
    if (/^[.,]/.test(s)) return `${out}${s}`
    return `${out} ${s}`
  }
  return `${out}. ${s}`
}

/**
 * Post-process AI response: strip banned phrases, guard hallucinations for zero-data businesses
 */
function postProcessResponse(response: string, businesses: any[]): string {
  let result = response
  
  // 1. Strip banned opening phrases
  const bannedOpeners = [
    /^(Ooo|Love that plan|Say no more|Great shout|Solid pick)[!.,—–\s]*/i,
  ]
  for (const pattern of bannedOpeners) {
    result = result.replace(pattern, '')
  }
  
  // 2. Strip banned inline phrases globally
  const bannedPhrases = [
    /people are (\*\*)?obsessed(\*\*)? with this place/gi,
    /absolute gem/gi,
    /hidden gem/gi,
    /real gems?/gi,
    /you're in luck/gi,
    /🔥/g,
  ]
  for (const pattern of bannedPhrases) {
    result = result.replace(pattern, '')
  }
  
  // 3. Hallucination guard for zero-data businesses
  // Build set of business names that have KB/menu data
  const businessesWithData = new Set<string>()
  for (const b of businesses) {
    if (b.kb_content || b.menu_preview || b.knowledge_base_content) {
      businessesWithData.add((b.business_name || '').toLowerCase())
    }
  }
  
  // For businesses NOT in the data set, strip "known for" / "specializes in" claims
  const hallucinationPatterns = [
    /known for\s+[^.!?\n]+/gi,
    /speciali[sz]es? in\s+[^.!?\n]+/gi,
    /famous for\s+[^.!?\n]+/gi,
    /renowned for\s+[^.!?\n]+/gi,
  ]
  
  // Only strip if the claim follows a business name that has NO data
  // Extract business name -> slug pairs from the response
  const businessLinkPattern = /\*\*\[([^\]]+)\]\(\/user\/business\/[^)]+\)\*\*/g
  let linkMatch: RegExpExecArray | null
  while ((linkMatch = businessLinkPattern.exec(result)) !== null) {
    const mentionedName = linkMatch[1].toLowerCase()
    if (!businessesWithData.has(mentionedName)) {
      // This business has no data -- check the text after its link for hallucination patterns
      const afterLink = result.slice(linkMatch.index + linkMatch[0].length, linkMatch.index + linkMatch[0].length + 200)
      for (const pattern of hallucinationPatterns) {
        const hMatch = pattern.exec(afterLink)
        if (hMatch && hMatch.index < 100) {
          // Strip the hallucinated claim from the full response
          const fullStart = linkMatch.index + linkMatch[0].length + hMatch.index
          result = result.slice(0, fullStart) + result.slice(fullStart + hMatch[0].length)
          if (process.env.NODE_ENV === 'development') {
            console.log(`🧹 Stripped hallucination for "${mentionedName}": "${hMatch[0]}"`)
          }
        }
      }
    }
  }
  
  // 4. Clean up double spaces and trailing whitespace from stripping
  result = result.replace(/  +/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  
  return result
}

/**
 * Build compressed system prompt for AI chat
 */
function buildSystemPromptV2(args: {
  cityDisplayName: string
  userMessage: string
  isBroadQuery: boolean
  stateContext?: string
  businessContext: string
  cityContext?: string
  state: ConversationState
  atlasAvailable: boolean
  currentTime?: string
  previousResponses?: string[]
}): string {
  const { cityDisplayName, userMessage, isBroadQuery, stateContext, businessContext, cityContext, state, atlasAvailable, currentTime, previousResponses } = args

  const convoFocus = state?.currentBusiness
    ? `FOCUS: You are currently discussing ${state.currentBusiness.name}. Stay on that unless the user asks to switch.`
    : `FOCUS: Help them discover what they want, then dive into specifics.`

  // Temporal context: current time for "open now" / "tonight" awareness
  const temporalBlock = currentTime
    ? `\nCURRENT TIME: ${currentTime}\nWhen listing results, mention open/closed status if hours are available. List open businesses first, but ALWAYS still include closed businesses — just note they are currently closed. Never skip a relevant business just because it is closed. If hours are missing, do not guess — just omit status.\n`
    : ''

  // Variety context: avoid repeating exact openers
  const varietyBlock = previousResponses && previousResponses.length > 0
    ? `\nVARIETY: Your last ${previousResponses.length} response(s) started with: ${previousResponses.map(r => `"${r.slice(0, 60)}…"`).join(', ')}. Do NOT repeat the same opening sentence or structure.\n`
    : ''

  // Clarify-first rule for very broad queries with no constraints
  const clarifyBlock = isBroadQuery
    ? `
CLARIFY-FIRST: The user asked something broad: "${userMessage}"
Show 2–3 top picks immediately, then ask ONE short preference question to narrow it down.
Examples of good questions (pick the most relevant):
- For bars: "Cocktail bar vibe, pub with a beer garden, or somewhere with food and drinks?"
- For restaurants: "Any cuisine in mind, or something specific like date night, family, outdoor seating?"
- For cafes: "After a coffee spot, brunch place, or somewhere to work from?"
Do NOT block results — always show picks first, then ask.`
    : ''

  return `
You are a local concierge for ${cityDisplayName}. Be helpful, warm, and accurate. Never fabricate information.
${temporalBlock}
⚠️  CRITICAL FORMATTING RULES ⚠️
Every business name MUST be a clickable markdown link: **[Business Name](/user/business/slug)**
NEVER write plain bold business names like **Business Name** — always include the link!

HARD RULES (DO NOT BREAK):
- LINKS: Every business mention MUST use **[Business Name](/user/business/slug)**. If you can't link it, don't mention it.
- ONE BUSINESS PER PARAGRAPH: Separate businesses with a blank line. Never put two in the same paragraph.
- KEEP IT TIGHT: 1–2 sentences per business max (rating + ONE factual detail from AVAILABLE BUSINESSES only).
- NO BULLET LISTS for business results. Use full paragraphs.
- EVIDENCE BOUNDARY: Only describe menu items, offers, hours, amenities, vibe if that exact info exists in AVAILABLE BUSINESSES / KB / menu_preview / offers. If not present, do NOT infer from category/name. In zero-data mode: name+link, category, rating+review_count, distance only.
- 🍴 MENU ITEM QUERIES (HIGHEST PRIORITY):
  When user asks about a SPECIFIC food/drink item (wings, cocktails, burger, ribs, pizza, etc):
  ✅ EXTRACT the exact item from KB content with name + price
  ✅ CITE directly: "They have X (£Y)"
  ✅ If multiple matching items exist, list them with prices
  ❌ DO NOT use generic descriptions like "specializes in" when KB has specific items
- 📋 GENERAL MENU QUERIES:
  When user asks "what food/menu", "what do they serve":
  ✅ CHECK for "Featured Menu Items:" in AVAILABLE BUSINESSES
  ✅ If present: list 3-5 items with names and prices
  ❌ DO NOT say "I don't have menu details" when Featured Menu Items are listed
- SHOW ALL UPFRONT: If you have 2+ relevant matches, mention ALL in your FIRST answer. Never drip-feed.
- NO HALLUCINATIONS: Never invent dishes, vibe, amenities, hours, or offers. Only mention specifics from AVAILABLE BUSINESSES.
- 🚨 ZERO-DATA BUSINESSES: If a business has NO menu items, NO KB content, NO offers — ONLY mention: name (with link), category, rating + review count, distance. DO NOT add what they are "known for", "specialize in", or "offer". DO NOT infer from business name or category.
- GOOGLE REVIEWS: Numeric rating + review_count only. Never quote or paraphrase review text.
- OFFERS: DB-authoritative only. If an offer is not in current data, it does not exist.
- TIERS: If there are relevant Qwikker Picks for the user's request, list them first. Never force a Qwikker Pick that doesn't match the request — relevance always wins over tier.
- "QWIKKER PICKS": Only use this label if EVERY business you mentioned is [TIER: qwikker_picks].
- ATLAS: ${atlasAvailable ? 'When listing 2+ businesses, end your response with a short line like: "Tap **Explore on Atlas** below to take a guided tour of these spots on the map!" — use natural wording but always mention the Atlas button.' : 'DO NOT mention map views or Atlas — the map is not available for these businesses.'}
- ZERO RESULTS: Be honest. NEVER say "you're in luck" if you have nothing to show. Suggest a nearby alternative category or ask what else they'd like.
- MATCH USER LANGUAGE: If the user asked for "bars", say "bars" in your response — never substitute with "dining options", "restaurants", or "places to eat". Mirror the user's terminology.
- "ANY MORE?" HANDLING: If you showed all matches, say so. If you missed any, correct yourself immediately.

MULTI-PART QUERIES:
When the user asks for more than one thing (e.g. "drinks then food", "cocktails AND spicy food", "brunch and shopping"):
- Address EACH part separately in your response
- Group businesses by the part they satisfy (e.g. "For drinks:" then "For food:")
- If one part has results and another doesn't, say so clearly

TONE:
- Be conversational and warm for planning/discovery queries ("date night", "any good bars", "somewhere cosy")
- Be factual and direct for information queries ("what time does X close", "do they have parking", "is there an offer")
- NEVER use these phrases: "Love that plan", "Say no more", "Ooo", "you're in luck", "great shout", "solid pick", "absolute gem", "hidden gem", "people are obsessed"
- NEVER use fire emoji 🔥 in business descriptions
- NEVER use exclamation marks more than once per response
- Keep warmth natural — a knowledgeable friend, not a hype machine
${varietyBlock}
${clarifyBlock}
${stateContext ? `CONVERSATION CONTEXT:\n${stateContext}\n` : ''}
${convoFocus}

AVAILABLE BUSINESSES (sorted by tier; qwikker_picks first):
${businessContext || 'No businesses available.'}

${cityContext ? `CITY INFO:\n${cityContext}\n` : ''}
`.trim()
}

/**
 * Generate AI response using hybrid model selection
 */
export async function generateHybridAIResponse(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
  conversationState?: ConversationState
): Promise<ChatResponse> {
  
  try {
    const { city, userName = 'there' } = context
    
    // ✅ SHIP-SAFE: Assert city is provided (prevent silent tenant leaks)
    if (!city || city === 'unknown') {
      console.error('❌ CRITICAL: No city provided to generateHybridAIResponse')
      if (process.env.NODE_ENV === 'development') {
        throw new Error('City is required for AI chat')
      }
      return {
        success: false,
        error: 'City configuration missing. Please contact support.'
      }
    }
    
    // 🔑 Get franchise-specific OpenAI API key
    const franchiseKeys = await getFranchiseApiKeys(city)
    
    if (!franchiseKeys.openai_api_key) {
      console.error(`❌ No OpenAI API key configured for ${city}`)
      return {
        success: false,
        error: 'AI service not configured for this city. Please contact support.'
      }
    }
    
    // Create OpenAI client with franchise's API key (they pay for usage)
    const openai = new OpenAI({
      apiKey: franchiseKeys.openai_api_key,
    })
    
  // 🔍 EARLY EXIT: Handle hidden business detail command
  // ✅ SAFETY: Only match if entire message is exactly the command (prevent accidental triggers)
  const detailCommandMatch = userMessage.trim().match(/^__qwikker_business_detail__:(\S+)$/)
  if (detailCommandMatch) {
    const businessId = detailCommandMatch[1]
    
    // ✅ SHIP-SAFE: Validate UUID format before querying
    if (!isValidUUID(businessId)) {
      console.warn(`⚠️ Invalid business ID format: ${businessId}`)
      return {
        success: false,
        error: 'Invalid business identifier',
        response: 'Sorry, I couldn\'t find that business. Please try again.'
      }
    }
    
    console.log(`🔍 Hidden detail request detected for business ID: ${businessId}`)
    // ✅ CONTEXT: Pass conversation history for smarter detail responses
    return await generateBusinessDetailResponse(businessId, context, openai, conversationHistory)
  }
    
    // Initialize or use existing conversation state
    let state = conversationState || createInitialState()
    
    // ✅ Initialize tenant-aware supabase client FIRST (prevents TDZ error)
    // This must come before any DB queries (including state restoration)
    const supabase = await createTenantAwareServerClient(city)
    
    // ✅ VERIFY: Tenant context is actually set (dev-only)
    if (process.env.NODE_ENV !== 'production') {
      const { data: currentCity, error } = await supabase.rpc('get_current_city')
      console.log('🔒 [TENANT DEBUG] current city =', currentCity, error ? error.message : '')
    }
    
    // 🧠 STEP 1: RESTORE CURRENT BUSINESS FROM HISTORY
    // Parse conversation history to restore which business we're discussing
    // This enables Fact Mode to activate on detail follow-ups
    function extractLastBusinessFromHistory(history: any[]): string | null {
      if (!history?.length) return null
      
      const linkRegex = /\*\*\[[^\]]+\]\(\/user\/business\/([a-z0-9-]+)\)\*\*/
      
      // Search backwards through history to find most recent business mention
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i]?.content || ''
        const match = msg.match(linkRegex)
        if (match) return match[1]
      }
      return null
    }
    
    const lastSlug = extractLastBusinessFromHistory(conversationHistory)
    
    // 🐛 DEBUG: Log history parsing (dev-only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📜 [HISTORY DEBUG] conversationHistory length: ${conversationHistory?.length || 0}`)
      if (conversationHistory && conversationHistory.length > 0) {
        console.log(`📜 [HISTORY DEBUG] Last message:`, conversationHistory[conversationHistory.length - 1])
      }
      console.log(`📜 [HISTORY DEBUG] Extracted slug: ${lastSlug || 'none'}`)
    }
    
    if (lastSlug && process.env.NODE_ENV !== 'production') {
      console.log(`📜 [HISTORY DEBUG] Found app slug: ${lastSlug} (DB has no slug column - route.ts will resolve)`)
    }
    
    // 🎯 EARLY DETAIL SHORT-CIRCUIT: Detect follow-up/detail queries about a specific business
    // If user is asking about a business we already know about (from slug), skip global KB search
    const lowerMessage = userMessage.toLowerCase()
    const isFollowUpDetailQuery = /\b(what else|any more|anything else|what do they (sell|serve|have|offer)|what('?s| is) on (the |their )?menu|tell me (more|about)|their menu|their food|kids menu|dessert menu|drink menu|wine list)\b/i.test(lowerMessage)
    const isAnaphoricQuery = /^(any more|anything else|what else|more|another|more places)[\?\!\.]*$/i.test(userMessage.trim())
    
    // Short-circuit: if we have a resolved business slug AND query is about that business
    const shouldShortCircuitToDetail = (isFollowUpDetailQuery || isAnaphoricQuery) && lastSlug
    
    if (shouldShortCircuitToDetail) {
      console.log(`🎯 [DETAIL SHORT-CIRCUIT] Follow-up query about ${lastSlug} - skipping global KB search`)
    } else if (isAnaphoricQuery) {
      // Anaphoric but no clear target - we'll handle this below
      console.log(`🔍 [ANAPHORA DETECTED] "${userMessage}" needs context resolution`)
    }
    
    // 🎯 STEP 1: Classify query complexity
    const classification = classifyQueryIntent(userMessage, conversationHistory)
    const modelToUse = classification.complexity === 'complex' ? 'gpt-4o' : 'gpt-4o-mini'
    
    logClassification(userMessage, classification, modelToUse)
    
    // 🔒 KB AUTHORITY GATE: Distinguish HARD queries from MIXED queries
    // HARD queries (pure offers/events) → DB-only, no KB
    // MIXED queries (discovery + offers) → KB for discovery, DB for filtering
    
    // Detect if offers/events are mentioned
    const isOfferQuery = /\b(offers?|deals?|discounts?|promos?|specials?)\b/i.test(lowerMessage) ||
                         /\b(show|list|all|any|get|find|see|tell me).*(deals?|offers?)\b/i.test(lowerMessage)
    // Match "shows" (noun) but NOT "show" (verb) to avoid false positives like "show me restaurants"
    const isEventQuery = /\b(events?|shows|concerts?|gigs?|happening|what'?s on|things to do)\b/i.test(lowerMessage) && 
                         !/\b(show me|show all|showing)\b/i.test(lowerMessage)
    
    // 🎯 CRITICAL FIX: Distinguish HARD queries (DB-only) from MIXED queries (KB + DB)
    // HARD = pure offer/event query (e.g., "show me offers", "current deals")
    // MIXED = discovery with constraints (e.g., "restaurants with offers", "family friendly with deals")
    const isMixedQuery = /(with|that has|which has|anywhere|places|restaurants?|bars?|cafes?|family|kids?|cheap|good|best)/i.test(userMessage)
    
    const isHardOfferQuery = isOfferQuery && !isMixedQuery
    const isHardEventQuery = isEventQuery && !isMixedQuery
    
    const isKbDisabled = isHardOfferQuery || isHardEventQuery
    const intent = isOfferQuery ? 'offers' : (isEventQuery ? 'events' : 'general')
    
    console.log(`🔍 KB GATE CHECK: query="${userMessage}"`)
    console.log(`  isOfferQuery=${isOfferQuery}, isEventQuery=${isEventQuery}`)
    console.log(`  isMixedQuery=${isMixedQuery} (discovery with constraints)`)
    console.log(`  isHardOfferQuery=${isHardOfferQuery} (pure offers, no discovery)`)
    console.log(`  isKbDisabled=${isKbDisabled}, intent="${intent}"`)
    
    if (isKbDisabled) {
      console.log(`🚫 KB search DISABLED: HARD ${intent} query (DB-authoritative only)`)
    } else if (isOfferQuery || isEventQuery) {
      console.log(`✅ KB search ENABLED: MIXED query (discovery with ${intent} constraint)`)
    } else {
      console.log(`✅ KB search ENABLED: General discovery query`)
    }
    
    // 🎯 STEP 2: Search knowledge base with context-aware query expansion
    // ❗ SKIP ENTIRELY if intent requires DB authority (offers, events)
    // ❗ ALSO SKIP if this is a detail follow-up about a known business
    const searchLimit = userMessage.toLowerCase().includes('list all') ? 30 : 12
    
    let businessResults = { success: true, results: [] as any[] }
    let cityResults = { success: true, results: [] as any[] }
    
    if (!isKbDisabled && !shouldShortCircuitToDetail) {
      // If user uses pronouns (their, they, it), inject current business name into search
      let enhancedQuery = userMessage
      const usesPronoun = /\b(their|they|them|it|its)\b/i.test(userMessage.toLowerCase())
      
      if (usesPronoun && state.currentBusiness) {
        // Extract the last mentioned business from conversation
        const lastBusiness = conversationHistory
          .slice(-6) // Look at last 6 messages
          .reverse()
          .find(msg => msg.role === 'assistant' && /\*\*([^*]+)\*\*/g.test(msg.content))
        
        if (lastBusiness) {
          const businessMatch = lastBusiness.content.match(/\*\*([^*]+)\*\*/)
          if (businessMatch) {
            const businessName = businessMatch[1]
            enhancedQuery = `${businessName} ${userMessage}`
            console.log(`🎯 Enhanced query with context: "${enhancedQuery}"`)
          }
        }
      }
      
      businessResults = await searchBusinessKnowledge(enhancedQuery, city, { 
        matchCount: searchLimit,
        matchThreshold: 0.5  // Lower threshold to catch more relevant results (0.7 was too strict)
      })
      cityResults = await searchCityKnowledge(userMessage, city, { matchCount: 6 })
    }
    
    // 🎯 Fetch offer counts for businesses to enrich context (DEDUPED)
    // (supabase client already initialized at top of function)
    
    // 🔧 CRITICAL FIX: Query ALL THREE TIERS from their respective views
    // Tier 1: business_profiles_chat_eligible (paid/trial)
    // Tier 2: business_profiles_lite_eligible (claimed-free)
    // Tier 3: business_profiles_ai_fallback_pool (unclaimed)
    
    const [tier1Response, tier2Response, tier3Response] = await Promise.all([
      supabase.from('business_profiles_chat_eligible').select('*').eq('city', city),
      supabase.from('business_profiles_lite_eligible').select('*').eq('city', city),
      supabase.from('business_profiles_ai_fallback_pool').select('*').eq('city', city)
    ])
    
    const tier1Businesses = tier1Response.data || []
    const tier2Businesses = tier2Response.data || []
    const tier3Businesses = tier3Response.data || []
    
    console.log(`💼 Queried from views: T1=${tier1Businesses.length}, T2=${tier2Businesses.length}, T3=${tier3Businesses.length}`)
    
    // 🎯 DETAIL SHORT-CIRCUIT: If this is a follow-up about a specific business,
    // filter candidates to only that business (skip global search)
    let tier1FilteredForDetail = tier1Businesses
    let tier2FilteredForDetail = tier2Businesses
    let tier3FilteredForDetail = tier3Businesses
    
    if (shouldShortCircuitToDetail && lastSlug) {
      // Convert slug to business name pattern (e.g., "triangle-gyross" -> "triangle gyross")
      const namePattern = lastSlug.split('-').join(' ')
      const allBusinesses = [...tier1Businesses, ...tier2Businesses, ...tier3Businesses]
      
      // Find business matching the slug pattern
      const targetBusiness = allBusinesses.find(b => 
        b.business_name.toLowerCase().includes(namePattern.toLowerCase()) ||
        namePattern.toLowerCase().includes(b.business_name.toLowerCase().replace(/[^\w\s]/g, ''))
      )
      
      if (targetBusiness) {
        // Filter all tiers to only this business
        tier1FilteredForDetail = tier1Businesses.filter(b => b.id === targetBusiness.id)
        tier2FilteredForDetail = tier2Businesses.filter(b => b.id === targetBusiness.id)
        tier3FilteredForDetail = tier3Businesses.filter(b => b.id === targetBusiness.id)
        
        console.log(`🎯 [DETAIL FILTER] Locked to: ${targetBusiness.business_name} (id: ${targetBusiness.id})`)
      } else {
        console.log(`⚠️ [DETAIL FILTER] Could not resolve slug "${lastSlug}" to business - continuing with all candidates`)
      }
    }
    
    // Use filtered tiers for the rest of the flow
    const tier1 = tier1FilteredForDetail
    const tier2 = tier2FilteredForDetail
    const tier3 = tier3FilteredForDetail
    
    // Build vocabulary from ALL tiers (dynamic, not hardcoded)
    const allInventoryBusinesses = [
      ...(tier1 || []),
      ...(tier2 || []),
      ...(tier3 || [])
    ]
    const vocabulary = buildInventoryVocabulary(allInventoryBusinesses)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[VOCAB] sizes:', {
        categories: vocabulary.categories.size,
        types: vocabulary.types.size,
        terms: vocabulary.terms.size
      })
    }
    
    const businessOfferCounts: Record<string, number> = {}
    
    if (businessResults.success && businessResults.results.length > 0) {
      // FIX: Dedupe business IDs first to avoid counting same business multiple times
      const businessIds = Array.from(new Set(
        businessResults.results.map(r => r.business_id).filter(Boolean) as string[]
      )).slice(0, 6) // Check top 6 unique businesses
      
      if (businessIds.length > 0) {
        // ✅ Count ONLY active, valid offers from eligible businesses
        const { data: offerCounts } = await supabase
          .from('business_offers_chat_eligible')
          .select('business_id')
          .in('business_id', businessIds)
        
        if (offerCounts) {
          offerCounts.forEach(offer => {
            businessOfferCounts[offer.business_id] = (businessOfferCounts[offer.business_id] || 0) + 1
          })
        }
      }
    }
    
    // 🚨 STEP 3: HARD STOP FOR HARD OFFER QUERIES (DB-AUTHORITATIVE MODE)
    // ONLY for PURE offer queries (e.g., "show me offers")
    // MIXED queries (e.g., "restaurants with offers") go through normal KB flow
    if (isHardOfferQuery) {
      try {
        console.log(`🎫 Fetching ALL active offers in ${city}`)
        
        // 🔒 THE ONLY SOURCE: business_offers_chat_eligible view
        // ✅ Join business_profiles to filter by city (view doesn't have city column)
        const { data: offers, error } = await supabase
          .from('business_offers_chat_eligible')
          .select(`
            id,
            business_id,
            offer_name,
            offer_description,
            offer_type,
            offer_value,
            offer_terms,
            offer_start_date,
            offer_end_date,
            offer_image,
            business_profiles!inner(
              business_name,
              city
            )
          `)
          .eq('business_profiles.city', city)
          .order('offer_end_date', { ascending: false })
          .limit(10)
        
        if (error) {
          console.error('❌ Error fetching offers:', error)
        }
        
        // 🚨 ZERO OFFERS: Return authoritative "no offers" message
        if (!offers || offers.length === 0) {
          console.log(`🚫 ZERO OFFERS in DB → returning authoritative "no offers" response`)
          return {
            success: true,
            response: `There are no active offers in ${city} right now. Check back soon, or explore our great businesses and restaurants!`,
            sources: [],
            businessCarousel: [],
            walletActions: [],
            eventCards: [],
            uiMode: 'conversational',
            hasBusinessResults: false,
            modelUsed: 'gpt-4o-mini',
            classification
          }
        }
        
        // 🎉 OFFERS EXIST: Return static message + offers (DO NOT CALL AI MODEL)
        const walletActions = offers.map(offer => ({
          type: 'add_to_wallet' as const,
          offerId: offer.id,
          offerName: offer.offer_name,
          offerDescription: offer.offer_description || null,
          offerType: offer.offer_type || null,
          offerValue: offer.offer_value,
          offerTerms: offer.offer_terms || null,
          offerStartDate: offer.offer_start_date || null,
          offerEndDate: offer.offer_end_date || null,
          offerImage: offer.offer_image || null,
          businessName: offer.business_profiles?.business_name || 'Unknown',
          businessId: offer.business_id
        }))
        
        console.log(`✅ Found ${walletActions.length} offers from business_offers_chat_eligible`)
        console.log(`🎫 First offer: ID=${offers[0].id}, Business=${offers[0].business_profiles?.business_name}`)
        
        // ✅ DEV LOG: Show each deal with expiry date
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 Current Deals (business_offers_chat_eligible view = THE ONLY SOURCE):')
          offers.forEach(o => {
            const expiryDate = o.offer_end_date ? new Date(o.offer_end_date).toLocaleDateString() : 'No expiry'
            console.log(`  - ${o.business_profiles?.business_name} | ${o.offer_name} | ends ${expiryDate}`)
          })
        }
        
        // 🎯 DETERMINISTIC RESPONSE: Static message + offer cards (NO AI MODEL CALL)
        return {
          success: true,
          response: `Here are the current deals in ${city}:`,
          sources: [],
          businessCarousel: [],
          walletActions,
          eventCards: [],
          uiMode: 'conversational',
          hasBusinessResults: false,
          modelUsed: 'gpt-4o-mini',
          classification
        }
      } catch (error) {
        console.error('❌ Error in offer hard stop:', error)
        // Fall through to normal flow on error
      }
    }
    
    // 🎯 STEP 3.5: DETECT INTENT & SCORE RELEVANCE (BEFORE BUILDING AI CONTEXT!)
    // CRITICAL: We must know which businesses are relevant BEFORE the AI generates its response
    console.log('🔍 PRE-CONTEXT: Detecting intent and scoring relevance...')
    const detectedIntent = detectIntent(userMessage)
    const facet = detectFacet(userMessage)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[INTENT]', {
        hasIntent: detectedIntent.hasIntent,
        categories: detectedIntent.categories,
        keywords: detectedIntent.keywords
      })
    }
    
    // 🔒 FACET INJECTION: If alcohol facet is detected but no intent, treat as intentful
    // Prevents "cocktails" from being treated as browse mode
    if (!detectedIntent.hasIntent && facet.alcohol) {
      detectedIntent.hasIntent = true
      detectedIntent.keywords = [...detectedIntent.keywords, 'alcohol']
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔒 FACET INJECTION: alcohol facet detected, treating as intentful query`)
      }
    }
    
    const intentTerms = detectedIntent.categories.concat(detectedIntent.keywords).join(', ') || 'none'
    console.log(`🎯 Intent detected: ${detectedIntent.hasIntent ? intentTerms : 'none'} (categories: ${detectedIntent.categories.length}, keywords: ${detectedIntent.keywords.length})`)
    if (facet.alcohol && process.env.NODE_ENV === 'development') {
      console.log(`🔒 Facet: alcohol query detected`)
    }
    
    // Store relevance scores for all businesses
    const businessRelevanceScores = new Map<string, number>()
    
    // 🎯 BUILD AI CONTEXT: MERGE KB CONTENT + THREE-TIER RANKING
    // CRITICAL: AI needs BOTH tier ranking AND rich KB content (kids menus, menu items, offers)
    
    // Step 1: Create KB content map by business_id
    // 🔥 CRITICAL FIX: CONCATENATE ALL RELEVANT KB ENTRIES, DON'T PICK JUST ONE!
    // If user asks "ribs?" and business has:
    // - Featured items (no ribs)
    // - PDF menu (has ribs)
    // The AI needs BOTH to find the ribs!
    const kbContentByBusinessId = new Map<string, string>()  // Now stores CONCATENATED content strings
    const kbScoreById = new Map<string, number>()  // Store semantic search similarity scores
    if (businessResults.success && businessResults.results.length > 0) {
      // Group KB entries by business_id
      const kbByBusiness = new Map<string, any[]>()
      
      for (const kbResult of businessResults.results) {
        if (kbResult.business_id) {
          // Store semantic similarity score (highest per business)
          const similarity = (kbResult as any).similarity ?? 0
          const existingScore = kbScoreById.get(kbResult.business_id) || 0
          if (similarity > existingScore) {
            kbScoreById.set(kbResult.business_id, similarity)
          }
          
          // Group all KB entries for this business
          if (!kbByBusiness.has(kbResult.business_id)) {
            kbByBusiness.set(kbResult.business_id, [])
          }
          kbByBusiness.get(kbResult.business_id)!.push(kbResult)
        }
      }
      
      // For each business, concatenate ALL relevant KB content
      for (const [businessId, kbEntries] of kbByBusiness.entries()) {
        // Filter out archived/inactive entries (if status field exists)
        const activeEntries = kbEntries.filter(kb => !kb.status || kb.status === 'active')
        
        if (activeEntries.length === 0) continue
        
        // Sort by priority (menus first, then offers, etc.)
        const getPriority = (kb: any) => {
          const type = kb.knowledge_type || ''
          const title = (kb.title || '').toLowerCase()
          
          // PDF documents are usually the most comprehensive
          if (type === 'pdf_document') return 1
          // Then menu-related content
          if (title.includes('menu') || title.includes('kids')) return 2
          // Then custom knowledge (descriptions, etc.)
          if (type === 'custom_knowledge') return 3
          // Offers last (they're already shown separately)
          if (type === 'offer') return 99
          
          return 50
        }
        
        const sortedEntries = activeEntries.sort((a, b) => getPriority(a) - getPriority(b))
        
        // Concatenate content from all entries
        const combinedContent = sortedEntries
          .map(kb => {
            const title = kb.title || 'Information'
            const content = kb.content || ''
            return `${title}:\n${content}`
          })
          .join('\n\n---\n\n')
        
        kbContentByBusinessId.set(businessId, combinedContent)
      }
      
      console.log(`📚 KB content available for ${kbContentByBusinessId.size} businesses`)
      console.log(`🔍 KB similarity scores:`, Array.from(kbScoreById.entries()).map(([id, score]) => `${id.substring(0, 8)}: ${score.toFixed(2)}`).join(', '))
    }
    
    // Step 2: Score ALL businesses for relevance
    // Semantic search may have found evidence even if intent detector found nothing
    console.log(`🎯 Scoring all businesses for intent: "${intentTerms || 'semantic-only'}"`)
    
    // Score Tier 1
    tier1.forEach(b => {
      const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet)
      businessRelevanceScores.set(b.id, score)
    })
    
    // Score Tier 2
    tier2.forEach(b => {
      const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet)
      businessRelevanceScores.set(b.id, score)
    })
    
    // Score Tier 3
    tier3.forEach(b => {
      const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet)
      businessRelevanceScores.set(b.id, score)
    })
    
    console.log(`🎯 Scored ${businessRelevanceScores.size} businesses (${Array.from(businessRelevanceScores.values()).filter(s => s > 0).length} relevant)`)
    
    if (process.env.NODE_ENV === 'development') {
      const top = Array.from(businessRelevanceScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, score]) => {
          const b =
            tier1.find(x => x.id === id) ||
            tier2.find(x => x.id === id) ||
            tier3.find(x => x.id === id)
          return { business: b?.business_name || id, score }
        })
      console.log('[RELEVANCE] top10:', top)
    }
    
    // Step 3: Merge all three tiers with tier priority AND relevance scores
    const allBusinessesForContext = [
      ...tier1.map(b => ({ 
        ...b, 
        tierSource: 'tier1', 
        tierPriority: 1, 
        tierLabel: b.effective_tier || 'paid',
        relevanceScore: businessRelevanceScores.get(b.id) || 0 
      })),
      ...tier2.map(b => ({ 
        ...b, 
        tierSource: 'tier2', 
        tierPriority: 2, 
        tierLabel: 'claimed_free',
        relevanceScore: businessRelevanceScores.get(b.id) || 0
      })),
      ...tier3.map(b => ({ 
        ...b, 
        tierSource: 'tier3', 
        tierPriority: 3, 
        tierLabel: 'unclaimed',
        relevanceScore: businessRelevanceScores.get(b.id) || 0
      }))
    ]
    
    // Step 4: Apply "Relevance decides IF, Tier decides ORDER" rule
    // 🚨 CRITICAL FIX: NEVER use browse fallback for specific queries!
    // If user asks for Greek and we only have 1, show that 1 Greek place, NOT random cafes!
    let sortedForContext = [...allBusinessesForContext]
    
    // Filter to relevant businesses. When intent is detected AND we have strong
    // category matches (score >= CAROUSEL_MIN), raise the bar to exclude semantic
    // noise (cafes/restaurants matching "bar" via KB text similarity alone).
    const allScores = allBusinessesForContext.map(b => b.relevanceScore || 0)
    const topContextScore = Math.max(...allScores, 0)
    const contextThreshold = (detectedIntent.hasIntent && topContextScore >= CAROUSEL_MIN) 
      ? INJECT_MIN  // Strong category matches exist -- exclude weak semantic noise
      : CONTEXT_MIN // No strong matches -- accept everything > 0
    
    const relevantBusinesses = allBusinessesForContext.filter(b => 
      (b.relevanceScore || 0) >= contextThreshold
    )
    
    if (relevantBusinesses.length > 0) {
      console.log(`🎯 ${relevantBusinesses.length} relevant of ${allBusinessesForContext.length} (threshold: ${contextThreshold}, topScore: ${topContextScore})`)
      sortedForContext = relevantBusinesses
    } else if (detectedIntent.hasIntent) {
      // User asked for something specific but we found nothing
      console.log(`⚠️ Zero relevant results for specific query. AI will explain none found.`)
      sortedForContext = []
    } else {
      // Browse mode / no intent - show all
      console.log(`📊 No specific intent - showing all ${allBusinessesForContext.length} businesses`)
      sortedForContext = allBusinessesForContext
    }
    
    // Sort strategies:
    // BROWSE MODE: Tier first (paid always above unclaimed), then rating within tier
    // INTENT MODE: Relevance first (truth), then tier as tiebreaker, then rating
    const userLoc = normalizeLocation(context.userLocation)
    
    sortedForContext.sort((a, b) => {
      if (!detectedIntent.hasIntent) {
        // BROWSE MODE: Tier-first guarantees paying businesses always appear above unclaimed
        // 1. Tier priority (paid > claimed > unclaimed)
        if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
        
        // 2. Rating within same tier (higher = better)
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (ratingA !== ratingB) return ratingB - ratingA
        
        // 3. Distance (if available, closer = better)
        if (userLoc && a.latitude && b.latitude && a.longitude && b.longitude) {
          const distA = calculateDistance(userLoc, { latitude: a.latitude, longitude: a.longitude })
          const distB = calculateDistance(userLoc, { latitude: b.latitude, longitude: b.longitude })
          return distA - distB
        }
        
        return 0
      } else {
        // INTENT MODE: Integer relevance band first, then tier within band, then
        // decimal precision within same band+tier. This ensures a score-5 bar always
        // beats a score-2 restaurant, but within the same band (e.g. both "2.x"),
        // a spotlight business ranks above a featured one -- that's what they pay for.
        const scoreA = a.relevanceScore || 0
        const scoreB = b.relevanceScore || 0
        const bandA = Math.floor(scoreA)
        const bandB = Math.floor(scoreB)
        
        // 1. Integer relevance band (higher = genuinely more relevant)
        if (bandA !== bandB) return bandB - bandA
        
        // 2. Tier priority within same band (paid > claimed > unclaimed)
        if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
        
        // 3. Decimal precision within same band + tier (higher semantic = better)
        if (scoreA !== scoreB) return scoreB - scoreA
        
        // 4. Rating (higher = better)
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (ratingA !== ratingB) return ratingB - ratingA
        
        // 5. Distance (if available, closer = better)
        if (userLoc && a.latitude && b.latitude && a.longitude && b.longitude) {
          const distA = calculateDistance(userLoc, { latitude: a.latitude, longitude: a.longitude })
          const distB = calculateDistance(userLoc, { latitude: b.latitude, longitude: b.longitude })
          return distA - distB
        }
        
        return 0
      }
    })
    
    console.log(`🎯 Building AI context from ${sortedForContext.length} businesses (T1=${tier1.length}, T2=${tier2.length}, T3=${tier3.length})`)
    
    // Sanity filter: only apply for food/drink intent queries (not general browse or service queries)
    const foodDrinkCategories = new Set([
      'greek', 'italian', 'chinese', 'japanese', 'thai', 'indian', 'mexican',
      'french', 'american', 'mediterranean', 'vietnamese', 'korean', 'spanish',
      'turkish', 'seafood', 'bakery', 'cafe', 'bar', 'dessert'
    ])
    const isFoodDrinkIntent = detectedIntent.categories.some(c => foodDrinkCategories.has(c)) ||
      detectedIntent.keywords.some(k => ['cocktails', 'cocktail', 'drink', 'drinks', 'beer', 'wine', 'brunch', 'breakfast', 'lunch', 'dinner'].includes(k))
    
    if (isFoodDrinkIntent) {
      const nonFoodCategories = [
        'barber', 'barbershop', 'hair salon', 'salon', 'hairdresser',
        'dentist', 'dental', 'doctor', 'medical', 'clinic',
        'car wash', 'auto', 'garage', 'mechanic',
        'gym', 'fitness', 'yoga studio',
        'bank', 'atm', 'finance'
      ]
      
      sortedForContext = sortedForContext.filter(b => {
        const category = (b.display_category || b.system_category || b.google_primary_type || '').toLowerCase()
        const isWrong = nonFoodCategories.some(wrong => category.includes(wrong))
        if (isWrong) {
          console.log(`🚨 FILTERED: ${b.business_name} (${category}) — not relevant for food/drink query`)
        }
        return !isWrong
      })
      console.log(`🎯 After food/drink sanity filter: ${sortedForContext.length} businesses remaining`)
    }
    
    if (sortedForContext.length > 0) {
      console.log(`📊 Top 5 for AI${detectedIntent.hasIntent ? ' (RELEVANCE-FILTERED)' : ''}:`)
      sortedForContext.slice(0, 5).forEach((b, i) => {
        const hasKB = kbContentByBusinessId.has(b.id) ? '📚' : ''
        const relevanceLabel = detectedIntent.hasIntent ? ` [relevance: ${b.relevanceScore || 0}]` : ''
        console.log(`  ${i + 1}. ${b.business_name} [${b.tierLabel}] ${b.rating}★ ${hasKB}${relevanceLabel}`)
      })
    }
    
    // Step 4: Build RICH context with KB content merged with DB data
    const businessContext = sortedForContext.length > 0
      ? sortedForContext.slice(0, 10).map((business, index) => {
          const offerCount = business.id ? businessOfferCounts[business.id] || 0 : 0
          const offerText = offerCount > 0 ? ` [Has ${offerCount} ${offerCount === 1 ? 'offer' : 'offers'} available]` : ''
          
          // 📚 PRIORITY: Use KB content if available (has ALL relevant entries concatenated!)
          const kbContent = kbContentByBusinessId.get(business.id)
          
          let richContent = ''
          if (kbContent) {
            // KB content is GOLD - it has everything (all relevant KB entries concatenated)!
            richContent = `\n${kbContent}`
            console.log(`✅ Using KB content for ${business.business_name} (${kbContent.length} chars)`)
          } else {
            // Fallback to basic DB fields
            if (business.business_tagline) {
              richContent += `\nTagline: "${business.business_tagline}"`
            } else if (business.business_description) {
              richContent += `\nDescription: "${business.business_description}"`
            }
          }
          
          // ✅ ALWAYS add featured menu items (menu_preview) if available, even when KB exists
          // This ensures AI can see menu items for Tier 2 businesses (claimed-free)
          if (business.menu_preview && Array.isArray(business.menu_preview) && business.menu_preview.length > 0) {
            richContent += `\n\nFeatured Menu Items (${business.menu_preview.length} items):`
            business.menu_preview.forEach((item: any, idx: number) => {
              richContent += `\n  ${idx + 1}. ${item.name}`
              if (item.price) richContent += ` - ${item.price}`
              if (item.description) richContent += `\n     ${item.description}`
            })
            console.log(`✅ Adding ${business.menu_preview.length} featured menu items for ${business.business_name}`)
          } else if (business.featured_items_count && business.featured_items_count > 0) {
            // Fallback: Just show count if menu_preview not available
            richContent += `\n\nFeatured Menu Items: ${business.featured_items_count} items available`
            console.log(`⚠️ Only featured_items_count available for ${business.business_name}, no menu_preview data`)
          } else if (!kbContent) {
            // Only log if we don't have KB content (KB might have menu info already)
            console.log(`⚠️ No featured menu items for ${business.business_name}`)
          }
          
          // 📅 Add opening hours if available (for initial recommendation)
          let hoursLine = ''
          if (business.business_hours_structured) {
            const openStatus = getOpenStatusForToday(business.business_hours_structured, new Date())
            if (openStatus.hasHours && openStatus.conversational) {
              hoursLine = `\nHours: ${openStatus.conversational}`
            }
          }
          
          // Build rating line (only show if has real reviews)
          let ratingLine = ''
          if (business.rating && business.rating > 0 && business.review_count && business.review_count > 0) {
            ratingLine = `\nRating: ${business.rating}★ from ${business.review_count} Google reviews`
          }
          
          return `**${business.business_name}** [TIER: ${business.tierLabel}]${ratingLine}
Category: ${business.display_category || 'Not specified'}${hoursLine}${richContent}${offerText}`
        }).join('\n\n')
      : 'No businesses available in this city yet.'
    
    console.log(`📊 AI Context: ${sortedForContext.length} total businesses, ${kbContentByBusinessId.size} with KB content, context length: ${businessContext.length} chars`)

    const cityContext = cityResults.success && cityResults.results.length > 0
      ? cityResults.results.map(result => 
          `${result.title}: ${result.content}`
        ).join('\n\n')
      : ''
    
    // 🎯 STEP 4: Build context-aware system prompt (SIMPLE AND CLEAR)
    const stateContext = generateStateContext(state)
    
    // Broad query detection: trigger clarify-first when the user gives a category
    // but zero constraints (no vibe, no area, no dish). Covers both "any restaurants?"
    // and "any bars?" — the AI shows top picks + asks one preference question.
    const relevantCount = allBusinessesForContext.filter(b => (b.relevanceScore || 0) >= INJECT_MIN).length
    const hasCategoryButNoConstraints = detectedIntent.hasIntent 
      && detectedIntent.categories.length > 0 
      && detectedIntent.keywords.length === 0
    const isGenericDiscovery = !detectedIntent.hasIntent 
      && /\b(restaurant|restaurants|eat|food|place|places|where should i|recommend|suggest|dinner|lunch|breakfast|bar|bars|pub|pubs|drinks?|cocktails?|cafe|cafes|coffee)\b/i.test(userMessage)
    
    const isBroadQuery = conversationHistory.length <= 2 
      && (hasCategoryButNoConstraints || isGenericDiscovery)
      && relevantCount >= 3
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🎯 [BROAD QUERY CHECK] hasIntent=${detectedIntent.hasIntent}, relevantCount=${relevantCount}, isBroadQuery=${isBroadQuery}`)
    }
    
    const cityDisplayName = city.charAt(0).toUpperCase() + city.slice(1)
    
    // Compute Atlas availability from the SAME candidates we'll show (not all businesses)
    // This prevents AI from mentioning map when businesses have no valid coordinates
    const candidatesForAtlas = detectedIntent.hasIntent
      ? sortedForContext // intent mode: relevant businesses only
      : allBusinessesForContext // browse mode: all businesses
    
    const atlasAvailable = (candidatesForAtlas || []).filter(hasValidCoords).length >= 2
    
    if (process.env.NODE_ENV === 'development') {
      const validCoordCount = (candidatesForAtlas || []).filter(hasValidCoords).length
      console.log(`🗺️  [ATLAS] Available: ${atlasAvailable} (${validCoordCount} of ${candidatesForAtlas.length} candidates have valid coords)`)
    }
    
    // Temporal context: pass current time for "open now" / "tonight" awareness
    const now = new Date()
    const currentTime = now.toLocaleString('en-GB', { 
      weekday: 'long', hour: '2-digit', minute: '2-digit', 
      timeZone: 'Europe/London' 
    })
    
    // Extract last 2 AI responses for variety tracking
    const previousResponses = conversationHistory
      .filter(m => m.role === 'assistant')
      .slice(-2)
      .map(m => m.content)
    
    const systemPrompt = buildSystemPromptV2({ 
      cityDisplayName, 
      userMessage, 
      isBroadQuery, 
      stateContext, 
      businessContext, 
      cityContext, 
      state,
      atlasAvailable,
      currentTime,
      previousResponses
    })
    
    if (process.env.NODE_ENV === 'development') console.log('[PROMPT] systemPrompt chars=', systemPrompt.length)

    // 🎯 STEP 5
    // 🎯 STEP 5: Build conversation messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8), // Last 8 messages
      { role: 'user', content: userMessage }
    ]
    
    // 🎯 FACT DELIVERY MODE: Override for detail requests about claimed businesses
    // Detect if user is asking for details and we have a current business in context
    const isDetailRequest = isDetailFollowup(userMessage, state)
    let aiResponse = ''
    
    if (isDetailRequest && state?.currentBusiness) {
      console.log(`📋 [FACT MODE] Detail request detected for business: ${state.currentBusiness.name}`)
      
      // Fetch full business data from DB to get all structured fields
      const { data: fullBusiness } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', state.currentBusiness.id)
        .single()
      
      if (fullBusiness) {
        const factBlock = buildOwnerFactBlock(fullBusiness)
        
        if (factBlock) {
          console.log(`📋 [FACT MODE] Generating deterministic response for ${fullBusiness.business_name}`)
          
          // Use GPT just to wrap facts warmly, but with strict instruction
          const factModePrompt = `You are presenting verified business information to a user.

The data below is owner-verified and MUST be stated exactly as given.

RULES:
- Present ALL facts clearly
- Do NOT say "typically", "usually", "might be", "check their site", "confirm"
- Do NOT add uncertainty or hedging
- Keep it warm and helpful, but factual
- After facts, offer to help with directions or booking

VERIFIED DATA:
${factBlock}

User asked: "${userMessage}"

Present this information clearly and offer further help.`

          const factCompletion = await openai.chat.completions.create({
            model: modelToUse,
            messages: [
              { role: 'system', content: factModePrompt },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.3, // Lower temp for fact delivery
            max_tokens: 400
          })
          
          aiResponse = factCompletion.choices[0]?.message?.content || factBlock
          
          // GUARDRAIL: If model still hedges, use raw fact block
          const hasHedging = /typically|usually|might|probably|often|generally|tends to|check (their|the) site|confirm/i.test(aiResponse)
          if (hasHedging) {
            console.warn(`⚠️  [FACT MODE] Detected hedging in response - using raw fact block`)
            aiResponse = factBlock
          }
          
          console.log(`✅ [FACT MODE] Generated fact-based response (${aiResponse.length} chars)`)
        }
      }
    }
    
    // 🎯 STEP 6: Call appropriate model (skip if fact mode already generated response)
    if (!aiResponse) {
      console.log(`\n🤖 CALLING ${modelToUse.toUpperCase()} for query: "${userMessage}"`)
      console.log(`📊 Conversation depth: ${conversationHistory.length} messages`)
      console.log(`🎯 State: ${stateContext}`)
      
      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages,
        temperature: 0.8,
        max_tokens: 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      })

      aiResponse = completion.choices[0]?.message?.content || ''
    }
    
    // === POST-PROCESSING GUARDRAILS ===
    aiResponse = postProcessResponse(aiResponse, allBusinessesForContext)
    
    // --- DEDUPE: Parse AI response for business links to prevent duplicates in Tier2/Tier3 ---
    // NOTE: These are RAW slugs - not yet validated against actual business inventory
    const mentionedSlugs = new Set<string>()
    const linkRegex = /\/user\/business\/([a-z0-9-]+)/g
    let match: RegExpExecArray | null
    while ((match = linkRegex.exec(aiResponse)) !== null) {
      mentionedSlugs.add(match[1])
    }
    
    // 🎯 STEP 7: Update conversation state
    const extractedBusinesses = extractBusinessNamesFromText(aiResponse)
    const updatedState = updateConversationState(state, userMessage, aiResponse, extractedBusinesses)
    
    // Build sources for UI
    const sources = businessResults.success ? businessResults.results.map(result => ({
      type: 'business' as const,
      businessName: result.business_name,
      content: result.content,
      similarity: result.similarity
    })) : []
    
    // 🎯 STEP 8: Wallet actions for offers
    // ⚠️ NOTE: Offer queries are now handled by HARD STOP above (before AI model call)
    // This code path only runs for non-offer queries
    let walletActions: ChatResponse['walletActions'] = []
    
    // 🎯 STEP 9: Fetch event cards if user is asking about events OR conversation contains events
    let eventCards: ChatResponse['eventCards'] = []
    
    // Check current message - but EXCLUDE food/menu context
    const isFoodContext = /\b(menu|mains|food|lunch|dinner|breakfast|dish|meal|eat|burger|fries|steak|ribeye|sauce|toppings|patty|cheese)\b/i.test(userMessage)
    const currentMessageMentionsEvents = !isFoodContext && /\b(event|show|concert|gig|happening|what'?s on|things to do|this weekend|tonight)\b/i.test(userMessage)
    
    // Check if events were discussed in recent conversation (more specific patterns)
    const recentConversation = conversationHistory.slice(-4).map(m => m.content).join(' ')
    const conversationMentionsEvents = /\b(event card|show me the event|concert|gig|happening tonight|what's on tonight|tasting experience|tasting event|jazz night|live music)\b/i.test(recentConversation)
    
    // Check if user is showing interest (yes, yeah, sure, etc) after events were mentioned
    // BUT exclude if they're asking about offers/deals
    const isAskingAboutOffer = /\b(offer|deal|discount|promo)\b/i.test(userMessage)
    const showingInterest = !isAskingAboutOffer && /\b(yes|yeah|yep|sure|sounds good|go on|interested|tell me more|show me the event|pull up)\b/i.test(userMessage)
    
    const shouldFetchEvents = currentMessageMentionsEvents || (conversationMentionsEvents && showingInterest && !isFoodContext && !isAskingAboutOffer)
    
    console.log(`🎉 EVENT QUERY CHECK:`, {
      userMessage,
      currentMessageMentionsEvents,
      conversationMentionsEvents,
      showingInterest,
      shouldFetchEvents
    })
    
    if (shouldFetchEvents) {
      try {
        const supabase = await createTenantAwareServerClient(city)
        
        console.log(`🎉 FETCHING EVENT CARDS - User wants event details for ${city}`)
        
        // Check LAST 4 messages for specific event name (more context)
        const recentMessages = conversationHistory.slice(-4).map(m => m.content).join(' ')
        const tastingMentioned = /tasting experience|tasting event|tasting night|cocktail tasting/i.test(recentMessages)
        const jazzMentioned = /jazz night|live jazz|jazz event/i.test(recentMessages)
        
        // 🆕 Check for date mentions in the CURRENT user message and AI response
        const allRelevantText = `${userMessage} ${aiResponse} ${recentMessages}`
        const dateMatch = allRelevantText.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(?:december|dec|november|nov|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct)\b/i)
        
        let specificDate: string | null = null
        if (dateMatch) {
          // Parse the date from the match
          const day = parseInt(dateMatch[1])
          const monthStr = dateMatch[0].match(/(december|dec|november|nov|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct)/i)?.[1].toLowerCase()
          
          const monthMap: Record<string, number> = {
            'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
            'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5,
            'july': 6, 'jul': 6, 'august': 7, 'aug': 7, 'september': 8, 'sep': 8,
            'october': 9, 'oct': 9, 'november': 10, 'nov': 10, 'december': 11, 'dec': 11
          }
          
          if (monthStr && monthMap[monthStr] !== undefined) {
            const year = new Date().getFullYear()
            const date = new Date(year, monthMap[monthStr], day)
            specificDate = date.toISOString().split('T')[0]
            console.log(`📅 Detected specific date in message: ${specificDate} (${dateMatch[0]})`)
          }
        }
        
        console.log(`🔍 Event detection in last 4 messages:`)
        console.log(`   - Tasting mentioned: ${tastingMentioned}`)
        console.log(`   - Jazz mentioned: ${jazzMentioned}`)
        console.log(`   - Specific date detected: ${specificDate}`)
        console.log(`   - Recent messages:`, conversationHistory.slice(-4).map(m => m.content.substring(0, 50)))
        
        let query = supabase
          .from('business_events')
          .select(`
            id,
            event_name,
            event_description,
            event_type,
            event_date,
            event_start_time,
            event_end_time,
            custom_location_name,
            booking_url,
            event_image,
            business_id,
            business_profiles!inner(business_name, city)
          `)
          .eq('status', 'approved')
          .eq('business_profiles.city', city)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
        
        // 🎯 PRIORITY 1: Filter by specific date if mentioned
        if (specificDate) {
          query = query.eq('event_date', specificDate)
          console.log(`🎯 Filtering for events on: ${specificDate}`)
        }
        // 🎯 PRIORITY 2: Filter by specific event type if mentioned
        else if (tastingMentioned) {
          query = query.ilike('event_name', '%tasting%')
          console.log(`🎯 Filtering for: Tasting Experience`)
        } else if (jazzMentioned) {
          query = query.ilike('event_name', '%jazz%')
          console.log(`🎯 Filtering for: Jazz Night`)
        } else {
          // Default: show only next upcoming event (not all 5)
          query = query.limit(1)
          console.log(`🎯 No specific mention - showing only next upcoming event`)
        }
        
        const { data: events, error } = await query
        
        console.log(`🔍 Query result: ${events?.length || 0} events found, error:`, error)
        
        console.log('🔍 Raw events data:', JSON.stringify(events, null, 2))
        
        if (!error && events && events.length > 0) {
          eventCards = events.map(event => {
            console.log('🔄 Mapping event:', event.event_name)
            return {
              id: event.id,
              title: event.event_name?.trim() || 'Untitled Event',
              description: event.event_description || 'No description',
              event_type: event.event_type || 'Other',
              start_date: event.event_date,
              start_time: event.event_start_time || null,
              end_date: null, // Not in schema
              end_time: event.event_end_time || null,
              location: event.custom_location_name || event.business_profiles?.business_name || 'TBA',
              ticket_url: event.booking_url || null,
              image_url: event.event_image || null,
              business_name: event.business_profiles?.business_name || 'Unknown Business',
              business_id: event.business_id
            }
          })
          
          console.log(`✅ Successfully mapped ${eventCards.length} event cards`)
          console.log('📦 Event cards data:', JSON.stringify(eventCards, null, 2))
        } else if (error) {
          console.error('❌ Error fetching events:', error)
        } else {
          console.log('ℹ️ No upcoming events found')
        }
      } catch (error) {
        console.error('❌ Error fetching event cards:', error)
      }
    }
    
    console.log(`✅ Response generated (${aiResponse.length} chars) using ${modelToUse}`)
    
    // 🗺️ ATLAS: Build business carousel with proper deduplication and enrichment
    let businessCarousel: ChatResponse['businessCarousel'] = undefined
    let hasBusinessResults = false
    let uiMode: 'conversational' | 'suggestions' | 'map' = 'conversational'
    let shouldAttachCarousel = false // ✅ HOIST: Declare at top level so review fetch block can access
    let fallbackBusinesses: any[] = [] // Declare in outer scope so it's always accessible
    let topMatchesText: any[] = [] // ✅ HOIST: Tier 3 that beats irrelevant Tier 1 (needed for review snippets)
    
    // 🎯 ARCHITECTURAL FIX: Merge KB results with direct DB query
    // This ensures businesses without KB content still appear
    const hasAnyBusinesses = tier1.length > 0 || tier2.length > 0 || tier3.length > 0
    if (businessResults.success || hasAnyBusinesses) {
      // STEP 1: Build map of all businesses (KB + direct query)
      const businessById = new Map<string, any>()
      const kbScoreById = new Map<string, number>()
      
      // Add KB results with similarity scores
      if (businessResults.success && businessResults.results.length > 0) {
        for (const r of businessResults.results) {
          if (!r.business_id) continue
          const score = (r as any).similarity ?? 0
          const existing = kbScoreById.get(r.business_id) ?? 0
          if (score > existing) {
            kbScoreById.set(r.business_id, score)
          }
        }
      }
      
      // Add ALL businesses from the three tiers
      for (const b of tier1) {
        if (!businessById.has(b.id)) {
          businessById.set(b.id, { ...b, tierSource: 'tier1' })
        }
      }
      for (const b of tier2) {
        if (!businessById.has(b.id)) {
          businessById.set(b.id, { ...b, tierSource: 'tier2' })
        }
      }
      for (const b of tier3) {
        if (!businessById.has(b.id)) {
          businessById.set(b.id, { ...b, tierSource: 'tier3' })
        }
      }
      
      console.log(`💼 Tier separation: T1=${tier1.length}, T2=${tier2.length}, T3=${tier3.length}`)
      
      const businesses = tier1 // ✅ For backward compat, "businesses" = Tier 1
      hasBusinessResults = businesses.length > 0
      
      console.log(`💼 Total businesses after merge: ${Array.from(businessById.values()).length} (${kbScoreById.size} had KB content)`)
      
      // STEP 2: Fetch offers/vibes for all businesses
      
      // 💚 Fetch Qwikker Vibes for all businesses (for chat context + within-tier ranking)
      const vibesMap = new Map()
      if (businesses && businesses.length > 0) {
        await Promise.all(
          businesses.map(async (business) => {
            const vibes = await getBusinessVibeStats(business.id)
            if (vibes && vibes.total_vibes >= 5) {
              // Only include businesses with 5+ vibes (statistically significant)
              vibesMap.set(business.id, vibes)
            }
          })
        )
        console.log(`💚 Found vibes for ${vibesMap.size} businesses (5+ vibes each)`)
      }
      
      // 🎯 THREE-TIER CHAT SYSTEM: Browse Fill + Intent Relevance Gating
      // TIER 1: Paid/Trial (already queried above via business_profiles_chat_eligible)
      // TIER 2: Claimed-Free "Lite" (query always, append below paid, max 2)
      // TIER 3: Unclaimed Fallback (query based on browse mode OR intent relevance)
      
      // 🔒 REUSE intent + facet from top of function (computed once at line ~437)
      // detectedIntent and facet are already in scope
      const { detectBrowse } = await import('./intent-detector')
      
      // Detect browse mode
      // 🔒 TODO: Pass lastMode from ConversationState once we store it properly
      const browseMode = detectBrowse(userMessage, undefined)
      
      console.log(`🎯 Browse mode: ${browseMode.mode}, Intent: ${detectedIntent.hasIntent ? detectedIntent.categories.concat(detectedIntent.keywords).join(', ') || 'detected but no terms' : 'none'}`)
      
      // Query Tier 2: Claimed-Free businesses (already loaded from tier2)
      console.log('💼 Using Tier 2: Claimed-Free businesses (pre-loaded)')
      const MAX_TIER2_IN_TOP = 2
      const liteBusinesses = tier2.slice(0, MAX_TIER2_IN_TOP)
      
      console.log(`💼 Found ${liteBusinesses?.length || 0} Lite businesses`)
      
      // THREE-TIER LOGIC: Browse Fill + Intent Relevance Gating
      // (fallbackBusinesses and topMatchesText declared in outer scope)
      
      const TARGET_RESULTS = 8
      const MIN_RELEVANT_FOR_INTENT = 2
      const MIN_TIER1_TOP_SCORE = 3
      const MAX_TIER3_WHEN_PAID_RELEVANT = 2
      const MAX_TIER3_IN_MORE = 3
      
      // 🔒 REUSE businessRelevanceScores from top of function (already computed at line ~457)
      // Do NOT redeclare - that creates shadowing bugs
      
      if (browseMode.mode === 'browse' || browseMode.mode === 'browse_more') {
        // BROWSE MODE: Always fill with Tier 3
        console.log('📚 BROWSE MODE: Fetching Tier 3 to fill inventory')
        
        // Reset offset on new browse
        // 🔒 TODO: Track browseOffset in ConversationState, not conversationHistory
        const browseOffset = browseMode.mode === 'browse' ? 0 : 0
        
        const tier1Count = businesses?.length || 0
        const tier2Count = Math.min(liteBusinesses?.length || 0, MAX_TIER2_IN_TOP)
        const combinedCount = tier1Count + tier2Count
        
        if (combinedCount < TARGET_RESULTS) {
          const tier3Limit = TARGET_RESULTS - combinedCount
          
          // Use pre-loaded Tier 3 businesses (sorted by rating)
          fallbackBusinesses = tier3
            .sort((a, b) => {
              if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0)
              if (b.review_count !== a.review_count) return (b.review_count || 0) - (a.review_count || 0)
              return (a.business_name || '').localeCompare(b.business_name || '')
            })
            .slice(browseOffset, browseOffset + tier3Limit)
          
          // 🔒 TODO: Track browseOffset in ConversationState, not conversationHistory
          // (Pushing non-ChatMessage objects breaks OpenAI prompts)
          
          console.log(`📚 Filled with ${fallbackBusinesses.length} Tier 3 businesses (offset: ${browseOffset})`)
        }
        
      } else if (detectedIntent.hasIntent) {
        // INTENT MODE: Score relevance, fetch Tier 2 AND Tier 3 if needed
        const intentTerms = [...detectedIntent.categories, ...detectedIntent.keywords].join(', ')
        console.log(`🎯 INTENT MODE: Checking relevance for "${intentTerms}" (categories: ${detectedIntent.categories.length}, keywords: ${detectedIntent.keywords.length})`)
        
        // Score Tier 1
        const tier1WithScores = businesses.map(b => {
          const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet)
          businessRelevanceScores.set(b.id, score) // Store for carousel filtering
          return {
            ...b,
            tierPriority: 1,
            relevanceScore: score
          }
        })
        
        // ALWAYS score Tier 2 (for text filtering) even if we don't fetch Tier 3
        liteBusinesses.forEach(b => {
          const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet)
          businessRelevanceScores.set(b.id, score)
        })
        
        const tier1RelevantCount = tier1WithScores.filter(b => b.relevanceScore >= 2).length
        const maxTier1Score = Math.max(...tier1WithScores.map(b => b.relevanceScore), 0)
        
        const tier1HasEnoughRelevant = tier1RelevantCount >= MIN_RELEVANT_FOR_INTENT
        const tier1HasStrongTop = maxTier1Score >= MIN_TIER1_TOP_SCORE
        
        console.log(`🎯 Tier 1: ${tier1RelevantCount} relevant, max score: ${maxTier1Score}`)
        console.log(`🎯 hasEnoughRelevant: ${tier1HasEnoughRelevant}, hasStrongTop: ${tier1HasStrongTop}`)
        
        // Only skip Tier 2/3 if BOTH conditions met
        const shouldFetchLowerTiers = !tier1HasEnoughRelevant || !tier1HasStrongTop
        
        if (shouldFetchLowerTiers) {
          console.log(`🎯 Tier 1 weak - fetching Tier 2 AND Tier 3`)
          
          // Score Tier 2 (claimed-free Lite) for relevance
          const tier2WithScores = (liteBusinesses || [])
            .map(b => ({
              ...b,
              tierPriority: 2,
              relevanceScore: scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet),
              tierSource: 'tier2'
            }))
            .filter(b => b.relevanceScore > 0)
          
          console.log(`🎯 Tier 2: ${tier2WithScores.length} relevant claimed-free businesses`)
          
          // ✅ FIX: Score ALL Tier 3 businesses first, THEN filter by relevance
          const tier3WithScores = (tier3 || [])
            .map(b => ({
              ...b,
              tierPriority: 3,
              relevanceScore: scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet),
              tierSource: 'tier3'
            }))
          
          // ✅ DEBUG: Log all Tier 3 scores for "indian" query
          if (detectedIntent.categories.includes('indian')) {
            console.log(`🔍 DEBUG: Scoring ${tier3.length} Tier 3 businesses for "indian"`)
            const indianMatches = tier3WithScores.filter(b => b.relevanceScore > 0)
            console.log(`  Found ${indianMatches.length} relevant matches:`)
            indianMatches.slice(0, 5).forEach(b => {
              console.log(`    - ${b.business_name}: score=${b.relevanceScore}, category="${b.display_category}"`)
            })
          }
          
          // Filter for relevant businesses (score > 0)
          const tier3Relevant = tier3WithScores
            .filter(b => b.relevanceScore > 0)
            .sort((a, b) => {
              // Sort by relevance first, then rating
              if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore
              if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0)
              if (b.review_count !== a.review_count) return (b.review_count || 0) - (a.review_count || 0)
              return (a.business_name || '').localeCompare(b.business_name || '')
            })
          
          console.log(`🎯 Tier 3: ${tier3Relevant.length} relevant unclaimed businesses`)
          
          // Combine Tier 2 + Tier 3, sorted by TIER PRIORITY first, then relevance
          const allLowerTiers = [...tier2WithScores, ...tier3WithScores]
            .sort((a, b) => {
              // CRITICAL: Tier priority FIRST (spotlight → featured → starter → claimed → unclaimed)
              if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
              // Then by relevance score within tier
              return b.relevanceScore - a.relevanceScore
            })
          
          if (tier1HasEnoughRelevant) {
            // Tier 1 has enough relevant matches (2+) - lower tiers are just an assist
            // ✅ FIX: Also filter by relevanceScore > 0 here
            fallbackBusinesses = allLowerTiers
              .filter(b => b.relevanceScore > 0)
              .slice(0, MAX_TIER3_WHEN_PAID_RELEVANT)
            
            console.log(`🎯 Tier 1 has ${tier1RelevantCount} relevant - showing ${fallbackBusinesses.length} Tier 2/3 assist`)
            
          } else {
            // Tier 1 is genuinely irrelevant (< 2 relevant) - lower tiers dominate
            // ✅ FIX: Filter by relevanceScore > 0 BEFORE showing
            const lowerTiersTop = allLowerTiers
              .filter(b => b.relevanceScore > 0)
              .slice(0, 6)
            
            // CRITICAL: Put best Tier 2/3 in topMatchesText (shown first as text)
            topMatchesText = lowerTiersTop
            
            // Remaining goes to "more options" - use ID tracking to avoid .includes() bug
            const topIds = new Set(lowerTiersTop.map(b => b.id))
            fallbackBusinesses = allLowerTiers
              .filter(b => !topIds.has(b.id) && b.relevanceScore > 0) // ✅ FIX: Also filter by score
              .slice(0, MAX_TIER3_IN_MORE)
            
            console.log(`🎯 Tier 1 irrelevant - showing ${topMatchesText.length} Tier 2/3 as top matches`)
          }
          
          // 🔍 DEBUG HARNESS: Kids Menu Query Diagnostic (dev only)
          if (process.env.NODE_ENV === 'development' && userMessage.toLowerCase().includes('kids')) {
            console.log('\n' + '='.repeat(80))
            console.log('🔍 DEBUG HARNESS: Kids Menu Query Diagnostic')
            console.log('='.repeat(80))
            
            // Show KB content retrieved
            console.log(`\n📚 KB CONTENT RETRIEVED (${kbContentByBusinessId.size} businesses):`)
            const kbBusinesses = Array.from(kbContentByBusinessId.entries()).slice(0, 5)
            for (const [businessId, kbContent] of kbBusinesses) {
              const hasKidsInKB = kbContent.toLowerCase().includes('kids')
              const business = businessById.get(businessId)
              console.log(`  - ${business?.business_name || businessId}:`)
              console.log(`    Has "kids": ${hasKidsInKB ? '✅' : '❌'}`)
              console.log(`    Content preview: ${kbContent.substring(0, 120)}...`)
            }
            
            // Show all scored businesses across all tiers
            console.log(`\n🎯 SCORED BUSINESSES (Top 15 candidates):`)
            console.log('Rank | Business Name                | Tier | Priority | hasKB | kbKids | Score | Reasons           | Filtered?')
            console.log('-----|------------------------------|------|----------|-------|--------|-------|-------------------|----------')
            
            const allScoredBusinesses = [
              ...(tier1WithScores || []).map(b => ({ ...b, tierSource: 'tier1' })),
              ...(tier2WithScores || []).map(b => ({ ...b, tierSource: 'tier2' })),
              ...(tier3WithScores || []).map(b => ({ ...b, tierSource: 'tier3' }))
            ]
              .sort((a, b) => {
                if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
                return b.relevanceScore - a.relevanceScore
              })
              .slice(0, 15)
            
            allScoredBusinesses.forEach((b, index) => {
              const hasKB = kbContentByBusinessId.has(b.id)
              const kbContent = kbContentByBusinessId.get(b.id) || ''
              const kbMatchedKids = kbContent.toLowerCase().includes('kids')
              const filteredOut = b.relevanceScore === 0 ? '🚫 YES' : '✅ NO'
              const reasons = b.matchReasons?.join(', ') || 'N/A'
              
              console.log(`${String(index + 1).padStart(4)} | ${b.business_name.substring(0, 28).padEnd(28)} | ${b.tierSource.padEnd(4)} | ${String(b.tierPriority || '?').padStart(8)} | ${hasKB ? '✅' : '❌'.padEnd(5)} | ${kbMatchedKids ? '✅' : '❌'.padEnd(6)} | ${String(b.relevanceScore).padStart(5)} | ${reasons.substring(0, 17).padEnd(17)} | ${filteredOut}`)
            })
            
            console.log('='.repeat(80) + '\n')
          }
        } else {
          console.log(`✅ Tier 1 sufficient (${tier1RelevantCount} relevant, max score ${maxTier1Score})`)
        }
        
        // 🔒 DO NOT push mode into conversationHistory - it corrupts ChatMessage[] type
        // TODO: Store mode in ConversationState instead
        
      } else {
        // CONVERSATIONAL: Tier 1 only, no fill
        console.log('💬 CONVERSATIONAL MODE: Tier 1 only')
        // 🔒 DO NOT push mode into conversationHistory - it corrupts ChatMessage[] type
      }
      
      // STEP 3: Tier priority and exclusions
      // ✅ NO LONGER NEEDED: The view business_profiles_chat_eligible already filters out ineligible businesses
      // effective_tier is computed from subscriptions and is NEVER null for eligible businesses
      // If a business appears in this view, it's safe to show in chat
      
      // STEP 4: UI Mode classifier (deterministic carousel gating)
      // CRITICAL FIX: Carousel should NOT show on browse queries or when Tier 1 is irrelevant
      const msg = userMessage.toLowerCase()
      const wantsMap = /\b(map|atlas|on the map|pins|show.*location|where.*located)\b/.test(msg)
      
      // Extract unique business IDs (Tier 1 only) for carousel
      const uniqueBusinessIds = Array.from(new Set(businesses.map(b => b.id)))
      
      // Carousel gating: only show for specific intent with relevant Tier 1, or map mode
      // Check if any Tier 1 business scored high enough for carousel
      const tier1HasStrongMatch = uniqueBusinessIds.some(id => 
        (businessRelevanceScores.get(id) || 0) >= CAROUSEL_MIN
      )
      
      if (wantsMap) {
        uiMode = 'map'
        shouldAttachCarousel = false
      } else if (detectedIntent.hasIntent) {
        uiMode = 'conversational'
        shouldAttachCarousel = false
      } else if (browseMode.mode !== 'not_browse') {
        uiMode = 'suggestions'
        shouldAttachCarousel = false
      } else {
        uiMode = 'conversational'
        shouldAttachCarousel = false
      }
      // Carousel disabled: Tier 1 is test data only. Re-enable when real paid businesses exist.
      console.log(`🎨 UI Mode: ${uiMode}, carousel: OFF (disabled until real Tier 1 data)`)
      
      console.log(`🎨 UI Mode: ${uiMode}, shouldAttachCarousel: ${shouldAttachCarousel}`)
      
      // Helper: Calculate distance and walking time (used by all business display sections)
      const getDistanceInfo = (businessLat: number, businessLng: number, userLat?: number, userLng?: number) => {
        if (!userLat || !userLng) return null
        
        // Haversine formula for distance
        const R = 3959 // Earth radius in miles
        const dLat = (businessLat - userLat) * Math.PI / 180
        const dLon = (businessLng - userLng) * Math.PI / 180
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(userLat * Math.PI / 180) * Math.cos(businessLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        const distance = R * c
        
        // Calculate walking time (average 3 mph)
        const walkingMinutes = Math.round((distance / 3) * 60)
        
        if (distance < 0.1) {
          return "right around the corner"
        } else if (walkingMinutes <= 5) {
          return `just a ${walkingMinutes} min walk`
        } else if (walkingMinutes <= 15) {
          return `${walkingMinutes} min walk from you`
        } else if (distance < 1) {
          return `${distance.toFixed(1)} miles away`
        } else {
          return `${distance.toFixed(1)} miles from you`
        }
      }
      
      // STEP 5: Build final carousel (PAID-ONLY)
      // 🎯 MONETIZATION: Carousel cards are EXCLUSIVE to paid/trial tiers
      // Free tier (Tier 2 & 3) = text-only mentions (clear upsell incentive)
      // ✅ NO MORE OVERRIDE - AI writes the response using rich context!
      console.log(`✅ AI response used AS-IS (no override). Length: ${aiResponse.length} chars`)
      
      if (shouldAttachCarousel && uniqueBusinessIds.length > 0) {
        // Build Tier 1 carousel (Paid/Trial ONLY)
        const paidCarousel = uniqueBusinessIds
          .map(id => {
            const b = businessById.get(id)
            const vibes = vibesMap.get(id)
            return { business: b, vibes }
          })
          .filter(({ business }) => Boolean(business)) // Remove nulls
          .map(({ business: b, vibes }) => ({
            id: b!.id,
            business_name: b!.business_name,
            business_tagline: b!.business_tagline || undefined,
            system_category: b!.system_category || undefined,
            display_category: b!.display_category || b!.system_category || undefined,
            business_tier: b!.effective_tier || 'starter',
            tier_priority: b!.tier_priority || 999,
            vibes_positive_percentage: vibes?.positive_percentage,
            vibes_total: vibes?.total_vibes,
            business_address: b!.business_address || undefined,
            business_town: b!.business_town || city,
            logo: b!.logo || undefined,
            business_images: Array.isArray(b!.business_images) 
              ? b!.business_images 
              : (b!.business_images ? [b!.business_images] : undefined),
            rating: (b!.rating && b!.rating > 0) ? b!.rating : undefined,
            review_count: b!.review_count || undefined,
            offers_count: businessOfferCounts[b!.id] || 0,
            // ✅ ATLAS CRITICAL: Add location & contact fields
            latitude: b!.latitude,
            longitude: b!.longitude,
            phone: b!.phone || undefined,
            website_url: b!.website_url || undefined,
            google_place_id: b!.google_place_id || undefined
          }))
        
        // Sort Tier 1 by tier_priority, then vibes (within-tier), then rating, then offers
        // 💚 Vibes influence ranking WITHIN tiers (Pick, Featured, Starter), not across tiers
        paidCarousel.sort((a, b) => {
          // 1. Tier priority (spotlight > featured > starter)
          if (a.tier_priority !== b.tier_priority) return a.tier_priority - b.tier_priority
          
          // 2. Vibes (within same tier) - only if both have 5+ vibes
          const aVibes = (a.vibes_total && a.vibes_total >= 5) ? (a.vibes_positive_percentage ?? 0) : 0
          const bVibes = (b.vibes_total && b.vibes_total >= 5) ? (b.vibes_positive_percentage ?? 0) : 0
          if (bVibes !== aVibes) return bVibes - aVibes
          
          // 3. Google rating
          const ar = a.rating ?? 0
          const br = b.rating ?? 0
          if (br !== ar) return br - ar
          
          // 4. Offers count
          return (b.offers_count ?? 0) - (a.offers_count ?? 0)
        })
        
        // Carousel = PAID ONLY (Tier 1)
        // Filter carousel by relevance: STRICT — only show Tier 1 businesses
        // that genuinely match the intent (score >= CAROUSEL_MIN).
        // No fallback to lower thresholds. If Tier 1 doesn't match, no carousel.
        if (detectedIntent.hasIntent && businessRelevanceScores.size > 0) {
          const filtered = paidCarousel.filter(b => {
            const score = businessRelevanceScores.get(b.id) || 0
            if (score >= CAROUSEL_MIN) {
              console.log(`  ✅ Carousel: ${b.business_name} score=${score}`)
            } else {
              console.log(`  ❌ Carousel skip: ${b.business_name} score=${score} (need ${CAROUSEL_MIN}+)`)
            }
            return score >= CAROUSEL_MIN
          })
          
          businessCarousel = filtered.slice(0, 6)
          
          if (businessCarousel.length > 0) {
            console.log(`🎯 Carousel: ${businessCarousel.length} businesses scored ${CAROUSEL_MIN}+: ${businessCarousel.map(b => b.business_name).join(', ')}`)
          } else {
            console.log(`🎯 No Tier 1 businesses match intent — carousel disabled, Tier 2/3 text only`)
            shouldAttachCarousel = false
          }
        } else if (!detectedIntent.hasIntent) {
          // No specific intent (browse/general) — show top Tier 1 by tier priority
          businessCarousel = paidCarousel.slice(0, 6)
        } else {
          businessCarousel = []
          shouldAttachCarousel = false
        }
        
        // Tier 2 & 3: TEXT-ONLY mentions (no carousel cards)
        // This creates clear upsell incentive: want carousel? upgrade!
        
        // --- DEDUPE: Build slug -> ID lookup from all tier businesses ---
        const slugToId = new Map<string, string>()
        const allTierBusinesses = [
          ...(tier1 || []),
          ...(tier2 || []),
          ...(tier3 || [])
        ]
        
        for (const b of allTierBusinesses) {
          const id = String(b.id)
          const slug = getBusinessSlug(b)
          slugToId.set(slug, id)
        }
        
        // 🚨 CRITICAL: Track which businesses we've already appended to text to prevent duplicates
        // Now seeded with AI-mentioned businesses (validated against real inventory)
        
        // Validate raw slugs against slugToId to prevent false matches (e.g., literal "slug")
        const validMentionedSlugs = new Set<string>()
        const invalidSlugs: string[] = []
        
        for (const slug of mentionedSlugs) {
          if (slugToId.has(slug)) {
            validMentionedSlugs.add(slug)
          } else {
            invalidSlugs.push(slug)
          }
        }
        
        if (process.env.NODE_ENV === 'development' && invalidSlugs.length > 0) {
          console.warn(`⚠️  [DEDUPE] Invalid AI-linked slugs (not in slugToId): ${invalidSlugs.join(', ')}`)
        }
        
        // Use VALID slugs for everything after this point
        const aiMentionedCount = validMentionedSlugs.size
        
        const appendedBusinessIds = new Set<string>()
        for (const slug of validMentionedSlugs) {
          const id = slugToId.get(slug)!  // Safe: already validated
          appendedBusinessIds.add(id)
        }
        
        if (process.env.NODE_ENV === 'development' && validMentionedSlugs.size > 0) {
          console.log(`🔍 [DEDUPE] AI mentioned ${validMentionedSlugs.size} valid business links: ${Array.from(validMentionedSlugs).join(', ')}`)
        }
        
        // --- GATE: Skip Tier2/3 injection if AI already listed 2+ businesses ---
        const shouldInjectSupplemental = aiMentionedCount < 2
        
        // 🚨 SOPHISTICATED TIER 2/3 GATE (not just "discovery query")
        // 
        // RULE: Only show Tier 2/3 if:
        // 1. User asked a browse/list query ("best places", "anywhere", "recommend"), OR
        // 2. We have relevance evidence (KB matches, category matches)
        //
        // DON'T show if:
        // - No intent detected (intent = none)
        // - AND no semantic/KB evidence (all scores = 0)
        // - This prevents "Triangle spam on every response"
        
        const isBrowseQuery = browseMode.mode === 'browse'
        const hasEvidence = businessRelevanceScores.size > 0 && 
          Array.from(businessRelevanceScores.values()).some(score => score >= INJECT_MIN)
        
        const shouldShowTier2 = isBrowseQuery || hasEvidence
        
        console.log(`🔍 Tier 2/3 gate: browse=${isBrowseQuery}, evidence=${hasEvidence}, show=${shouldShowTier2}`)
        
        if (liteBusinesses && liteBusinesses.length > 0 && shouldShowTier2) {
          // Filter Tier 2 by relevance - STRICT GATE
          let filteredLiteBusinesses = liteBusinesses
          
          // Tier 2 injection should NEVER depend on detectedIntent.hasIntent.
          // It should depend on whether we have any relevance evidence for this query.
          const hasAnyRelevant =
            Array.from(businessRelevanceScores.values()).some((s) => (s || 0) > 0)

          if (isBrowseQuery) {
            // TRUE browse intent (e.g. "show me restaurants", "qwikker picks")
            filteredLiteBusinesses = liteBusinesses
            console.log(`🎯 Browse mode: showing all ${filteredLiteBusinesses.length} Tier 2 businesses`)
          } else if (hasAnyRelevant) {
            // SPECIFIC query mode: only inject Tier2 if it is also relevant
            filteredLiteBusinesses = liteBusinesses.filter((b) => {
              const score = businessRelevanceScores.get(b.id) || 0
              return score >= 1
            })
            console.log(
              `🎯 Specific query filter: ${filteredLiteBusinesses.length} of ${liteBusinesses.length} Tier 2 businesses have score >= 1`
            )
          } else {
            // No evidence found for a specific query — do NOT inject random Tier2
            filteredLiteBusinesses = []
            console.log(`🎯 No relevant businesses found for specific query: skipping Tier 2`)
          }
          
          // --- DEDUPE: Filter out businesses AI already mentioned ---
          if (!shouldInjectSupplemental) {
            // Don't inject Tier2/Tier3 when AI already did a multi-result answer
            filteredLiteBusinesses = []
            if (process.env.NODE_ENV === 'development') {
              console.log(`🎯 [DEDUPE] AI already mentioned ${aiMentionedCount} businesses → skipping Tier2/Tier3 injection`)
            }
          } else {
            // Filter out AI-mentioned businesses
            filteredLiteBusinesses = (filteredLiteBusinesses || []).filter(b => !appendedBusinessIds.has(String(b.id)))
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 [DEDUPE] Tier2 after AI-dedupe: ${filteredLiteBusinesses.length}`)
            }
          }
          
          if (filteredLiteBusinesses.length > 0) {
            const liteIntros = [
              "Also worth checking out:",
              "A couple more options:",
              "Worth a look:",
            ]
            let liteText = liteIntros[Math.floor(Math.random() * liteIntros.length)] + `\n\n`
            
            filteredLiteBusinesses.slice(0, 3).forEach((b) => {
            appendedBusinessIds.add(String(b.id))
            
            const businessSlug = getBusinessSlug(b)
            
            liteText += `**[${b.business_name}](/user/business/${businessSlug})**`
            if (b.display_category) {
              liteText += ` — ${b.display_category}`
            }
            
            if (b.rating && b.rating > 0 && b.review_count) {
              liteText += ` (${b.rating}★ from ${b.review_count} reviews)`
            }
            
            if (b.menu_preview && Array.isArray(b.menu_preview) && b.menu_preview.length > 0) {
              liteText = appendSentence(liteText, `${b.menu_preview.length} featured menu items`)
            }
            
            if (b.approved_offers_count && b.approved_offers_count > 0) {
              liteText = appendSentence(liteText, `${b.approved_offers_count} offer${b.approved_offers_count === 1 ? '' : 's'} available`)
            }
            
            if (b.latitude && b.longitude && context.userLocation) {
              const distanceText = getDistanceInfo(b.latitude, b.longitude, context.userLocation.latitude, context.userLocation.longitude)
              if (distanceText) {
                liteText = appendSentence(liteText, distanceText.charAt(0).toUpperCase() + distanceText.slice(1))
              }
            }
            
            liteText += `\n\n`
            })
            
            aiResponse = aiResponse.trimEnd() + '\n\n' + liteText.trim()
          }
        }
        
        // Show fallbackBusinesses if they exist and are relevant
        // 🚨 SAME SOPHISTICATED GATE as Tier 2
        if (fallbackBusinesses && fallbackBusinesses.length > 0 && shouldShowTier2) {
          // 🚨 FIX: Filter Tier 3 by relevance too (same as Tier 2)
          let filteredFallbackBusinesses = fallbackBusinesses
          
          // --- DEDUPE: Filter out businesses AI already mentioned + Tier 2 appended ---
          if (!shouldInjectSupplemental) {
            // Don't inject Tier3 when AI already did a multi-result answer
            filteredFallbackBusinesses = []
            if (process.env.NODE_ENV === 'development') {
              console.log(`🎯 [DEDUPE] AI already mentioned ${aiMentionedCount} businesses → skipping Tier3 injection`)
            }
          } else {
            // First, remove any businesses already appended in AI response or Tier 2
            filteredFallbackBusinesses = filteredFallbackBusinesses.filter(b => !appendedBusinessIds.has(String(b.id)))
            console.log(`🚨 Deduplicated Tier 3: ${filteredFallbackBusinesses.length} of ${fallbackBusinesses.length} (removed ${fallbackBusinesses.length - filteredFallbackBusinesses.length} duplicates)`)
          }
          
          // STRICT FILTER: Same as Tier 2 (use relevance evidence, not hasIntent)
          const hasAnyRelevantTier3 =
            Array.from(businessRelevanceScores.values()).some((s) => (s || 0) > 0)

          if (isBrowseQuery) {
            // TRUE browse intent (e.g. "show me restaurants", "qwikker picks")
            console.log(`🎯 Browse mode: showing ${filteredFallbackBusinesses.length} Tier 3 businesses`)
          } else if (hasAnyRelevantTier3) {
            // SPECIFIC query mode: only inject Tier3 if it is also relevant
            filteredFallbackBusinesses = filteredFallbackBusinesses.filter((b) => {
              const score = businessRelevanceScores.get(b.id) || 0
              return score >= 1
            })
            console.log(
              `🎯 Specific query filter: ${filteredFallbackBusinesses.length} Tier 3 businesses have score >= 1`
            )
          } else {
            // No evidence found for a specific query — do NOT inject random Tier3
            filteredFallbackBusinesses = []
            console.log(`🎯 No relevant businesses found for specific query: skipping Tier 3`)
          }
          
          // Only show if we have relevant businesses
          if (filteredFallbackBusinesses.length === 0) {
            console.log(`🎯 Skipping Tier 3 text: no relevant fallback businesses`)
          }
          
          if (filteredFallbackBusinesses.length > 0) {
            fallbackBusinesses = filteredFallbackBusinesses
            
            const MAX_TIER3_INJECT = 6
            const neutralIntros = [
              "A few more options:",
              "Also in the area:",
              "You might also like:",
            ]
            let fallbackText = neutralIntros[Math.floor(Math.random() * neutralIntros.length)] + `\n\n`
            
            fallbackBusinesses.slice(0, MAX_TIER3_INJECT).forEach((b) => {
              const businessSlug = getBusinessSlug(b)
              
              fallbackText += `**[${b.business_name}](/user/business/${businessSlug})**`
              
              if (b.display_category) {
                fallbackText += ` — ${b.display_category}`
              }
              
              if (b.rating && b.review_count) {
                fallbackText += ` (${b.rating}★ from ${b.review_count} reviews)`
              }
              
              if (b.latitude && b.longitude && context.userLocation) {
                const distanceText = getDistanceInfo(b.latitude, b.longitude, context.userLocation.latitude, context.userLocation.longitude)
                if (distanceText) {
                  fallbackText = appendSentence(fallbackText, distanceText.charAt(0).toUpperCase() + distanceText.slice(1))
                }
              }
              
              fallbackText += `\n\n`
            })
            
            fallbackText += `_Ratings and reviews provided by Google_`
            
            aiResponse = aiResponse.trimEnd() + '\n\n' + fallbackText.trim()
          }
        }
        
        console.log(`🗺️ Built three-tier response:`)
        console.log(`   - Tier 1 (Paid) Carousel: ${paidCarousel.length} cards`)
        console.log(`   - Tier 2 (Lite) Text: ${liteBusinesses?.length || 0} mentions`)
        console.log(`   - Tier 3 (Fallback) Text: ${fallbackBusinesses.length} mentions`)
        
      } else {
        console.log(`🗺️ Business results available but carousel gated (no list query)`)
      }
    }
    
    // ✅ LEGAL COMPLIANCE: Review text removed per Google ToS
    // We still show rating + review_count + link to Google Maps in business cards
    
    // 🗺️ ATLAS: Build mapPins array (ONLY relevant businesses for the query)
    // CRITICAL: Only build mapPins if we're actually showing businesses (carousel OR text mentions)
    // Don't show Atlas CTA for conversational responses like "thanks" that have no business context
    const mapPins: ChatResponse['mapPins'] = []
    const addedIds = new Set<string>()
    
    // Only populate mapPins if we have business results to show
    const shouldBuildMapPins = (businessCarousel && businessCarousel.length > 0) || 
                               (topMatchesText && topMatchesText.length > 0) ||
                               (fallbackBusinesses && fallbackBusinesses.length > 0)
    
    // Determine if this is browse mode for reason tagging
    const isBrowseModeForReasons = !detectedIntent.hasIntent
    
    // ✅ Helper: Safely get reasonMeta (always returns valid object, never undefined)
    const safeGetReasonMeta = (business: any, userLoc: any) => {
      try {
        const meta = getReasonMeta(business, userLoc)
        return meta || { isOpenNow: false, distanceMeters: null, ratingBadge: null }
      } catch (error) {
        console.warn('⚠️ getReasonMeta failed, using fallback:', error)
        return { isOpenNow: false, distanceMeters: null, ratingBadge: null }
      }
    }
    
    // ✅ Combine all businesses for relative ranking
    const allBusinessesForRanking = [
      ...(tier1 || []),
      ...(tier2 || []),
      ...(tier3 || [])
    ]
    
    if (shouldBuildMapPins) {
      // 🚨 FIX: Use sortedForContext (relevance-filtered) instead of ALL businesses
      // This ensures Atlas shows ONLY relevant results (e.g. Greek query => only Greek pins)
      const relevantBusinessesForAtlas = sortedForContext.slice(0, 25) // Cap at 25 for performance
      
      // Optimization: Build tier ID sets once for O(1) lookup (important for large cities)
      const tier1Ids = new Set((tier1 || []).map((b: any) => b.id))
      const tier2Ids = new Set((tier2 || []).map((b: any) => b.id))
      
      relevantBusinessesForAtlas.forEach((b: any) => {
        if (b.latitude && b.longitude && !addedIds.has(b.id)) {
          // Determine tier from business data (O(1) Set lookup)
          let businessTier: 'paid' | 'claimed_free' | 'unclaimed' = 'unclaimed'
          if (tier1Ids.has(b.id)) {
            businessTier = 'paid'
          } else if (tier2Ids.has(b.id)) {
            businessTier = 'claimed_free'
          }
          
          mapPins.push({
            id: b.id,
            business_name: b.business_name,
            latitude: b.latitude,
            longitude: b.longitude,
            rating: b.rating,
            review_count: b.review_count,
            display_category: b.display_category,
            business_tier: businessTier,
            phone: b.phone,
            website_url: b.website_url,
            google_place_id: b.google_place_id,
            reason: getReasonTag(
              b,
              detectedIntent,
              businessRelevanceScores.get(b.id) || 0,
              context.userLocation,
              isBrowseModeForReasons,
              allBusinessesForRanking // ✅ Pass all businesses for relative ranking
            ),
            reasonMeta: safeGetReasonMeta(b, context.userLocation) // ✅ Always present
          })
          addedIds.add(b.id)
        }
      })
    
    } // End of shouldBuildMapPins
    
    const paidCount = mapPins.filter(p => p.business_tier === 'paid').length
    const claimedFreeCount = mapPins.filter(p => p.business_tier === 'claimed_free').length
    const unclaimedCount = mapPins.filter(p => p.business_tier === 'unclaimed').length
    
    if (shouldBuildMapPins) {
      // Accurate log label: "intent pins" vs "browse pins"
      const pinType = detectedIntent.hasIntent ? 'intent pins' : 'browse pins'
      console.log(`🗺️ ATLAS MAP PINS: ${mapPins.length} ${pinType} (${paidCount} paid, ${claimedFreeCount} claimed-free, ${unclaimedCount} unclaimed)`)
      if (process.env.NODE_ENV === 'development' && mapPins.length > 0) {
        const firstFive = mapPins.slice(0, 5).map(p => p.business_name).join(', ')
        console.log(`🗺️ [ATLAS] First 5 pins: ${firstFive}`)
        console.log(`🗺️ [ATLAS] Mode: ${detectedIntent.hasIntent ? `intent (${detectedIntent.categories.join(', ')})` : 'browse'}`)
      }
    } else {
      console.log(`🗺️ ATLAS MAP PINS: Skipped (no business results to show)`)
    }
    
    // --- DEV-ONLY: Duplicate link detection (cheap insurance) ---
    if (process.env.NODE_ENV === 'development') {
      const finalLinkRegex = /\/user\/business\/([a-z0-9-]+)/g
      const finalSlugs: string[] = []
      let m: RegExpExecArray | null
      while ((m = finalLinkRegex.exec(aiResponse)) !== null) {
        finalSlugs.push(m[1])
      }
      
      const uniqueSlugs = new Set(finalSlugs)
      if (finalSlugs.length !== uniqueSlugs.size) {
        const duplicates = finalSlugs.filter((slug, idx) => finalSlugs.indexOf(slug) !== idx)
        console.warn(`⚠️  [DUPLICATE LINKS] Found ${finalSlugs.length} links but only ${uniqueSlugs.size} unique. Duplicates: ${Array.from(new Set(duplicates)).join(', ')}`)
      }
    }
    
    // NOTE: Final paragraph formatting moved to route.ts (after Atlas stripping)
    // This ensures formatting is preserved and happens as the absolute last step
    
    // 🧠 STEP 2: UPDATE CURRENT BUSINESS FROM AI RESPONSE
    // Parse AI response for business links - for debugging only
    // (DB has no slug column - we cannot query by slug)
    const mentionedSlugsInResponse = [...aiResponse.matchAll(/\*\*\[[^\]]+\]\(\/user\/business\/([a-z0-9-]+)\)\*\*/g)].map(m => m[1])
    
    if (mentionedSlugsInResponse.length > 0 && process.env.NODE_ENV !== 'production') {
      console.log(`🧠 [STATE DEBUG] AI mentioned slugs: ${mentionedSlugsInResponse.join(', ')} (cannot persist via DB)`)
    }
    
    return {
      success: true,
      response: aiResponse,
      sources,
      uiMode, // Explicit UI mode for carousel gating
      hasBusinessResults, // For "Qwikker Atlas" CTA without carousel spam
      businessCarousel, // Only populated when user asks for list/map
      walletActions,
      eventCards,
      mapPins, // ✅ ATLAS: ALL businesses for map (paid cyan + unclaimed grey)
      queryCategories: detectedIntent.categories, // ✅ ATLAS: For filtering businesses by query
      queryKeywords: detectedIntent.keywords, // ✅ ATLAS: For filtering businesses by query
      modelUsed: modelToUse,
      classification,
      metadata: {
        atlasAvailable, // Server-computed flag: true if 2+ candidates have valid coords
        coordsCandidateCount: (candidatesForAtlas || []).filter(hasValidCoords).length,
        currentBusinessId: state.currentBusiness?.id ?? null, // For state-aware footer logic
        currentBusinessSlug: null // DB has no slug column - always null
      }
    }

  } catch (error) {
    console.error('❌ Hybrid chat error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Generate business detail response from hidden ID-based request
 */
async function generateBusinessDetailResponse(
  businessId: string,
  context: ChatContext,
  openai: OpenAI,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  console.log(`🔍 Generating detail response for business ID: ${businessId}`)
  
  // ✅ TENANT SAFETY: Pass city to ensure correct tenant context
  const supabase = await createTenantAwareServerClient(context.city)
  
  // SECURITY: UUID validation first
  if (!isValidUUID(businessId)) {
    console.error(`❌ Invalid business ID: ${businessId}`)
    return {
      success: false,
      error: 'Invalid business ID'
    }
  }
  
  // Fetch business (allow cross-city for "More details" from Atlas)
  const { data: business, error} = await supabase
    .from('business_profiles')
    .select('*')
    .eq('id', businessId)
    // ✅ REMOVED: .eq('city', context.city) to allow cross-city details
    .single()
  
  if (error || !business) {
    console.error(`❌ Business not found: ${businessId}`, error)
    return {
      success: false,
      error: 'Business not found'
    }
  }
  
  console.log(`✅ Found business: ${business.business_name}`)
  
  // Build detail context
  const detailLines = [
    `Business: ${business.business_name}`,
    `Category: ${business.display_category || business.system_category || 'Local business'}`,
    business.business_tagline ? `Tagline: ${business.business_tagline}` : null,
    business.rating && business.review_count ? 
      `Rating: ${business.rating}★ from ${business.review_count} Google reviews` : null,
    business.business_address ? `Location: ${business.business_address}` : null,
    business.phone ? `Phone: ${business.phone}` : null,
    business.website_url ? `Website: ${business.website_url}` : null,
    business.business_hours ? `Hours: ${business.business_hours}` : null
  ].filter(Boolean).join('\n')
  
  // ✅ CONTEXT: Include recent conversation history for smarter responses
  const recentHistory = conversationHistory
    .filter(m => !m.content?.startsWith('__qwikker_')) // Strip hidden commands
    .slice(-6)
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  
  // Generate concise AI response
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful local guide. Be concise, friendly, and factual. Only use provided data. No hallucinations.' 
        },
        ...recentHistory, // ✅ Include conversation context
        { 
          role: 'user', 
          content: `User wants details about ${business.business_name}.\n\n${detailLines}\n\nGenerate a 2-3 sentence response highlighting:\n1. What makes this place worth visiting\n2. Key practical info\n3. End with a helpful question or suggestion\n\nNo hallucinations. Use only the provided data.` 
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    })
    
    const aiResponse = completion.choices[0].message.content || 
      `${business.business_name} is a ${business.display_category || 'local business'} with ${business.rating}★ rating. Want directions?`
    
    console.log(`✅ Generated detail response for ${business.business_name}`)
    
    return {
      success: true,
      response: aiResponse,
      businessCarousel: [{
        id: business.id,
        business_name: business.business_name,
        business_tagline: business.business_tagline,
        system_category: business.system_category,
        display_category: business.display_category,
        business_tier: business.business_tier || 'unclaimed',
        tier_priority: 99, // Fallback priority
        business_address: business.business_address,
        business_town: business.business_town,
        logo: business.logo,
        business_images: business.business_images,
        rating: business.rating,
        review_count: business.review_count,
        latitude: business.latitude,
        longitude: business.longitude,
        phone: business.phone,
        website_url: business.website_url,
        google_place_id: business.google_place_id
      }],
      modelUsed: 'gpt-4o-mini',
      classification: { complexity: 'simple', queryType: 'business_detail', requiresKB: false }
    }
  } catch (error) {
    console.error(`❌ Error generating detail response:`, error)
    
    // Fallback: return basic info without AI enhancement
    return {
      success: true,
      response: `${business.business_name} is located at ${business.business_address || 'this location'}. ${business.rating ? `Rated ${business.rating}★ on Google.` : ''} Want directions?`,
      businessCarousel: [{
        id: business.id,
        business_name: business.business_name,
        business_tagline: business.business_tagline,
        system_category: business.system_category,
        display_category: business.display_category,
        business_tier: business.business_tier || 'unclaimed',
        tier_priority: 99,
        business_address: business.business_address,
        business_town: business.business_town,
        logo: business.logo,
        business_images: business.business_images,
        rating: business.rating,
        review_count: business.review_count,
        latitude: business.latitude,
        longitude: business.longitude,
        phone: business.phone,
        website_url: business.website_url,
        google_place_id: business.google_place_id
      }],
      modelUsed: 'gpt-4o-mini',
      classification: { complexity: 'simple', queryType: 'business_detail', requiresKB: false }
    }
  }
}

/**
 * Extract business names from text (simplified for state tracking)
 */
/**
 * Extract business names from AI response by parsing markdown links
 * Used for conversation state tracking (which businesses were mentioned)
 * Dynamic: works with any business that has a properly formatted link
 */
function extractBusinessNamesFromText(text: string): string[] {
  // Match pattern: **[Business Name](/user/business/slug)**
  const matches = [...text.matchAll(/\*\*\[([^\]]+)\]\(\/user\/business\/[a-z0-9-]+\)\*\*/g)]
  return matches.map(m => m[1])
}

