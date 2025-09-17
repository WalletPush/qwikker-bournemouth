// Mock data for user dashboard - Phase 1 UI shell

// Gamification System Interfaces
export interface UserProfile {
  id: string
  name: string
  email: string
  joinedDate: string
  totalPoints: number
  level: number
  experiencePoints: number
  nextLevelXP: number
  tier: 'explorer' | 'insider' | 'legend'
  badges: Badge[]
  stats: UserStats
  referralCode: string
  referredBy?: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  pointsRequired?: number
  alternateRequirement?: {
    type: 'days' | 'visits' | 'referrals' | 'unlocks'
    amount: number
    label: string
  }
  unlockedDate?: string
  progress?: {
    current: number
    target: number
  }
  reward?: BadgeReward
}

export interface BadgeReward {
  type: 'free_item' | 'discount' | 'exclusive_access' | 'special_experience'
  businessName: string
  businessId: string
  title: string
  description: string
  value: string
  terms: string
  redemptionCode?: string
}

export interface UserStats {
  businessesVisited: number
  secretItemsUnlocked: number
  offersRedeemed: number
  friendsReferred: number
  reviewsWritten: number
  photosShared: number
  chatMessages: number
  streakDays: number
}

export interface PointsTransaction {
  id: string
  type: 'earned' | 'spent'
  amount: number
  reason: string
  description: string
  timestamp: string
  relatedItem?: {
    type: 'business' | 'offer' | 'secret_item' | 'badge'
    id: string
    name: string
  }
}

export interface UnlockMethod {
  type: 'points' | 'visit' | 'social' | 'achievement'
  cost?: number
  requirement?: string
  description: string
}

