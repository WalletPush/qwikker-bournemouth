/**
 * SOCIAL WIZARD v1 — PROMPT BUILDER
 * 
 * Builds strict, grounded prompts that output ONLY valid JSON
 * No hallucinations, no exaggeration, only facts from context
 */

import { MarketingContext } from './contextBuilder'

export type PostGoal = 'promote_offer' | 'hype_event' | 'menu_spotlight' | 'general_update'
export type PostTone = 'premium' | 'bold' | 'friendly' | 'playful'

export interface PromptInput {
  goal: PostGoal
  tone: PostTone
  hookTags: string[] // e.g., ['limited time', 'new', 'locals love']
  context: MarketingContext
  pinnedSource?: { type: 'offer' | 'event' | 'menu'; id: string }
}

export interface PromptOutput {
  systemPrompt: string
  userPrompt: string
}

/**
 * Build system and user prompts for AI generation
 * Enforces strict JSON output format
 */
export function buildSocialPrompt(input: PromptInput): PromptOutput {
  const { goal, tone, hookTags, context, pinnedSource } = input

  // Build focus content if source is pinned
  let focusContent = ''
  if (pinnedSource) {
    if (pinnedSource.type === 'offer') {
      const offer = context.offers.find(o => o.id === pinnedSource.id)
      if (offer) {
        focusContent = `\n🎯 FOCUS: Promote this offer: "${offer.offer_name}" - ${offer.offer_value} (ends ${offer.offer_end_date})`
      }
    } else if (pinnedSource.type === 'event') {
      const event = context.events.find(e => e.id === pinnedSource.id)
      if (event) {
        focusContent = `\n🎯 FOCUS: Promote this event: "${event.event_name}" on ${event.event_date}. ${event.event_description}`
      }
    } else if (pinnedSource.type === 'menu') {
      const item = context.menuHighlights.find(m => m.id === pinnedSource.id)
      if (item) {
        focusContent = `\n🎯 FOCUS: Highlight this menu item: "${item.name}". ${item.description || ''}`
      }
    }
  }

  // Build system prompt with strict JSON output requirement
  const systemPrompt = `You are an elite social media copywriter for local businesses.

TONE: ${tone}
GOAL: ${goal}
HOOKS: ${hookTags.join(', ') || 'none'}

BUSINESS CONTEXT:
- Name: ${context.business.name}
- Category: ${context.business.category}
- Location: ${context.business.town}
${context.business.vibe ? `- Vibe: ${context.business.vibe}` : ''}
${focusContent}

AVAILABLE ASSETS:
${context.offers.length > 0 ? `\nOFFERS:\n${context.offers.map(o => `- ${o.offer_name}: ${o.offer_value} (ends ${o.offer_end_date})`).join('\n')}` : ''}
${context.events.length > 0 ? `\nEVENTS:\n${context.events.map(e => `- ${e.event_name} on ${e.event_date}: ${e.event_description}`).join('\n')}` : ''}
${context.menuHighlights.length > 0 ? `\nMENU HIGHLIGHTS:\n${context.menuHighlights.map(m => `- ${m.name}${m.description ? `: ${m.description}` : ''}${m.price ? ` (${m.price})` : ''}`).join('\n')}` : ''}
${context.secretMenu.length > 0 ? `\nSECRET MENU (SPOTLIGHT TIER ONLY):\n${context.secretMenu.map(s => `- ${s.name}: ${s.description}`).join('\n')}` : ''}

🚨 STRICT RULES:
1. NEVER invent facts not provided above
2. NEVER claim awards/"best in town" unless explicitly stated
3. NEVER mention competitors
4. Secret menu items ONLY if listed above
5. Use ONLY real offers/events/menu items from the data
6. Be authentic, not salesy or exaggerated
7. Keep captions concise (150-220 characters ideal, max 250)
8. Generate EXACTLY 8 hashtags in 3 categories:
   - 3 LOCAL hashtags (e.g., #${context.business.town}Eats, #${context.business.town}Food, #Visit${context.business.town})
   - 3 NICHE hashtags (industry-specific, e.g., #BurgerLovers, #CraftCocktails, #LocalCoffee)
   - 2 TRENDING engagement hashtags (e.g., #WeekendVibes, #Foodie, #DateNight)

📋 OUTPUT FORMAT (JSON ONLY):
You MUST output ONLY valid JSON with NO extra text before or after.

{
  "variants": [
    {
      "caption": "engaging caption here (max 250 chars)",
      "hashtags": ["#LocalTag1", "#LocalTag2", "#LocalTag3", "#NicheTag1", "#NicheTag2", "#NicheTag3", "#TrendingTag1", "#TrendingTag2"],
      "template": "offer_card"
    },
    {
      "caption": "second unique caption here",
      "hashtags": ["#Local1", "#Local2", "#Local3", "#Niche1", "#Niche2", "#Niche3", "#Trending1", "#Trending2"],
      "template": "event_card"
    },
    {
      "caption": "third unique caption here",
      "hashtags": ["#Local1", "#Local2", "#Local3", "#Niche1", "#Niche2", "#Niche3", "#Trend1", "#Trend2"],
      "template": "general"
    }
  ]
}

Templates: offer_card | event_card | menu_spotlight | general

Each variant must be unique in angle and wording.`

  const userPrompt = `Create 3 social media post variants for ${context.business.name}.

Goal: ${goal}
Tone: ${tone}
${hookTags.length > 0 ? `Hooks: ${hookTags.join(', ')}` : ''}
${focusContent}

Output ONLY valid JSON with 3 variants. No extra text.`

  return { systemPrompt, userPrompt }
}

