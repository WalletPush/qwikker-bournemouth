/**
 * SOCIAL WIZARD v1 — DETERMINISTIC CONTEXT BUILDER
 * 
 * Builds marketing context from business data with strict grounding rules:
 * - Never invent facts
 * - Only use data from DB/KB
 * - Secret menu ONLY if Spotlight tier AND explicitly flagged
 * - Store source IDs for traceability
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface MarketingContext {
  business: {
    name: string
    category: string
    town: string
    vibe: string | null
    effective_tier: string
  }
  offers: Array<{
    id: string
    offer_name: string
    offer_value: string
    offer_end_date: string
  }>
  events: Array<{
    id: string
    event_name: string
    event_description: string
    event_date: string
    event_start_time: string | null
  }>
  menuHighlights: Array<{
    id: string
    name: string
    description?: string
    price?: string
  }>
  secretMenu: Array<{
    id: string
    name: string
    description: string
  }>
  reviews: Array<{
    id: string
    rating: number
    text?: string
    author?: string
  }>
  imagery: string[]
  sourceIds: {
    offers: string[]
    events: string[]
    menuItems: string[]
  }
}

/**
 * Build complete marketing context for AI generation
 * 
 * @param businessId - Business UUID
 * @param pinnedSource - Optional specific source to focus on
 * @param secretMenuItemId - Optional secret menu item ID (Spotlight tier only)
 */
export async function buildBusinessMarketingContext(
  businessId: string,
  pinnedSource?: { type: 'offer' | 'event' | 'menu'; id: string },
  secretMenuItemId?: string | null
): Promise<MarketingContext> {
  
  const supabase = createAdminClient()

  // 1. Fetch business profile
  const { data: business, error: businessError } = await supabase
    .from('business_profiles')
    .select('business_name, system_category, business_town, business_tagline, plan, business_images')
    .eq('id', businessId)
    .single()

  if (businessError || !business) {
    throw new Error(`Business not found: ${businessError?.message}`)
  }

  const tier = business.plan || 'starter'

  // 2. Fetch active offers (approved + not expired)
  const { data: offers } = await supabase
    .from('business_offers')
    .select('id, offer_name, offer_value, offer_end_date')
    .eq('business_id', businessId)
    .eq('status', 'approved')
    .gt('offer_end_date', new Date().toISOString())
    .order('display_order', { ascending: true })
    .limit(5)

  // 3. Fetch upcoming events (approved + future)
  const { data: events } = await supabase
    .from('business_events')
    .select('id, event_name, event_description, event_date, event_start_time')
    .eq('business_id', businessId)
    .eq('status', 'approved')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(3)

  // 4. Fetch menu highlights from knowledge_base
  // DEFENSIVE: KB schema may vary, extract deterministically
  const menuHighlights = await extractMenuHighlights(supabase, businessId)

  // 5. Fetch secret menu (ONLY if Spotlight tier AND secretMenuItemId provided)
  let secretMenu: Array<{ id: string; name: string; description: string }> = []
  if (tier === 'spotlight' && secretMenuItemId) {
    secretMenu = await extractSecretMenu(supabase, businessId, secretMenuItemId)
  }

  // 6. Fetch reviews (if stored locally)
  // Note: May not have reviews table yet; return empty array
  const reviews: Array<{ id: string; rating: number; text?: string; author?: string }> = []
  // TODO: Implement if reviews table exists

  // 7. Business imagery
  const imagery = business.business_images || []

  return {
    business: {
      name: business.business_name,
      category: business.system_category || 'restaurant',
      town: business.business_town || '',
      vibe: business.business_tagline,
      effective_tier: tier
    },
    offers: offers || [],
    events: events || [],
    menuHighlights,
    secretMenu,
    reviews,
    imagery,
    sourceIds: {
      offers: (offers || []).map(o => o.id),
      events: (events || []).map(e => e.id),
      menuItems: menuHighlights.map(m => m.id)
    }
  }
}

/**
 * Extract menu highlights from knowledge_base (defensive)
 * Handles variable KB schema gracefully
 */
