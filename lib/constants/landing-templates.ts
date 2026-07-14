// Landing page template + section system (multi-tenant, per-city)
//
// All per-city customization is stored as DATA in
// `franchise_crm_configs.landing_page_config` (a JSONB blob). Templates and
// section defaults below are READ-ONLY shared constants: picking a template
// copies its defaults into the city's own row, it never mutates anything shared.
//
// Design rules:
// - The Qwikker logo is fixed for every template/city; only the accent theme varies.
// - Marketing body copy (features/why/how/faq/CTAs) is Qwikker-authored and locked;
//   admins can show/hide/reorder those sections but not reword them.
// - Any section an admin hasn't customized falls back to code defaults so no city breaks.

export type LandingTemplateId = 'signature' | 'vibrant' | 'editorial'

export type ThemeMode = 'dark' | 'light'

export interface LandingTheme {
  accent: string
  accent_hover?: string
  mode?: ThemeMode
}

export interface SupporterLogo {
  name: string
  logo_url: string
  url?: string | null
}

export interface Tier2Sponsor {
  name: string
  logo_url: string
  url?: string | null
}

export interface OffersSectionConfig {
  enabled?: boolean
  heading?: string | null
  max?: number
}

export interface CategoryTilesConfig {
  enabled?: boolean
  heading?: string | null
  categories?: string[] | null
}

// Publish state controlled by the CITY ADMIN (distinct from the HQ lifecycle
// `franchise_crm_configs.status`). Lets an onboarded city keep a branded
// "coming soon" page public until they've populated businesses/offers, so they
// don't drive pass installs to an empty platform.
export type PublishStatus = 'live' | 'coming_soon'

// The full per-city landing config (superset of legacy keys + new template keys).
export interface LandingPageConfig {
  // Template + theme (new)
  template?: LandingTemplateId
  theme?: LandingTheme
  section_order?: string[]
  sections_enabled?: Record<string, boolean>

  // City-admin publish switch. Defaults to 'coming_soon' so a brand-new city
  // never leaks an empty landing page before the admin is ready.
  publish_status?: PublishStatus
  // Optional admin-set launch date shown on the coming-soon page ("Launching <date>").
  coming_soon_launch_label?: string | null
  // Light editing of the coming-soon page (falls back to sensible defaults).
  coming_soon_headline?: string | null
  coming_soon_subtitle?: string | null
  coming_soon_waitlist_enabled?: boolean

  // Hero (editable)
  hero_headline?: string | null
  hero_subtitle?: string | null
  hero_image_url?: string | null
  // Vibrant only: 0–100 strength of the accent colour wash / blur over the hero image.
  hero_blur?: number | null

  // Sponsors (existing toggle: sponsor_enabled)
  sponsor_enabled?: boolean
  sponsor_name?: string | null
  sponsor_tagline?: string | null
  sponsor_logo_url?: string | null
  sponsor_url?: string | null
  tier2_sponsors?: Tier2Sponsor[] | null

  // Supporters (existing toggle: supporters_enabled)
  supporters_enabled?: boolean
  supporters_heading?: string | null
  supporter_logos?: SupporterLogo[] | null

  // Founding counter (existing toggle: show_founding_counter)
  show_founding_counter?: boolean
  founding_member_total_spots?: number

  // Featured businesses (existing toggle: show_featured_businesses)
  show_featured_businesses?: boolean
  featured_business_ids?: string[] | null

  // Pass holder count (existing toggle: show_pass_count)
  show_pass_count?: boolean

  // New sections
  offers_section?: OffersSectionConfig
  category_tiles?: CategoryTilesConfig
}

// ====================
// SECTION REGISTRY
// ====================
// Canonical list of toggleable/orderable sections that appear BELOW the hero.
// The hero is always rendered first and is not part of this list.
//
// `enableSource` tells the render + editor where a section's on/off flag lives:
//  - 'sections_enabled' : config.sections_enabled[key] (new sections + locked-copy sections)
//  - a legacy key string: read directly off config (backward compatible)