/**
 * Build campaign pack prompt (5 posts with different angles)
 * Used for Spotlight tier campaign generation
 */
export function buildCampaignPrompt(input: PromptInput): PromptOutput {
  const { goal, tone, context, pinnedSource } = input

  let focusContent = ''
  if (pinnedSource) {
    if (pinnedSource.type === 'offer') {
      const offer = context.offers.find(o => o.id === pinnedSource.id)
      if (offer) {
        focusContent = `\n🎯 CAMPAIGN FOCUS: "${offer.offer_name}" - ${offer.offer_value} (ends ${offer.offer_end_date})`
      }
    } else if (pinnedSource.type === 'event') {
      const event = context.events.find(e => e.id === pinnedSource.id)
      if (event) {
        focusContent = `\n🎯 CAMPAIGN FOCUS: "${event.event_name}" on ${event.event_date}`
      }
    }
  }

  const systemPrompt = `You are creating a 5-post campaign series for ${context.business.name}.

TONE: ${tone}
GOAL: ${goal}
${focusContent}

BUSINESS CONTEXT:
- Name: ${context.business.name}
- Category: ${context.business.category}
- Location: ${context.business.town}

AVAILABLE ASSETS:
${context.offers.length > 0 ? `Offers: ${context.offers.map(o => o.offer_name).join(', ')}` : ''}
${context.events.length > 0 ? `Events: ${context.events.map(e => e.event_name).join(', ')}` : ''}
${context.menuHighlights.length > 0 ? `Menu: ${context.menuHighlights.map(m => m.name).join(', ')}` : ''}

🎯 CAMPAIGN STRATEGY (5 posts with different angles):
Post 1: TEASE - Build curiosity without revealing everything
Post 2: FEATURE - Showcase with all details
Post 3: SOCIAL_PROOF - Use testimonials/reviews to build trust
Post 4: REMINDER - Create urgency (limited time, seats, etc.)
Post 5: LAST_CALL - Final push with strong CTA

🚨 STRICT RULES:
- Use ONLY facts from context above
- NEVER invent details
- Keep captions concise (150-220 chars)
- Each post must have unique angle and wording
- Generate EXACTLY 8 hashtags per post in 3 categories:
  * 3 LOCAL hashtags (e.g., #${context.business.town}Eats, #${context.business.town}Food)
  * 3 NICHE hashtags (industry-specific)
  * 2 TRENDING engagement hashtags

📋 OUTPUT FORMAT (JSON ONLY):
{
  "posts": [
    {
      "angle": "tease",
      "caption": "curiosity-building caption",
      "hashtags": ["#Local1", "#Local2", "#Local3", "#Niche1", "#Niche2", "#Niche3", "#Trend1", "#Trend2"],
      "template": "offer_card"
    },
    {
      "angle": "feature",
      "caption": "detailed showcase caption",
      "hashtags": ["#Local1", "#Local2", "#Local3", "#Niche1", "#Niche2", "#Niche3", "#Trend1", "#Trend2"],
      "template": "offer_card"
    },
    {
      "angle": "social_proof",
      "caption": "trust-building caption",
      "hashtags": ["#Local1", "#Local2", "#Local3", "#Niche1", "#Niche2", "#Niche3", "#Trend1", "#Trend2"],
      "template": "general"
    },
    {
      "angle": "reminder",
      "caption": "urgency caption",
      "hashtags": ["#Local1", "#Local2", "#Local3", "#Niche1", "#Niche2", "#Niche3", "#Trend1", "#Trend2"],
      "template": "offer_card"
    },
    {
      "angle": "last_call",
      "caption": "final push caption",
      "hashtags": ["#Local1", "#Local2", "#Local3", "#Niche1", "#Niche2", "#Niche3", "#Trend1", "#Trend2"],
      "template": "offer_card"
    }
  ]
}

Output ONLY valid JSON. No extra text.`

  const userPrompt = `Create a 5-post campaign for ${context.business.name}. Goal: ${goal}. Tone: ${tone}. Output ONLY valid JSON with 5 posts.`

  return { systemPrompt, userPrompt }
}
