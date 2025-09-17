// Mock data for user dashboard - Phase 1 UI shell

export interface MockBusiness {
  id: string
  name: string
  slug: string
  tagline: string
  address: string
  town: string
  hours: string
  logo?: string
  images: string[]
  tier: 'qwikker_picks' | 'featured' | 'recommended'
  category: string
  rating: number
  reviewCount: number
  distance: number
  menuPreview: string[]
  hasSecretMenu: boolean
  activeOffers: number
  offerIds?: string[] // IDs of offers this business has
}

export interface MockOffer {
  id: string
  businessId: string
  businessName: string
  title: string
  description: string
  value: string
  type: 'discount' | 'two_for_one' | 'freebie' | 'percentage_off'
  badge: string
  terms: string
  expiryDate: string
  isPopular: boolean
  isEndingSoon: boolean
  image?: string
}

export interface MockSecretMenu {
  id: string
  businessId: string
  businessName: string
  items: {
    name: string
    description: string
    price?: string
    isSignature?: boolean
    isPremium?: boolean
    rarity?: number
    chefNote?: string
  }[]
}

export interface MockChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  businessCards?: {
    id: string
    name: string
    tagline: string
    image?: string
    actions: string[]
  }[]
}

// Mock businesses with tier-based hierarchy
export const mockBusinesses: MockBusiness[] = [
  // QWIKKER PICKS (top tier)
  {
    id: '1',
    name: 'The Seaside Bistro',
    slug: 'seaside-bistro',
    tagline: 'Fresh seafood with ocean views',
    address: '15 Pier Approach',
    town: 'Bournemouth',
    hours: '12pm - 10pm',
    images: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop&crop=center'],
    tier: 'qwikker_picks',
    category: 'Restaurant',
    rating: 4.8,
    reviewCount: 127,
    distance: 0.3,
    menuPreview: ['Fish & Chips £14', 'Seafood Platter £22', 'Crab Cakes £16'],
    hasSecretMenu: true,
    activeOffers: 2,
    offerIds: ['1', '4'] // 2-for-1 Fish & Chips, Free Dessert with Main Course
  },
  {
    id: '2', 
    name: 'Artisan Coffee Co.',
    slug: 'artisan-coffee',
    tagline: 'Locally roasted, ethically sourced',
    address: '42 Old Christchurch Rd',
    town: 'Bournemouth',
    hours: '7am - 6pm',
    images: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop&crop=center'],
    tier: 'qwikker_picks',
    category: 'Cafe',
    rating: 4.9,
    reviewCount: 89,
    distance: 0.5,
    menuPreview: ['Flat White £3.20', 'Avocado Toast £7.50', 'Pastries from £2.80'],
    hasSecretMenu: true,
    activeOffers: 2,
    offerIds: ['2', '6'] // Free Pastry with Coffee, 25% off Coffee Beans
  },
  
  // FEATURED (mid tier)
  {
    id: '3',
    name: 'Zen Wellness Spa',
    slug: 'zen-wellness',
    tagline: 'Relaxation and rejuvenation',
    address: '8 Westover Rd',
    town: 'Bournemouth',
    hours: '9am - 8pm',
    images: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop&crop=center'],
    tier: 'featured',
    category: 'Spa',
    rating: 4.6,
    reviewCount: 203,
    distance: 0.8,
    menuPreview: ['Massage £45', 'Facial £35', 'Full Day Package £120'],
    hasSecretMenu: false,
    activeOffers: 1,
    offerIds: ['5'] // Buy 2 Get 1 Free Treatments
  },
  {
    id: '4',
    name: 'The Craft Brewery',
    slug: 'craft-brewery',
    tagline: 'Local ales and craft beers',
    address: '23 Richmond Hill',
    town: 'Bournemouth',
    hours: '4pm - 11pm',
    images: ['https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=400&h=300&fit=crop&crop=center'],
    tier: 'featured',
    category: 'Bar',
    rating: 4.5,
    reviewCount: 156,
    distance: 1.2,
    menuPreview: ['Pint £4.50', 'Tasting Flight £12', 'Bar Snacks £6-8'],
    hasSecretMenu: true,
    activeOffers: 2,
    offerIds: ['3', '7'] // 20% off Tasting Flights, Happy Hour: 2-for-1 Pints
  },
  
  // RECOMMENDED (base tier)
  {
    id: '5',
    name: 'Fitness First Gym',
    slug: 'fitness-first',
    tagline: 'Your fitness journey starts here',
    address: '156 Holdenhurst Rd',
    town: 'Bournemouth',
    hours: '6am - 10pm',
    images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center'],
    tier: 'recommended',
    category: 'Gym',
    rating: 4.5,
    reviewCount: 78,
    distance: 1.5,
    menuPreview: ['Day Pass £12', 'Monthly £29', 'Personal Training £35/hr'],
    hasSecretMenu: false,
    activeOffers: 0,
    offerIds: [] // No current offers
  },
  {
    id: '6',
    name: 'Bella Vista Restaurant',
    slug: 'bella-vista',
    tagline: 'Authentic Italian cuisine',
    address: '67 Christchurch Rd',
    town: 'Bournemouth',
    hours: '5pm - 10pm',
    images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop&crop=center'],
    tier: 'recommended',
    category: 'Restaurant',
    rating: 4.6,
    reviewCount: 94,
    distance: 2.1,
    menuPreview: ['Pasta £12-16', 'Pizza £10-14', 'Wine from £18'],
    hasSecretMenu: false,
    activeOffers: 1,
    offerIds: ['8'] // 30% off Wine Selection
  }
]