export type EnableSource =
  | 'sections_enabled'
  | 'sponsor_enabled'
  | 'supporters_enabled'
  | 'show_founding_counter'
  | 'show_featured_businesses'
  | 'show_pass_count'
  | 'offers_section'
  | 'category_tiles'

export interface SectionDef {
  key: string
  label: string
  description: string
  enableSource: EnableSource
  defaultEnabled: boolean
  // Whether the admin can edit this section's content (vs. Qwikker-authored locked copy)
  editable: boolean
}

export const LANDING_SECTIONS: SectionDef[] = [
  {
    key: 'offers',
    label: 'Live Offers',
    description: 'Show current local offers right under the hero (highest converting).',
    enableSource: 'offers_section',
    defaultEnabled: true,
    editable: true,
  },
  {
    key: 'category_tiles',
    label: 'Category Tiles',
    description: 'Bold tile grid that links into discovery (Eat, Explore, Stay...).',
    enableSource: 'category_tiles',
    defaultEnabled: true,
    editable: true,
  },
  {
    key: 'features',
    label: 'Features Grid',
    description: 'The 4 core feature cards (Offers, Loyalty, Secret Menu, AI).',
    enableSource: 'sections_enabled',
    defaultEnabled: true,
    editable: false,
  },
  {
    key: 'business_cta',
    label: 'Business CTA Banner',
    description: '"Own a local business?" call-to-action banner.',
    enableSource: 'sections_enabled',
    defaultEnabled: true,
    editable: false,
  },
  {
    key: 'final_cta',
    label: 'Closing CTA',
    description: '"Ready to explore [city]?" closing call-to-action.',
    enableSource: 'sections_enabled',
    defaultEnabled: true,
    editable: false,
  },
  {
    key: 'why',
    label: 'Why Qwikker',
    description: 'Three reasons-to-believe points.',
    enableSource: 'sections_enabled',
    defaultEnabled: true,
    editable: false,
  },
  {
    key: 'how',
    label: 'How It Works',
    description: 'Three-step explainer.',
    enableSource: 'sections_enabled',
    defaultEnabled: true,
    editable: false,
  },
  {
    key: 'pass_count',
    label: 'Pass Holder Count',
    description: '"Join X people already exploring [city]".',
    enableSource: 'show_pass_count',
    defaultEnabled: false,
    editable: true,
  },
  {
    key: 'founding',
    label: 'Founding Member Counter',
    description: 'Hero urgency line: "Only X founding spots left".',
    enableSource: 'show_founding_counter',
    defaultEnabled: false,
    editable: true,
  },
  {
    key: 'featured',
    label: 'Featured Businesses',
    description: 'Hand-picked businesses carousel.',
    enableSource: 'show_featured_businesses',
    defaultEnabled: false,
    editable: true,
  },
  {
    key: 'faq',
    label: 'FAQ',
    description: 'Frequently asked questions.',
    enableSource: 'sections_enabled',
    defaultEnabled: true,
    editable: false,
  },
  {
    key: 'sponsors',
    label: 'Sponsors',
    description: 'Headline + tier-2 sponsor banner.',
    enableSource: 'sponsor_enabled',
    defaultEnabled: false,
    editable: true,
  },
  {
    key: 'supporters',
    label: 'Supporters',
    description: '"Proudly supported by" logo wall.',
    enableSource: 'supporters_enabled',
    defaultEnabled: false,
    editable: true,
  },
]

export const LANDING_SECTION_BY_KEY: Record<string, SectionDef> = Object.fromEntries(
  LANDING_SECTIONS.map((s) => [s.key, s])
)

// Canonical default order (below the hero). Templates can override.
export const DEFAULT_SECTION_ORDER: string[] = LANDING_SECTIONS.map((s) => s.key)

// ====================
// TEMPLATES
// ====================

