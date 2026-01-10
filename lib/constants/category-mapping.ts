// Category Mapping for Google Places Import
// Maps our user-friendly categories to Google Places API types

export const CATEGORY_MAPPING = {
  'Restaurant': {
    googleTypes: ['restaurant', 'meal_takeaway'],
    displayName: 'Restaurant',
    businessType: 'restaurant'
  },
  'Cafe/Coffee Shop': {
    googleTypes: ['cafe', 'coffee_shop'],
    displayName: 'Cafe/Coffee Shop',
    businessType: 'cafe'
  },
  'Bar/Pub': {
    googleTypes: ['bar', 'night_club'],
    displayName: 'Bar/Pub',
    businessType: 'bar'
  },
  'Dessert/Ice Cream': {
    googleTypes: ['bakery', 'ice_cream_shop'],
    displayName: 'Dessert/Ice Cream',
    businessType: 'dessert'
  },
  'Takeaway/Street Food': {
    googleTypes: ['meal_takeaway', 'food_truck'],
    displayName: 'Takeaway/Street Food',
    businessType: 'takeaway'
  },
  'Salon/Spa': {
    googleTypes: ['beauty_salon', 'spa'],
    displayName: 'Salon/Spa',
    businessType: 'salon'
  },
  'Hairdresser/Barber': {
    googleTypes: ['hair_care', 'barber_shop'],
    displayName: 'Hairdresser/Barber',
    businessType: 'salon'
  },
  'Tattoo/Piercing': {
    googleTypes: ['tattoo_studio', 'piercing_studio'],
    displayName: 'Tattoo/Piercing',
    businessType: 'salon'
  },
  'Clothing/Fashion': {
    googleTypes: ['clothing_store', 'shoe_store', 'jewelry_store'],
    displayName: 'Clothing/Fashion',
    businessType: 'retail'
  },
  'Gift Shop': {
    googleTypes: ['gift_shop', 'souvenir_store'],
    displayName: 'Gift Shop',
    businessType: 'retail'
  },
  'Fitness/Gym': {
    googleTypes: ['gym', 'fitness_center'],
    displayName: 'Fitness/Gym',
    businessType: 'fitness'
  },
  'Sports/Outdoors': {
    googleTypes: ['sporting_goods_store', 'outdoor_sports'],
    displayName: 'Sports/Outdoors',
    businessType: 'retail'
  },
  'Hotel/BnB': {
    googleTypes: ['lodging', 'hotel', 'bed_and_breakfast'],
    displayName: 'Hotel/BnB',
    businessType: 'accommodation'
  },
  'Venue/Event Space': {
    googleTypes: ['event_venue', 'banquet_hall'],
    displayName: 'Venue/Event Space',
    businessType: 'venue'
  },
  'Entertainment/Attractions': {
    googleTypes: ['tourist_attraction', 'amusement_park', 'movie_theater'],
    displayName: 'Entertainment/Attractions',
    businessType: 'entertainment'
  },
  'Professional Services': {
    googleTypes: ['lawyer', 'accountant', 'real_estate_agency', 'insurance_agency'],
    displayName: 'Professional Services',
    businessType: 'service_business'
  },
  'Other': {
    googleTypes: ['establishment', 'point_of_interest'],
    displayName: 'Other',
    businessType: 'other'
  }
} as const;

// Reverse mapping: Google type -> Our category
export const GOOGLE_TYPE_TO_CATEGORY: Record<string, string> = {};
Object.entries(CATEGORY_MAPPING).forEach(([category, config]) => {
  config.googleTypes.forEach(type => {
    GOOGLE_TYPE_TO_CATEGORY[type] = category;
  });
});

