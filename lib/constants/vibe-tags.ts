import { getSystemCategoryFromDisplayLabel } from '@/lib/constants/system-categories'

export interface VibeTag {
  slug: string
  label: string
}

export interface VibeTagCategory {
  id: string
  label: string
  tags: VibeTag[]
}

// ============================================================================
// CATEGORY-AWARE VIBE TAGS (dennis-03)
// ----------------------------------------------------------------------------
// Vibe tags used to be a single food/hospitality-skewed list. They now adapt to
// the business's type via VIBE_TAG_GROUPS, keyed by a small set of "vibe groups".
// Each group keeps the same 3-section shape (Atmosphere / Good for / Features) so
// the pickers can render any group without changes.
// ============================================================================

export type VibeGroup =
  | 'food'
  | 'beauty'
  | 'wellness'
  | 'fitness'
  | 'retail'
  | 'accommodation'
  | 'venue'
  | 'services'
  | 'default'

export const VIBE_TAG_GROUPS: Record<VibeGroup, VibeTagCategory[]> = {
  // Restaurants, cafes, bars, pubs, bakeries, desserts, takeaways, fast food
  food: [
  {
    id: 'atmosphere',
    label: 'Atmosphere',
    tags: [
      { slug: 'cozy', label: 'Cozy' },
      { slug: 'lively', label: 'Lively' },
      { slug: 'quiet', label: 'Quiet' },
      { slug: 'romantic', label: 'Romantic' },
      { slug: 'trendy', label: 'Trendy' },
      { slug: 'casual', label: 'Casual' },
      { slug: 'upscale', label: 'Upscale' },
      { slug: 'rustic', label: 'Rustic' },
      { slug: 'modern', label: 'Modern' },
      { slug: 'intimate', label: 'Intimate' },
    ],
  },
  {
    id: 'good-for',
    label: 'Good for',
    tags: [
      { slug: 'families', label: 'Families' },
      { slug: 'date-night', label: 'Date Night' },
      { slug: 'groups', label: 'Groups' },
      { slug: 'solo', label: 'Solo' },
      { slug: 'business-meetings', label: 'Business Meetings' },
      { slug: 'celebrations', label: 'Celebrations' },
      { slug: 'brunch', label: 'Brunch' },
      { slug: 'late-night', label: 'Late Night' },
      { slug: 'after-work', label: 'After Work' },
    ],
  },
  {
    id: 'amenities',
    label: 'Amenities',
    tags: [
      { slug: 'dog-friendly', label: 'Dog Friendly' },
      { slug: 'outdoor-seating', label: 'Outdoor Seating' },
      { slug: 'wifi', label: 'WiFi' },
      { slug: 'parking', label: 'Parking' },
      { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
      { slug: 'live-music', label: 'Live Music' },
      { slug: 'takeaway', label: 'Takeaway' },
      { slug: 'delivery', label: 'Delivery' },
      { slug: 'reservations', label: 'Reservations' },
    ],
  },
  ],

  // Salons, barbers, tattoo & piercing
  beauty: [
    {
      id: 'atmosphere',
      label: 'Atmosphere',
      tags: [
        { slug: 'relaxing', label: 'Relaxing' },
        { slug: 'luxurious', label: 'Luxurious' },
        { slug: 'trendy', label: 'Trendy' },
        { slug: 'modern', label: 'Modern' },
        { slug: 'welcoming', label: 'Welcoming' },
        { slug: 'calming', label: 'Calming' },
        { slug: 'chic', label: 'Chic' },
        { slug: 'boutique', label: 'Boutique' },
      ],
    },
    {
      id: 'good-for',
      label: 'Good for',
      tags: [
        { slug: 'self-care', label: 'Self-Care' },
        { slug: 'special-occasions', label: 'Special Occasions' },
        { slug: 'bridal', label: 'Bridal' },
        { slug: 'groups', label: 'Groups' },
        { slug: 'kids-welcome', label: 'Kids Welcome' },
        { slug: 'solo', label: 'Solo' },
        { slug: 'quick-visits', label: 'Quick Visits' },
      ],
    },
    {
      id: 'amenities',
      label: 'Booking & Amenities',
      tags: [
        { slug: 'appointments', label: 'Appointments' },
        { slug: 'walk-ins-welcome', label: 'Walk-ins Welcome' },
        { slug: 'online-booking', label: 'Online Booking' },
        { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
        { slug: 'parking', label: 'Parking' },
        { slug: 'wifi', label: 'WiFi' },
        { slug: 'card-payments', label: 'Card Payments' },
        { slug: 'gift-vouchers', label: 'Gift Vouchers' },
      ],
    },
  ],

  // Wellness / therapy / health / medical
  wellness: [
    {
      id: 'atmosphere',
      label: 'Atmosphere',
      tags: [
        { slug: 'calming', label: 'Calming' },
        { slug: 'tranquil', label: 'Tranquil' },
        { slug: 'professional', label: 'Professional' },
        { slug: 'clinical', label: 'Clinical' },
        { slug: 'welcoming', label: 'Welcoming' },
        { slug: 'modern', label: 'Modern' },
      ],
    },
    {
      id: 'good-for',
      label: 'Good for',
      tags: [
        { slug: 'relaxation', label: 'Relaxation' },
        { slug: 'recovery', label: 'Recovery' },
        { slug: 'pain-relief', label: 'Pain Relief' },
        { slug: 'prenatal', label: 'Prenatal' },
        { slug: 'seniors', label: 'Seniors' },
        { slug: 'first-timers', label: 'First-Timers' },
      ],
    },
    {
      id: 'amenities',
      label: 'Booking & Amenities',
      tags: [
        { slug: 'appointments', label: 'Appointments' },
        { slug: 'walk-ins-welcome', label: 'Walk-ins Welcome' },
        { slug: 'online-booking', label: 'Online Booking' },
        { slug: 'home-visits', label: 'Home Visits' },
        { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
        { slug: 'parking', label: 'Parking' },
        { slug: 'gift-vouchers', label: 'Gift Vouchers' },
      ],
    },
  ],

  // Gyms, fitness studios, sports
  fitness: [
    {
      id: 'atmosphere',
      label: 'Atmosphere',
      tags: [
        { slug: 'energetic', label: 'Energetic' },
        { slug: 'motivating', label: 'Motivating' },
        { slug: 'welcoming', label: 'Welcoming' },
        { slug: 'community', label: 'Community' },
        { slug: 'modern', label: 'Modern' },
        { slug: 'no-judgment', label: 'No Judgment' },
      ],
    },
    {
      id: 'good-for',
      label: 'Good for',
      tags: [
        { slug: 'beginners', label: 'Beginners' },
        { slug: 'weight-loss', label: 'Weight Loss' },
        { slug: 'strength-training', label: 'Strength Training' },
        { slug: 'group-classes', label: 'Group Classes' },
        { slug: 'kids-welcome', label: 'Kids Welcome' },
        { slug: 'seniors', label: 'Seniors' },
        { slug: 'personal-training', label: 'Personal Training' },
      ],
    },
    {
      id: 'amenities',
      label: 'Facilities',
      tags: [
        { slug: 'showers', label: 'Showers' },
        { slug: 'changing-rooms', label: 'Changing Rooms' },
        { slug: 'parking', label: 'Parking' },
        { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
        { slug: 'day-passes', label: 'Day Passes' },
        { slug: 'personal-training', label: 'Personal Training' },
        { slug: 'wifi', label: 'WiFi' },
      ],
    },
  ],

  // Retail shops, grocery, markets
  retail: [
    {
      id: 'atmosphere',
      label: 'Atmosphere',
      tags: [
        { slug: 'boutique', label: 'Boutique' },
        { slug: 'trendy', label: 'Trendy' },
        { slug: 'spacious', label: 'Spacious' },
        { slug: 'friendly', label: 'Friendly' },
        { slug: 'modern', label: 'Modern' },
        { slug: 'independent', label: 'Independent' },
      ],
    },
    {
      id: 'good-for',
      label: 'Good for',
      tags: [
        { slug: 'gifts', label: 'Gifts' },
        { slug: 'browsing', label: 'Browsing' },
        { slug: 'families', label: 'Families' },
        { slug: 'bargain-hunters', label: 'Bargain Hunters' },
        { slug: 'local-produce', label: 'Local Produce' },
      ],
    },
    {
      id: 'amenities',
      label: 'Services & Amenities',
      tags: [
        { slug: 'parking', label: 'Parking' },
        { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
        { slug: 'click-and-collect', label: 'Click & Collect' },
        { slug: 'delivery', label: 'Delivery' },
        { slug: 'card-payments', label: 'Card Payments' },
        { slug: 'gift-wrapping', label: 'Gift Wrapping' },
        { slug: 'loyalty-scheme', label: 'Loyalty Scheme' },
      ],
    },
  ],

  // Hotels, B&Bs, lodging
  accommodation: [
    {
      id: 'atmosphere',
      label: 'Atmosphere',
      tags: [
        { slug: 'luxurious', label: 'Luxurious' },
        { slug: 'cozy', label: 'Cozy' },
        { slug: 'romantic', label: 'Romantic' },
        { slug: 'family-friendly', label: 'Family Friendly' },
        { slug: 'boutique', label: 'Boutique' },
        { slug: 'quiet', label: 'Quiet' },
        { slug: 'modern', label: 'Modern' },
      ],
    },
    {
      id: 'good-for',
      label: 'Good for',
      tags: [
        { slug: 'couples', label: 'Couples' },
        { slug: 'families', label: 'Families' },
        { slug: 'business-travel', label: 'Business Travel' },
        { slug: 'groups', label: 'Groups' },
        { slug: 'long-stays', label: 'Long Stays' },
        { slug: 'solo', label: 'Solo' },
      ],
    },
    {
      id: 'amenities',
      label: 'Facilities',
      tags: [
        { slug: 'parking', label: 'Parking' },
        { slug: 'wifi', label: 'WiFi' },
        { slug: 'breakfast-included', label: 'Breakfast Included' },
        { slug: 'pet-friendly', label: 'Pet Friendly' },
        { slug: 'pool', label: 'Pool' },
        { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
        { slug: 'airport-transfer', label: 'Airport Transfer' },
      ],
    },
  ],

  // Venues, entertainment, tours & activities
  venue: [
    {
      id: 'atmosphere',
      label: 'Atmosphere',
      tags: [
        { slug: 'lively', label: 'Lively' },
        { slug: 'family-friendly', label: 'Family Friendly' },
        { slug: 'unique', label: 'Unique' },
        { slug: 'scenic', label: 'Scenic' },
        { slug: 'immersive', label: 'Immersive' },
        { slug: 'spacious', label: 'Spacious' },
        { slug: 'intimate', label: 'Intimate' },
      ],
    },
    {
      id: 'good-for',
      label: 'Good for',
      tags: [
        { slug: 'groups', label: 'Groups' },
        { slug: 'families', label: 'Families' },
        { slug: 'date-night', label: 'Date Night' },
        { slug: 'celebrations', label: 'Celebrations' },
        { slug: 'kids-welcome', label: 'Kids Welcome' },
        { slug: 'team-building', label: 'Team Building' },
        { slug: 'tourists', label: 'Tourists' },
      ],
    },
    {
      id: 'amenities',
      label: 'Amenities',
      tags: [
        { slug: 'parking', label: 'Parking' },
        { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
        { slug: 'booking-required', label: 'Booking Required' },
        { slug: 'food-and-drink', label: 'Food & Drink' },
        { slug: 'outdoor', label: 'Outdoor' },
        { slug: 'guided-tours', label: 'Guided Tours' },
      ],
    },
  ],

  // Professional services, automotive, rentals/hire
  services: [
    {
      id: 'atmosphere',
      label: 'Atmosphere',
      tags: [
        { slug: 'professional', label: 'Professional' },
        { slug: 'friendly', label: 'Friendly' },
        { slug: 'efficient', label: 'Efficient' },
        { slug: 'trustworthy', label: 'Trustworthy' },
        { slug: 'modern', label: 'Modern' },
      ],
    },
    {
      id: 'good-for',
      label: 'Good for',
      tags: [
        { slug: 'quick-service', label: 'Quick Service' },
        { slug: 'long-term', label: 'Long Term' },
        { slug: 'first-timers', label: 'First-Timers' },
        { slug: 'businesses', label: 'Businesses' },
        { slug: 'tourists', label: 'Tourists' },
      ],
    },
    {
      id: 'amenities',
      label: 'Services & Amenities',
      tags: [
        { slug: 'appointments', label: 'Appointments' },
        { slug: 'walk-ins-welcome', label: 'Walk-ins Welcome' },
        { slug: 'online-booking', label: 'Online Booking' },
        { slug: 'home-visits', label: 'Home Visits' },
        { slug: 'free-quotes', label: 'Free Quotes' },
        { slug: 'parking', label: 'Parking' },
        { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
        { slug: 'card-payments', label: 'Card Payments' },
      ],
    },
  ],

  // Fallback for uncategorised / 'other'
  default: [
    {
      id: 'atmosphere',
      label: 'Atmosphere',
      tags: [
        { slug: 'welcoming', label: 'Welcoming' },
        { slug: 'friendly', label: 'Friendly' },
        { slug: 'modern', label: 'Modern' },
        { slug: 'trendy', label: 'Trendy' },
        { slug: 'casual', label: 'Casual' },
        { slug: 'upscale', label: 'Upscale' },
        { slug: 'cozy', label: 'Cozy' },
        { slug: 'quiet', label: 'Quiet' },
      ],
    },
    {
      id: 'good-for',
      label: 'Good for',
      tags: [
        { slug: 'families', label: 'Families' },
        { slug: 'groups', label: 'Groups' },
        { slug: 'solo', label: 'Solo' },
        { slug: 'couples', label: 'Couples' },
        { slug: 'tourists', label: 'Tourists' },
        { slug: 'kids-welcome', label: 'Kids Welcome' },
      ],
    },
    {
      id: 'amenities',
      label: 'Amenities',
      tags: [
        { slug: 'parking', label: 'Parking' },
        { slug: 'wifi', label: 'WiFi' },
        { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
        { slug: 'card-payments', label: 'Card Payments' },
        { slug: 'appointments', label: 'Appointments' },
        { slug: 'walk-ins-welcome', label: 'Walk-ins Welcome' },
        { slug: 'online-booking', label: 'Online Booking' },
      ],
    },
  ],
}

// Maps the canonical system_category enum → vibe group
const SYSTEM_CATEGORY_TO_VIBE_GROUP: Record<string, VibeGroup> = {
  restaurant: 'food',
  cafe: 'food',
  bakery: 'food',
  bar: 'food',
  pub: 'food',
  dessert: 'food',
  takeaway: 'food',
  fast_food: 'food',
  salon: 'beauty',
  barber: 'beauty',
  tattoo: 'beauty',
  wellness: 'wellness',
  health: 'wellness',
  fitness: 'fitness',
  sports: 'fitness',
  retail: 'retail',
  grocery: 'retail',
  hotel: 'accommodation',
  venue: 'venue',
  entertainment: 'venue',
  tours_activities: 'venue',
  professional: 'services',
  automotive: 'services',
  rental: 'services',
  other: 'default',
}

// Maps the legacy BusinessType enum (profile dropdown) → vibe group
const BUSINESS_TYPE_TO_VIBE_GROUP: Record<string, VibeGroup> = {
  bar: 'food',
  cafe: 'food',
  restaurant: 'food',
  salon: 'beauty',
  spa: 'beauty',
  gym: 'fitness',
  retail_shop: 'retail',
  hotel: 'accommodation',
  service_business: 'services',
  other: 'default',
}

/**
 * Resolve which vibe group applies to a business, from any of the category-ish
 * signals we might have. Tries (in order): system_category enum, legacy
 * business_type enum, then free-text category/type via display-label mapping.
 */
export function resolveVibeGroup(input: {
  systemCategory?: string | null
  businessType?: string | null
  categoryText?: string | null
}): VibeGroup {
  const candidates = [input.systemCategory, input.businessType, input.categoryText]
  for (const raw of candidates) {
    if (!raw) continue
    const norm = raw.toLowerCase().trim()
    if (SYSTEM_CATEGORY_TO_VIBE_GROUP[norm]) return SYSTEM_CATEGORY_TO_VIBE_GROUP[norm]
    if (BUSINESS_TYPE_TO_VIBE_GROUP[norm]) return BUSINESS_TYPE_TO_VIBE_GROUP[norm]
    // Free text (e.g. "Cafe", "Barber Shop", "Rent-a-car") → system category
    const mapped = getSystemCategoryFromDisplayLabel(raw)
    if (mapped && mapped !== 'other' && SYSTEM_CATEGORY_TO_VIBE_GROUP[mapped]) {
      return SYSTEM_CATEGORY_TO_VIBE_GROUP[mapped]
    }
  }
  return 'default'
}

/**
 * Returns the vibe-tag sections relevant to a specific business type.
 * Pass any of system_category, business_type, or free-text categoryText.
 */
export function getVibeTagCategoriesForBusiness(input: {
  systemCategory?: string | null
  businessType?: string | null
  categoryText?: string | null
}): VibeTagCategory[] {
  return VIBE_TAG_GROUPS[resolveVibeGroup(input)]
}

// Legacy export: the original food/hospitality set (kept for backward compat).
export const VIBE_TAG_CATEGORIES: VibeTagCategory[] = VIBE_TAG_GROUPS.food

// Union of every tag across every group, de-duplicated by slug. Used for label
// lookup + slug validation so any saved tag (from any group) always resolves.
export const ALL_VIBE_TAGS: VibeTag[] = (() => {
  const seen = new Map<string, VibeTag>()
  for (const group of Object.values(VIBE_TAG_GROUPS)) {
    for (const category of group) {
      for (const tag of category.tags) {
        if (!seen.has(tag.slug)) seen.set(tag.slug, tag)
      }
    }
  }
  return Array.from(seen.values())
})()

export const VIBE_TAG_SLUGS = new Set(ALL_VIBE_TAGS.map(t => t.slug))

export const MAX_CUSTOM_TAGS = 3
export const MAX_CUSTOM_TAG_LENGTH = 30

export function getVibeTagLabel(slug: string): string {
  return ALL_VIBE_TAGS.find(t => t.slug === slug)?.label || slug
}

export interface VibeTagsData {
  selected: string[]
  custom: string[]
}
