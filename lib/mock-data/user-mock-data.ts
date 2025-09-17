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
    images: ['/mock-business-1.jpg'],
    tier: 'qwikker_picks',
    category: 'Restaurant',
    rating: 4.8,
    reviewCount: 127,
    distance: 0.3,
    menuPreview: ['Fish & Chips £14', 'Seafood Platter £22', 'Crab Cakes £16'],
    hasSecretMenu: true,
    activeOffers: 2
  },
  {
    id: '2', 
    name: 'Artisan Coffee Co.',
    slug: 'artisan-coffee',
    tagline: 'Locally roasted, ethically sourced',
    address: '42 Old Christchurch Rd',
    town: 'Bournemouth',
    hours: '7am - 6pm',
    images: ['/mock-business-2.jpg'],
    tier: 'qwikker_picks',
    category: 'Cafe',
    rating: 4.9,
    reviewCount: 89,
    distance: 0.5,
    menuPreview: ['Flat White £3.20', 'Avocado Toast £7.50', 'Pastries from £2.80'],
    hasSecretMenu: true,
    activeOffers: 1
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
    images: ['/mock-business-3.jpg'],
    tier: 'featured',
    category: 'Spa',
    rating: 4.6,
    reviewCount: 203,
    distance: 0.8,
    menuPreview: ['Massage £45', 'Facial £35', 'Full Day Package £120'],
    hasSecretMenu: false,
    activeOffers: 1
  },
  {
    id: '4',
    name: 'The Craft Brewery',
    slug: 'craft-brewery',
    tagline: 'Local ales and craft beers',
    address: '23 Richmond Hill',
    town: 'Bournemouth',
    hours: '4pm - 11pm',
    images: ['/mock-business-4.jpg'],
    tier: 'featured',
    category: 'Bar',
    rating: 4.5,
    reviewCount: 156,
    distance: 1.2,
    menuPreview: ['Pint £4.50', 'Tasting Flight £12', 'Bar Snacks £6-8'],
    hasSecretMenu: true,
    activeOffers: 3
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
    images: ['/mock-business-5.jpg'],
    tier: 'recommended',
    category: 'Gym',
    rating: 4.2,
    reviewCount: 78,
    distance: 1.5,
    menuPreview: ['Day Pass £12', 'Monthly £29', 'Personal Training £35/hr'],
    hasSecretMenu: false,
    activeOffers: 1
  },
  {
    id: '6',
    name: 'Bella Vista Restaurant',
    slug: 'bella-vista',
    tagline: 'Authentic Italian cuisine',
    address: '67 Christchurch Rd',
    town: 'Bournemouth',
    hours: '5pm - 10pm',
    images: ['/mock-business-6.jpg'],
    tier: 'recommended',
    category: 'Restaurant',
    rating: 4.3,
    reviewCount: 94,
    distance: 2.1,
    menuPreview: ['Pasta £12-16', 'Pizza £10-14', 'Wine from £18'],
    hasSecretMenu: false,
    activeOffers: 2
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
        description: 'Pan-seared scallops with black pudding and pea puree',
        price: '£18',
        isSignature: true
      },
      {
        name: 'Fisherman\'s Breakfast',
        description: 'Available all day - smoked haddock, poached egg, hollandaise',
        price: '£12'
      }
    ]
  },
  {
    id: '2', 
    businessId: '2',
    businessName: 'Artisan Coffee Co.',
    items: [
      {
        name: 'The Roaster\'s Choice',
        description: 'Single origin pour-over, changes weekly',
        price: '£4.50',
        isSignature: true
      },
      {
        name: 'Dirty Chai Latte',
        description: 'Chai latte with an espresso shot',
        price: '£3.80'
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