// Per-template default copy. `{city}` is substituted with the city display name
// at render time. Headline/subtitle are written into the editable boxes when a
// template is picked; eyebrow/supporting/CTA label are template-driven voice.
export interface TemplateCopy {
  heroEyebrow: string
  heroHeadline: string
  heroSubtitle: string
  heroSupporting: string
  heroCtaLabel: string
  offersHeading: string
  tilesHeading: string
  // Coming-soon page voice (distinct per template).
  comingSoonEyebrow: string
  comingSoonHeadline: string
  comingSoonSubtitle: string
}

export interface LandingTemplate {
  id: LandingTemplateId
  label: string
  description: string
  theme: Required<LandingTheme>
  // Curated accent swatches the admin can pick from (no free color wheel).
  palette: string[]
  section_order: string[]
  // Defaults applied to sections_enabled when this template is chosen.
  sections_enabled: Record<string, boolean>
  copy: TemplateCopy
  // Default hero background used when the city hasn't uploaded/picked one.
  defaultHeroImage: string
}

// Built-in hero backgrounds an admin can pick from (alongside uploading their own).
export interface HeroPreset {
  id: string
  label: string
  url: string
}

export const HERO_PRESETS: HeroPreset[] = [
  { id: 'signature', label: 'Night skyline', url: '/hero-signature.png' },
  { id: 'vibrant', label: 'Street life', url: '/hero-vibrant.png' },
  { id: 'editorial', label: 'Old town', url: '/qwikkerhero.png' },
]

// Replace the {city} token in template copy with the city's display name.
export function applyCityToken(str: string, displayName: string): string {
  return (str || '').split('{city}').join(displayName)
}

const QWIKKER_GREEN = '#00d083'
const QWIKKER_GREEN_HOVER = '#00b86f'

function defaultSectionsEnabled(overrides: Record<string, boolean> = {}): Record<string, boolean> {
  const base: Record<string, boolean> = {}
  for (const s of LANDING_SECTIONS) {
    if (s.enableSource === 'sections_enabled') base[s.key] = s.defaultEnabled
  }
  return { ...base, ...overrides }
}