async function extractMenuHighlights(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string
): Promise<Array<{ id: string; name: string; description?: string; price?: string }>> {
  
  // Query KB entries for this business
  const { data: kbEntries } = await supabase
    .from('knowledge_base')
    .select('id, title, content, metadata')
    .eq('business_id', businessId)
    .limit(20) // Get more, then filter

  if (!kbEntries || kbEntries.length === 0) {
    return []
  }

  // Helper to check if item is secret (exclude from regular menu highlights)
  const isSecret = (entry: any): boolean => {
    const title = entry.title?.toLowerCase() || ''
    const content = entry.content?.toLowerCase() || ''
    return title.includes('secret menu') || content.includes('secret menu item')
  }

  const highlights: Array<{ id: string; name: string; description?: string; price?: string }> = []

  for (const entry of kbEntries) {
    // Skip secret menu items
    if (isSecret(entry)) continue
    // Skip if explicitly marked as secret
    if (entry.metadata?.is_secret || entry.metadata?.secret) {
      continue
    }

    // Try structured metadata first
    if (entry.metadata?.name) {
      highlights.push({
        id: entry.id,
        name: entry.metadata.name,
        description: entry.metadata.description || entry.content?.slice(0, 100),
        price: entry.metadata.price || undefined
      })
      continue
    }

    // Fallback: extract from content if it looks like a menu item
    if (entry.content) {
      const lines = entry.content.split('\n').filter(l => l.trim().length > 3)
      for (const line of lines.slice(0, 2)) { // First 2 lines only
        if (line.match(/^[-•*]\s*(.+)/)) {
          // Bullet point format
          const name = line.replace(/^[-•*]\s*/, '').trim().slice(0, 50)
          if (name.length > 3) {
            highlights.push({
              id: entry.id,
              name,
              description: undefined,
              price: undefined
            })
            break
          }
        } else if (line.length > 5 && line.length < 60) {
          // Short line that might be a dish name
          highlights.push({
            id: entry.id,
            name: line.trim().slice(0, 50),
            description: undefined,
            price: undefined
          })
          break
        }
      }
    }

    if (highlights.length >= 5) break
  }

  return highlights.slice(0, 5)
}

/**
 * Extract secret menu items (uses same detection as chat system)
 * Detects from title/content patterns, not just strict metadata flags
 * 
 * @param secretMenuItemId - Optional specific secret menu item ID to fetch
 */
async function extractSecretMenu(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  secretMenuItemId?: string
): Promise<Array<{ id: string; name: string; description: string }>> {
  
  // Helper to detect if entry is secret menu
  const isSecretMenuItem = (entry: any): boolean => {
    const title = entry.title?.toLowerCase() || ''
    const content = entry.content?.toLowerCase() || ''
    const metadataType = entry.metadata?.type?.toLowerCase() || ''
    
    // Check metadata flags
    if (entry.metadata?.is_secret === true || entry.metadata?.secret === true) {
      return true
    }
    
    // Check title/content for "secret menu" pattern (like chat does)
    if (
      title.includes('secret menu') ||
      title.includes('secret item') ||
      content.includes('secret menu item') ||
      metadataType.includes('secret')
    ) {
      return true
    }
    
    return false
  }

  // If specific item ID provided, fetch only that item
  if (secretMenuItemId) {
    const { data: entry } = await supabase
      .from('knowledge_base')
      .select('id, title, content, metadata')
      .eq('id', secretMenuItemId)
      .eq('business_id', businessId)
      .single()

    if (!entry || !isSecretMenuItem(entry)) return []

    // Extract clean name (remove business prefix)
    let name = entry.metadata?.name || entry.title || 'Secret Item'
    name = name.replace(/.*?-\s*Secret Menu:\s*/i, '')
    name = name.replace(/.*?-\s*/i, '')
    
    const description = entry.metadata?.description || entry.content?.slice(0, 100) || ''

    return [{
      id: entry.id,
      name,
      description
    }]
  }

  // Otherwise, fetch all secret menu items
  const { data: allEntries } = await supabase
    .from('knowledge_base')
    .select('id, title, content, metadata')
    .eq('business_id', businessId)
    .limit(50)

  if (!allEntries || allEntries.length === 0) {
    return []
  }

  const secretItems: Array<{ id: string; name: string; description: string }> = []

  for (const entry of allEntries) {
    if (!isSecretMenuItem(entry)) continue

    // Extract clean name
    let name = entry.metadata?.name || entry.title || 'Secret Item'
    name = name.replace(/.*?-\s*Secret Menu:\s*/i, '')
    name = name.replace(/.*?-\s*/i, '')
    
    const description = entry.metadata?.description || entry.content?.slice(0, 100) || ''

    if (name && description) {
      secretItems.push({
        id: entry.id,
        name,
        description
      })
    }

    if (secretItems.length >= 5) break
  }

  return secretItems
}
