/**
 * Map Google Places types to human-readable category labels
 * for display in Discover cards
 */

const GOOGLE_TYPE_LABELS: Record<string, string> = {
  // Food & Drink
  'restaurant': 'Restaurant',
  'cafe': 'Café',
  'coffee_shop': 'Coffee Shop',
  'bar': 'Bar',
  'pub': 'Pub',
  'night_club': 'Night Club',
  'bakery': 'Bakery',
  'meal_takeaway': 'Takeaway',
  'meal_delivery': 'Delivery',
  'food': 'Food & Drink',
  'pizza_restaurant': 'Pizzeria',
  'italian_restaurant': 'Italian Restaurant',
  'chinese_restaurant': 'Chinese Restaurant',
  'indian_restaurant': 'Indian Restaurant',
  'japanese_restaurant': 'Japanese Restaurant',
  'mexican_restaurant': 'Mexican Restaurant',
  'thai_restaurant': 'Thai Restaurant',
  'french_restaurant': 'French Restaurant',
  'seafood_restaurant': 'Seafood Restaurant',
  'steak_house': 'Steakhouse',
  'sushi_restaurant': 'Sushi Restaurant',
  'fast_food_restaurant': 'Fast Food',
  'hamburger_restaurant': 'Burger Joint',
  'ice_cream_shop': 'Ice Cream',
  'dessert_shop': 'Desserts',
  
  // Beauty & Wellness
  'hair_salon': 'Hair Salon',
  'hair_care': 'Hair Care',
  'barber_shop': 'Barber',
  'beauty_salon': 'Beauty Salon',
  'spa': 'Spa',
  'nail_salon': 'Nail Salon',
  'tattoo_shop': 'Tattoo Studio',
  
  // Fitness & Sports
  'gym': 'Gym',
  'fitness_center': 'Fitness Center',
  'yoga_studio': 'Yoga Studio',
  'sports_club': 'Sports Club',
  
  // Retail
  'clothing_store': 'Clothing Store',
  'shoe_store': 'Shoe Store',
  'jewelry_store': 'Jewellery',
  'book_store': 'Bookshop',
  'gift_shop': 'Gift Shop',
  'florist': 'Florist',
  'pet_store': 'Pet Shop',
  'liquor_store': 'Off Licence',
  'convenience_store': 'Convenience Store',
  'supermarket': 'Supermarket',
  
  // Entertainment
  'movie_theater': 'Cinema',
  'bowling_alley': 'Bowling',
  'casino': 'Casino',
  'amusement_park': 'Amusement Park',
  'tourist_attraction': 'Attraction',
  'art_gallery': 'Art Gallery',
  'museum': 'Museum',
  
  // Accommodation
  'lodging': 'Accommodation',
  'hotel': 'Hotel',
  'hostel': 'Hostel',
  
  // Services
  'car_wash': 'Car Wash',
  'car_repair': 'Auto Repair',
  'laundry': 'Laundry',
  'dentist': 'Dentist',
  'doctor': 'Doctor',
  'pharmacy': 'Pharmacy',
  'veterinary_care': 'Vet',
  
  // Generic fallbacks
  'establishment': 'Business',
  'point_of_interest': 'Attraction',
  'store': 'Shop',
}

/**
 * Get a human-readable category label from business profile data
 * Priority: google_primary_type > display_category > system_category
 */
export function getCategoryLabel(business: {
  google_primary_type?: string | null
  google_types?: string[] | null
  display_category?: string | null
  system_category?: string | null
}): string {
  // 1. Try google_primary_type
  if (business.google_primary_type) {
    const label = GOOGLE_TYPE_LABELS[business.google_primary_type]
    if (label) return label
  }
  
  // 2. Try first non-generic type from google_types
  if (business.google_types && Array.isArray(business.google_types)) {
    const genericTypes = new Set(['establishment', 'point_of_interest', 'premise'])
    
    for (const type of business.google_types) {
      if (!genericTypes.has(type)) {
        const label = GOOGLE_TYPE_LABELS[type]
        if (label) return label
      }
    }
  }
  
  // 3. Use display_category (user-facing label from onboarding)
  if (business.display_category) {
    return business.display_category
  }
  
  // 4. Fallback to system_category (capitalize first letter)
  if (business.system_category) {
    return business.system_category.charAt(0).toUpperCase() + business.system_category.slice(1)
  }
  
  // 5. Ultimate fallback
  return 'Business'
}
