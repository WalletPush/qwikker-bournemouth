// System Category Architecture for QWIKKER
// 3-layer category system as recommended by ChatGPT

// ====================
// SYSTEM CATEGORIES (The Canonical List)
// ====================
// This is the single source of truth for all categories
// Used by: placeholders, AI, filtering, analytics, pricing

export const SYSTEM_CATEGORIES = [
  "restaurant",
  "cafe",
  "bar",
  "dessert",
  "takeaway",
  "salon",
  "barber",
  "tattoo",
  "retail",
  "fitness",
  "sports",
  "hotel",
  "venue",
  "entertainment",
  "professional",
  "other"
] as const;

export type SystemCategory = typeof SYSTEM_CATEGORIES[number];

// ====================
// DISPLAY LABELS (User-Facing)
// ====================
// What users see on cards, filters, onboarding
// Can be changed anytime without breaking logic

export const SYSTEM_CATEGORY_LABEL: Record<SystemCategory, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe / Coffee Shop",
  bar: "Bar / Pub",
  dessert: "Dessert / Ice Cream",
  takeaway: "Takeaway / Street Food",
  salon: "Salon / Spa",
  barber: "Hairdresser / Barber",
  tattoo: "Tattoo / Piercing",
  retail: "Retail",
  fitness: "Fitness / Gym",
  sports: "Sports / Outdoors",
  hotel: "Hotel / BnB",
  venue: "Venue / Event Space",
  entertainment: "Entertainment / Attractions",
  professional: "Professional Services",
  other: "Other",
};

// ====================
// GOOGLE TYPES → SYSTEM CATEGORY MAPPING
// ====================
// Used by import tool to map raw Google Place types → system_category

export function mapGoogleTypesToSystemCategory(types: string[]): SystemCategory {
  const t = new Set(types.map(type => type.toLowerCase()));

  // Food & Drink (order matters - most specific first)
  if (t.has("cafe") || t.has("coffee_shop")) return "cafe";
  if (t.has("bar") || t.has("pub") || t.has("night_club") || t.has("wine_bar")) return "bar";
  if (t.has("ice_cream_shop") || t.has("dessert_shop")) return "dessert";
  if (t.has("bakery") && !t.has("restaurant")) return "dessert"; // Bakery without restaurant = dessert
  if (t.has("meal_takeaway") || t.has("fast_food_restaurant")) return "takeaway";
  if (t.has("restaurant") || t.has("pizza_restaurant") || t.has("italian_restaurant") || 
      t.has("chinese_restaurant") || t.has("indian_restaurant") || t.has("mexican_restaurant") ||
      t.has("japanese_restaurant") || t.has("thai_restaurant") || t.has("french_restaurant")) return "restaurant";

  // Beauty & Wellness
  if (t.has("hair_care") || t.has("hair_salon") || t.has("barber_shop")) return "barber";
  if (t.has("beauty_salon") || t.has("spa") || t.has("nail_salon")) return "salon";
  if (t.has("tattoo_shop") || t.has("tattoo_studio") || t.has("piercing_studio")) return "tattoo";

  // Fitness & Sports
  if (t.has("gym") || t.has("fitness_center") || t.has("yoga_studio") || t.has("pilates_studio")) return "fitness";
  if (t.has("sporting_goods_store") || t.has("sports_club") || t.has("sports_complex")) return "sports";

  // Retail
  if (t.has("clothing_store") || t.has("shoe_store") || t.has("jewelry_store") || 
      t.has("gift_shop") || t.has("souvenir_store") || t.has("store") || t.has("shopping_mall")) return "retail";

  // Hospitality
  if (t.has("lodging") || t.has("hotel") || t.has("motel") || t.has("bed_and_breakfast")) return "hotel";

  // Events & Venues
  if (t.has("event_venue") || t.has("banquet_hall") || t.has("wedding_venue") || t.has("conference_center")) return "venue";

  // Entertainment
  if (t.has("tourist_attraction") || t.has("amusement_park") || t.has("museum") || 
      t.has("art_gallery") || t.has("movie_theater") || t.has("bowling_alley") || 
      t.has("amusement_center")) return "entertainment";

  // Professional Services
  if (t.has("lawyer") || t.has("accounting") || t.has("accountant") || 
      t.has("real_estate_agency") || t.has("insurance_agency") || t.has("consultant")) return "professional";

  // Fallback
  return "other";
}

// ====================
// HELPER FUNCTIONS
// ====================

// Get display label from system_category
export function getDisplayLabel(systemCategory: SystemCategory): string {
  return SYSTEM_CATEGORY_LABEL[systemCategory];
}

// Get system_category from display label (for backward compatibility / migration)
export function getSystemCategoryFromDisplayLabel(displayLabel: string): SystemCategory {
  const normalized = displayLabel.toLowerCase().trim();
  
  if (normalized.includes('restaurant')) return 'restaurant';
  if (normalized.includes('cafe') || normalized.includes('coffee')) return 'cafe';
  if (normalized.includes('bar') || normalized.includes('pub')) return 'bar';
  if (normalized.includes('dessert') || normalized.includes('ice cream')) return 'dessert';
  if (normalized.includes('takeaway') || normalized.includes('street food')) return 'takeaway';
  if (normalized.includes('salon') || normalized.includes('spa')) return 'salon';
  if (normalized.includes('hairdresser') || normalized.includes('barber')) return 'barber';
  if (normalized.includes('tattoo') || normalized.includes('piercing')) return 'tattoo';
  if (normalized.includes('clothing') || normalized.includes('fashion') || normalized.includes('gift') || normalized.includes('retail')) return 'retail';
  if (normalized.includes('fitness') || normalized.includes('gym')) return 'fitness';
  if (normalized.includes('sports') || normalized.includes('outdoor')) return 'sports';
  if (normalized.includes('hotel') || normalized.includes('bnb')) return 'hotel';
  if (normalized.includes('venue') || normalized.includes('event space')) return 'venue';
  if (normalized.includes('entertainment') || normalized.includes('attraction')) return 'entertainment';
  if (normalized.includes('professional') || normalized.includes('service')) return 'professional';
  
  return 'other';
}

// Onboarding form options (uses system_category as value, display label as label)
export const ONBOARDING_CATEGORY_OPTIONS = SYSTEM_CATEGORIES.map(
  (systemCategory) => ({
    value: systemCategory,
    label: SYSTEM_CATEGORY_LABEL[systemCategory],
  })
);

// Check if a value is a valid SystemCategory
export function isValidSystemCategory(value: unknown): value is SystemCategory {
  return typeof value === 'string' && SYSTEM_CATEGORIES.includes(value as SystemCategory);
}