// Mock offers
export const mockOffers: MockOffer[] = [
  {
    id: '1',
    businessId: '1',
    businessName: 'The Seaside Bistro',
    title: '2-for-1 Fish & Chips',
    description: 'Buy one fish & chips, get one free. Perfect for sharing!',
    value: 'Save £14',
    type: 'two_for_one',
    badge: '2-FOR-1',
    terms: 'Valid Mon-Thu only. One per table.',
    expiryDate: '2024-12-31',
    isPopular: true,
    isEndingSoon: false
  },
  {
    id: '2',
    businessId: '2',
    businessName: 'Artisan Coffee Co.',
    title: 'Free Pastry with Coffee',
    description: 'Get a free pastry when you buy any specialty coffee',
    value: 'Save up to £2.80',
    type: 'freebie',
    badge: 'FREE ITEM',
    terms: 'One per customer per day.',
    expiryDate: '2024-11-30',
    isPopular: false,
    isEndingSoon: true
  },
  {
    id: '3',
    businessId: '4',
    businessName: 'The Craft Brewery',
    title: '20% off Tasting Flights',
    description: 'Try 4 different craft beers at a special price',
    value: '20% OFF',
    type: 'percentage_off',
    badge: '20% OFF',
    terms: 'Available 4-7pm weekdays only.',
    expiryDate: '2024-12-15',
    isPopular: true,
    isEndingSoon: false
  },
  {
    id: '4',
    businessId: '1',
    businessName: 'The Seaside Bistro',
    title: 'Free Dessert with Main Course',
    description: 'Choose any dessert from our menu when you order a main course',
    value: 'Save up to £8',
    type: 'freebie',
    badge: 'FREE DESSERT',
    terms: 'Valid for dinner service only. One per person.',
    expiryDate: '2024-12-20',
    isPopular: true,
    isEndingSoon: false
  },
  {
    id: '5',
    businessId: '3',
    businessName: 'Zen Wellness Spa',
    title: 'Buy 2 Get 1 Free Treatments',
    description: 'Book any 2 treatments and get the 3rd one absolutely free',
    value: 'Save up to £45',
    type: 'buy_x_get_y',
    badge: 'BUY 2 GET 1',
    terms: 'Must be booked in advance. Same day appointments.',
    expiryDate: '2024-11-25',
    isPopular: false,
    isEndingSoon: true
  },
  {
    id: '6',
    businessId: '2',
    businessName: 'Artisan Coffee Co.',
    title: '25% off Coffee Beans',
    description: 'Take home our premium coffee beans at a special price',
    value: '25% OFF',
    type: 'percentage_off',
    badge: '25% OFF',
    terms: 'In-store purchases only. While stocks last.',
    expiryDate: '2024-12-10',
    isPopular: false,
    isEndingSoon: false
  },
  {
    id: '7',
    businessId: '4',
    businessName: 'The Craft Brewery',
    title: 'Happy Hour: 2-for-1 Pints',
    description: 'Buy one pint and get another one free during happy hour',
    value: 'Save up to £6',
    type: 'two_for_one',
    badge: '2-FOR-1',
    terms: 'Monday to Friday 4-6pm only.',
    expiryDate: '2024-12-31',
    isPopular: true,
    isEndingSoon: false
  },
  {
    id: '8',
    businessId: '6',
    businessName: 'Bella Vista Restaurant',
    title: '30% off Wine Selection',
    description: 'Enjoy our premium wine selection at a discounted price',
    value: '30% OFF',
    type: 'percentage_off',
    badge: '30% OFF',
    terms: 'Dine-in only. Excludes vintage wines.',
    expiryDate: '2024-11-30',
    isPopular: true,
    isEndingSoon: true
  }
]

