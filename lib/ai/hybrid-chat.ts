/**
 * Hybrid AI Chat System
 * Routes queries to GPT-4o-mini (cheap) or GPT-4o (smart) based on complexity
 */

import OpenAI from 'openai'
import { searchBusinessKnowledge, searchCityKnowledge } from './embeddings'
import { classifyQueryIntent, logClassification } from './intent-classifier'
import { detectIntent } from './intent-detector'
import { scoreBusinessRelevance } from './relevance-scorer'
import { detectFacet, isAlcoholCapableCategory } from './facets'
import { getReasonTag, getReasonMeta } from './reason-tagger'
import { 
  ConversationState, 
  createInitialState, 
  updateConversationState, 
  generateStateContext 
} from './conversation-state'
import { createTenantAwareServerClient } from '@/lib/utils/tenant-security'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isFreeTier, isAiEligibleTier, getTierPriority } from '@/lib/atlas/eligibility'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'
import { normalizeLocation, calculateDistance, isValidUUID } from '@/lib/utils/location'
import { getBusinessVibeStats } from '@/lib/utils/vibes'
import { getOpenStatusForToday } from '@/lib/utils/opening-hours'
import { logAIUsage } from './usage-tracker'

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
    slug?: string
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
  /** Server-suggested chips (client may navigate or send as follow-up) */
  quickReplies?: string[]
  walletActions?: Array<{
    type: 'save_offer'
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
    businessSlug?: string | null
    activationWindowMinutes?: number
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
    slug?: string
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
    hasLoyalty?: boolean
    loyaltyReward?: string
    loyaltyThreshold?: number
    userStamps?: number
    userStampsRemaining?: number
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
  contextBusinesses?: Array<{ business_name: string; id: string }> // Businesses sent to AI context (for link injection fallback)
  queryCategories?: string[] // ✅ ATLAS: Categories detected in query (for filtering businesses)
  queryKeywords?: string[] // ✅ ATLAS: Keywords detected in query (for filtering businesses)
  metadata?: {
    atlasAvailable?: boolean // Server-computed: true if 2+ relevant businesses have valid coords
    coordsCandidateCount?: number // Number of candidates with valid coordinates
    currentBusinessId?: string | number | null // Current business ID for state-aware footer
    currentBusinessSlug?: string | null // Current business slug for detail-mode fetch
    mode?: string
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
    // Enriched featured items — so dish tokens exist in inventory vocabulary
    if (Array.isArray(b.menu_preview)) {
      for (const item of b.menu_preview) {
        addPhrase(item?.name)
        addPhrase(item?.description)
      }
    }
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
  if (b?.latitude == null || b?.longitude == null) return false
  const lat = Number(b.latitude)
  const lng = Number(b.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
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

/** Normalize for name matching — strips & / punctuation so "Bar & Restaurant" ≈ "Bar Restaurant". */
function normalizeSpokenBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SPOKEN_NAME_GENERIC = new Set([
  'restaurant', 'restaurants', 'bar', 'bars', 'cafe', 'cafes', 'grill', 'bistro',
  'pub', 'lounge', 'house', 'the', 'and', 'club', 'night', 'hotel', 'resort',
  'beach', 'spa', 'shop', 'store', 'place', 'spot', 'food', 'kitchen',
])

/** Cheap edit-distance for unique typo matching (short strings only). */
function spokenNameEditDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const rows = a.length + 1
  const cols = b.length + 1
  const dist: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let i = 0; i < rows; i++) dist[i][0] = i
  for (let j = 0; j < cols; j++) dist[0][j] = j
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost
      )
    }
  }
  return dist[a.length][b.length]
}

/**
 * Resolve a spoken business name against inventory (all tiers).
 * Conservative: exact → unique substring/token → unique high-confidence typo.
 * Ambiguous / weak matches return null so discovery is not hijacked.
 */
function findBusinessBySpokenName(queryName: string, businesses: any[]): any | null {
  const targetNorm = normalizeSpokenBusinessName(queryName)
  if (!targetNorm) return null
  const targetSlug = slugifyBusinessName(queryName)
  const targetTokens = targetNorm.split(' ').filter((t) => t.length >= 2 && !SPOKEN_NAME_GENERIC.has(t))

  // Too generic alone ("beach club", "best beach") — never lock
  if (targetTokens.length === 0) return null

  type Scored = { biz: any; score: number }
  const scored: Scored[] = []

  for (const biz of businesses) {
    const name = typeof biz?.business_name === 'string' ? biz.business_name : ''
    if (!name) continue
    const nameNorm = normalizeSpokenBusinessName(name)
    const nameSlug = slugifyBusinessName(name)
    const bizTokens = nameNorm.split(' ').filter((t) => t.length >= 2)

    let score = 0
    if (nameNorm === targetNorm || nameSlug === targetSlug) {
      score = 100
    } else if (
      targetNorm.length >= 5 &&
      (nameNorm.startsWith(targetNorm + ' ') ||
        nameNorm.includes(' ' + targetNorm + ' ') ||
        nameNorm.endsWith(' ' + targetNorm) ||
        nameNorm === targetNorm)
    ) {
      // Query is a distinctive prefix/substring of the full name (e.g. "kibanda beach")
      score = 90
    } else if (
      targetNorm.length >= 8 &&
      nameNorm.includes(targetNorm) &&
      targetTokens.length >= 2
    ) {
      score = 85
    } else if (targetTokens.length >= 2) {
      const exactMatched = targetTokens.filter((t) => bizTokens.some((bt) => bt === t))
      const fuzzyMatched = targetTokens.filter(
        (t) =>
          !exactMatched.includes(t) &&
          bizTokens.some((bt) => bt === t || (t.length >= 4 && bt.startsWith(t)))
      )
      // Exact token alignment wins (CHE Rock Bar vs Cheetah's Rock for "che rock bar")
      if (exactMatched.length === targetTokens.length) score = 95
      else if (exactMatched.length >= 2 && exactMatched.length + fuzzyMatched.length === targetTokens.length)
        score = 85
      else if (exactMatched.length + fuzzyMatched.length === targetTokens.length && exactMatched.length >= 1)
        score = 75
      else if (exactMatched.length >= 2) score = 60 + exactMatched.length * 5
      else if (fuzzyMatched.length >= 2) score = 55
    } else if (targetTokens.length === 1 && targetTokens[0].length >= 6) {
      const tok = targetTokens[0]
      // Single distinctive token: only exact token hit on a unique business (scored later)
      if (bizTokens.some((bt) => bt === tok)) score = 70
      else if (bizTokens.some((bt) => bt.startsWith(tok) || tok.startsWith(bt))) score = 60
    }

    // Unique high-confidence typo (edit distance 1–2 on full normalized name)
    if (score === 0 && targetNorm.length >= 8 && nameNorm.length >= 8) {
      const d = spokenNameEditDistance(targetNorm, nameNorm)
      const maxD = targetNorm.length >= 12 ? 2 : 1
      if (d > 0 && d <= maxD) score = 75
    }

    if (score > 0) scored.push({ biz, score })
  }

  if (scored.length === 0) return null
  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  const tied = scored.filter((s) => s.score === top.score)
  if (tied.length > 1) return null // ambiguous — do not lock

  // Single-token / weaker matches need higher bar
  if (top.score < 70 && targetTokens.length < 2) return null
  if (top.score < 55) return null

  return top.biz
}

/**
 * Extract a bare / named-ask target from the user message when they are asking
 * about a specific venue without saying "tell me about".
 * Returns null for discovery / category queries.
 */
function extractBareNameAskTarget(userMessage: string): string | null {
  const trimmed = userMessage.trim().replace(/[\?\!\.]+$/g, '').trim()
  if (!trimmed) return null

  const discoveryStart =
    /^(show|find|list|where|what|who|how|when|recommend|suggest|any|best|near|all|looking for|i want|i need|are there|is there)\b/i
  if (discoveryStart.test(trimmed)) return null

  // "Is Kibanda Beach Club listed?" / "is Kibanda on qwikker?"
  const isListed = trimmed.match(
    /^is\s+(.+?)\s+(listed|on qwikker|available|in (the )?(app|guide)|active)\b/i
  )
  if (isListed?.[1]) return isListed[1].trim()

  // "details on Kibanda" / "info about Kibanda Beach Club"
  const detailsOn = trimmed.match(/^(details|info|information)\s+(on|about|for)\s+(.+)$/i)
  if (detailsOn?.[3]) return detailsOn[3].trim()

  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 8) return null

  // Reject pure category phrases
  const norm = normalizeSpokenBusinessName(trimmed)
  const tokens = norm.split(' ').filter((t) => t.length >= 2 && !SPOKEN_NAME_GENERIC.has(t))
  if (tokens.length === 0) return null

  // Looks like a proper name / venue title (has a distinctive token)
  return trimmed
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
 * Derive cuisine/type labels that actually exist in the current inventory.
 * Used for clarify-first prompts — never invent types the city doesn't have.
 */
function deriveAvailableTypes(businesses: any[], limit = 5): string[] {
  const cuisineHints: Array<{ label: string; patterns: RegExp[] }> = [
    { label: 'Pizza', patterns: [/pizza/i] },
    { label: 'Seafood', patterns: [/seafood|fish|sushi/i] },
    { label: 'Italian', patterns: [/italian|pasta|trattoria/i] },
    { label: 'Indian', patterns: [/indian|tandoori|curry house/i] },
    { label: 'Thai', patterns: [/thai/i] },
    { label: 'Chinese', patterns: [/chinese|dim\s*sum/i] },
    { label: 'Japanese', patterns: [/japanese|ramen|sushi/i] },
    { label: 'Mexican', patterns: [/mexican|taco|burrito/i] },
    { label: 'Korean', patterns: [/korean|bbq/i] },
    { label: 'Greek', patterns: [/greek|gyro|souvlaki/i] },
    { label: 'Swahili', patterns: [/swahili|local cuisine|zanzibar cuisine/i] },
    { label: 'Burgers', patterns: [/burger/i] },
    { label: 'Steak', patterns: [/steak/i] },
    { label: 'Cafe', patterns: [/\bcafe\b|\bcoffee\b/i] },
    { label: 'Fine dining', patterns: [/fine dining|gourmet/i] },
  ]

  const found: string[] = []
  const seen = new Set<string>()

  for (const hint of cuisineHints) {
    const hit = businesses.some((b) => {
      const hay = `${b.display_category || ''} ${b.business_name || ''} ${b.business_type || ''}`
      return hint.patterns.some((p) => p.test(hay))
    })
    if (hit && !seen.has(hint.label.toLowerCase())) {
      seen.add(hint.label.toLowerCase())
      found.push(hint.label)
    }
    if (found.length >= limit) break
  }

  // Fall back to distinct display_category labels when cuisine hints are sparse
  if (found.length < 2) {
    const counts = new Map<string, number>()
    for (const b of businesses) {
      const label = String(b.display_category || '').trim()
      if (!label || /^restaurants?$/i.test(label)) continue
      counts.set(label, (counts.get(label) || 0) + 1)
    }
    const extras = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label)
      .filter((label) => !seen.has(label.toLowerCase()))
    for (const label of extras) {
      found.push(label)
      if (found.length >= limit) break
    }
  }

  return found.slice(0, limit)
}

/**
 * Post-process AI response: strip internal tags, enforce inventory-only mentions,
 * guard hallucinations for zero-data businesses.
 */
function postProcessResponse(
  response: string,
  businesses: any[],
  loyaltyBusinessNames: Set<string> = new Set()
): string {
  let result = response
  const allowedSlugs = new Set(
    businesses.map((b) => getBusinessSlug(b)).filter((s) => typeof s === 'string' && s.length > 0)
  )

  // 0a. Drop whole paragraphs that reference slugs not in AVAILABLE BUSINESSES
  // (stops PDF-invented venues like "Ocean Restaurant [SLUG: ocean-restaurant]")
  result = result
    .split(/\n\n+/)
    .filter((paragraph) => {
      const slugRefs = [
        ...paragraph.matchAll(/\[SLUG:\s*([a-z0-9-]+)\]/gi),
        ...paragraph.matchAll(/\/user\/business\/([a-z0-9-]+)/gi),
      ]
      if (slugRefs.length === 0) return true
      return slugRefs.every((m) => allowedSlugs.has(m[1]))
    })
    .join('\n\n')

  // 0b. Convert **Name** [SLUG: foo] → proper markdown link when slug is allowed
  result = result.replace(
    /\*\*([^*]+)\*\*\s*\[SLUG:\s*([a-z0-9-]+)\]/gi,
    (_full, name: string, slug: string) => {
      if (allowedSlugs.has(slug)) {
        return `**[${name.trim()}](/user/business/${slug})**`
      }
      return '' // illegal — already filtered by paragraph drop; belt-and-braces
    }
  )

  // 0c. Strip any leftover internal tags (never show to users)
  result = result.replace(/\s*\[SLUG:\s*[a-z0-9-]+\]/gi, '')
  result = result.replace(/\s*\[TIER:\s*[^\]]+\]/gi, '')

  // 0d. Neutralise markdown business links whose slug is not in inventory
  result = result.replace(
    /\*\*\[([^\]]+)\]\(\/user\/business\/([a-z0-9-]+)\)\*\*/g,
    (full, _name: string, slug: string) => (allowedSlugs.has(slug) ? full : '')
  )
  
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

  // 3b. Kill fabricated stamp / reward-progress claims.
  // Models parrot prompt examples ("1 stamp away") onto venues with no loyalty.
  // Only keep progress sentences that name a business the user actually has stamps at.
  const stampProgressPattern =
    /\b(\d+\s*stamp(?:s)?\s+away|one stamp away|just\s+\d+\s+stamp|stamps?\s+until|free reward waiting|claim that reward|reward waiting at|\/\s*\d+\s*stamps?\b|almost there[^.!?\n]{0,40}reward)\b/i

  result = result
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => {
      if (!stampProgressPattern.test(sentence)) return true
      if (loyaltyBusinessNames.size === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🧹 Stripped fabricated loyalty sentence (no user stamps): "${sentence.slice(0, 80)}"`)
        }
        return false
      }
      const lower = sentence.toLowerCase()
      const mentionsReal = [...loyaltyBusinessNames].some((name) => lower.includes(name))
      if (!mentionsReal) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🧹 Stripped loyalty sentence for non-member venue: "${sentence.slice(0, 80)}"`)
        }
        return false
      }
      return true
    })
    .join(' ')
    .replace(/  +/g, ' ')
  
  // 4. Clean up double spaces and trailing whitespace from stripping
  result = result.replace(/  +/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  
  return result
}