export const LANDING_TEMPLATES: Record<LandingTemplateId, LandingTemplate> = {
  signature: {
    id: 'signature',
    label: 'Signature',
    description: 'Premium, dark and minimal. Understated and modern — great default.',
    theme: { accent: QWIKKER_GREEN, accent_hover: QWIKKER_GREEN_HOVER, mode: 'dark' },
    palette: [QWIKKER_GREEN, '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6'],
    section_order: [
      'offers',
      'category_tiles',
      'features',
      'business_cta',
      'final_cta',
      'why',
      'how',
      'pass_count',
      'featured',
      'faq',
      'sponsors',
      'supporters',
    ],
    sections_enabled: defaultSectionsEnabled(),
    copy: {
      heroEyebrow: 'Now live in {city}',
      heroHeadline: '{city}, in your wallet',
      heroSubtitle: 'Local offers, loyalty rewards, secret menus, and dish-level recommendations — delivered to your mobile wallet.',
      heroSupporting: 'Powered by real menus, real hours, and local context — not scraped reviews.',
      heroCtaLabel: 'Add to your mobile wallet',
      offersHeading: 'Live offers in {city}',
      tilesHeading: 'Explore {city}',
      comingSoonEyebrow: 'Coming soon',
      comingSoonHeadline: '{city} is almost here',
      comingSoonSubtitle: 'A premium local pass — offers, loyalty rewards and secret menus, kept in your mobile wallet. We’re putting the finishing touches to {city}.',
    },
    defaultHeroImage: '/hero-signature.png',
  },
  vibrant: {
    id: 'vibrant',
    label: 'Vibrant',
    description: 'Bold, colorful and playful. Image-forward — great for tourist/leisure cities.',
    theme: { accent: '#ff5a5f', accent_hover: '#e54a4f', mode: 'light' },
    palette: ['#ff5a5f', '#00d083', '#f5a623', '#3b82f6', '#a855f7', '#14b8a6'],
    section_order: [
      'offers',
      'category_tiles',
      'featured',
      'features',
      'how',
      'business_cta',
      'pass_count',
      'why',
      'final_cta',
      'faq',
      'sponsors',
      'supporters',
    ],
    sections_enabled: defaultSectionsEnabled(),
    copy: {
      heroEyebrow: 'Now live in {city}',
      heroHeadline: 'The best of {city},\nin your pocket',
      heroSubtitle: 'Exclusive deals, secret menus and loyalty rewards from the places locals love — all in your wallet, no app to download.',
      heroSupporting: '',
      heroCtaLabel: 'Get the pass — free',
      offersHeading: 'Deals you can grab today',
      tilesHeading: 'What are you into?',
      comingSoonEyebrow: 'Launching soon',
      comingSoonHeadline: '{city} is about\nto get good',
      comingSoonSubtitle: 'Exclusive deals, secret menus and rewards from the places locals love — landing in {city} very soon. Be first in line.',
    },
    defaultHeroImage: '/hero-vibrant.png',
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    description: 'Image-forward, magazine feel. Lets local photography lead.',
    theme: { accent: '#111827', accent_hover: '#000000', mode: 'light' },
    palette: ['#111827', '#00d083', '#b45309', '#0ea5e9', '#be123c', '#4d7c0f'],
    section_order: [
      'offers',
      'featured',
      'category_tiles',
      'why',
      'features',
      'how',
      'business_cta',
      'pass_count',
      'final_cta',
      'faq',
      'sponsors',
      'supporters',
    ],
    sections_enabled: defaultSectionsEnabled(),
    copy: {
      heroEyebrow: 'The local guide to {city}',
      heroHeadline: '{city}, curated.',
      heroSubtitle: 'A considered guide to the places worth your time — offers, menus and local knowledge, kept in your wallet.',
      heroSupporting: '',
      heroCtaLabel: 'Get the {city} pass',
      offersHeading: 'Offers worth claiming',
      tilesHeading: 'Browse {city}',
      comingSoonEyebrow: 'A new local guide',
      comingSoonHeadline: '{city},\ncoming soon.',
      comingSoonSubtitle: 'A considered guide to the places worth your time — offers, menus and local knowledge. We’re curating {city} now.',
    },
    defaultHeroImage: '/qwikkerhero.png',
  },
}

export const DEFAULT_TEMPLATE_ID: LandingTemplateId = 'signature'

// ====================
// RESOLUTION HELPERS
// ====================

// Is a given section enabled, taking template defaults + per-city overrides into account?
export function isSectionEnabled(config: LandingPageConfig, key: string): boolean {
  const def = LANDING_SECTION_BY_KEY[key]
  if (!def) return false

  switch (def.enableSource) {
    case 'sections_enabled':
      return config.sections_enabled?.[key] ?? resolveTemplate(config).sections_enabled[key] ?? def.defaultEnabled
    case 'offers_section':
      return config.offers_section?.enabled ?? false
    case 'category_tiles':
      return config.category_tiles?.enabled ?? false
    case 'sponsor_enabled':
      return config.sponsor_enabled ?? false
    case 'supporters_enabled':
      return config.supporters_enabled ?? false
    case 'show_founding_counter':
      return config.show_founding_counter ?? false
    case 'show_featured_businesses':
      return config.show_featured_businesses ?? false
    case 'show_pass_count':
      return config.show_pass_count ?? false
    default:
      return def.defaultEnabled
  }
}

export function resolveTemplate(config: LandingPageConfig): LandingTemplate {
  return LANDING_TEMPLATES[config.template ?? DEFAULT_TEMPLATE_ID] ?? LANDING_TEMPLATES[DEFAULT_TEMPLATE_ID]
}

// The ordered list of section keys to render, honouring config override then template.
export function resolveSectionOrder(config: LandingPageConfig): string[] {
  const template = resolveTemplate(config)
  const order = config.section_order && config.section_order.length > 0
    ? config.section_order
    : template.section_order

  // Keep only known sections; append any known sections missing from a stale order.
  const known = order.filter((k) => LANDING_SECTION_BY_KEY[k])
  for (const k of DEFAULT_SECTION_ORDER) {
    if (!known.includes(k)) known.push(k)
  }
  return known
}

