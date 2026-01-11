// Category Mapping for Google Places Import
// Maps our canonical system categories to Google Places API types
// CRITICAL: This must stay in sync with system-categories.ts

import { type SystemCategory, SYSTEM_CATEGORY_LABEL } from './system-categories'

interface CategoryConfig {
  googleTypes: string[] // Google Places API type identifiers
  displayName: string  // User-facing label
}

// Map system_category enum → Google Places types
export const CATEGORY_MAPPING: Record<SystemCategory, CategoryConfig> = {
  restaurant: {
    googleTypes: ['restaurant', 'pizza_restaurant', 'italian_restaurant', 'chinese_restaurant', 'indian_restaurant', 'mexican_restaurant', 'japanese_restaurant', 'thai_restaurant', 'french_restaurant'],
    displayName: SYSTEM_CATEGORY_LABEL.restaurant
  },
  cafe: {
    googleTypes: ['cafe', 'coffee_shop'],
    displayName: SYSTEM_CATEGORY_LABEL.cafe
  },
  bakery: {
    googleTypes: ['bakery'],
    displayName: SYSTEM_CATEGORY_LABEL.bakery
  },
  bar: {
    googleTypes: ['bar', 'night_club', 'wine_bar'],
    displayName: SYSTEM_CATEGORY_LABEL.bar
  },
  pub: {
    googleTypes: ['pub', 'gastropub'],
    displayName: SYSTEM_CATEGORY_LABEL.pub
  },
  dessert: {
    googleTypes: ['ice_cream_shop', 'dessert_shop'],
    displayName: SYSTEM_CATEGORY_LABEL.dessert
  },
  takeaway: {
    googleTypes: ['meal_takeaway'],
    displayName: SYSTEM_CATEGORY_LABEL.takeaway
  },
  fast_food: {
    googleTypes: ['fast_food_restaurant'],
    displayName: SYSTEM_CATEGORY_LABEL.fast_food
  },
  salon: {
    googleTypes: ['beauty_salon', 'spa', 'nail_salon'],
    displayName: SYSTEM_CATEGORY_LABEL.salon
  },
  barber: {
    googleTypes: ['hair_care', 'hair_salon', 'barber_shop'],
    displayName: SYSTEM_CATEGORY_LABEL.barber
  },
  tattoo: {
    googleTypes: ['tattoo_shop', 'tattoo_studio', 'piercing_studio'],
    displayName: SYSTEM_CATEGORY_LABEL.tattoo
  },
  wellness: {
    googleTypes: ['physiotherapist', 'massage_spa', 'wellness_center', 'acupuncture', 'osteopath', 'chiropractor'],
    displayName: SYSTEM_CATEGORY_LABEL.wellness
  },
  retail: {
    googleTypes: ['clothing_store', 'shoe_store', 'jewelry_store', 'gift_shop', 'souvenir_store', 'store', 'shopping_mall'],
    displayName: SYSTEM_CATEGORY_LABEL.retail
  },
  fitness: {
    googleTypes: ['gym', 'fitness_center', 'yoga_studio', 'pilates_studio'],
    displayName: SYSTEM_CATEGORY_LABEL.fitness
  },
  sports: {
    googleTypes: ['sporting_goods_store', 'sports_club', 'sports_complex'],
    displayName: SYSTEM_CATEGORY_LABEL.sports
  },
  hotel: {
    googleTypes: ['lodging', 'hotel', 'motel', 'bed_and_breakfast'],
    displayName: SYSTEM_CATEGORY_LABEL.hotel
  },
  venue: {
    googleTypes: ['event_venue', 'banquet_hall', 'wedding_venue', 'conference_center'],
    displayName: SYSTEM_CATEGORY_LABEL.venue
  },
  entertainment: {
    googleTypes: ['tourist_attraction', 'amusement_park', 'museum', 'art_gallery', 'movie_theater', 'bowling_alley', 'amusement_center'],
    displayName: SYSTEM_CATEGORY_LABEL.entertainment
  },
  professional: {
    googleTypes: ['lawyer', 'accounting', 'accountant', 'real_estate_agency', 'insurance_agency', 'consultant'],
    displayName: SYSTEM_CATEGORY_LABEL.professional
  },
  other: {
    googleTypes: ['establishment', 'point_of_interest'],
    displayName: SYSTEM_CATEGORY_LABEL.other
  }
} as const

// Reverse mapping: Google type → system_category (for quick lookups)
export const GOOGLE_TYPE_TO_SYSTEM_CATEGORY: Record<string, SystemCategory> = {}
Object.entries(CATEGORY_MAPPING).forEach(([category, config]) => {
  config.googleTypes.forEach(type => {
    GOOGLE_TYPE_TO_SYSTEM_CATEGORY[type] = category as SystemCategory
  })
})