/**
 * Build USER PROFILE section for AI prompt.
 * Summarised format with max 2 example names per section, 1500 char hard cap.
 * Deduplicates business names across sections (Loved > Saved > Claims).
 */
function buildUserProfileSection(data: {
  preferredCategories: string[]
  dietaryRestrictions: string[]
  vibes: string[]
  saved: string[]
  claims: { offerTitle: string; businessName: string }[]
}): string {
  const { preferredCategories, dietaryRestrictions, vibes, saved, claims } = data

  const hasAnyData = preferredCategories.length > 0 ||
    dietaryRestrictions.length > 0 ||
    vibes.length > 0 ||
    saved.length > 0 ||
    claims.length > 0

  if (!hasAnyData) return ''

  const usedNames = new Set<string>()

  const interestsLine = preferredCategories.length > 0
    ? `- Interests: ${preferredCategories.join(', ')}`
    : ''
  const dietaryLine = dietaryRestrictions.length > 0
    ? `- Dietary: ${dietaryRestrictions.join(', ')}`
    : ''

  // Loved (highest priority — gets first pick of names)
  const uniqueVibes = vibes.filter(n => !usedNames.has(n))
  uniqueVibes.forEach(n => usedNames.add(n))
  const lovedLine = uniqueVibes.length > 0
    ? `- Loved: ${uniqueVibes.length} business${uniqueVibes.length !== 1 ? 'es' : ''} (recent: ${uniqueVibes.slice(0, 2).join(', ')})`
    : ''

  // Saved (second priority)
  const uniqueSaved = saved.filter(n => !usedNames.has(n))
  uniqueSaved.forEach(n => usedNames.add(n))
  const savedLine = uniqueSaved.length > 0
    ? `- Saved: ${uniqueSaved.length} business${uniqueSaved.length !== 1 ? 'es' : ''} (recent: ${uniqueSaved.slice(0, 2).join(', ')})`
    : ''

  // Claims (lowest priority)
  const uniqueClaims = claims.filter(c => !usedNames.has(c.businessName))
  uniqueClaims.forEach(c => usedNames.add(c.businessName))
  const claimsLine = uniqueClaims.length > 0
    ? `- Recent deals claimed: ${uniqueClaims.length} (e.g. ${uniqueClaims[0].offerTitle} at ${uniqueClaims[0].businessName})`
    : ''

  // Assemble in priority order with hard cap enforcement
  const HARD_CAP = 1500
  const header = 'USER PROFILE:'
  // Never dropped: interests + dietary
  const coreSections = [interestsLine, dietaryLine].filter(Boolean)
  // Droppable in reverse order: claims first, then saved, then loved
  const droppable = [lovedLine, savedLine, claimsLine].filter(Boolean)

  let sections = [...coreSections, ...droppable]
  let result = `${header}\n${sections.join('\n')}`

  // Drop from the end (claims → saved → loved) until under cap
  while (result.length > HARD_CAP && droppable.length > 0) {
    const dropped = droppable.pop()!
    sections = sections.filter(s => s !== dropped)
    result = `${header}\n${sections.join('\n')}`
  }

  return result
}

/**
 * Build compressed system prompt for AI chat
 */