export interface MockBusiness {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
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
    id: string
    name: string
    description: string
    price?: string
    isSignature?: boolean
    isPremium?: boolean
    rarity?: number
    chefNote?: string
    hint?: string
    unlockMethods: UnlockMethod[]
    pointsReward?: number
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
    description: 'Located right on Bournemouth Pier, The Seaside Bistro offers the finest fresh seafood with breathtaking ocean views. Our chefs work closely with local fishermen to bring you the catch of the day, prepared with Mediterranean flair. Whether you\'re enjoying our famous fish & chips on the terrace or indulging in our premium seafood platter, every meal comes with the sound of waves and the salty sea breeze.',
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
    description: 'A cozy independent coffee shop in the heart of Bournemouth, Artisan Coffee Co. roasts their beans in-house every morning. We source directly from sustainable farms around the world and serve specialty coffee alongside freshly baked pastries. Our warm, welcoming atmosphere makes it the perfect spot for remote work, catching up with friends, or simply enjoying a moment of peace with exceptional coffee.',
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
    description: 'Escape the hustle and bustle at Zen Wellness Spa, Bournemouth\'s premier destination for holistic wellness. Our expert therapists offer a range of treatments from traditional massages to cutting-edge facial therapies, all in a serene environment designed to restore your mind, body, and spirit. Using only premium organic products, we create a sanctuary where stress melts away and inner peace is rediscovered.',
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
    description: 'The Craft Brewery is Bournemouth\'s favorite local brewing destination, featuring an impressive selection of house-brewed ales and carefully curated craft beers from around the UK. Our industrial-chic taproom offers the perfect atmosphere to sample our rotating selection of IPAs, stouts, and seasonal brews, paired with artisanal bar snacks. Join us for brewery tours, tasting flights, and live music nights.',
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
    description: 'A state-of-the-art fitness facility in central Bournemouth, Fitness First Gym offers everything you need to achieve your health and fitness goals. With cutting-edge equipment, expert personal trainers, diverse group classes, and a welcoming community atmosphere, we cater to all fitness levels. From strength training and cardio to yoga and HIIT classes, your transformation starts here.',
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

// ============================================================================
// GAMIFICATION SYSTEM MOCK DATA
// ============================================================================

// Available Badges
export const mockBadges: Badge[] = [
  // COMMON BADGES
  {
    id: 'first_visit',
    name: 'First Steps',
    description: 'Made your first business visit',
    icon: '👣',
    rarity: 'common'
  },
  {
    id: 'chat_starter',
    name: 'Conversation Starter',
    description: 'Had your first AI chat conversation',
    icon: '💬',
    rarity: 'common'
  },
  {
    id: 'offer_collector',
    name: 'Deal Hunter',
    description: 'Claimed your first offer',
    icon: '🎯',
    rarity: 'common'
  },
  
  // RARE BADGES
  {
    id: 'secret_seeker',
    name: 'Secret Seeker',
    description: 'Unlocked your first secret menu item',
    icon: '🔍',
    rarity: 'rare'
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Referred 3 friends to Qwikker',
    icon: '🦋',
    rarity: 'rare',
    alternateRequirement: {
      type: 'referrals',
      amount: 3,
      label: '3 friends referred'
    }
  },
  {
    id: 'local_expert',
    name: 'Local Expert',
    description: 'Visited 10 different businesses',
    icon: '🏆',
    rarity: 'rare',
    alternateRequirement: {
      type: 'visits',
      amount: 10,
      label: '10 businesses visited'
    }
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Used Qwikker for 7 days straight',
    icon: '🔥',
    rarity: 'rare',
    alternateRequirement: {
      type: 'days',
      amount: 7,
      label: '7 days active'
    }
  },
  
  // EPIC BADGES
  {
    id: 'secret_master',
    name: 'Secret Menu Master',
    description: 'Unlocked 25 secret menu items',
    icon: '🗝️',
    rarity: 'epic',
    alternateRequirement: {
      type: 'unlocks',
      amount: 25,
      label: '25 secret items unlocked'
    },
    reward: {
      type: 'free_item',
      businessName: 'Any Partner Venue',
      businessId: 'all',
      title: '£5 Qwikker Credit',
      description: 'Use this credit at any participating Qwikker partner venue',
      value: '£5',
      terms: 'Valid at all partner venues. Cannot be combined with other offers. Show badge to redeem.',
      redemptionCode: 'QWIK-EPIC-CREDIT'
    }
  },
  {
    id: 'influence_master',
    name: 'Influencer',
    description: 'Referred 10 friends to Qwikker',
    icon: '📢',
    rarity: 'epic',
    alternateRequirement: {
      type: 'referrals',
      amount: 10,
      label: '10 friends referred'
    },
    reward: {
      type: 'free_item',
      businessName: 'Any Partner Venue',
      businessId: 'all',
      title: '£3 Qwikker Credit',
      description: 'Use this credit at any participating Qwikker partner venue',
      value: '£3',
      terms: 'Valid at all partner venues. Cannot be combined with other offers. Show badge to redeem.',
      redemptionCode: 'QWIK-EPIC-SOCIAL'
    }
  },
  {
    id: 'points_collector',
    name: 'Point Collector',
    description: 'Earned 5,000 total points',
    icon: '💎',
    rarity: 'epic',
    pointsRequired: 5000,
    reward: {
      type: 'free_item',
      businessName: 'Any Partner Venue',
      businessId: 'all',
      title: '£4 Qwikker Credit',
      description: 'Use this credit at any participating Qwikker partner venue',
      value: '£4',
      terms: 'Valid at all partner venues. Cannot be combined with other offers. Show badge to redeem.',
      redemptionCode: 'QWIK-EPIC-POINTS'
    }
  },
  
  // LEGENDARY BADGES
  {
    id: 'bournemouth_legend',
    name: 'Bournemouth Legend',
    description: 'Ultimate Bournemouth mastery - complete all achievements',
    icon: '👑',
    rarity: 'legendary',
    pointsRequired: 15000,
    reward: {
      type: 'free_item',
      businessName: 'Any Partner Venue',
      businessId: 'all',
      title: '£20 Qwikker Credit',
      description: 'Ultimate recognition for true Bournemouth mastery',
      value: '£20',
      terms: 'Valid at all partner venues. Cannot be combined with other offers. Show badge to redeem.',
      redemptionCode: 'QWIK-LEGEND-MASTER'
    }
  },
  {
    id: 'founding_member',
    name: 'Founding Member',
    description: 'One of the first 100 Qwikker users',
    icon: '⭐',
    rarity: 'legendary',
    pointsRequired: 8000,
    reward: {
      type: 'free_item',
      businessName: 'Any Partner Venue',
      businessId: 'all',
      title: '£10 Qwikker Credit',
      description: 'Special recognition for being an early Qwikker pioneer',
      value: '£10',
      terms: 'Valid at all partner venues. Cannot be combined with other offers. Show badge to redeem.',
      redemptionCode: 'QWIK-LEGEND-FOUNDER'
    }
  }
]

// Current User Profile
export const mockUserProfile: UserProfile = {
  id: 'user_david_123',
  name: 'David',
  email: 'david@example.com',
  joinedDate: '2024-01-05T00:00:00Z',
  totalPoints: 1250,
  level: 3,
  experiencePoints: 1250,
  nextLevelXP: 2000,
  tier: 'insider',
  badges: [
    { ...mockBadges[0], unlockedDate: '2024-01-05T12:00:00Z' }, // First Steps
    { ...mockBadges[1], unlockedDate: '2024-01-05T14:30:00Z' }, // Conversation Starter
    { ...mockBadges[2], unlockedDate: '2024-01-06T10:15:00Z' }, // Deal Hunter
    { ...mockBadges[3], unlockedDate: '2024-01-08T16:45:00Z' }, // Secret Seeker
    { 
      ...mockBadges[4], 
      progress: { current: 1, target: 3 } // Social Butterfly (in progress)
    },
    { 
      ...mockBadges[5], 
      progress: { current: 4, target: 10 } // Local Expert (in progress)
    }
  ],
  stats: {
    businessesVisited: 4,
    secretItemsUnlocked: 2,
    offersRedeemed: 3,
    friendsReferred: 1,
    reviewsWritten: 0,
    photosShared: 0,
    chatMessages: 15,
    streakDays: 3
  },
  referralCode: 'DAVID-QWK-2024',
  referredBy: undefined
}

// Points Transaction History
export const mockPointsHistory: PointsTransaction[] = [
  {
    id: 'txn_001',
    type: 'earned',
    amount: 100,
    reason: 'business_visit',
    description: 'Visited The Seaside Bistro',
    timestamp: '2024-01-15T12:30:00Z',
    relatedItem: {
      type: 'business',
      id: '1',
      name: 'The Seaside Bistro'
    }
  },
  {
    id: 'txn_002',
    type: 'earned',
    amount: 50,
    reason: 'secret_unlock',
    description: 'Unlocked "The Midnight Burger"',
    timestamp: '2024-01-15T12:45:00Z',
    relatedItem: {
      type: 'secret_item',
      id: 'midnight_burger',
      name: 'The Midnight Burger'
    }
  },
  {
    id: 'txn_003',
    type: 'spent',
    amount: -75,
    reason: 'secret_unlock',
    description: 'Unlocked "Chef\'s Secret Pasta"',
    timestamp: '2024-01-14T19:20:00Z',
    relatedItem: {
      type: 'secret_item',
      id: 'secret_pasta',
      name: 'Chef\'s Secret Pasta'
    }
  },
  {
    id: 'txn_004',
    type: 'earned',
    amount: 25,
    reason: 'offer_redeem',
    description: 'Redeemed 2-for-1 Fish & Chips',
    timestamp: '2024-01-12T19:45:00Z',
    relatedItem: {
      type: 'offer',
      id: '1',
      name: '2-for-1 Fish & Chips'
    }
  },
  {
    id: 'txn_005',
    type: 'earned',
    amount: 75,
    reason: 'friend_referral',
    description: 'Friend Sarah joined Qwikker',
    timestamp: '2024-01-10T14:15:00Z'
  },
  {
    id: 'txn_006',
    type: 'earned',
    amount: 100,
    reason: 'business_visit',
    description: 'Visited Artisan Coffee Co.',
    timestamp: '2024-01-08T09:30:00Z',
    relatedItem: {
      type: 'business',
      id: '2',
      name: 'Artisan Coffee Co.'
    }
  }
]

// Points Earning Rules (Anti-Abuse System)
export const pointsEarningRules = {
  friend_referral: { points: 500, description: 'Friend joins Qwikker using your referral link' },
  offer_redeem: { points: 50, description: 'Actually redeem an offer at a business (verified by staff)' },
  business_visit: { points: 25, description: 'Visit a business (simplified validation coming soon)' },
  review_write: { points: 20, description: 'Write a review after business visit' },
  social_share: { points: 10, description: 'Share a business or offer on social media' }
}

// Enhanced Secret Menu Items
export const enhancedSecretMenus: MockSecretMenu[] = [
  {
    id: 'seaside_secrets',
    businessId: '1',
    businessName: 'The Seaside Bistro',
    items: [
      {
        id: 'midnight_burger',
        name: 'The Midnight Burger',
        description: 'A legendary wagyu beef patty with truffle aioli, caramelized onions, and aged cheddar on a brioche bun baked fresh at 5am',
        price: '£18',
        rarity: 5,
        hint: 'This isn\'t just any burger - it\'s made with ingredients that aren\'t available during regular hours. The chef only makes 10 per day, and regulars know to ask for it by name...',
        chefNote: 'This recipe took me 3 years to perfect. The secret is in the overnight-marinated patty and our special 5am brioche.',
        unlockMethods: [
          { type: 'visit', description: 'Visit restaurant and scan secret menu QR code' },
          { type: 'points', cost: 75, description: 'Spend 75 points to unlock remotely' },
          { type: 'social', requirement: '2_referrals', description: 'Get 2 friends to join Qwikker' }
        ],
        pointsReward: 50
      },
      {
        id: 'fishermans_secret',
        name: 'The Fisherman\'s Secret',
        description: 'Fresh catch of the day with our secret herb crust, known only to the chef and a few loyal customers',
        price: '£24',
        rarity: 4,
        hint: 'Local fishermen bring us their best catch, and we prepare it with a special herb blend that\'s been in the chef\'s family for generations...',
        chefNote: 'My grandmother\'s recipe from the Dorset coast. The herbs are foraged locally each morning.',
        unlockMethods: [
          { type: 'visit', description: 'Visit restaurant and scan secret menu QR code' },
          { type: 'points', cost: 60, description: 'Spend 60 points to unlock remotely' }
        ],
        pointsReward: 40
      },
      {
        id: 'captains_dessert',
        name: 'Captain\'s Hidden Treasure',
        description: 'A dessert that changes daily based on the chef\'s inspiration and available ingredients',
        price: '£12',
        rarity: 3,
        hint: 'Every day brings a new treasure - sometimes it\'s a decadent chocolate creation, other times a light fruit masterpiece...',
        unlockMethods: [
          { type: 'visit', description: 'Visit restaurant and scan secret menu QR code' },
          { type: 'points', cost: 45, description: 'Spend 45 points to unlock remotely' }
        ],
        pointsReward: 30
      }
    ]
  },
  {
    id: 'coffee_secrets',
    businessId: '2', 
    businessName: 'Artisan Coffee Co.',
    items: [
      {
        id: 'baristas_blend',
        name: 'The Barista\'s Personal Blend',
        description: 'A unique coffee blend created by our head barista, not available to the public',
        price: '£4.50',
        rarity: 4,
        hint: 'Our head barista spent months perfecting this blend using beans from three different continents...',
        chefNote: 'I roast this blend personally every Monday morning. It\'s my passion project.',
        unlockMethods: [
          { type: 'visit', description: 'Visit coffee shop and scan secret menu QR code' },
          { type: 'points', cost: 50, description: 'Spend 50 points to unlock remotely' }
        ],
        pointsReward: 35
      },
      {
        id: 'hidden_latte',
        name: 'The Underground Latte',
        description: 'Made with our secret spice blend and served in a special ceramic cup',
        price: '£5.25',
        rarity: 3,
        hint: 'The spice blend includes cardamom, cinnamon, and something special that regular customers rave about...',
        unlockMethods: [
          { type: 'visit', description: 'Visit coffee shop and scan secret menu QR code' },
          { type: 'points', cost: 40, description: 'Spend 40 points to unlock remotely' }
        ],
        pointsReward: 25
      }
    ]
  }
]
