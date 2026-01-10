// Global placeholder system for unclaimed businesses
// 10-20 abstract variants per category to prevent grid repetition
// Stored in /public/placeholders/ - accessible by ALL franchises
//
// CRITICAL: Placeholders are keyed by system_category (stable enum), NOT display_category
// This ensures placeholders work correctly even if admin changes the display label
//
// 🔒 SAFETY RULES (IMPORTANT):
// - Variant 0 = NEUTRAL (safe for all businesses in category)
// - Variant 1-9 = SPECIFIC (admin manual selection only)
// - Import tool ALWAYS sets placeholder_variant = 0
// - Never auto-assign cuisine-specific images (prevents misrepresentation)
//
// Example: Restaurant variant 0 = neutral plated dish (works for vegan, steakhouse, etc.)
//          Restaurant variant 3 = steak (admin must explicitly choose this)

import { SystemCategory } from './system-categories'

interface PlaceholderVariant {
  id: number
  filename: string // Format: category-abstract-01.v1.webp (versioned for cache control)
  description: string
}

interface CategoryPlaceholder {
  category: string
  variants: PlaceholderVariant[]
  icon: string
  label: string
  accentColor: string
  overlayGradient: string
}

export const PLACEHOLDER_LIBRARY: Record<SystemCategory, CategoryPlaceholder> = {
  'restaurant': {
    category: 'restaurant',
    variants: [
      { id: 0, filename: 'restaurant-abstract-00.v1.webp', description: '🔒 NEUTRAL: Table setting (safe for all)' },
      { id: 1, filename: 'restaurant-abstract-01.v1.webp', description: 'Wine glass with bokeh' },
      { id: 2, filename: 'restaurant-abstract-02.v1.webp', description: 'Pasta close-up' },
      { id: 3, filename: 'restaurant-abstract-03.v1.webp', description: '⚠️ ADMIN ONLY: Steak/grill' },
      { id: 4, filename: 'restaurant-abstract-04.v1.webp', description: 'Bread basket detail' },
      { id: 5, filename: 'restaurant-abstract-05.v1.webp', description: 'Silverware pattern' },
      { id: 6, filename: 'restaurant-abstract-06.v1.webp', description: '⚠️ ADMIN ONLY: Burger' },
      { id: 7, filename: 'restaurant-abstract-07.v1.webp', description: 'Napkin fold close-up' },
      { id: 8, filename: 'restaurant-abstract-08.v1.webp', description: 'Candle light bokeh' },
      { id: 9, filename: 'restaurant-abstract-09.v1.webp', description: '⚠️ ADMIN ONLY: Pizza' },
      { id: 10, filename: 'restaurant-abstract-10.v1.webp', description: '⚠️ ADMIN ONLY: Sushi/Asian' },
    ],
    icon: '🍽️',
    label: 'Restaurant',
    accentColor: 'text-orange-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'cafe': {
    category: 'cafe',
    variants: [
      { id: 0, filename: 'cafe-abstract-00.v1.webp', description: '🔒 NEUTRAL: Coffee cup on table (safe for all)' },
      { id: 1, filename: 'cafe-abstract-01.v1.webp', description: 'Coffee bean pile' },
      { id: 2, filename: 'cafe-abstract-02.v1.webp', description: 'Espresso pouring' },
      { id: 3, filename: 'cafe-abstract-03.v1.webp', description: 'Milk foam swirl' },
      { id: 4, filename: 'cafe-abstract-04.v1.webp', description: 'Coffee cup handle' },
      { id: 5, filename: 'cafe-abstract-05.v1.webp', description: 'Ceramic texture' },
      { id: 6, filename: 'cafe-abstract-06.v1.webp', description: 'Grinder mechanism' },
      { id: 7, filename: 'cafe-abstract-07.v1.webp', description: '⚠️ ADMIN ONLY: Latte art' },
      { id: 8, filename: 'cafe-abstract-08.v1.webp', description: 'French press glass' },
      { id: 9, filename: 'cafe-abstract-09.v1.webp', description: 'Coffee drops' },
      { id: 10, filename: 'cafe-abstract-10.v1.webp', description: 'Wooden counter grain' },
    ],
    icon: '☕',
    label: 'Café',
    accentColor: 'text-amber-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'bar': {
    category: 'bar',
    variants: [
      { id: 0, filename: 'bar-abstract-00.v1.webp', description: '🔒 NEUTRAL: Backlit bottles (safe for all)' },
      { id: 1, filename: 'bar-abstract-01.v1.webp', description: 'Wine glass bokeh' },
      { id: 2, filename: 'bar-abstract-02.v1.webp', description: 'Cocktail detail' },
      { id: 3, filename: 'bar-abstract-03.v1.webp', description: 'Bottles backlit' },
      { id: 4, filename: 'bar-abstract-04.v1.webp', description: 'Whiskey glass' },
      { id: 5, filename: 'bar-abstract-05.v1.webp', description: 'Ice cube close-up' },
      { id: 6, filename: 'bar-abstract-06.v1.webp', description: 'Citrus garnish' },
      { id: 7, filename: 'bar-abstract-07.v1.webp', description: 'Glass rim salt' },
      { id: 8, filename: 'bar-abstract-08.v1.webp', description: 'Bottle cap detail' },
      { id: 9, filename: 'bar-abstract-09.v1.webp', description: 'Pour stream' },
      { id: 10, filename: 'bar-abstract-10.v1.webp', description: 'Cork texture' },
    ],
    icon: '🍷',
    label: 'Bar',
    accentColor: 'text-purple-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'barber': {
    category: 'barber',
    variants: [
      { id: 1, filename: 'barber-abstract-01.v1.webp', description: 'Scissors blade reflection' },
      { id: 2, filename: 'barber-abstract-02.v1.webp', description: 'Leather chair texture' },
      { id: 3, filename: 'barber-abstract-03.v1.webp', description: 'Chrome barber pole' },
      { id: 4, filename: 'barber-abstract-04.v1.webp', description: 'Shaving brush bristles' },
      { id: 5, filename: 'barber-abstract-05.v1.webp', description: 'Comb teeth silhouette' },
      { id: 6, filename: 'barber-abstract-06.v1.webp', description: 'Hair clipper metal' },
      { id: 7, filename: 'barber-abstract-07.v1.webp', description: 'Straight razor handle' },
      { id: 8, filename: 'barber-abstract-08.v1.webp', description: 'Mirror reflection' },
      { id: 9, filename: 'barber-abstract-09.v1.webp', description: 'Wood grain with tools' },
      { id: 10, filename: 'barber-abstract-10.v1.webp', description: 'Shaving cream foam' },
    ],
    icon: '✂️',
    label: 'Barber',
    accentColor: 'text-slate-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'dessert': {
    category: 'dessert',
    variants: [
      { id: 1, filename: 'dessert-abstract-01.v1.webp', description: 'Chocolate shavings macro' },
      { id: 2, filename: 'dessert-abstract-02.v1.webp', description: 'Ice cream drip' },
      { id: 3, filename: 'dessert-abstract-03.v1.webp', description: 'Powdered sugar cloud' },
      { id: 4, filename: 'dessert-abstract-04.v1.webp', description: 'Macaron texture' },
      { id: 5, filename: 'dessert-abstract-05.v1.webp', description: 'Waffle cone grid' },
      { id: 6, filename: 'dessert-abstract-06.v1.webp', description: 'Berry juice drop' },
      { id: 7, filename: 'dessert-abstract-07.v1.webp', description: 'Caramel drizzle' },
      { id: 8, filename: 'dessert-abstract-08.v1.webp', description: 'Cake frosting swirl' },
      { id: 9, filename: 'dessert-abstract-09.v1.webp', description: 'Sugar crystals macro' },
      { id: 10, filename: 'dessert-abstract-10.v1.webp', description: 'Vanilla bean seeds' },
    ],
    icon: '🍰',
    label: 'Dessert',
    accentColor: 'text-pink-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'takeaway': {
    category: 'takeaway',
    variants: [
      { id: 1, filename: 'takeaway-abstract-01.v1.webp', description: 'Kraft paper texture' },
      { id: 2, filename: 'takeaway-abstract-02.v1.webp', description: 'Chopsticks on dark wood' },
      { id: 3, filename: 'takeaway-abstract-03.v1.webp', description: 'Food container steam' },
      { id: 4, filename: 'takeaway-abstract-04.v1.webp', description: 'Noodles close-up' },
      { id: 5, filename: 'takeaway-abstract-05.v1.webp', description: 'Paper napkin fold' },
      { id: 6, filename: 'takeaway-abstract-06.v1.webp', description: 'Food wrapper metallic' },
      { id: 7, filename: 'takeaway-abstract-07.v1.webp', description: 'Sauce drip' },
      { id: 8, filename: 'takeaway-abstract-08.v1.webp', description: 'Bamboo steamer weave' },
      { id: 9, filename: 'takeaway-abstract-09.v1.webp', description: 'Cardboard box texture' },
      { id: 10, filename: 'takeaway-abstract-10.v1.webp', description: 'Plastic fork silhouette' },
    ],
    icon: '🥡',
    label: 'Takeaway',
    accentColor: 'text-red-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'salon': {
    category: 'salon',
    variants: [
      { id: 1, filename: 'salon-abstract-01.v1.webp', description: 'Nail polish bottle' },
      { id: 2, filename: 'salon-abstract-02.v1.webp', description: 'Makeup brush bristles' },
      { id: 3, filename: 'salon-abstract-03.v1.webp', description: 'Essential oil drop' },
      { id: 4, filename: 'salon-abstract-04.v1.webp', description: 'White towel texture' },
      { id: 5, filename: 'salon-abstract-05.v1.webp', description: 'Rose gold metal tool' },
      { id: 6, filename: 'salon-abstract-06.v1.webp', description: 'Cream texture swirl' },
      { id: 7, filename: 'salon-abstract-07.v1.webp', description: 'Mirror reflection' },
      { id: 8, filename: 'salon-abstract-08.v1.webp', description: 'Candle flame spa' },
      { id: 9, filename: 'salon-abstract-09.v1.webp', description: 'Flower petal' },
      { id: 10, filename: 'salon-abstract-10.v1.webp', description: 'Soft fabric fold' },
    ],
    icon: '💅',
    label: 'Salon',
    accentColor: 'text-rose-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'tattoo': {
    category: 'tattoo',
    variants: [
      { id: 1, filename: 'tattoo-abstract-01.v1.webp', description: 'Black ink drop' },
      { id: 2, filename: 'tattoo-abstract-02.v1.webp', description: 'Tattoo machine needle' },
      { id: 3, filename: 'tattoo-abstract-03.v1.webp', description: 'Leather with studs' },
      { id: 4, filename: 'tattoo-abstract-04.v1.webp', description: 'Neon tube reflection' },
      { id: 5, filename: 'tattoo-abstract-05.v1.webp', description: 'Ink bottle cap' },
      { id: 6, filename: 'tattoo-abstract-06.v1.webp', description: 'Stencil paper texture' },
      { id: 7, filename: 'tattoo-abstract-07.v1.webp', description: 'Latex glove texture' },
      { id: 8, filename: 'tattoo-abstract-08.v1.webp', description: 'Carbon transfer paper' },
      { id: 9, filename: 'tattoo-abstract-09.v1.webp', description: 'Tattoo flash art edge' },
      { id: 10, filename: 'tattoo-abstract-10.v1.webp', description: 'Chrome machine coil' },
    ],
    icon: '🎨',
    label: 'Tattoo',
    accentColor: 'text-indigo-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'retail': {
    category: 'retail',
    variants: [
      { id: 1, filename: 'retail-abstract-01.v1.webp', description: 'Clothing hanger silhouette' },
      { id: 2, filename: 'retail-abstract-02.v1.webp', description: 'Fabric texture close-up' },
      { id: 3, filename: 'retail-abstract-03.v1.webp', description: 'Shopping bag handle' },
      { id: 4, filename: 'retail-abstract-04.v1.webp', description: 'Price tag detail' },
      { id: 5, filename: 'retail-abstract-05.v1.webp', description: 'Wooden shelf grain' },
      { id: 6, filename: 'retail-abstract-06.v1.webp', description: 'Button detail macro' },
      { id: 7, filename: 'retail-abstract-07.v1.webp', description: 'Zipper teeth close-up' },
      { id: 8, filename: 'retail-abstract-08.v1.webp', description: 'Tissue paper fold' },
      { id: 9, filename: 'retail-abstract-09.v1.webp', description: 'Gift box ribbon' },
      { id: 10, filename: 'retail-abstract-10.v1.webp', description: 'Store window reflection' },
    ],
    icon: '🛍️',
    label: 'Retail',
    accentColor: 'text-blue-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'fitness': {
    category: 'fitness',
    variants: [
      { id: 1, filename: 'fitness-abstract-01.v1.webp', description: 'Dumbbell weight plate' },
      { id: 2, filename: 'fitness-abstract-02.v1.webp', description: 'Yoga mat rolled edge' },
      { id: 3, filename: 'fitness-abstract-03.v1.webp', description: 'Water bottle condensation' },
      { id: 4, filename: 'fitness-abstract-04.v1.webp', description: 'Gym equipment cable' },
      { id: 5, filename: 'fitness-abstract-05.v1.webp', description: 'Rubber gym floor' },
      { id: 6, filename: 'fitness-abstract-06.v1.webp', description: 'Sweat droplets on metal' },
      { id: 7, filename: 'fitness-abstract-07.v1.webp', description: 'Resistance band stretch' },
      { id: 8, filename: 'fitness-abstract-08.v1.webp', description: 'Kettlebell handle' },
      { id: 9, filename: 'fitness-abstract-09.v1.webp', description: 'Towel on bench' },
      { id: 10, filename: 'fitness-abstract-10.v1.webp', description: 'Gym shoe sole tread' },
    ],
    icon: '💪',
    label: 'Fitness',
    accentColor: 'text-green-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'sports': {
    category: 'sports',
    variants: [
      { id: 1, filename: 'sports-abstract-01.v1.webp', description: 'Football leather stitching' },
      { id: 2, filename: 'sports-abstract-02.v1.webp', description: 'Tennis ball fuzz' },
      { id: 3, filename: 'sports-abstract-03.v1.webp', description: 'Grass blade with water' },
      { id: 4, filename: 'sports-abstract-04.v1.webp', description: 'Sports shoe cleat' },
      { id: 5, filename: 'sports-abstract-05.v1.webp', description: 'Net weave pattern' },
      { id: 6, filename: 'sports-abstract-06.v1.webp', description: 'Whistle metal reflection' },
      { id: 7, filename: 'sports-abstract-07.v1.webp', description: 'Stopwatch face' },
      { id: 8, filename: 'sports-abstract-08.v1.webp', description: 'Court line marking' },
      { id: 9, filename: 'sports-abstract-09.v1.webp', description: 'Sports tape roll' },
      { id: 10, filename: 'sports-abstract-10.v1.webp', description: 'Trophy rim reflection' },
    ],
    icon: '⚽',
    label: 'Sports',
    accentColor: 'text-lime-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'hotel': {
    category: 'hotel',
    variants: [
      { id: 1, filename: 'hotel-abstract-01.v1.webp', description: 'White bed sheets texture' },
      { id: 2, filename: 'hotel-abstract-02.v1.webp', description: 'Hotel room key card' },
      { id: 3, filename: 'hotel-abstract-03.v1.webp', description: 'Pillow corner fold' },
      { id: 4, filename: 'hotel-abstract-04.v1.webp', description: 'Door handle chrome' },
      { id: 5, filename: 'hotel-abstract-05.v1.webp', description: 'Towel swan fold edge' },
      { id: 6, filename: 'hotel-abstract-06.v1.webp', description: 'Minibar glass texture' },
      { id: 7, filename: 'hotel-abstract-07.v1.webp', description: 'Curtain fabric drape' },
      { id: 8, filename: 'hotel-abstract-08.v1.webp', description: 'Room number plate' },
      { id: 9, filename: 'hotel-abstract-09.v1.webp', description: 'Marble surface droplets' },
      { id: 10, filename: 'hotel-abstract-10.v1.webp', description: 'Bedside lamp glow' },
    ],
    icon: '🏨',
    label: 'Hotel',
    accentColor: 'text-cyan-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'venue': {
    category: 'venue',
    variants: [
      { id: 1, filename: 'venue-abstract-01.v1.webp', description: 'Stage spotlight beam' },
      { id: 2, filename: 'venue-abstract-02.v1.webp', description: 'Velvet rope texture' },
      { id: 3, filename: 'venue-abstract-03.v1.webp', description: 'Champagne flute rim' },
      { id: 4, filename: 'venue-abstract-04.v1.webp', description: 'Red carpet texture' },
      { id: 5, filename: 'venue-abstract-05.v1.webp', description: 'Microphone stand silhouette' },
      { id: 6, filename: 'venue-abstract-06.v1.webp', description: 'Theater seat fabric' },
      { id: 7, filename: 'venue-abstract-07.v1.webp', description: 'Confetti falling blur' },
      { id: 8, filename: 'venue-abstract-08.v1.webp', description: 'Chandelier crystal' },
      { id: 9, filename: 'venue-abstract-09.v1.webp', description: 'Event ticket edge' },
      { id: 10, filename: 'venue-abstract-10.v1.webp', description: 'Stage curtain fold' },
    ],
    icon: '🎭',
    label: 'Venue',
    accentColor: 'text-fuchsia-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'entertainment': {
    category: 'entertainment',
    variants: [
      { id: 1, filename: 'entertainment-abstract-01.v1.webp', description: 'Movie screen glow' },
      { id: 2, filename: 'entertainment-abstract-02.v1.webp', description: 'Popcorn kernel' },
      { id: 3, filename: 'entertainment-abstract-03.v1.webp', description: 'Game controller button' },
      { id: 4, filename: 'entertainment-abstract-04.v1.webp', description: '3D glasses lens' },
      { id: 5, filename: 'entertainment-abstract-05.v1.webp', description: 'Bowling lane wood' },
      { id: 6, filename: 'entertainment-abstract-06.v1.webp', description: 'Arcade joystick handle' },
      { id: 7, filename: 'entertainment-abstract-07.v1.webp', description: 'Playing card edge' },
      { id: 8, filename: 'entertainment-abstract-08.v1.webp', description: 'Dice roll motion' },
      { id: 9, filename: 'entertainment-abstract-09.v1.webp', description: 'Ticket perforation' },
      { id: 10, filename: 'entertainment-abstract-10.v1.webp', description: 'Neon sign tube glow' },
    ],
    icon: '🎮',
    label: 'Entertainment',
    accentColor: 'text-yellow-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'professional': {
    category: 'professional',
    variants: [
      { id: 1, filename: 'professional-abstract-01.v1.webp', description: 'Fountain pen nib' },
      { id: 2, filename: 'professional-abstract-02.v1.webp', description: 'Business card embossing' },
      { id: 3, filename: 'professional-abstract-03.v1.webp', description: 'Document paper grain' },
      { id: 4, filename: 'professional-abstract-04.v1.webp', description: 'Laptop keyboard key' },
      { id: 5, filename: 'professional-abstract-05.v1.webp', description: 'Office desk wood grain' },
      { id: 6, filename: 'professional-abstract-06.v1.webp', description: 'Paper clip chain' },
      { id: 7, filename: 'professional-abstract-07.v1.webp', description: 'Signature line with pen' },
      { id: 8, filename: 'professional-abstract-08.v1.webp', description: 'Legal folder tab' },
      { id: 9, filename: 'professional-abstract-09.v1.webp', description: 'Coffee cup on documents' },
      { id: 10, filename: 'professional-abstract-10.v1.webp', description: 'Calculator button texture' },
    ],
    icon: '💼',
    label: 'Professional',
    accentColor: 'text-gray-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'other': {
    category: 'other',
    variants: [
      { id: 1, filename: 'other-abstract-01.v1.webp', description: 'Concrete texture' },
      { id: 2, filename: 'other-abstract-02.v1.webp', description: 'Wood grain natural light' },
      { id: 3, filename: 'other-abstract-03.v1.webp', description: 'Metal surface reflection' },
      { id: 4, filename: 'other-abstract-04.v1.webp', description: 'Fabric weave texture' },
      { id: 5, filename: 'other-abstract-05.v1.webp', description: 'Glass transparency bokeh' },
      { id: 6, filename: 'other-abstract-06.v1.webp', description: 'Brick wall detail' },
      { id: 7, filename: 'other-abstract-07.v1.webp', description: 'Paper texture fold shadow' },
      { id: 8, filename: 'other-abstract-08.v1.webp', description: 'Leather surface grain' },
      { id: 9, filename: 'other-abstract-09.v1.webp', description: 'Stone texture water droplets' },
      { id: 10, filename: 'other-abstract-10.v1.webp', description: 'Brushed steel surface' },
    ],
    icon: '🏢',
    label: 'Other',
    accentColor: 'text-slate-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  // Add other categories as needed...
}

// Hash function for deterministic variant selection
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Get placeholder for a business - deterministic based on google_place_id
// @param systemCategory - The stable system_category enum (NOT display_category)
// @param googlePlaceId - Used for deterministic hash-based variant selection
// @param manualVariantId - Optional admin override for specific variant
// @param businessStatus - Used for safety assertion (force neutral for unclaimed)
export function getPlaceholder(
  systemCategory: SystemCategory,
  googlePlaceId: string,
  manualVariantId?: number | null,
  businessStatus?: string
) {
  const categoryData = PLACEHOLDER_LIBRARY[systemCategory]
  
  if (!categoryData) {
    // Fallback to restaurant if category not found
    const fallback = PLACEHOLDER_LIBRARY['restaurant']
    let variantIndex = manualVariantId !== null && manualVariantId !== undefined
      ? manualVariantId % fallback.variants.length
      : hashString(googlePlaceId) % fallback.variants.length
    
    // 🔒 GUARDRAIL #2: Runtime safety assertion
    // Force neutral variant for unclaimed businesses (defensive programming)
    if (businessStatus === 'unclaimed' && variantIndex !== 0) {
      console.warn(`🔒 Safety override: non-neutral variant (${variantIndex}) on unclaimed business. Forcing variant 0.`)
      variantIndex = 0
    }
    
    return {
      ...fallback,
      selectedVariant: fallback.variants[variantIndex],
      imagePath: `/placeholders/${fallback.category}/${fallback.variants[variantIndex].filename}`
    }
  }

  // Use manual variant if set, otherwise hash-based auto-selection
  let variantIndex = manualVariantId !== null && manualVariantId !== undefined
    ? manualVariantId % categoryData.variants.length
    : hashString(googlePlaceId) % categoryData.variants.length

  // 🔒 GUARDRAIL #2: Runtime safety assertion
  // Force neutral variant for unclaimed businesses (defensive programming)
  if (businessStatus === 'unclaimed' && variantIndex !== 0) {
    console.warn(`🔒 Safety override: non-neutral variant (${variantIndex}) on unclaimed business. Forcing variant 0.`)
    variantIndex = 0
  }

  return {
    ...categoryData,
    selectedVariant: categoryData.variants[variantIndex],
    imagePath: `/placeholders/${categoryData.category}/${categoryData.variants[variantIndex].filename}`
  }
}

// Get all variants for a category (for admin UI dropdown)
export function getCategoryVariants(systemCategory: SystemCategory) {
  return PLACEHOLDER_LIBRARY[systemCategory]?.variants || []
}

// Get all available categories
export function getAllPlaceholderCategories(): SystemCategory[] {
  return Object.keys(PLACEHOLDER_LIBRARY) as SystemCategory[]
}

