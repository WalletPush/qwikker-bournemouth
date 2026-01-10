// Global placeholder system for unclaimed businesses
// 10-20 abstract variants per category to prevent grid repetition
// Stored in /public/placeholders/ - accessible by ALL franchises
//
// CRITICAL: Placeholders are keyed by system_category (stable enum), NOT display_category
// This ensures placeholders work correctly even if admin changes the display label

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
      { id: 1, filename: 'restaurant-abstract-01.v1.webp', description: 'Elegant cutlery detail' },
      { id: 2, filename: 'restaurant-abstract-02.v1.webp', description: 'Wine glass on table' },
      { id: 3, filename: 'restaurant-abstract-03.v1.webp', description: 'Pasta close-up' },
      { id: 4, filename: 'restaurant-abstract-04.v1.webp', description: 'Bread basket detail' },
      { id: 5, filename: 'restaurant-abstract-05.v1.webp', description: 'Silverware pattern' },
      { id: 6, filename: 'restaurant-abstract-06.v1.webp', description: 'Plate edge detail' },
      { id: 7, filename: 'restaurant-abstract-07.v1.webp', description: 'Napkin fold close-up' },
      { id: 8, filename: 'restaurant-abstract-08.v1.webp', description: 'Candle light bokeh' },
      { id: 9, filename: 'restaurant-abstract-09.v1.webp', description: 'Herb garnish macro' },
      { id: 10, filename: 'restaurant-abstract-10.v1.webp', description: 'Sauce drizzle detail' },
    ],
    icon: '🍽️',
    label: 'Restaurant',
    accentColor: 'text-orange-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'coffee': {
    category: 'coffee',
    variants: [
      { id: 1, filename: 'coffee-abstract-01.v1.webp', description: 'Steam rising' },
      { id: 2, filename: 'coffee-abstract-02.v1.webp', description: 'Latte art detail' },
      { id: 3, filename: 'coffee-abstract-03.v1.webp', description: 'Beans texture' },
      { id: 4, filename: 'coffee-abstract-04.v1.webp', description: 'Cup handle close-up' },
      { id: 5, filename: 'coffee-abstract-05.v1.webp', description: 'Espresso pour' },
      { id: 6, filename: 'coffee-abstract-06.v1.webp', description: 'Pastry crumb detail' },
      { id: 7, filename: 'coffee-abstract-07.v1.webp', description: 'Saucer pattern' },
      { id: 8, filename: 'coffee-abstract-08.v1.webp', description: 'Grinder close-up' },
      { id: 9, filename: 'coffee-abstract-09.v1.webp', description: 'Sugar crystals' },
      { id: 10, filename: 'coffee-abstract-10.v1.webp', description: 'Milk foam texture' },
    ],
    icon: '☕',
    label: 'Café',
    accentColor: 'text-amber-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'bar': {
    category: 'bar',
    variants: [
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
      { id: 1, filename: 'barber-abstract-01.v1.webp', description: 'Scissors silhouette' },
      { id: 2, filename: 'barber-abstract-02.v1.webp', description: 'Comb close-up' },
      { id: 3, filename: 'barber-abstract-03.v1.webp', description: 'Razor detail' },
      { id: 4, filename: 'barber-abstract-04.v1.webp', description: 'Brush bristles' },
      { id: 5, filename: 'barber-abstract-05.v1.webp', description: 'Clippers macro' },
      { id: 6, filename: 'barber-abstract-06.v1.webp', description: 'Leather detail' },
      { id: 7, filename: 'barber-abstract-07.v1.webp', description: 'Towel texture' },
      { id: 8, filename: 'barber-abstract-08.v1.webp', description: 'Mirror reflection' },
      { id: 9, filename: 'barber-abstract-09.v1.webp', description: 'Tool arrangement' },
      { id: 10, filename: 'barber-abstract-10.v1.webp', description: 'Powder brush' },
    ],
    icon: '✂️',
    label: 'Barber',
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
export function getPlaceholder(
  systemCategory: SystemCategory,
  googlePlaceId: string,
  manualVariantId?: number | null
) {
  const categoryData = PLACEHOLDER_LIBRARY[systemCategory]
  
  if (!categoryData) {
    // Fallback to restaurant if category not found
    const fallback = PLACEHOLDER_LIBRARY['restaurant']
    const variantIndex = manualVariantId 
      ? (manualVariantId - 1) % fallback.variants.length
      : hashString(googlePlaceId) % fallback.variants.length
    
    return {
      ...fallback,
      selectedVariant: fallback.variants[variantIndex],
      imagePath: `/placeholders/${fallback.category}/${fallback.variants[variantIndex].filename}`
    }
  }

  // Use manual variant if set, otherwise hash-based auto-selection
  const variantIndex = manualVariantId 
    ? (manualVariantId - 1) % categoryData.variants.length
    : hashString(googlePlaceId) % categoryData.variants.length

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

