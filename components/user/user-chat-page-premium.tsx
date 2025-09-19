'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  businessCards?: BusinessCard[]
  offers?: Offer[]
  quickActions?: QuickAction[]
}

interface BusinessCard {
  id: string
  name: string
  category: string
  rating: number
  distance: string
  image: string
  isQwikkerPick?: boolean
  hasSecretMenu?: boolean
  activeOffers: number
  address: string
  phone?: string
  description: string
}

interface Offer {
  id: string
  businessName: string
  title: string
  description: string
  discount: string
  validUntil: string
  image: string
}

interface QuickAction {
  id: string
  label: string
  action: string
  icon: React.ReactNode
}

export function UserChatPagePremium({ currentUser }: { currentUser?: any }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Premium business data
  const businessData: BusinessCard[] = [
    {
      id: 'jerrys-burgers',
      name: "Jerry's Burgers",
      category: 'Restaurant',
      rating: 4.7,
      distance: '0.2 miles',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      isQwikkerPick: false,
      hasSecretMenu: true,
      activeOffers: 1,
      address: '123 High Street, Bournemouth',
      phone: '+44 1202 123456',
      description: 'Best burgers in Bournemouth with premium ingredients'
    },
    {
      id: 'artisan-coffee',
      name: 'Artisan Coffee Co.',
      category: 'Cafe',
      rating: 4.9,
      distance: '0.5 miles',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
      isQwikkerPick: true,
      hasSecretMenu: false,
      activeOffers: 2,
      address: '42 Old Christchurch Rd, Bournemouth',
      phone: '+44 1202 987654',
      description: 'Locally roasted, ethically sourced coffee'
    },
    {
      id: 'seaside-bistro',
      name: 'The Seaside Bistro',
      category: 'Restaurant',
      rating: 4.8,
      distance: '0.3 miles',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      isQwikkerPick: true,
      hasSecretMenu: true,
      activeOffers: 0,
      address: '15 Pier Approach, Bournemouth',
      phone: '+44 1202 456789',
      description: 'Fresh seafood with stunning ocean views'
    }
  ]

  const offerData: Offer[] = [
    {
      id: 'jerrys-50-off',
      businessName: "Jerry's Burgers",
      title: '50% Off All Burgers',
      description: 'Premium beef burgers at half price',
      discount: '50% OFF',
      validUntil: 'Tomorrow',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=150&fit=crop'
    },
    {
      id: 'coffee-buy-2-get-1',
      businessName: 'Artisan Coffee Co.',
      title: 'Buy 2 Get 1 Free',
      description: 'On all specialty coffees',
      discount: 'BUY 2 GET 1',
      validUntil: 'Today 6pm',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&h=150&fit=crop'
    }
  ]

  // Initialize chat with personalized welcome
  useEffect(() => {
    if (!isInitialized) {
      const userName = currentUser?.name || 'Explorer'
      const userLevel = currentUser?.level || 1
      const userTier = currentUser?.tier || 'explorer'
      
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Hey ${userName}! 👋 Welcome back, Level ${userLevel} ${userTier.charAt(0).toUpperCase() + userTier.slice(1)}! I'm your personal Bournemouth guide. I can help you discover amazing places, find exclusive deals, and unlock secret experiences.`,
        timestamp: new Date().toISOString(),
        quickActions: [
          {
            id: 'discover-food',
            label: 'Discover Food',
            action: 'food',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          },
          {
            id: 'hot-offers',
            label: 'Hot Offers',
            action: 'offers',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
          },
          {
            id: 'secret-menu',
            label: 'Secret Menu',
            action: 'secrets',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          }
        ]
      }
      
      setMessages([welcomeMessage])
      setIsInitialized(true)
    }
  }, [currentUser, isInitialized])

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Conversational, personal response system
    setTimeout(() => {
      const query = text.toLowerCase()
      let response: ChatMessage

      if (query.includes('coffee') || query.includes('cafe') || text === 'coffee') {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "Ah, a coffee person! I love that. Are you looking for somewhere cozy to work, or more of a grab-and-go situation? I know some amazing spots that locals swear by.",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'cozy-coffee',
              label: 'Cozy spot to work',
              action: 'cozy-coffee',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            },
            {
              id: 'quick-coffee',
              label: 'Quick coffee on the go',
              action: 'quick-coffee',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            }
          ]
        }
      } else if (text === 'cozy-coffee') {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "Perfect! Artisan Coffee Co. is exactly what you're looking for. They have this amazing atmosphere - locally roasted beans, comfy seating, and the wifi is solid. Plus they're doing a buy-2-get-1 deal today. Want directions?",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'get-directions',
              label: 'Yes, get directions',
              action: 'artisan-directions',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            },
            {
              id: 'tell-me-more',
              label: 'Tell me more about it',
              action: 'artisan-details',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          ]
        }
      } else if (text === 'artisan-details') {
        const coffeeBusinesses = businessData.filter(b => b.category === 'Cafe')
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "Here's the full scoop on Artisan Coffee Co. - it's honestly one of my favorite recommendations:",
          timestamp: new Date().toISOString(),
          businessCards: coffeeBusinesses.slice(0, 1)
        }
      } else if (query.includes('dinner') || query.includes('restaurant') || query.includes('food') || text === 'food') {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "Ooh, food! My favorite topic. What's the vibe you're going for? Something casual and fun, or are we talking proper date night material?",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'casual-food',
              label: 'Casual & fun',
              action: 'casual-dining',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            },
            {
              id: 'romantic-food',
              label: 'Date night vibes',
              action: 'romantic-dining',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            }
          ]
        }
      } else if (text === 'casual-dining') {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "Jerry's Burgers is absolutely perfect for that! They do these incredible gourmet burgers, and here's the insider secret - they have a hidden menu item called 'The Underground' that's not on the regular menu. Want me to show you how to order it?",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'show-secret',
              label: 'Show me the secret!',
              action: 'jerrys-secret',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            },
            {
              id: 'jerrys-details',
              label: 'Tell me about Jerry\'s',
              action: 'jerrys-info',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          ]
        }
      } else if (text === 'jerrys-secret') {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "Okay, here's the insider knowledge: Ask for 'The Underground Burger' - it's double beef with their secret sauce and crispy onions. It's £14.75 and absolutely worth it. Just show this message to your server or mention my name... well, the AI's name! 😉",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'get-directions-jerrys',
              label: 'Get directions to Jerry\'s',
              action: 'jerrys-directions',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            }
          ]
        }
      } else if (text === 'jerrys-info' || query.includes('tell me more about jerry') || query.includes('more about jerry')) {
        const restaurants = businessData.filter(b => b.name.includes('Jerry'))
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "Jerry's is honestly a local gem - here's everything you need to know:",
          timestamp: new Date().toISOString(),
          businessCards: restaurants
        }
      } else if (query.includes('offers') || query.includes('deals') || text === 'offers') {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "You're smart to ask! There are some brilliant deals on right now. Jerry's has 50% off all burgers until tomorrow, and that coffee place I mentioned? Buy 2 get 1 free until 6pm today. Which one catches your eye?",
          timestamp: new Date().toISOString(),
          offers: offerData
        }
      } else if (query.includes('secret') || query.includes('hidden') || text === 'secrets') {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "Ah, you want the insider secrets! 🤫 I know about some exclusive hidden menu items that most people don't know about. These places have special items you can only get if you know to ask:",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'jerrys-secret',
              label: "Jerry's Underground Burger",
              action: 'jerrys-secret',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            },
            {
              id: 'seaside-secret',
              label: "Seaside's Ocean Breeze",
              action: 'seaside-secret',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            }
          ]
        }
      } else if (text === 'seaside-secret') {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "🌊 The Ocean Breeze Cocktail at Seaside Bistro! It's a refreshing blend of blue curaçao, coconut rum, and pineapple juice for £9.50. Just ask your bartender for the 'Ocean Breeze' - they'll know you're in the know! 😉",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'get-directions-seaside',
              label: 'Get directions to Seaside',
              action: 'seaside-directions',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            }
          ]
        }
      } else if (query.includes('romantic') || query.includes('date') || text === 'romantic-dining') {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "Perfect for a romantic evening! The Seaside Bistro has stunning ocean views and is ideal for date nights. They do incredible fresh seafood and the atmosphere is just magical, especially at sunset.",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'seaside-details',
              label: 'Tell me more',
              action: 'seaside-info',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            },
            {
              id: 'book-table',
              label: 'Get directions',
              action: 'seaside-directions',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            }
          ]
        }
      } else if (text === 'seaside-info' || query.includes('seaside') || query.includes('more about seaside')) {
        const seasideBusinesses = businessData.filter(b => b.name.includes('Seaside'))
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "The Seaside Bistro is absolutely stunning - here's what makes it special:",
          timestamp: new Date().toISOString(),
          businessCards: seasideBusinesses
        }
      } else if (query.includes('thanks') || query.includes('thank you') || query.includes('cheers')) {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "You're very welcome! I'm always here to help you discover the best of Bournemouth. Enjoy your adventure! 😊",
          timestamp: new Date().toISOString()
        }
      } else if (query.includes('hi') || query.includes('hello') || query.includes('hey')) {
        const userName = currentUser?.name || 'Explorer'
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Hey ${userName}! Great to see you again. What can I help you discover today?`,
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'food-help',
              label: 'Food spots',
              action: 'food',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            },
            {
              id: 'coffee-help',
              label: 'Coffee places',
              action: 'coffee',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          ]
        }
      } else if (query.includes('what') && (query.includes('can you') || query.includes('do you'))) {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I'm your local Bournemouth expert! I can help you find amazing restaurants, discover exclusive offers, unlock secret menu items, get directions, and basically anything you need to make the most of your time here. What sounds interesting?",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'food-help',
              label: 'Find food',
              action: 'food',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            },
            {
              id: 'offers-help',
              label: 'Show offers',
              action: 'offers',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
            },
            {
              id: 'secrets-help',
              label: 'Secret menu',
              action: 'secrets',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            }
          ]
        }
      } else {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I'm not quite sure what you're looking for there, but I'm here to help! Are you thinking food, drinks, something fun to do, or maybe you want to discover some hidden gems around Bournemouth?",
          timestamp: new Date().toISOString(),
          quickActions: [
            {
              id: 'food-help',
              label: 'Food & drinks',
              action: 'food',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            },
            {
              id: 'hidden-gems',
              label: 'Hidden gems',
              action: 'secrets',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            }
          ]
        }
      }

      setMessages(prev => [...prev, response])
      setIsTyping(false)
    }, 1200)
  }

  const handleQuickAction = (action: string) => {
    handleSendMessage(action)
  }

  const BusinessCardComponent = ({ business }: { business: BusinessCard }) => (
    <Card className="w-64 bg-slate-800/40 border-slate-700/50 hover:border-[#00d083]/30 transition-all duration-300 group cursor-pointer">
      <div className="relative">
        <img 
          src={business.image} 
          alt={business.name}
          className="w-full h-24 object-cover rounded-t-lg"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-t-lg"></div>
        
        {business.isQwikkerPick && (
          <div className="absolute top-1 left-1">
            <span className="bg-[#00d083] text-black text-xs px-1.5 py-0.5 rounded-full font-semibold">
              ⭐ PICK
            </span>
          </div>
        )}
        
        {business.hasSecretMenu && (
          <div className="absolute bottom-1 right-1">
            <span className="bg-purple-600/90 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
              🤫
            </span>
          </div>
        )}
      </div>
      
      <CardContent className="p-3">
        <div className="space-y-2">
          <div>
            <h3 className="font-semibold text-white text-sm">{business.name}</h3>
            <p className="text-slate-400 text-xs">{business.description}</p>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span>⭐ {business.rating}</span>
            <span>📍 {business.distance}</span>
          </div>
          
          <div className="flex gap-1 pt-1">
            <Button 
              size="sm" 
              className="flex-1 bg-[#00d083] hover:bg-[#00b86f] text-black text-xs h-7"
              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(business.address)}`, '_blank')}
            >
              Directions
            </Button>
            {business.phone && (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs h-7"
                onClick={() => window.open(`tel:${business.phone}`, '_blank')}
              >
                Call
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const OfferCard = ({ offer }: { offer: Offer }) => (
    <Card className="w-56 bg-gradient-to-br from-orange-600/10 to-red-600/10 border-orange-500/20 hover:border-orange-400/30 transition-all duration-300">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <img 
            src={offer.image} 
            alt={offer.businessName}
            className="w-12 h-12 object-cover rounded-lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                {offer.discount}
              </span>
            </div>
            <h4 className="font-semibold text-white text-xs truncate">{offer.title}</h4>
            <p className="text-slate-400 text-xs truncate">{offer.businessName}</p>
            <p className="text-slate-500 text-xs">ends {offer.validUntil}</p>
          </div>
        </div>
        <Button 
          size="sm" 
          className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white text-xs h-6"
        >
          Claim
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/30 bg-slate-800/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Local Guide</h2>
            <p className="text-xs text-slate-400">Your premium Bournemouth concierge</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-green-400 text-xs">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          Online
        </div>
      </div>

      {/* Messages Area - Premium WhatsApp Style */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/20">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`${
              message.type === 'user' 
                ? 'max-w-[60%] bg-[#00d083] text-black rounded-2xl rounded-br-md px-3 py-2' 
                : 'max-w-[85%] bg-slate-800/80 text-slate-100 rounded-2xl rounded-tl-md px-4 py-3'
            } shadow-lg`}>
              <p className={`${message.type === 'user' ? 'text-sm' : 'text-sm leading-relaxed'} ${message.type === 'user' ? '' : 'mb-2'}`}>{message.content}</p>
              
              {/* Business Cards Carousel */}
              {message.businessCards && message.businessCards.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 mt-3">
                  {message.businessCards.map((business) => (
                    <BusinessCardComponent key={business.id} business={business} />
                  ))}
                </div>
              )}
              
              {/* Offers Carousel */}
              {message.offers && message.offers.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 mt-3">
                  {message.offers.map((offer) => (
                    <OfferCard key={offer.id} offer={offer} />
                  ))}
                </div>
              )}
              
              {/* Quick Actions */}
              {message.quickActions && message.quickActions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.quickActions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction(action.action)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-[#00d083]/50 hover:text-[#00d083] text-xs"
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
              
              <p className={`text-xs ${message.type === 'user' ? 'mt-1 text-black/60' : 'mt-2 text-slate-400'}`}>
                {new Date(message.timestamp).toLocaleTimeString('en-GB', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl px-4 py-3 shadow-lg">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Premium Input Area */}
      <div className="p-4 border-t border-slate-700/30 bg-slate-800/20">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              placeholder="Ask me anything about Bournemouth..."
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-[#00d083]/50 focus:ring-1 focus:ring-[#00d083]/20"
              disabled={isTyping}
            />
          </div>
          <Button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05f] text-black px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}