// Mock secret menus
export const mockSecretMenus: MockSecretMenu[] = [
  {
    id: '1',
    businessId: '1',
    businessName: 'The Seaside Bistro',
    items: [
      {
        name: 'The Captain\'s Special',
        description: 'Pan-seared scallops with black pudding and pea puree, finished with sea foam and caviar pearls. A dish inspired by Bournemouth\'s maritime heritage.',
        price: '£28',
        isSignature: true,
        isPremium: true,
        rarity: 5,
        chefNote: 'Only available when the tide is high'
      },
      {
        name: 'Fisherman\'s Dawn',
        description: 'Smoked haddock caught at sunrise, poached egg, hollandaise infused with sea salt, served on toasted brioche',
        price: '£16',
        isSignature: false,
        isPremium: false,
        rarity: 3,
        chefNote: 'Available all day, but best before noon'
      },
      {
        name: 'The Smuggler\'s Pie',
        description: 'Traditional steak and kidney pie with a secret ingredient known only to the chef\'s family for three generations',
        price: '£22',
        isSignature: true,
        isPremium: true,
        rarity: 4,
        chefNote: 'Recipe dates back to 1847'
      }
    ]
  },
  {
    id: '2', 
    businessId: '2',
    businessName: 'Artisan Coffee Co.',
    items: [
      {
        name: 'The Roaster\'s Vault',
        description: 'Ultra-rare single origin beans from a secret farm in Ethiopia, roasted in small batches of 10kg only. Changes based on harvest seasons.',
        price: '£12',
        isSignature: true,
        isPremium: true,
        rarity: 5,
        chefNote: 'Only 20 cups available per week'
      },
      {
        name: 'Midnight Conspiracy',
        description: 'Dark chocolate from Madagascar, triple espresso shot, hint of smoked chili, topped with gold leaf',
        price: '£8.50',
        isSignature: false,
        isPremium: true,
        rarity: 4,
        chefNote: 'Only served after 8pm'
      },
      {
        name: 'The Barista\'s Secret',
        description: 'A coffee blend that changes daily based on the barista\'s mood and the weather. No two cups are ever the same.',
        price: '£6',
        isSignature: true,
        isPremium: false,
        rarity: 3,
        chefNote: 'Ask the barista to surprise you'
      }
    ]
  },
  {
    id: '3',
    businessId: '4',
    businessName: 'The Craft Brewery',
    items: [
      {
        name: 'The Brewmaster\'s Ghost',
        description: 'Imperial stout aged in whiskey barrels for 18 months, infused with vanilla and oak. Only brewed during the winter solstice.',
        price: '£15',
        isSignature: true,
        isPremium: true,
        rarity: 5,
        chefNote: 'Limited to 100 bottles per year'
      },
      {
        name: 'Hop Thief\'s Escape',
        description: 'IPA with hops stolen from seven different breweries (legally, of course). Each sip tells a different story.',
        price: '£7.50',
        isSignature: false,
        isPremium: false,
        rarity: 3,
        chefNote: 'Recipe changes every month'
      },
      {
        name: 'The Underground',
        description: 'A beer so secret, it\'s not even on this menu. Ask the bartender if you dare.',
        price: '£??',
        isSignature: true,
        isPremium: true,
        rarity: 5,
        chefNote: 'Speak the password: "Bournemouth Depths"'
      }
    ]
  }
]