// Whether the city's PUBLIC page should be live. Defaults to 'coming_soon' when
// the admin hasn't explicitly published, so nothing leaks before they're ready.
export function resolvePublishStatus(config: LandingPageConfig): PublishStatus {
  return config.publish_status === 'live' ? 'live' : 'coming_soon'
}

export function isCityLive(config: LandingPageConfig): boolean {
  return resolvePublishStatus(config) === 'live'
}

// Build the CSS custom-property map for a theme. Returned as a plain string map
// so this stays React-free; cast to CSSProperties at the call site.
export function buildThemeStyle(
  templateId: string,
  mode: 'dark' | 'light',
  accent: string,
  accentHover: string
): Record<string, string> {
  const dark = mode === 'dark'
  const lightBg = templateId === 'editorial' ? '#faf8f5' : '#ffffff'
  return {
    '--accent': accent,
    '--accent-hover': accentHover,
    '--accent-contrast': '#ffffff',
    '--bg': dark ? '#0b0d10' : lightBg,
    '--surface': dark ? 'rgba(255,255,255,0.05)' : 'rgba(17,24,39,0.04)',
    '--surface-2': dark ? 'rgba(255,255,255,0.03)' : 'rgba(17,24,39,0.02)',
    '--border': dark ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.10)',
    '--border-soft': dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,24,39,0.07)',
    '--text': dark ? '#ffffff' : '#0f172a',
    '--text-muted': dark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.65)',
    '--text-faint': dark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.45)',
  }
}

export function resolveTheme(config: LandingPageConfig): Required<LandingTheme> {
  const template = resolveTemplate(config)
  const accent = config.theme?.accent || template.theme.accent
  const accent_hover = config.theme?.accent_hover || template.theme.accent_hover || accent
  const mode = config.theme?.mode || template.theme.mode
  return { accent, accent_hover, mode }
}

// Resolve the copy shown on the page: per-city overrides win, else the active
// template's voice, with the {city} token substituted.
export function resolveCopy(config: LandingPageConfig, displayName: string): TemplateCopy {
  const c = resolveTemplate(config).copy
  const sub = (s: string) => applyCityToken(s, displayName)
  return {
    heroEyebrow: sub(c.heroEyebrow),
    heroHeadline: config.hero_headline ? config.hero_headline : sub(c.heroHeadline),
    heroSubtitle: config.hero_subtitle ? config.hero_subtitle : sub(c.heroSubtitle),
    heroSupporting: sub(c.heroSupporting),
    heroCtaLabel: sub(c.heroCtaLabel),
    offersHeading: config.offers_section?.heading ? config.offers_section.heading : sub(c.offersHeading),
    tilesHeading: config.category_tiles?.heading ? config.category_tiles.heading : sub(c.tilesHeading),
    comingSoonEyebrow: sub(c.comingSoonEyebrow),
    comingSoonHeadline: sub(c.comingSoonHeadline),
    comingSoonSubtitle: sub(c.comingSoonSubtitle),
  }
}

// Coming-soon page copy: per-city overrides win, else the template's coming-soon voice.
export interface ComingSoonCopy {
  eyebrow: string
  headline: string
  subtitle: string
}

export function resolveComingSoonCopy(config: LandingPageConfig, displayName: string): ComingSoonCopy {
  const c = resolveTemplate(config).copy
  const sub = (s: string) => applyCityToken(s, displayName)
  return {
    eyebrow: config.coming_soon_launch_label?.trim() || sub(c.comingSoonEyebrow),
    headline: config.coming_soon_headline?.trim() || sub(c.comingSoonHeadline),
    subtitle: config.coming_soon_subtitle?.trim() || sub(c.comingSoonSubtitle),
  }
}