function buildSystemPromptV2(args: {
  cityDisplayName: string
  userMessage: string
  isBroadQuery: boolean
  availableTypes?: string[]
  stateContext?: string
  businessContext: string
  cityContext?: string
  state: ConversationState
  atlasAvailable: boolean
  currentTime?: string
  previousResponses?: string[]
  userName?: string
  userLoyaltySummary?: string
  eventContext?: string
  userProfileSection?: string
}): string {
  const { cityDisplayName, userMessage, isBroadQuery, availableTypes = [], stateContext, businessContext, cityContext, state, atlasAvailable, currentTime, previousResponses, userName, userLoyaltySummary, eventContext, userProfileSection } = args

  const convoFocus = state?.currentBusiness
    ? `FOCUS: You are currently discussing ${state.currentBusiness.name}. Stay on that unless the user asks to switch.`
    : `FOCUS: Help them discover what they want, then dive into specifics.`

  // Temporal context: current time for "open now" / "tonight" awareness
  const temporalBlock = currentTime
    ? `\nCURRENT TIME: ${currentTime}\nWhen listing results, mention open/closed status if hours are available. List open businesses first, but ALWAYS still include closed businesses — just note they are currently closed. Never skip a relevant business just because it is closed. If hours are missing, do not guess — just omit status. When a business is closed right now, don't lead with the negative — frame it positively: "worth checking out tomorrow" or "opens at 9am" rather than "however, they're closed today".\n`
    : ''

  // Variety context: avoid repeating exact openers
  const varietyBlock = previousResponses && previousResponses.length > 0
    ? `\nVARIETY: Your last ${previousResponses.length} response(s) started with: ${previousResponses.map(r => `"${r.slice(0, 60)}…"`).join(', ')}. Do NOT repeat the same opening sentence or structure.\n`
    : ''

  // Clarify-first: ask before dumping — inventory-backed types only
  const typesLine = availableTypes.length > 0
    ? `Available types you MAY offer (ONLY these — do not invent others): ${availableTypes.join(', ')}.`
    : `If you mention types/cuisines, ONLY use labels that appear in AVAILABLE BUSINESSES categories/names — never invent cuisines.`
  const clarifyBlock = isBroadQuery
    ? `
CLARIFY-FIRST: The user asked something broad: "${userMessage}"
Do NOT dump a long list of businesses yet. Instead:
1. Warm opener (use their name if you know it).
2. Say you'd rather not show everything at once — ask if they have anything in mind.
3. Offer 2–5 types from the list below if useful: ${typesLine}
4. Also offer: a specific craving/dish ("tell me what you're after and I'll find the best match").
5. Also offer: "or I can just show my top picks."
Do NOT recommend specific businesses in this clarify turn unless they already asked for top picks / a specific type / a dish.
When they later say "top picks" / "just show me", THEN recommend 2–3 from AVAILABLE BUSINESSES only (highest rated first).`
    : ''

  const nameGreeting = userName && userName !== 'there' ? `The user's name is ${userName}. Use their first name naturally in your opening line (e.g. "Hey ${userName.split(' ')[0]}," or "Right then ${userName.split(' ')[0]},"). Don't overuse it — once at the start is enough.` : 'You don\'t know the user\'s name. Use a friendly generic opener.'

  return `
You are Qwikker — a sharp, witty local concierge for ${cityDisplayName}. You know the area like a local who actually goes out. Be helpful, warm, a little cheeky, and always accurate. Never fabricate information.
${nameGreeting}

PERSONALITY:
- Sound like a knowledgeable mate who knows all the best spots, not a corporate chatbot
- Use natural, expressive language: "Oooh nice choice", "Right then", "Good shout", "Here's what I'd go with"
- Keep it punchy. One good opener line, then get to the useful info
- Be genuinely enthusiastic when the request is fun — bars, date nights, nightlife — match their energy
- For practical queries (hours, directions, menus), be direct and efficient
- Vary your openers — don't start every response the same way
${temporalBlock}
⚠️  CRITICAL FORMATTING RULES ⚠️
Every business in AVAILABLE BUSINESSES has internal tags: [SLUG: ...] and [TIER: ...].
These tags are INTERNAL ONLY — NEVER copy [SLUG: ...] or [TIER: ...] into your reply.
Use the SLUG only to build a markdown link, then discard the tag.
Example: If a business has [SLUG: sobo-beach], write: **[Sobo Beach](/user/business/sobo-beach)**
NEVER write plain bold business names — always include the link!
NEVER invent a SLUG for a place that is not in AVAILABLE BUSINESSES.

HARD RULES (DO NOT BREAK):
- LINKS: Every business mention MUST use **[Business Name](/user/business/{slug from SLUG tag})**. If you can't find the slug in AVAILABLE BUSINESSES, don't mention it.
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
  When user asks "what food/menu", "what do they serve", "full menu", "their menu":
  ✅ CHECK for "Featured Menu Items:" OR any food/drink items with prices in the business's KB data
  ✅ If Featured Menu Items exist: list ALL of them with names (and prices/descriptions if present).
  ✅ If they asked for the full/entire menu but you only have featured items: say so honestly — "I don't have the entire menu for [Business] yet, but here are some of their most popular items:" then LIST the items. Suggest their website or phone if present. Never stop at the apology. Never mention PDFs.
  ❌ ABSOLUTE BAN: NEVER say "I don't have menu details", "I don't have the full menu", or "I can't provide more menu info" when ANY menu/food/drink data OR Featured Menu Items exist in that business's context. This is a CRITICAL UX failure.
- SHOW ALL UPFRONT: If you have 2+ relevant matches AND this is NOT a CLARIFY-FIRST turn, mention ALL matches in your FIRST answer. Never drip-feed. If AVAILABLE BUSINESSES contains ANY businesses and the user asked for recommendations/top picks/a type, you MUST recommend from them — never claim you have no recommendations when businesses are listed. CLARIFY-FIRST turns are the exception: ask first, don't dump businesses.
- NO HALLUCINATIONS: Never invent dishes, vibe, amenities, hours, or offers. Only mention specifics from AVAILABLE BUSINESSES.
- SAVE / REDEEM: Users CAN save and redeem offers in chat via Save/Redeem buttons on offer cards. NEVER say you cannot save, cannot redeem, cannot process redemption, cannot add to wallet, or that they should just mention the deal at the venue. If they ask to save/redeem, tell them to tap Save/Redeem on the offer card (the UI handles the Wallet update).
- 🚨 PER-BUSINESS DATA BOUNDARY: Each business's features are independent. When a user asks for specific amenities (outdoor seating, WiFi, parking, dog friendly, wheelchair accessible, etc.), ONLY claim a business has that feature if it appears in THAT business's Tags, KB content, or description. Never transfer or blend features from one business onto another. If Business A has "outdoor seating" and Business B does not, do NOT say Business B has outdoor seating — even if Business B matches other parts of the query. It is better to recommend fewer businesses accurately than to fabricate features to make more businesses fit.
- 🚨 ABSOLUTE RULE — QWIKKER BUSINESSES ONLY: You MUST ONLY mention businesses, venues, attractions, or commercial establishments that appear in AVAILABLE BUSINESSES above. If a place charges admission, sells products, or is a registered business, it MUST be in AVAILABLE BUSINESSES or you MUST NOT mention it. This includes but is not limited to: cinemas, bowling alleys, aquariums, theme parks, soft play centres, swimming pools, museums with paid admission, escape rooms, trampoline parks, and any chain brand (e.g. ODEON, Oceanarium, Adventure Wonderland). NEVER bold a name that is not a linked Qwikker business.
  The ONLY non-business places you may reference are free public outdoor spaces: parks, beaches, piers, promenades, and town squares.
- 🚨 NEVER RECOMMEND EXTERNAL PLATFORMS: Do NOT suggest, link to, or mention Booking.com, Airbnb, TripAdvisor, Yelp, Google Maps, Hostelworld, Expedia, Hotels.com, Uber Eats, Deliveroo, Just Eat, OpenTable, or any other third-party platform, app, or aggregator. If you don't have relevant Qwikker businesses for a query (e.g. accommodation, transport), say honestly: "We don't have [category] partners on Qwikker in [city] yet — but we're always adding new businesses." NEVER redirect users away from Qwikker.
  BEFORE saying you don't have recommendations, CHECK every business in AVAILABLE BUSINESSES for relevant features in their KB/menu data. A restaurant with a kids menu IS a valid answer for "things to do with kids." A bar with outdoor seating IS relevant for "patio drinks." Only say you have no recommendations when genuinely no business in your context has relevant data for the query.
- 🚨 ZERO-DATA BUSINESSES: If a business has NO menu items, NO KB content, NO offers — ONLY mention: name (with link), category, rating + review count. DO NOT add what they are "known for", "specialize in", or "offer". DO NOT infer from business name or category. NEVER write a trailing incomplete sentence like "is a lovely spot, ." — if you have nothing specific to say, just state the name, category, and rating.
- 🚨 CHECK YOUR DATA BEFORE SAYING "I DON'T KNOW": Before telling a user you don't have opening hours, menus, or other info, RE-READ the AVAILABLE BUSINESSES data above for that business. If Hours: is listed, USE IT. If menu items, dishes, prices, or PDF menu content appears in a business's KB data, YOU HAVE THEIR MENU — list the items. NEVER say "I don't have menu details" or "I can't provide more menu info" when menu data exists in the business's context block. This makes Qwikker look broken. If the user asks "what else do they have?", scan the FULL KB content for that business and list more items you haven't mentioned yet.
- 🔤 FUZZY NAME MATCHING: Users often misspell business names (e.g. "Bellagio" instead of "Bellaggio", "Nandos" instead of "Nando's"). Before saying "I couldn't find [name]", scan ALL business names in AVAILABLE BUSINESSES for close matches — same starting letters, similar spelling, phonetically alike. If you find a likely match, USE IT and respond as if the user asked about that business. NEVER say a business isn't in listings when a near-identical name exists in your data.
- 📋 HOURS QUERIES: When a user asks "what are the hours?" or "when is X open?", show the FULL weekly schedule from the data — not just today's or tomorrow's. Present it clearly (e.g. "Mon-Fri: 9am-5pm, Sat: 10am-4pm, Sun: Closed"). Only show a single day if the user specifically asked about that day (e.g. "are they open on Sunday?").
- GOOGLE REVIEWS: Numeric rating + review_count only. Never quote or paraphrase review text.
- OFFERS: DB-authoritative only. If an offer is not in current data, it does not exist.
- TIERS: Lead with paid partners when they match the request: [TIER: qwikker_picks] first, then [TIER: featured], then [TIER: recommended] (starter), then free/unclaimed. Never force a paid venue that does not match — but if a Recommended/Featured/Pick bar matches a drinks query, it MUST be mentioned before free bars. Relevance still beats tier when a free venue is clearly a better match (e.g. exact dish only they have).
- "QWIKKER PICKS": Only use this label if EVERY business you mentioned is [TIER: qwikker_picks].
- ATLAS: ${atlasAvailable ? 'When listing 2+ businesses, end your response with a short line like: "Tap **Explore on Atlas** below to take a guided tour of these spots on the map!" — use natural wording but always mention the Atlas button.' : 'DO NOT mention map views or Atlas — the map is not available for these businesses.'}
- 📅 BOOKING CTA: When recommending a business that has a "Book online:" or "Book by phone:" line in its data, include a brief booking nudge at the end of that business's paragraph. Use category-appropriate phrasing (e.g. "Reserve a table" for restaurants, "Book an appointment" for barbers/salons, or just "Book online" if unsure). If it is a URL: "[Reserve a table](URL)" or "[Book an appointment](URL)". If phone: "Call to book: PHONE". One line max. NOTE: This is for BUSINESS reservations only — do NOT confuse with event ticket links.
- 🍝 CUISINE QUERIES WITH PARTIAL MATCHES: If the user asks for a specific cuisine (e.g. "Italian", "Mexican", "Thai") and no business in your context is categorized exactly as that cuisine, but some businesses have related dishes or items in their KB/menu data (pasta, pizza, tacos, pad thai, etc.), you MUST recommend those businesses. Acknowledge honestly that there isn't a dedicated [cuisine] restaurant on Qwikker yet, then highlight the businesses that offer relevant dishes: "There isn't a dedicated Italian spot on Qwikker yet, but [Business Name] has some great Italian-inspired dishes — try their [specific item from KB]." This is FAR more helpful than saying "I don't have any recommendations." The businesses are in your context BECAUSE they have relevant menu items — use them.
- ZERO RESULTS: ONLY when AVAILABLE BUSINESSES is literally empty (or says "No businesses available"). NEVER say "you're in luck" if you have nothing to show. Suggest a nearby alternative category or ask what else they'd like.
- 🚨 NEVER FAKE AN EMPTY CITY: If AVAILABLE BUSINESSES lists ANY venues, you MUST recommend from that list. Saying "there aren't any bars/places listed", "I couldn't find any", or "none on Qwikker" while businesses are in your context is a CRITICAL failure — users will think the product is broken. Prefer imperfect matches ("here are solid spots for a drink") over claiming inventory is empty.
- MATCH USER LANGUAGE: If the user asked for "bars", say "bars" in your response — never substitute with "dining options", "restaurants", or "places to eat". Mirror the user's terminology.
- "ANY MORE?" HANDLING: If you showed all matches, say so. If you missed any, correct yourself immediately.
- USER PROFILE (READ CAREFULLY):
  The USER PROFILE is a preference SIGNAL, not a constraint. Use it to enhance relevance, never to override the user's current query.
  1. INTENT FIRST: Always fully answer the user's request first. Personalization should refine, not redirect the answer. If they ask for "best burger" and their profile says "Cafes", recommend burger places — not cafes.
  2. INTERESTS: When the query is broad ("where should I go tonight?"), lean towards businesses matching their interests and loved/saved places.
  3. DIETARY (CRITICAL — ZERO TOLERANCE):
     a. HARD BLOCK: Any business tagged [DIETARY CONFLICT] MUST NOT appear in your first recommendation. Push it to the END of your list or omit it entirely. NEVER describe meat dishes, grill items, or steaks to a vegetarian/vegan user. NEVER recommend a grill shack, steakhouse, or wing joint as a lead option for a vegetarian or vegan — even if it has high ratings or loyalty rewards.
     b. PRIORITISE: When the query is broad, ALWAYS lead with businesses that have clear vegan/vegetarian/etc options in their KB or menu data.
     c. UNKNOWN: If a business has no explicit dietary data, you may still mention it but add: "worth checking their menu for [restriction] options."
     d. NEVER hide all results — if nothing matches the restriction perfectly, say so honestly and show what's available with appropriate caveats.
     e. SECRET MENUS & SPECIFIC ITEMS: If a user asks for secret menu items or specific dishes and NONE match their dietary restriction, do NOT silently list the conflicting items. Instead, acknowledge it: "I couldn't find any [vegetarian/vegan/etc] secret menu items at [business] right now — would you still like to see what they have?" Give the user the choice.
  4. SILENT USE: Do NOT repeat the user's profile back to them. Just use it.
  5. NO PROFILE = NO ASSUMPTIONS: If no USER PROFILE section exists, do not assume any preferences or restrictions.
  6. TIE-BREAKER ONLY: USER PROFILE is a tie-breaker, not an override. When two businesses are similarly relevant to the query, prefer the one matching the user's profile. Never promote a low-relevance business above a high-relevance one just because it matches preferences. The ranked business list order reflects verified relevance — respect it.
- LOYALTY (ABSOLUTE HARD RULES — ZERO TOLERANCE FOR FABRICATION):
  1. Stamp progress is ONLY real when a business entry includes the exact tag format [USER: X/Y stamps, N to go]. If that tag is absent for a business, that user has NO stamp progress there — do NOT invent, guess, or imply any count.
  2. FORBIDDEN without [USER: … stamps …]: any phrase like "X stamp(s) away", "one stamp away", "almost there", "free reward waiting", "claim that reward", "stamps until", or inventing a stamp balance. This is a CRITICAL product failure when the venue has no loyalty program.
  3. USER LOYALTY PROGRESS section (if present below) lists ONLY venues the user actually joined. You may reference those venues' progress ONLY as written there. Never transplant that progress onto a different business.
  4. A plain "Loyalty: Collect N stamps for …" line (without [USER: …]) means the venue offers a program the user has NOT joined — you may say they have a loyalty card to join, NEVER that the user is close to a reward.
  5. If there is no USER LOYALTY PROGRESS section AND no [USER: … stamps …] tags on any business, do not mention stamp progress at all.
  6. BROAD DISCOVERY only: if USER LOYALTY PROGRESS marks REWARD READY or ALMOST THERE for a venue, you may lead with that venue using the numbers from the section — never invent different numbers.
- OFFERS (CRITICAL — READ CAREFULLY):
  Only mention offers for businesses that have [Has X offers available] in their context line. If a business does NOT have this tag, they have NO current valid offers — do NOT reference any offers from KB descriptions, even if the text mentions past promotions.

MULTI-PART QUERIES:
When the user asks for more than one thing (e.g. "drinks then food", "cocktails AND spicy food", "brunch and shopping"):
- Address EACH part separately in your response
- Group businesses by the part they satisfy (e.g. "For drinks:" then "For food:")
- If one part has results and another doesn't, say so clearly

TONE:
- Be conversational and warm for planning/discovery queries ("date night", "any good bars", "somewhere cosy")
- Be factual and direct for information queries ("what time does X close", "do they have parking", "is there an offer")
- BANNED PHRASES: "Love that plan", "Say no more", "you're in luck", "absolute gem", "hidden gem", "people are obsessed", "you won't regret it", "I've got you covered", "outside of the listed", "not on Qwikker yet", "outside of my database", "however, they're closed"
- ALLOWED: Natural reactions like "Oooh nice", "Right then", "Good shout" are fine — just don't use them if they don't fit the context (e.g. don't say "Love that plan" when the user didn't make a plan)
- NEVER use fire emoji 🔥 in business descriptions
- Max 2 exclamation marks per response
- Sound like a knowledgeable local friend — not a generic assistant or a hype machine
${varietyBlock}
${clarifyBlock}
${stateContext ? `CONVERSATION CONTEXT:\n${stateContext}\n` : ''}
${convoFocus}
${userProfileSection ? `\n${userProfileSection}\n` : ''}
${userLoyaltySummary || ''}
AVAILABLE BUSINESSES (sorted by tier; qwikker_picks first):
${businessContext || 'No businesses available.'}
${cityContext ? `CITY & LOCAL KNOWLEDGE (context for areas, culture, transport, festivals, tips):\n${cityContext}\n\nIMPORTANT — CITY KNOWLEDGE RULES:\n- Use this for neighbourhoods, beaches, culture, transport, parking, festivals, and general local tips.\n- You MAY name free public places (beaches, parks, piers, promenades) from this knowledge.\n- 🚨 COMMERCIAL BUSINESSES (restaurants, bars, cafes, hotels, shops, spas, tours, etc.) named ONLY in city knowledge and NOT in AVAILABLE BUSINESSES MUST NOT be recommended, linked, bolded, or given a SLUG. City PDFs often mention places that are not on Qwikker — ignore those names for recommendations.\n- ONLY recommend businesses that appear in AVAILABLE BUSINESSES above.\n- Do NOT invent venues, events, dates, or facts. If the information genuinely isn't there, say so honestly.\n` : ''}
${eventContext || ''}
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
    
    // Vibes map -- declared early so it's available in all code paths;
    // populated later in the browse-fill path (Step 2)
    let vibesMap = new Map<string, any>()
    
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
    // CRITICAL: "tell me about Happiness Spa" must NOT lock to the previous business.
    const lowerMessage = userMessage.toLowerCase()
    const tellMeAboutMatch = lowerMessage.match(/\btell me (?:more )?about\s+(.+?)[\?\!\.]*$/i)
    const aboutTarget = tellMeAboutMatch?.[1]?.trim() || ''
    const isAnaphoricAbout = aboutTarget.length > 0 && /^(them|it|that|this|those|more|the (place|spot|business|one))\b/i.test(aboutTarget)
    const aboutSlug = aboutTarget ? slugifyBusinessName(aboutTarget) : ''
    const aboutMatchesLast = !!(
      lastSlug &&
      aboutSlug &&
      (aboutSlug === lastSlug ||
        aboutSlug.includes(lastSlug) ||
        lastSlug.includes(aboutSlug) ||
        aboutTarget.includes(lastSlug.split('-').join(' ')))
    )
    // "tell me about X" only counts as follow-up when X is anaphoric or clearly the last business
    const isTellMeAboutFollowUp = /\btell me about\b/i.test(lowerMessage)
      ? (isAnaphoricAbout || aboutMatchesLast || !aboutTarget)
      : false
    const isFollowUpDetailQuery =
      /\b(what else|any more|anything else|what do they (sell|serve|have|offer)|what('?s| is) on (the |their )?menu|full menu|tell me more\b|their menu|their food|their kids menu|their dessert menu|their drink menu|their wine list)\b/i.test(lowerMessage) ||
      isTellMeAboutFollowUp
    const isAnaphoricQuery = /^(any more|anything else|what else|more|another|more places)[\?\!\.]*$/i.test(userMessage.trim())
    
    // KB-priority queries MUST always search KB (kids menu, vegan, dietary info lives ONLY in KB)
    const kbPriorityTerms = ['kids', 'children', 'family', 'vegan', 'vegetarian', 'gluten', 'allerg', 'halal', 'kosher', 'outdoor', 'patio', 'dog friendly', 'pet friendly']
    const isKbPriorityQuery = kbPriorityTerms.some(term => lowerMessage.includes(term))

    // Short-circuit: if we have a resolved business slug AND query is about that business
    // BUT never skip KB search for priority queries where KB is the only source of truth
    const shouldShortCircuitToDetail = (isFollowUpDetailQuery || isAnaphoricQuery) && lastSlug && !isKbPriorityQuery
    
    if (tellMeAboutMatch && aboutTarget && !isTellMeAboutFollowUp) {
      console.log(`🔍 [NEW BUSINESS ASK] "tell me about ${aboutTarget}" — not locking to previous slug ${lastSlug || 'none'}`)
    } else if (isKbPriorityQuery && (isFollowUpDetailQuery || isAnaphoricQuery) && lastSlug) {
      console.log(`📚 [KB PRIORITY] "${lowerMessage}" needs KB search even though it looks like a follow-up — KB is the source of truth for this info`)
    } else if (shouldShortCircuitToDetail) {
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
    
    // Chip "List a few" / save follow-ups must force offers hard-path (not Splash follow-up)
    // Typo-tolerant: "ofers", "ofer", "deasl" etc. still mean offers
    const offerNormalized = lowerMessage
      .replace(/\bof+ers?\b/g, (m) => (m.endsWith('s') ? 'offers' : 'offer'))
      .replace(/\bdeasl?s?\b/g, (m) => (m.includes('s') ? 'deals' : 'deal'))
      .replace(/\bdiscountss?\b/g, 'discounts')

    const lastAssistantText =
      [...conversationHistory].reverse().find((m) => m.role === 'assistant')?.content || ''
    // Don't treat "Kids Meal Deal" / menu copy as an offers turn — that made
    // "Anywhere else with kids menu?" falsely hard-path into Save/Redeem cards.
    const scrubbedPrevForOffers = lastAssistantText
      .replace(/\b(kids?\s+)?meal\s+deals?\b/gi, ' ')
      .replace(/\bkids?\s+(menu|food|meals?)\b/gi, ' ')
    const prevTurnWasOffers =
      /\b(live deals?|save one|redeem when|walletActions|full Offers page|active offers?|tap \*\*Save\*\*)\b/i.test(
        lastAssistantText
      ) ||
      /\b(offers?|discounts?|promos?|%\s*off)\b/i.test(scrubbedPrevForOffers) ||
      (/\bdeals?\b/i.test(scrubbedPrevForOffers) &&
        /\b(save|redeem|live deals?|Offers page)\b/i.test(lastAssistantText))

    const wantsSaveFollowUp =
      /\b(save (it|this|that)|can i save|how (do i|to) save|save (the )?offer)\b/i.test(
        userMessage
      )
    // Discovery follow-ups ("anywhere else with kids menu") must NOT inherit offer mode
    // just because the user said "else" / "more".
    const isDiscoveryElseAsk =
      /\b(kids?|menu|food|restaurants?|cafes?|bars?|places?|venues?|anywhere|with)\b/i.test(
        offerNormalized
      )
    const wantsOfferSample =
      wantsSaveFollowUp ||
      /\b(list a few|show a few|show me a few|list some|a few deals|sample deals|show some|show more deals|more deals|more offers|list a few deals|current deals|live deals|any deals|any offers)\b/i.test(
        offerNormalized
      ) ||
      // "more ofers" / "any more?" right after a real offers reply
      (prevTurnWasOffers &&
        !isDiscoveryElseAsk &&
        /\b(more|any more|another|else|again|keep going)\b/i.test(offerNormalized))

    // Specific deal claims ("Roma has a free tiramisu", "10% off at X") → offers DB, not KB waffle
    const assertsSpecificOffer =
      /\b(has\s+(a\s+)?(free|offer|deal)\b|\bfree\s+[a-z][a-z\-]*(?:\s+[a-z]+)?\b|\d+\s*%\s*off|percent(?:age)?\s*off|2[\s-]?for[\s-]?1)\b/i.test(
        lowerMessage
      )

    // Detect if offers/events are mentioned
    const isOfferQuery =
      wantsOfferSample ||
      assertsSpecificOffer ||
      /\b(offers?|deals?|discounts?|promos?|specials?)\b/i.test(offerNormalized) ||
      /\b(show|list|all|any|get|find|see|tell me|more).*(deals?|offers?)\b/i.test(offerNormalized)
    // Match "shows" (noun) but NOT "show" (verb) to avoid false positives like "show me restaurants"
    const isEventQuery = /\b(events?|shows|concerts?|gigs?|happening|what'?s on|things to do)\b/i.test(lowerMessage) && 
                         !/\b(show me|show all|showing)\b/i.test(lowerMessage)
    
    // 🎯 HARD vs MIXED
    // HARD = pure offer/event ask (e.g. "any deals?", "any good deals?", "list a few")
    // MIXED = discovery + offers (e.g. "restaurants with offers", "family places with deals")
    // NOTE: cheap/good/best alone must NOT flip a deal ask into mixed.
    // "Roma has a free tiramisu" mentions a place but is still a HARD offer lookup.
    const hasDiscoveryConstraint =
      !assertsSpecificOffer &&
      /\b(with|that has|which has|anywhere|places|restaurants?|bars?|cafes?|family|kids?)\b/i.test(
        userMessage
      )
    const hasQualityModifier = /\b(cheap|good|best)\b/i.test(userMessage)
    const isMixedQuery =
      !wantsOfferSample &&
      !assertsSpecificOffer &&
      (hasDiscoveryConstraint ||
        (hasQualityModifier && !isOfferQuery && !isEventQuery))
    
    const mentionsSecretMenu = /\b(secret\s*menus?)\b/i.test(lowerMessage)
    const isHardOfferQuery =
      wantsOfferSample ||
      assertsSpecificOffer ||
      (isOfferQuery && !isMixedQuery && !mentionsSecretMenu)
    const isHardEventQuery = isEventQuery && !isMixedQuery
    
    const isKbDisabled = isHardOfferQuery || isHardEventQuery
    const intent = isOfferQuery || wantsOfferSample ? 'offers' : (isEventQuery ? 'events' : 'general')
    
    console.log(`🔍 KB GATE CHECK: query="${userMessage}"`)
    console.log(`  isOfferQuery=${isOfferQuery}, isEventQuery=${isEventQuery}, assertsSpecificOffer=${assertsSpecificOffer}`)
    console.log(`  isMixedQuery=${isMixedQuery} (discovery with constraints)`)
    console.log(`  isHardOfferQuery=${isHardOfferQuery} (pure offers, no discovery)`)
    console.log(`  isKbDisabled=${isKbDisabled}, intent="${intent}"`)

    // Intent early — beer/drinks must expand search to bars BEFORE KB retrieval
    const earlyIntent = detectIntent(userMessage)
    const earlyFacet = detectFacet(userMessage)
    if (earlyFacet.alcohol && !earlyIntent.categories.includes('bar')) {
      earlyIntent.categories.push('bar')
      earlyIntent.hasIntent = true
    }
    const categorySearchTerms: Record<string, string> = {
      bar: 'bar pub lounge cocktail drinks beer wine nightlife',
      cafe: 'cafe coffee espresso',
      bakery: 'bakery bread pastry',
      dessert: 'dessert ice cream gelato',
      restaurant: 'restaurant dining food',
    }
    const intentSearchExpand = earlyIntent.categories
      .map((c) => categorySearchTerms[c.toLowerCase()])
      .filter(Boolean)
      .join(' ')
    
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

      // beer → bars: search the category the user actually wants
      if (intentSearchExpand) {
        enhancedQuery = `${enhancedQuery} ${intentSearchExpand}`
        console.log(`🔍 Category-expanded KB search: "${enhancedQuery}"`)
      }
      
      businessResults = await searchBusinessKnowledge(enhancedQuery, city, { 
        matchCount: searchLimit,
        matchThreshold: 0.5  // Lower threshold to catch more relevant results (0.7 was too strict)
      })
      cityResults = await searchCityKnowledge(userMessage, city, { matchCount: 6, matchThreshold: 0.4 })
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
    
    // 🎯 DETAIL / NAMED ASK: lock candidates to the specific business when we can resolve it.
    // CRITICAL: search ALL tiers — chat_eligible (T1) alone excludes unclaimed T3.
    let tier1FilteredForDetail = tier1Businesses
    let tier2FilteredForDetail = tier2Businesses
    let tier3FilteredForDetail = tier3Businesses

    const bareNameTarget = extractBareNameAskTarget(userMessage)
    const namedAskTarget =
      (tellMeAboutMatch && aboutTarget && !isTellMeAboutFollowUp ? aboutTarget : null) ||
      bareNameTarget

    let namedLockBusiness: { id: string; name: string; slug?: string } | null = null

    if (namedAskTarget) {
      const allForNameMatch = [...tier1Businesses, ...tier2Businesses, ...tier3Businesses]
      const namedHit = findBusinessBySpokenName(namedAskTarget, allForNameMatch)
      if (namedHit) {
        tier1FilteredForDetail = tier1Businesses.filter((b) => b.id === namedHit.id)
        tier2FilteredForDetail = tier2Businesses.filter((b) => b.id === namedHit.id)
        tier3FilteredForDetail = tier3Businesses.filter((b) => b.id === namedHit.id)
        namedLockBusiness = {
          id: String(namedHit.id),
          name: namedHit.business_name,
          slug: getBusinessSlug(namedHit) || undefined,
        }
        // Persist focus so detail mode / follow-ups lock by business_id + city
        state.currentBusiness = {
          id: String(namedHit.id),
          name: namedHit.business_name,
          slug: getBusinessSlug(namedHit) || undefined,
          contextType: 'detailed_view',
        }
        console.log(
          `🎯 [NAMED ASK] Locked to inventory match: ${namedHit.business_name} (id: ${namedHit.id}) from "${namedAskTarget}"`
        )
      } else {
        console.log(`⚠️ [NAMED ASK] No inventory match for "${namedAskTarget}" across T1/T2/T3`)
      }
    } else if (shouldShortCircuitToDetail && lastSlug) {
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

    // 📋 MENU HARD-PATH: "full menu" / "what's on their menu" must list featured items
    // when we have them — never let the model claim "I don't have the full menu" while
    // menu_preview is sitting in context (literal "full" = PDF hallucination).
    const isMenuAsk =
      /\b(full menu|their menu|the menu|menu items|on (the |their )?menu|what do they (sell|serve|have|offer)|what('?s| is) on (the |their )?menu)\b/i.test(
        lowerMessage
      ) ||
      /^(show|see|list|pull up)\b.*\bmenu\b/i.test(lowerMessage)

    if (isMenuAsk) {
      const inventoryForMenu = [
        ...tier1Businesses,
        ...tier2Businesses,
        ...tier3Businesses,
      ]
      const matchSlug = (b: any, slug: string) => {
        const s = getBusinessSlug(b)
        return (
          s === slug ||
          s.includes(slug) ||
          slug.includes(s) ||
          (b.business_name || '')
            .toLowerCase()
            .includes(slug.split('-').join(' '))
        )
      }
      let menuBiz: any =
        (tier1.length === 1 && tier1[0]) ||
        (tier2.length === 1 && tier2[0]) ||
        (tier3.length === 1 && tier3[0]) ||
        null
      if (!menuBiz && lastSlug) {
        menuBiz = inventoryForMenu.find((b) => matchSlug(b, lastSlug)) || null
      }
      if (!menuBiz && state.currentBusiness?.id) {
        menuBiz =
          inventoryForMenu.find((b) => String(b.id) === String(state.currentBusiness?.id)) ||
          null
      }

      const preview = Array.isArray(menuBiz?.menu_preview) ? menuBiz.menu_preview : []
      if (menuBiz && preview.length > 0) {
        const slug = getBusinessSlug(menuBiz)
        const lines = preview.map((item: any) => {
          const name = String(item?.name || '').trim()
          if (!name) return null
          const price = String(item?.price || '').trim()
          const desc = String(item?.description || '').trim()
          let line = `- **${name}**`
          if (price) line += ` (${price})`
          if (desc) line += ` — ${desc}`
          return line
        }).filter(Boolean)

        if (lines.length > 0) {
          const nameLink = `**[${menuBiz.business_name}](/user/business/${slug})**`
          const opener = `I don't have the entire menu for ${nameLink} yet, but here are some of their most popular items:`

          const contactBits: string[] = []
          const website = String(menuBiz.website_url || '').trim()
          const phone = String(menuBiz.phone || '').trim()
          if (website) contactBits.push(`[check their website](${website})`)
          if (phone) contactBits.push(`give them a call on ${phone}`)
          const closer =
            contactBits.length > 0
              ? `For everything else, ${contactBits.join(' or ')}.`
              : `Check their website or give them a call if you want to see what else they have to offer.`

          const response = `${opener}\n\n${lines.join('\n')}\n\n${closer}`
          console.log(
            `📋 [MENU HARD-PATH] Listed ${lines.length} featured items for ${menuBiz.business_name}`
          )
          return {
            success: true,
            response,
            sources: [],
            businessCarousel: [],
            walletActions: [],
            quickReplies: ['Any deals?', 'Opening hours', 'Directions'],
            eventCards: [],
            uiMode: 'conversational',
            hasBusinessResults: true,
            modelUsed: 'gpt-4o-mini',
            classification,
            metadata: {
              mode: 'menu_featured',
              currentBusinessId: menuBiz.id,
              currentBusinessSlug: slug,
            },
          }
        }
      }
    }
    
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
    // Always return ≤3 Save/Redeem cards (thumbnails + actions) — never AI prose links.
    // MIXED queries (e.g., "restaurants with offers") go through normal KB flow
    if (isHardOfferQuery) {
      try {
        console.log(`🎫 Offer hard-stop in ${city}`)
        const cityLabel = city.charAt(0).toUpperCase() + city.slice(1)

        // 🔒 Prefer chat-eligible view; fall back to business_offers if embed fails
        interface ChatOfferRow {
          id: string
          business_id: string
          offer_name: string
          offer_description: string | null
          offer_type: string | null
          offer_value: string
          offer_terms: string | null
          offer_start_date: string | null
          offer_end_date: string | null
          offer_image: string | null
          business_profiles?: {
            business_name?: string
            city?: string
            logo?: string | null
            business_images?: string[] | null
          } | null
        }
        let offers: ChatOfferRow[] = []

        const offerSelect = `
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
              city,
              logo,
              business_images
            )
          `

        const primary = await supabase
          .from('business_offers_chat_eligible')
          .select(offerSelect)
          .eq('business_profiles.city', city)
          .order('offer_end_date', { ascending: false })
          .limit(40)

        if (primary.error) {
          console.error('❌ chat_eligible offers query failed, trying business_offers fallback:', primary.error)
          // Retry without logo/images if embed columns fail on the view
          const primarySimple = await supabase
            .from('business_offers_chat_eligible')
            .select(`
              id, business_id, offer_name, offer_description, offer_type, offer_value,
              offer_terms, offer_start_date, offer_end_date, offer_image,
              business_profiles!inner(business_name, city)
            `)
            .eq('business_profiles.city', city)
            .order('offer_end_date', { ascending: false })
            .limit(40)

          if (!primarySimple.error && primarySimple.data) {
            offers = primarySimple.data as unknown as ChatOfferRow[]
          } else {
            const fallback = await supabase
              .from('business_offers')
              .select(offerSelect)
              .eq('status', 'approved')
              .eq('business_profiles.city', city)
              .order('offer_end_date', { ascending: false })
              .limit(40)
            if (fallback.error) {
              console.error('❌ business_offers fallback also failed:', fallback.error)
            } else {
              offers = (fallback.data || []) as unknown as ChatOfferRow[]
            }
          }
        } else {
          offers = (primary.data || []) as unknown as ChatOfferRow[]
        }

        // Drop expired / not-yet-started offers (same rules as Offers tab)
        const now = new Date()
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        offers = offers.filter((o) => {
          if (o.offer_end_date && new Date(o.offer_end_date) < todayStart) return false
          if (o.offer_start_date && new Date(o.offer_start_date) > now) return false
          return true
        })

        if (!offers || offers.length === 0) {
          console.log(`🚫 ZERO OFFERS in DB → authoritative "no offers" response`)
          return {
            success: true,
            response: wantsSaveFollowUp
              ? `I can Save offers right here in chat — but I don’t see any live deals in ${cityLabel} right now.`
              : `There are no active offers in ${cityLabel} right now. Check back soon, or explore businesses on Discover!`,
            sources: [],
            businessCarousel: [],
            walletActions: [],
            quickReplies: ['Find restaurants', 'Open Discover'],
            eventCards: [],
            uiMode: 'conversational',
            hasBusinessResults: false,
            modelUsed: 'gpt-4o-mini',
            classification
          }
        }

        // Prefer the business the user was just talking about (e.g. "Can I save it?" after CHE)
        // Also match names in the current message ("Roma has a free tiramisu")
        let focusedOffers = offers
        const focusName =
          state.currentBusiness?.name ||
          namedLockBusiness?.name ||
          ''

        const matchOffersByBusinessHint = (hint: string) => {
          const h = hint.toLowerCase().trim()
          if (h.length < 3) return [] as ChatOfferRow[]
          return offers.filter((o) => {
            const name = (o.business_profiles?.business_name || '').toLowerCase()
            if (!name) return false
            // "Roma" → Roma Italian… ; full name substring either way
            return (
              name.includes(h) ||
              h.includes(name) ||
              name.split(/\s+/).some((w) => w.length >= 4 && h.includes(w)) ||
              h.split(/\s+/).some((w) => w.length >= 4 && name.includes(w))
            )
          })
        }

        // Pull a likely business token from the user message (first capitalized run / known focus)
        const nameFromMessage = (() => {
          const m = userMessage.match(
            /\b([A-Z][a-zA-Z0-9'&]*(?:\s+[A-Z][a-zA-Z0-9'&]*){0,3})\b/
          )
          return m?.[1]?.trim() || ''
        })()

        if (focusName && (wantsSaveFollowUp || /\boffer\b/i.test(userMessage) || assertsSpecificOffer)) {
          const matched = matchOffersByBusinessHint(focusName)
          if (matched.length > 0) focusedOffers = matched
        } else if (nameFromMessage && (assertsSpecificOffer || isOfferQuery)) {
          const matched = matchOffersByBusinessHint(nameFromMessage)
          if (matched.length > 0) focusedOffers = matched
        } else if (wantsSaveFollowUp) {
          // Scan recent assistant text for a business name that has a live offer
          const recentAssistant = lastAssistantText
          const hit = offers.find((o) => {
            const name = o.business_profiles?.business_name || ''
            return name.length >= 4 && recentAssistant.toLowerCase().includes(name.toLowerCase())
          })
          if (hit) focusedOffers = [hit]
        }

        // Match offer title/value keywords from the user message (tiramisu, pizza, etc.)
        const offerKeywordHit = (o: ChatOfferRow) => {
          const blob = `${o.offer_name || ''} ${o.offer_value || ''} ${o.offer_description || ''}`.toLowerCase()
          const tokens = lowerMessage
            .replace(/[^a-z0-9\s%]/g, ' ')
            .split(/\s+/)
            .filter(
              (t) =>
                t.length >= 4 &&
                !/^(have|has|with|from|this|that|they|them|free|offer|offers|deal|deals|roma|just|about|some|more)$/i.test(
                  t
                )
            )
          return tokens.some((t) => blob.includes(t))
        }
        if (assertsSpecificOffer) {
          const byKeyword = focusedOffers.filter(offerKeywordHit)
          if (byKeyword.length > 0) {
            focusedOffers = byKeyword
          } else if (focusedOffers === offers) {
            // No business/keyword match — still show live deals rather than AI "couldn't find"
            focusedOffers = offers
          }
        }

        // Honour specific deal-type asks (2-for-1 / BOGOF / % off) instead of random live deals
        const wantsTwoForOne = /\b(2[\s-]?for[\s-]?1|2[\s-]?4[\s-]?1|two[\s-]?for[\s-]?(one|1)|bogof|buy\s+one\s+get\s+one)\b/i.test(userMessage)
        const wantsPercentOff = /\b(\d+\s*%|\d+\s*percent|percentage\s*off|%[\s-]?off)\b/i.test(userMessage)
        const isTwoForOneOffer = (o: ChatOfferRow) => {
          const type = (o.offer_type || '').toLowerCase()
          const blob = `${o.offer_name || ''} ${o.offer_value || ''} ${o.offer_description || ''}`.toLowerCase()
          return (
            type.includes('two_for') ||
            type.includes('2_for') ||
            type.includes('bogof') ||
            /\b(2[\s-]?for[\s-]?1|2[\s-]?4[\s-]?1|two[\s-]?for[\s-]?(one|1)|bogof|buy\s+one\s+get\s+one)\b/i.test(blob)
          )
        }
        const isPercentOffer = (o: ChatOfferRow) => {
          const type = (o.offer_type || '').toLowerCase()
          const blob = `${o.offer_name || ''} ${o.offer_value || ''}`.toLowerCase()
          return type.includes('percentage') || type.includes('percent') || /\d+\s*%/.test(blob)
        }

        if (wantsTwoForOne) {
          const matched = focusedOffers.filter(isTwoForOneOffer)
          if (matched.length > 0) {
            focusedOffers = matched
          } else {
            return {
              success: true,
              response: `I don’t see any live 2-for-1 deals in ${cityLabel} right now. Want me to show other live offers instead?`,
              sources: [],
              businessCarousel: [],
              walletActions: [],
              quickReplies: ['Show me live deals', 'Open Offers page'],
              eventCards: [],
              uiMode: 'conversational',
              hasBusinessResults: false,
              modelUsed: 'gpt-4o-mini',
              classification,
            }
          }
        } else if (wantsPercentOff) {
          const matched = focusedOffers.filter(isPercentOffer)
          if (matched.length > 0) focusedOffers = matched
        }

        const sampleOffers = focusedOffers.slice(0, 3)
        const windowById = new Map<string, number>()
        const { data: windowRows } = await supabase
          .from('business_offers')
          .select('id, activation_window_minutes')
          .in(
            'id',
            sampleOffers.map((o) => o.id)
          )
        for (const row of windowRows || []) {
          const mins = Number(row.activation_window_minutes)
          if (mins === 30 || mins === 60 || mins === 120) {
            windowById.set(row.id, mins)
          }
        }

        // Same image fallback as Offers page: offer → business photo → logo
        const resolveOfferImage = (offer: ChatOfferRow): string | null => {
          const profile = offer.business_profiles
          const fromBiz =
            (Array.isArray(profile?.business_images) && profile.business_images[0]) ||
            profile?.logo ||
            null
          return offer.offer_image || fromBiz || null
        }

        // Enrich missing images from business_profiles if view omitted logo/images
        const needsImageBizIds = sampleOffers
          .filter((o) => !resolveOfferImage(o))
          .map((o) => o.business_id)
        const imageByBizId = new Map<string, string>()
        if (needsImageBizIds.length > 0) {
          const { data: bizRows } = await supabase
            .from('business_profiles')
            .select('id, logo, business_images')
            .in('id', needsImageBizIds)
          for (const row of bizRows || []) {
            const img =
              (Array.isArray(row.business_images) && row.business_images[0]) ||
              row.logo ||
              null
            if (img) imageByBizId.set(row.id, img)
          }
        }

        const walletActions = sampleOffers.map((offer) => {
          const profile = offer.business_profiles
          return {
            type: 'save_offer' as const,
            offerId: offer.id,
            offerName: offer.offer_name,
            offerDescription: offer.offer_description || null,
            offerType: offer.offer_type || null,
            offerValue: offer.offer_value,
            offerTerms: offer.offer_terms || null,
            offerStartDate: offer.offer_start_date || null,
            offerEndDate: offer.offer_end_date || null,
            offerImage:
              resolveOfferImage(offer) || imageByBizId.get(offer.business_id) || null,
            businessName: profile?.business_name || 'Unknown',
            businessId: offer.business_id,
            businessSlug: null,
            activationWindowMinutes: windowById.get(offer.id) ?? 60,
          }
        })

        console.log(`✅ Hard-stop cards: ${walletActions.length} offers with Save/Redeem`)

        const saveCopy =
          wantsSaveFollowUp && walletActions.length === 1
            ? `Yes — tap **Save** on **${walletActions[0].offerName}** at ${walletActions[0].businessName} below. Redeem when you’re at the venue.`
            : wantsSaveFollowUp
              ? `Yes — you can Save right here. Tap **Save** on the deal you want below, then Redeem when you’re ready to show staff.`
              : wantsTwoForOne
                ? `Here are live 2-for-1 deals in ${cityLabel} — Save one, then Redeem when you’re at the venue.`
                : `Here are a few live deals in ${cityLabel} — Save one, then Redeem when you’re at the venue. Or open the full Offers page for everything.`

        return {
          success: true,
          response: saveCopy,
          sources: [],
          businessCarousel: [],
          walletActions,
          quickReplies: ['Open Offers page'],
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
    
    // 🔒 FACET INJECTION: alcohol queries always need bar venue intent
    // (covers "a beer in Nungwi" even if intent detector missed category)
    if (facet.alcohol) {
      detectedIntent.hasIntent = true
      if (!detectedIntent.categories.includes('bar')) {
        detectedIntent.categories.push('bar')
      }
      if (!detectedIntent.keywords.includes('alcohol')) {
        detectedIntent.keywords = [...detectedIntent.keywords, 'alcohol']
      }
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔒 FACET INJECTION: alcohol → bar intent`)
      }
    }

    // "top picks" / "just show me" after a restaurant clarify — keep restaurant intent
    const wantsTopPicks = /\b(top picks|just show( me)?|your picks|surprise me|show me (some |your )?picks)\b/i.test(userMessage)
    if (wantsTopPicks) {
      const recentText = [
        userMessage,
        ...conversationHistory.slice(-4).map((m) => m.content),
      ].join(' ')
      if (/\brestaurants?\b|\bdining\b|\beat\b|\bfood\b/i.test(recentText) && !detectedIntent.categories.includes('restaurant')) {
        detectedIntent.categories.push('restaurant')
        detectedIntent.hasIntent = true
        if (process.env.NODE_ENV === 'development') {
          console.log('🔒 TOP PICKS: injecting restaurant intent from conversation context')
        }
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
      const now = new Date()
      for (const [businessId, kbEntries] of kbByBusiness.entries()) {
        // Filter out archived/inactive entries (if status field exists)
        const activeEntries = kbEntries.filter(kb => {
          if (kb.status && kb.status !== 'active') return false

          // Filter expired offer entries by checking content for "Valid until:" or "Valid: ... to ..."
          const content = (kb.content || '') as string
          if (content.startsWith('OFFER:')) {
            const validUntilMatch = content.match(/Valid until:\s*(.+)/i)
            const validRangeMatch = content.match(/Valid:\s*.+\s+to\s+(.+)/i)
            const endDateStr = validUntilMatch?.[1]?.trim() || validRangeMatch?.[1]?.trim()
            if (endDateStr) {
              const endDate = new Date(endDateStr)
              if (!isNaN(endDate.getTime()) && endDate < now) {
                console.log(`🚫 Filtering expired KB offer: ${kb.title} (expired ${endDateStr})`)
                return false
              }
            }
          }
          return true
        })
        
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
    
    // Step 1b: Fetch Qwikker Vibes for all businesses (needed before context is built)
    const allBusinessIdsForVibes = [...tier1, ...tier2, ...tier3].map(b => b.id)
    if (allBusinessIdsForVibes.length > 0) {
      await Promise.all(
        allBusinessIdsForVibes.map(async (id) => {
          const vibes = await getBusinessVibeStats(id)
          if (vibes && vibes.total_vibes >= 5) {
            vibesMap.set(id, vibes)
          }
        })
      )
      if (vibesMap.size > 0) {
        console.log(`💚 Vibes loaded for ${vibesMap.size} businesses (5+ each)`)
      }
    }

    // Step 2: Score ALL businesses for relevance
    // Semantic search may have found evidence even if intent detector found nothing
    console.log(`🎯 Scoring all businesses for intent: "${intentTerms || 'semantic-only'}"`)
      
      // Score Tier 1
    tier1.forEach(b => {
        const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet, userMessage)
        businessRelevanceScores.set(b.id, score)
      })
      
      // Score Tier 2
    tier2.forEach(b => {
        const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet, userMessage)
        businessRelevanceScores.set(b.id, score)
      })
      
      // Score Tier 3
    tier3.forEach(b => {
        const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet, userMessage)
        businessRelevanceScores.set(b.id, score)
      })

    // 🔍 CATEGORY SEARCH: beer→bar means SEARCH bars in inventory, not hope scoring finds "beer" text.
    // Deterministic sweep so venues like "Che Bar" surface even with empty/odd categories.
    if (detectedIntent.categories.length > 0) {
      const inventory = [...tier1, ...tier2, ...tier3]
      for (const cat of detectedIntent.categories) {
        const c = cat.toLowerCase()
        let boosted = 0
        for (const b of inventory) {
          const blob = [
            b.business_name,
            b.display_category,
            b.system_category,
            b.google_primary_type,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          let matches = false
          if (c === 'bar') {
            matches =
              isAlcoholCapableCategory(blob) ||
              /\b(bar|pub|lounge|tavern|night\s*club|cocktail|wine|brew|taproom)\b/i.test(blob)
          } else {
            matches =
              blob.includes(c) ||
              (c === 'cafe' && /\b(cafe|coffee)\b/i.test(blob)) ||
              (c === 'restaurant' && /\b(restaurant|dining|bistro|eatery|grill)\b/i.test(blob)) ||
              (c === 'bakery' && /\b(bakery|pastry)\b/i.test(blob)) ||
              (c === 'dessert' && /\b(dessert|ice\s*cream|gelato)\b/i.test(blob))
          }

          if (!matches) continue
          const prev = businessRelevanceScores.get(b.id) || 0
          if (prev < CAROUSEL_MIN) {
            businessRelevanceScores.set(b.id, CAROUSEL_MIN)
            boosted++
          }
        }
        if (boosted > 0) {
          console.log(`🔍 Category search (${c}): found/boosted ${boosted} venues in inventory`)
        }
      }
      // Paid partners get a nudge so starter bars surface above free name-matches
      for (const b of tier1) {
        const prev = businessRelevanceScores.get(b.id) || 0
        if (prev >= INJECT_MIN) {
          businessRelevanceScores.set(b.id, prev + 1)
        }
      }
    }
      
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
        tierLabel: ({ spotlight: 'qwikker_picks', featured: 'featured', starter: 'recommended' } as Record<string, string>)[b.effective_tier] || 'recommended',
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
    
    // Step 3b: Fetch user loyalty memberships BEFORE sorting so we can boost rankings
    const userLoyaltyByBusinessId = new Map<string, { stamps_balance: number; stamps_remaining: number }>()
    const loyaltyByBusinessId = new Map<string, { program_name: string; reward_description: string; reward_threshold: number }>()
    let userLoyaltySummary = ''

    if (context.walletPassId) {
      try {
        const serviceRole = createServiceRoleClient()
        const { data: memberships } = await serviceRole
          .from('loyalty_memberships')
          .select(`
            program_id, stamps_balance,
            loyalty_programs!inner(
              business_id, program_name, reward_description, reward_threshold, status,
              business_profiles!inner(business_name)
            )
          `)
          .eq('user_wallet_pass_id', context.walletPassId)
          .eq('status', 'active')

        const summaryLines: string[] = []

        for (const m of memberships || []) {
          const prog = (m as any).loyalty_programs
          if (prog?.business_id && prog.status === 'active') {
            const remaining = prog.reward_threshold - m.stamps_balance
            userLoyaltyByBusinessId.set(prog.business_id, {
              stamps_balance: m.stamps_balance,
              stamps_remaining: remaining,
            })
            if (!loyaltyByBusinessId.has(prog.business_id)) {
              loyaltyByBusinessId.set(prog.business_id, {
                program_name: prog.program_name,
                reward_description: prog.reward_description,
                reward_threshold: prog.reward_threshold,
              })
            }
            const bizName = prog.business_profiles?.business_name || prog.program_name
            const nearReward = remaining <= 3 && remaining > 0
            const rewardReady = remaining <= 0
            const statusTag = rewardReady ? ' ⭐ REWARD READY!' : nearReward ? ' 🔥 ALMOST THERE!' : ''
            summaryLines.push(`- ${bizName}: ${m.stamps_balance}/${prog.reward_threshold} stamps (${remaining} to go for ${prog.reward_description})${statusTag}`)
          }
        }

        if (summaryLines.length > 0) {
          userLoyaltySummary = `\nUSER LOYALTY PROGRESS:\n${summaryLines.join('\n')}\n`
        }
      } catch (e) {
        console.log('⚠️ Loyalty membership fetch failed (non-critical):', e)
      }
    }

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
    
    let usedSoftCategoryFallback = false

    /** Soft match when scoring fails — never wipe inventory for bar/drink (etc.) queries. */
    const softMatchIntentCategory = (b: (typeof allBusinessesForContext)[number]): boolean => {
      const blob = [
        b.business_name,
        b.display_category,
        b.system_category,
        b.google_primary_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (facet.alcohol || detectedIntent.categories.includes('bar')) {
        if (isAlcoholCapableCategory(blob)) return true
        if (/\b(bar|pub|lounge|tavern|night\s*club|cocktail|wine|brew|taproom)\b/i.test(blob)) return true
      }

      for (const cat of detectedIntent.categories) {
        const c = cat.toLowerCase()
        if (blob.includes(c)) return true
        if (c === 'cafe' && /\b(cafe|coffee|espresso)\b/i.test(blob)) return true
        if (c === 'restaurant' && /\b(restaurant|dining|bistro|eatery|grill)\b/i.test(blob)) return true
        if (c === 'bakery' && /\b(bakery|baker|pastry)\b/i.test(blob)) return true
        if (c === 'dessert' && /\b(dessert|ice\s*cream|gelato|sweet)\b/i.test(blob)) return true
      }
      return false
    }

    if (relevantBusinesses.length > 0) {
      console.log(`🎯 ${relevantBusinesses.length} relevant of ${allBusinessesForContext.length} (threshold: ${contextThreshold}, topScore: ${topContextScore})`)
      sortedForContext = relevantBusinesses
    } else if (detectedIntent.hasIntent) {
      // Scoring miss — DO NOT empty context. That makes the model lie ("no bars listed")
      // when bars clearly exist. Soft-fallback to category-plausible venues instead.
      const softMatches = allBusinessesForContext.filter(softMatchIntentCategory)
      if (softMatches.length > 0) {
        usedSoftCategoryFallback = true
        // Give soft matches a floor so carousel/inject paths can still surface them
        for (const b of softMatches) {
          if ((b.relevanceScore || 0) < INJECT_MIN) {
            b.relevanceScore = INJECT_MIN
            businessRelevanceScores.set(b.id, INJECT_MIN)
          }
        }
        sortedForContext = softMatches
        console.log(
          `🛟 Soft category fallback: ${softMatches.length} venues (scoring returned 0 — still showing inventory)`
        )
      } else {
        // Truly nothing of that type in this city — keep empty so AI can say so honestly
        console.log(`⚠️ Zero relevant + zero soft matches for specific query.`)
        sortedForContext = []
      }
    } else {
      // Browse mode / no intent - show all
      console.log(`📊 No specific intent - showing all ${allBusinessesForContext.length} businesses`)
      sortedForContext = allBusinessesForContext
    }
    
    // Loyalty boost: businesses where the user has stamps get a ranking nudge.
    // This ensures "where should I go tonight" leads with near-reward businesses.
    if (userLoyaltyByBusinessId.size > 0) {
      for (const biz of sortedForContext) {
        const progress = userLoyaltyByBusinessId.get(biz.id)
        if (!progress) continue
        const rewardReady = progress.stamps_remaining <= 0
        const almostThere = progress.stamps_remaining > 0 && progress.stamps_remaining <= 3
        const boost = rewardReady ? 3 : almostThere ? 2 : 1
        biz.relevanceScore = (biz.relevanceScore || 0) + boost
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎟️ Loyalty boost: ${biz.business_name} +${boost} (${rewardReady ? 'REWARD READY' : almostThere ? 'ALMOST THERE' : 'member'})`)
        }
      }
    }

    // Sort strategies:
    // BROWSE MODE: Tier first (paid always above unclaimed), then rating within tier
    // INTENT MODE: Relevance first (truth), then tier as tiebreaker, then rating
    const userLoc = normalizeLocation(context.userLocation)
    
    sortedForContext.sort((a, b) => {
      if (!detectedIntent.hasIntent) {
        // BROWSE MODE: Loyalty-boosted businesses float to top within their tier
        // 1. Tier priority (paid > claimed > unclaimed)
        if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority

        // 2. Loyalty boost within same tier (higher = user has more engagement)
        const loyaltyA = userLoyaltyByBusinessId.has(a.id) ? (a.relevanceScore || 0) : 0
        const loyaltyB = userLoyaltyByBusinessId.has(b.id) ? (b.relevanceScore || 0) : 0
        if (loyaltyA !== loyaltyB) return loyaltyB - loyaltyA
        
        // 3. Rating within same tier (higher = better)
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (ratingA !== ratingB) return ratingB - ratingA
        
        // 4. Distance (if available, closer = better)
        if (userLoc && a.latitude && b.latitude && a.longitude && b.longitude) {
          const distA = calculateDistance(userLoc, { latitude: a.latitude, longitude: a.longitude })
          const distB = calculateDistance(userLoc, { latitude: b.latitude, longitude: b.longitude })
          return distA - distB
        }
        
        return 0
      } else {
        // INTENT MODE: Relevance first, but paid partners win when scores are close.
        // Starter/Featured/Picks (CHE) must beat free bars that only match on name/area.
        const scoreA = a.relevanceScore || 0
        const scoreB = b.relevanceScore || 0
        const bothRelevant = scoreA >= INJECT_MIN && scoreB >= INJECT_MIN
        const scoresClose = Math.abs(scoreA - scoreB) <= 2
        if (bothRelevant && scoresClose && a.tierPriority !== b.tierPriority) {
          return a.tierPriority - b.tierPriority
        }

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
      'restaurant',
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
      'bank', 'atm', 'finance',
      // Rentals / tourism — never answer food queries with scooter shops
      'scooter', 'motorcycle', 'moped', 'bike rental', 'bicycle rental',
      'car rental', 'vehicle rental', 'rental', 'hire', 'motorbike',
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
    
    // Step 4a: Fetch loyalty programs for context businesses (user memberships already fetched in Step 3b)
    const contextBusinessIds = sortedForContext.slice(0, 10).map(b => b.id).filter(Boolean)

    try {
      if (contextBusinessIds.length > 0) {
        const { data: loyaltyPrograms } = await supabase
          .from('loyalty_programs')
          .select('business_id, program_name, reward_description, reward_threshold')
          .in('business_id', contextBusinessIds)
          .eq('status', 'active')

        for (const lp of loyaltyPrograms || []) {
          if (!loyaltyByBusinessId.has(lp.business_id)) {
            loyaltyByBusinessId.set(lp.business_id, lp)
          }
        }
      }
    } catch (e) {
      console.log('⚠️ Loyalty programs fetch failed (non-critical):', e)
    }

    // Step 4a-2: Fetch user profile data for personalization (service role — RLS city filter bypass)
    let userProfileSection = ''
    let userDietaryRestrictions: string[] = []
    if (context.walletPassId) {
      try {
        const serviceClient = createServiceRoleClient()
        const walletPassId = context.walletPassId

        const [prefsResult, vibesResult, savedResult, claimsResult] = await Promise.allSettled([
          serviceClient.from('app_users')
            .select('preferred_categories, dietary_restrictions, preferred_radius_miles')
            .eq('wallet_pass_id', walletPassId).single(),
          serviceClient.from('qwikker_vibes')
            .select('business_id, business_profiles!inner(business_name)')
            .eq('vibe_user_key', walletPassId)
            .eq('vibe_rating', 'loved_it')
            .order('created_at', { ascending: false }).limit(20),
          serviceClient.from('user_saved_items')
            .select('item_id')
            .eq('wallet_pass_id', walletPassId)
            .eq('item_type', 'business').limit(20),
          serviceClient.from('user_offer_claims')
            .select('offer_title, business_name')
            .eq('wallet_pass_id', walletPassId)
            .order('claimed_at', { ascending: false }).limit(10),
        ])

        const prefs = prefsResult.status === 'fulfilled' ? prefsResult.value.data : null
        const vibes = vibesResult.status === 'fulfilled' ? vibesResult.value.data : []
        const savedIds = savedResult.status === 'fulfilled' ? savedResult.value.data : []
        const claims = claimsResult.status === 'fulfilled' ? claimsResult.value.data : []

        // Two-step resolve for saved items (no FK to business_profiles)
        let saved: { business_name: string }[] = []
        if (savedIds.length > 0) {
          const ids = savedIds.map((s: { item_id: string }) => s.item_id)
          const { data } = await serviceClient
            .from('business_profiles')
            .select('business_name')
            .in('id', ids)
          saved = data || []
        }

        // Extract dietary restrictions for conflict detection (used outside this block)
        userDietaryRestrictions = prefs?.dietary_restrictions || []

        // Build USER PROFILE with hard cap + dedup
        userProfileSection = buildUserProfileSection({
          preferredCategories: prefs?.preferred_categories || [],
          dietaryRestrictions: userDietaryRestrictions,
          vibes: (vibes || []).map((v: any) => (v.business_profiles as any)?.business_name).filter(Boolean),
          saved: saved.map(s => s.business_name).filter(Boolean),
          claims: (claims || []).map((c: any) => ({ offerTitle: c.offer_title, businessName: c.business_name })).filter((c: any) => c.businessName),
        })
      } catch (e) {
        console.log('⚠️ User profile fetch failed (non-critical):', e)
      }
    }

    // Dietary conflict detection: tag businesses whose core offering conflicts
    const dietaryLower = userDietaryRestrictions.map((d: string) => d.toLowerCase())

    function hasDietaryConflict(business: any): boolean {
      if (dietaryLower.length === 0) return false
      const cat = (business.display_category || '').toLowerCase()
      const name = (business.business_name || '').toLowerCase()
      const sysCategory = (business.system_category || '').toLowerCase()
      const combined = `${cat} ${name} ${sysCategory}`

      // Check KB + menu data for dietary-friendly signals before flagging
      const kb = (kbContentByBusinessId.get(business.id) || '').toLowerCase()
      const menuItems = (business.menu_preview || []).map((i: any) => `${i.name || ''} ${i.description || ''}`).join(' ').toLowerCase()
      const allContent = `${kb} ${menuItems}`

      const isVeg = dietaryLower.includes('vegetarian') || dietaryLower.includes('vegan')
      const isVegan = dietaryLower.includes('vegan')

      // If the business KB/menu explicitly mentions catering to this diet, no conflict
      const vegFriendlySignals = /\b(vegetarian (menu|option|friendly|section)|veg(an|etarian) burger|plant.?based|meat.?free|veggie (menu|option|burger|wrap))\b/
      const veganFriendlySignals = /\b(vegan (menu|option|friendly|section)|plant.?based (menu|option)|fully vegan)\b/

      if (isVeg && vegFriendlySignals.test(allContent)) return false
      if (isVegan && veganFriendlySignals.test(allContent)) return false

      if (isVeg && /\b(grill|steakhouse|steak house|wing|bbq|barbecue|burger bar|meat)\b/.test(combined)) return true
      if (isVegan && /\b(grill|steakhouse|steak house|wing|bbq|barbecue|burger bar|meat|dairy|cheese)\b/.test(combined)) return true
      if (dietaryLower.includes('shellfish allergy') && /\b(seafood|shellfish|oyster)\b/.test(combined)) return true
      if (dietaryLower.includes('gluten free') && /\b(bakery|donut|pizza)\b/.test(combined)) return true

      return false
    }

    // Step 4b: Build RICH context with KB content merged with DB data
    const businessContext = sortedForContext.length > 0
      ? sortedForContext.slice(0, 10).map((business, index) => {
          const offerCount = business.id ? businessOfferCounts[business.id] || 0 : 0
          const offerText = offerCount > 0 ? ` [Has ${offerCount} ${offerCount === 1 ? 'offer' : 'offers'} available]` : ''
          
          // 📚 PRIORITY: Use KB content if available (has ALL relevant entries concatenated!)
          const kbContent = kbContentByBusinessId.get(business.id)
          
          let richContent = ''
          if (kbContent) {
            let processedKb = kbContent
            // Tag individual secret menu items that conflict with user dietary restrictions
            if (dietaryLower.length > 0) {
              const isVeg = dietaryLower.includes('vegetarian') || dietaryLower.includes('vegan')
              const isVegan = dietaryLower.includes('vegan')
              const meatSignals = /\b(steak|ribeye|sirloin|pork|bacon|chicken|lamb|beef|brisket|ribs|bone marrow|duck|venison|sausage|wing|burger(?!\s*\(v))\b/i

              processedKb = processedKb.replace(
                /(SECRET MENU ITEM:.*?)(?=\nSECRET MENU ITEM:|\n\n|$)/gs,
                (block) => {
                  if (isVeg && meatSignals.test(block)) {
                    return `[⚠️ DIETARY CONFLICT — this item contains meat/fish, user is ${userDietaryRestrictions.join('/')}. Do NOT recommend without asking first.]\n${block}`
                  }
                  return block
                }
              )
            }
            richContent = `\n${processedKb}`
            console.log(`✅ Using KB content for ${business.business_name} (${processedKb.length} chars)`)
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
          
          // 📅 Add opening hours if available
          let hoursLine = ''
          if (business.business_hours_structured) {
            const openStatus = getOpenStatusForToday(business.business_hours_structured, new Date())
            if (openStatus.hasHours && openStatus.conversational) {
              hoursLine = `\nHours: ${openStatus.conversational}`
            }
          }
          if (!hoursLine && business.business_hours) {
            hoursLine = `\nHours: ${business.business_hours}`
          }
          
          // Build rating line (only show if has real reviews)
          let ratingLine = ''
          if (business.rating && business.rating > 0 && business.review_count && business.review_count > 0) {
            ratingLine = `\nRating: ${business.rating}★ from ${business.review_count} Google reviews`
          }
          
          // Loyalty program context with prominent tags for user progress
          let loyaltyLine = ''
          let loyaltyTag = ''
          const loyaltyProg = loyaltyByBusinessId.get(business.id)
          if (loyaltyProg) {
            loyaltyLine = `\nLoyalty: Collect ${loyaltyProg.reward_threshold} stamps for ${loyaltyProg.reward_description}`
            if (context.walletPassId) {
              const userProgress = userLoyaltyByBusinessId.get(business.id)
              if (userProgress) {
                const rewardReady = userProgress.stamps_remaining <= 0
                const almostThere = userProgress.stamps_remaining > 0 && userProgress.stamps_remaining <= 3
                loyaltyLine += ` [USER: ${userProgress.stamps_balance}/${loyaltyProg.reward_threshold} stamps, ${userProgress.stamps_remaining} to go]`
                if (rewardReady) {
                  loyaltyTag = ` [⭐ REWARD READY — free ${loyaltyProg.reward_description} waiting!]`
                } else if (almostThere) {
                  loyaltyTag = ` [🔥 ${userProgress.stamps_remaining} stamp${userProgress.stamps_remaining !== 1 ? 's' : ''} away from free ${loyaltyProg.reward_description}!]`
                }
              }
            }
          }

          let vibesLine = ''
          const vibeStats = vibesMap.get(business.id)
          if (vibeStats && vibeStats.total_vibes >= 5) {
            vibesLine = `\n💚 Qwikker Vibes 💚 ${vibeStats.positive_percentage}% positive from ${vibeStats.total_vibes} users`
          }

          let bookingLine = ''
          if (business.booking_url) {
            bookingLine = `\nBook online: ${business.booking_url}`
          } else if (business.booking_preference === 'phone' && business.phone) {
            bookingLine = `\nBook by phone: ${business.phone}`
          }

          let vibeTagsLine = ''
          const vt = business.vibe_tags as { selected?: string[]; custom?: string[] } | null
          if (vt) {
            const allTags = [...(vt.selected || []), ...(vt.custom || [])]
            if (allTags.length > 0) {
              vibeTagsLine = `\nTags: ${allTags.join(', ')}`
            }
          }

          const businessSlug = getBusinessSlug(business)
          const dietaryConflictTag = hasDietaryConflict(business)
            ? ` [⚠️ DIETARY CONFLICT — do NOT lead with this business for ${userDietaryRestrictions.join('/')} user]`
            : ''
          return `**${business.business_name}** [TIER: ${business.tierLabel}] [SLUG: ${businessSlug}]${loyaltyTag}${dietaryConflictTag}${ratingLine}${vibesLine}
Category: ${business.display_category || 'Not specified'}${vibeTagsLine}${hoursLine}${loyaltyLine}${bookingLine}${richContent}${offerText}`
        }).join('\n\n')
      : 'No businesses available in this city yet.'
    
    console.log(`📊 AI Context: ${sortedForContext.length} total businesses, ${kbContentByBusinessId.size} with KB content, context length: ${businessContext.length} chars`)

    const cityContext = cityResults.success && cityResults.results.length > 0
      ? cityResults.results.map(result => 
          `${result.title}: ${result.content}`
        ).join('\n\n')
      : ''

    // 🔎 DIagnostic: show exactly which city-knowledge entries reached the prompt
    console.log(`🏛️ CITY KNOWLEDGE → ${cityResults.results.length} entries, ${cityContext.length} chars | ${cityResults.results.map((r: any) => `"${r.title}" (${(r.content || '').length}c, biz=${r.business_id ? 'Y' : 'null'})`).join(' | ') || 'NONE'}`)
    
    // 🎯 STEP 4: Build context-aware system prompt (SIMPLE AND CLEAR)
    const stateContext = generateStateContext(state)
    
    // Broad query detection: clarify-first when category is broad and unconstrained.
    // Skip clarify when user already asked for top picks / a specific dish follow-up.
    const relevantCount = allBusinessesForContext.filter(b => (b.relevanceScore || 0) >= INJECT_MIN).length
    const hasCategoryButNoConstraints = detectedIntent.hasIntent 
      && detectedIntent.categories.length > 0 
      && detectedIntent.keywords.length === 0
      && !wantsTopPicks
    const isGenericDiscovery = !detectedIntent.hasIntent 
      && /\b(restaurant|restaurants|eat|food|place|places|where should i|recommend|suggest|dinner|lunch|breakfast|bar|bars|pub|pubs|drinks?|cocktails?|cafe|cafes|coffee)\b/i.test(userMessage)
    
    const isBroadQuery = conversationHistory.length <= 2 
      && (hasCategoryButNoConstraints || isGenericDiscovery)
      && relevantCount >= 3
      && !wantsTopPicks

    const availableTypes = isBroadQuery
      ? deriveAvailableTypes(
          allBusinessesForContext.filter((b) => (b.relevanceScore || 0) >= INJECT_MIN),
          5
        )
      : []
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🎯 [BROAD QUERY CHECK] hasIntent=${detectedIntent.hasIntent}, relevantCount=${relevantCount}, isBroadQuery=${isBroadQuery}, types=${availableTypes.join('|') || 'none'}`)
    }
    
    const cityDisplayName = city.charAt(0).toUpperCase() + city.slice(1)
    
    // Compute Atlas availability from businesses we'll actually surface.
    // If dish/menu matches produced a relevance filter, use that set — never the
    // full city catalog (that caused "no sambosa" + "tour these spots" contradictions).
    const hasMenuOrIntentHits = sortedForContext.length > 0
      && sortedForContext.length < allBusinessesForContext.length
      && sortedForContext.some((b) => (b.relevanceScore || 0) >= INJECT_MIN)
    const candidatesForAtlas = (detectedIntent.hasIntent || hasMenuOrIntentHits)
      ? sortedForContext
      : allBusinessesForContext
    
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
    
    // 🎯 PRE-AI EVENT FETCH: Detect event intent and fetch events BEFORE the AI call
    // so the AI knows about upcoming events and can reference them naturally
    let eventCards: ChatResponse['eventCards'] = []
    let eventContext = ''

    const eventIntentPatterns = /\b(any events|events?\s+(?:near|in|at|this|happening|on|coming|soon)|what(?:'?s| is)\s+(?:on|happening)|things to do|concerts?|gigs?|live music|upcoming events?|events?\s+tonight|events?\s+this weekend|show me events?|happening\s+(?:soon|tonight|this|near))\b/i
    const currentMessageWantsEvents = eventIntentPatterns.test(userMessage)
    const isNonEventContext = /\b(menu|mains|food|lunch|dinner|breakfast|dish|meal|eat|burger|steak|offer|deal|discount|promo|restaurant|bar|cafe|pub)\b/i.test(userMessage)
    const recentUserMessages = conversationHistory.slice(-4).filter(m => m.role === 'user').map(m => m.content).join(' ')
    const userPreviouslyAskedEvents = eventIntentPatterns.test(recentUserMessages)
    const showingInterest = /\b(yes|yeah|yep|sure|sounds good|tell me more|show me the event|pull up the event)\b/i.test(userMessage)
    const shouldFetchEvents = (currentMessageWantsEvents && !isNonEventContext) || (userPreviouslyAskedEvents && showingInterest && !isNonEventContext)

    console.log(`🎉 EVENT QUERY CHECK:`, {
      userMessage,
      currentMessageWantsEvents,
      userPreviouslyAskedEvents,
      showingInterest,
      shouldFetchEvents
    })

    if (shouldFetchEvents) {
      try {
        console.log(`🎉 FETCHING EVENT CARDS - User wants event details for ${city}`)

        const recentMessages = conversationHistory.slice(-4).map(m => m.content).join(' ')
        const tastingMentioned = /tasting experience|tasting event|tasting night|cocktail tasting/i.test(recentMessages)
        const jazzMentioned = /jazz night|live jazz|jazz event/i.test(recentMessages)

        const allRelevantText = `${userMessage} ${recentMessages}`
        const dateMatch = allRelevantText.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(?:december|dec|november|nov|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct)\b/i)

        let specificDate: string | null = null
        if (dateMatch) {
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

        if (specificDate) {
          query = query.eq('event_date', specificDate)
        } else if (tastingMentioned) {
          query = query.ilike('event_name', '%tasting%')
        } else if (jazzMentioned) {
          query = query.ilike('event_name', '%jazz%')
        } else {
          query = query.limit(3)
        }

        const { data: events, error } = await query

        if (!error && events && events.length > 0) {
          eventCards = events.map(event => ({
            id: event.id,
            title: event.event_name?.trim() || 'Untitled Event',
            description: event.event_description || 'No description',
            event_type: event.event_type || 'Other',
            start_date: event.event_date,
            start_time: event.event_start_time || null,
            end_date: null,
            end_time: event.event_end_time || null,
            location: event.custom_location_name || event.business_profiles?.business_name || 'TBA',
            ticket_url: event.booking_url || null,
            image_url: event.event_image || null,
            business_name: event.business_profiles?.business_name || 'Unknown Business',
            business_id: event.business_id
          }))

          // Build context string so the AI knows what events are available
          eventContext = `UPCOMING EVENTS IN ${cityDisplayName}:\n` + eventCards.map(e => {
            const datePart = e.start_date ? new Date(e.start_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
            const timePart = e.start_time ? ` at ${e.start_time}` : ''
            return `- "${e.title}" at ${e.business_name} (${datePart}${timePart})`
          }).join('\n') + `\nEvent cards will be displayed in the UI alongside your response. Reference these events naturally and enthusiastically. Do NOT say you don't have event information.`

          console.log(`✅ Pre-fetched ${eventCards.length} event cards for AI context`)
        } else if (error) {
          console.error('❌ Error fetching events:', error)
        } else {
          console.log('ℹ️ No upcoming events found')
        }
      } catch (error) {
        console.error('❌ Error fetching event cards:', error)
      }
    }

    // Build tag match callout for the top business if it has a strong tag match
    let tagMatchCallout = ''
    if (detectedIntent.hasIntent && sortedForContext.length > 0) {
      const topBiz = sortedForContext[0]
      if ((topBiz.relevanceScore || 0) >= 4) {
        const vt = topBiz.vibe_tags as { selected?: string[]; custom?: string[] } | null
        if (vt) {
          const allTags = [...(vt.selected || []), ...(vt.custom || [])].map(t => t.toLowerCase())
          const matchedTags = detectedIntent.keywords.filter(kw => {
            const kwLower = kw.toLowerCase()
            const kwHyph = kwLower.replace(/\s+/g, '-')
            return allTags.some(tag => tag === kwLower || tag === kwHyph || tag.replace(/-/g, ' ') === kwLower)
          })
          if (matchedTags.length > 0) {
            tagMatchCallout = `\n🎯 PRIORITY MATCH: "${topBiz.business_name}" has explicit vibe tags matching the user's query (${matchedTags.join(', ')}). This is verified business data — recommend this business FIRST.\n`
          }
        }
      }
    }

    const softFallbackCallout = usedSoftCategoryFallback
      ? `\n🛟 INVENTORY FALLBACK: Exact keyword scoring was weak, but these venues ARE on Qwikker and fit the request type (bars/drinks/etc). You MUST recommend from this list. NEVER say there aren't any bars/places listed.\n`
      : ''

    const systemPrompt = buildSystemPromptV2({ 
      cityDisplayName, 
      userMessage, 
      isBroadQuery,
      availableTypes,
      stateContext, 
      businessContext: softFallbackCallout + tagMatchCallout + businessContext, 
      cityContext, 
      state,
      atlasAvailable,
      currentTime,
      previousResponses,
      userName,
      userLoyaltySummary,
      eventContext,
      userProfileSection,
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
      
      // Fetch full business data — use eligibility view to prevent expired businesses leaking
      const { data: fullBusiness } = await supabase
        .from('business_profiles_chat_eligible')
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

          if (factCompletion.usage) {
            logAIUsage({ city, walletPassId: context.walletPassId, model: modelToUse, usage: factCompletion.usage, queryType: 'fact_mode' })
          }
          
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

      if (completion.usage) {
        logAIUsage({ city, walletPassId: context.walletPassId, model: modelToUse, usage: completion.usage, queryType: classification.complexity })
      }
    }
    
    // === POST-PROCESSING GUARDRAILS ===
    const loyaltyNamesForGuard = new Set<string>()
    for (const [bizId] of userLoyaltyByBusinessId) {
      const biz = allBusinessesForContext.find((b) => b.id === bizId)
      const name = (biz?.business_name || '').toLowerCase().trim()
      if (name) loyaltyNamesForGuard.add(name)
    }
    aiResponse = postProcessResponse(aiResponse, allBusinessesForContext, loyaltyNamesForGuard)
    
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
    
    // Event cards were already fetched in the pre-AI step above
    
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
      // T1-only was wrong for T3-heavy cities (e.g. Zanzibar): Atlas/CTA looked empty
      // even when relevant unclaimed restaurants existed.
      hasBusinessResults = businessById.size > 0
      
      console.log(`💼 Total businesses after merge: ${Array.from(businessById.values()).length} (${kbScoreById.size} had KB content)`)
      
      // vibesMap already populated in Step 1b above — reuse it here
      
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
          const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet, userMessage)
          businessRelevanceScores.set(b.id, score) // Store for carousel filtering
          return {
            ...b,
            tierPriority: 1,
            relevanceScore: score
          }
        })
        
        // ALWAYS score Tier 2 (for text filtering) even if we don't fetch Tier 3
        liteBusinesses.forEach(b => {
          const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet, userMessage)
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
              relevanceScore: scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet, userMessage),
              tierSource: 'tier2'
            }))
            .filter(b => b.relevanceScore > 0)
          
          console.log(`🎯 Tier 2: ${tier2WithScores.length} relevant claimed-free businesses`)
          
          // ✅ FIX: Score ALL Tier 3 businesses first, THEN filter by relevance
          const tier3WithScores = (tier3 || [])
            .map(b => ({
              ...b,
              tierPriority: 3,
              relevanceScore: scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id), kbScoreById.get(b.id), facet, userMessage),
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
      console.log(`🎨 UI Mode: ${uiMode}, carousel: OFF`)
      
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
            slug: getBusinessSlug(b!),
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
    
    // Only populate mapPins if we have businesses with coordinates to show
    const shouldBuildMapPins = sortedForContext.some((b: any) => b.latitude && b.longitude)
    
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
      // Prefer strong matches for Atlas — weak score>=1 noise made dish queries
      // open a 12-place tour when chat only named one spot.
      const topAtlasScore = Math.max(0, ...sortedForContext.map((b: any) => b.relevanceScore || 0))
      const atlasScoreFloor = topAtlasScore >= CAROUSEL_MIN ? CAROUSEL_MIN : CONTEXT_MIN
      const relevantBusinessesForAtlas = sortedForContext
        .filter((b: any) => (b.relevanceScore || 0) >= atlasScoreFloor)
        .slice(0, 12)
      
      console.log(`🗺️ Atlas pin floor: score>=${atlasScoreFloor} (top=${topAtlasScore}) → ${relevantBusinessesForAtlas.length} candidates`)

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
          
          const loyaltyProg = loyaltyByBusinessId.get(b.id)
          const userProgress = userLoyaltyByBusinessId.get(b.id)

          mapPins.push({
            id: b.id,
            slug: getBusinessSlug(b),
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
            hasLoyalty: !!loyaltyProg,
            loyaltyReward: loyaltyProg?.reward_description,
            loyaltyThreshold: loyaltyProg?.reward_threshold,
            userStamps: userProgress?.stamps_balance,
            userStampsRemaining: userProgress?.stamps_remaining,
            reason: getReasonTag(
              b,
              detectedIntent,
              businessRelevanceScores.get(b.id) || 0,
              context.userLocation,
              isBrowseModeForReasons,
              allBusinessesForRanking
            ),
            reasonMeta: safeGetReasonMeta(b, context.userLocation)
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
      contextBusinesses: sortedForContext.map(b => ({ business_name: b.business_name, id: b.id })),
      queryCategories: detectedIntent.categories, // ✅ ATLAS: For filtering businesses by query
      queryKeywords: detectedIntent.keywords, // ✅ ATLAS: For filtering businesses by query
      modelUsed: modelToUse,
      classification,
      metadata: {
        atlasAvailable, // Server-computed flag: true if 2+ candidates have valid coords
        coordsCandidateCount: (candidatesForAtlas || []).filter(hasValidCoords).length,
        currentBusinessId: namedLockBusiness?.id ?? state.currentBusiness?.id ?? null,
        currentBusinessSlug: namedLockBusiness?.slug ?? state.currentBusiness?.slug ?? null,
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

  // SECURITY: UUID validation first
  if (!isValidUUID(businessId)) {
    console.error(`❌ Invalid business ID: ${businessId}`)
    return {
      success: false,
      error: 'Invalid business ID'
    }
  }

  // Service role + explicit city check. Anon/RLS on chat_eligible alone misses
  // unclaimed T3 (Atlas "Tell me more" for imports like CHE Rock).
  const supabase = createServiceRoleClient()
  const city = (context.city || '').toLowerCase()

  const detailViews = [
    'business_profiles_chat_eligible',
    'business_profiles_lite_eligible',
    'business_profiles_ai_fallback_pool',
  ] as const

  let business: any = null
  let detailViewUsed: string | null = null
  for (const view of detailViews) {
    const { data, error } = await supabase
      .from(view)
      .select('*')
      .eq('id', businessId)
      .maybeSingle()
    if (!error && data) {
      business = data
      detailViewUsed = view
      break
    }
  }

  // Last resort: base table (still city-gated below)
  if (!business) {
    const { data } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', businessId)
      .maybeSingle()
    if (data) {
      business = data
      detailViewUsed = 'business_profiles'
    }
  }

  if (!business) {
    console.error(`❌ Business not found across chat tiers: ${businessId}`)
    return {
      success: false,
      error: 'Business not found'
    }
  }

  // Tenant isolation — never return another city's listing
  if (city && business.city && String(business.city).toLowerCase() !== city) {
    console.error(
      `🚨 Detail city mismatch: business ${businessId} city=${business.city} request=${city}`
    )
    return {
      success: false,
      error: 'Business not found'
    }
  }

  console.log(`✅ Detail lookup via ${detailViewUsed}: ${business.business_name}`)
  
  const vibeStats = await getBusinessVibeStats(businessId)

  // Build detail context
  const detailLines = [
    `Business: ${business.business_name}`,
    `Category: ${business.display_category || business.system_category || 'Local business'}`,
    business.business_tagline ? `Tagline: ${business.business_tagline}` : null,
    business.rating && business.review_count ? 
      `Rating: ${business.rating}★ from ${business.review_count} Google reviews` : null,
    vibeStats && vibeStats.total_vibes >= 5 ?
      `Qwikker Vibes: ${vibeStats.positive_percentage}% positive from ${vibeStats.total_vibes} users` : null,
    business.business_address ? `Location: ${business.business_address}` : null,
    business.phone ? `Phone: ${business.phone}` : null,
    business.website_url ? `Website: ${business.website_url}` : null,
    business.business_hours ? `Hours: ${business.business_hours}` : null,
    (() => {
      const vt = (business as Record<string, unknown>).vibe_tags as { selected?: string[]; custom?: string[] } | null
      if (!vt) return null
      const all = [...(vt.selected || []), ...(vt.custom || [])]
      return all.length > 0 ? `Tags: ${all.join(', ')}` : null
    })()
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

    if (completion.usage) {
      logAIUsage({ city: context.city, walletPassId: context.walletPassId, model: 'gpt-4o-mini', usage: completion.usage, queryType: 'business_detail' })
    }
    
    console.log(`✅ Generated detail response for ${business.business_name}`)
    
    return {
      success: true,
      response: aiResponse,
      businessCarousel: [{
        id: business.id,
        slug: getBusinessSlug(business),
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
        slug: getBusinessSlug(business),
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