// Suggested prompts for AI chat
export const suggestedPrompts = [
  'Find me a great coffee shop nearby',
  'What\'s good for dinner tonight?',
  'Show me businesses with secret menus',
  'Any offers ending soon?',
  'Best rated restaurants in Bournemouth',
  'What\'s open right now?'
]

// Mock user credits data
export const mockUserCredits = {
  balance: 150,
  tier: 'Silver',
  pointsToNextTier: 100,
  recentEarnings: [
    { action: 'Business visit', points: 10, date: '2024-01-14' },
    { action: 'Review written', points: 25, date: '2024-01-13' },
    { action: 'Offer claimed', points: 5, date: '2024-01-12' },
    { action: 'Secret menu discovered', points: 15, date: '2024-01-11' }
  ],
  availableRewards: [
    { name: 'Free coffee at Artisan Coffee Co.', cost: 50, available: true },
    { name: '10% off at The Seaside Bistro', cost: 75, available: true },
    { name: 'Free spa treatment consultation', cost: 100, available: true },
    { name: 'VIP brewery tour', cost: 200, available: false }
  ]
}

// User's claimed offers with status tracking
export const mockClaimedOffers = [
  {
    id: '1',
    offerId: '1', // References mockOffers
    status: 'redeemed', // claimed | wallet_added | redeemed | expired
    claimedAt: '2024-01-10T10:30:00Z',
    walletAddedAt: '2024-01-10T10:35:00Z',
    redeemedAt: '2024-01-12T19:45:00Z',
    businessName: 'The Seaside Bistro',
    offerTitle: '2-for-1 Fish & Chips',
    value: '£24.99',
    redemptionCode: 'QWK-FSH-001'
  },
  {
    id: '2',
    offerId: '2',
    status: 'wallet_added',
    claimedAt: '2024-01-14T14:20:00Z',
    walletAddedAt: '2024-01-14T14:22:00Z',
    redeemedAt: null,
    businessName: 'Artisan Coffee Co.',
    offerTitle: 'Free Pastry with Coffee',
    value: '£4.50',
    redemptionCode: 'QWK-PST-002'
  },
  {
    id: '3',
    offerId: '3',
    status: 'claimed',
    claimedAt: '2024-01-15T09:15:00Z',
    walletAddedAt: null,
    redeemedAt: null,
    businessName: 'The Craft Brewery',
    offerTitle: '20% off Tasting Flights',
    value: '20% off',
    redemptionCode: 'QWK-DIN-003'
  }
]

// Business analytics data (what businesses would see)
export const mockBusinessAnalytics = {
  'the-seaside-bistro': {
    offers: {
      '1': { // 2-for-1 Fish & Chips
        views: 1247,
        claims: 89,
        walletAdds: 76,
        redemptions: 34,
        revenue: '£843.66',
        conversionRate: {
          viewToClaim: '7.1%',
          claimToWallet: '85.4%',
          walletToRedemption: '44.7%',
          overallConversion: '2.7%'
        }
      }
    },
    totalOfferViews: 2891,
    totalClaims: 203,
    totalRedemptions: 78,
    newCustomersFromOffers: 45,
    repeatCustomerRate: '67%'
  },
  'artisan-coffee-co': {
    offers: {
      '2': { // Free Pastry with Coffee
        views: 892,
        claims: 156,
        walletAdds: 134,
        redemptions: 89,
        revenue: '£623.50',
        conversionRate: {
          viewToClaim: '17.5%',
          claimToWallet: '85.9%',
          walletToRedemption: '66.4%',
          overallConversion: '10.0%'
        }
      }
    },
    totalOfferViews: 1456,
    totalClaims: 298,
    totalRedemptions: 156,
    newCustomersFromOffers: 89,
    repeatCustomerRate: '78%'
  }
}
