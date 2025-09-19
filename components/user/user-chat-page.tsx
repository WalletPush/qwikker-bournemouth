'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockBusinesses, suggestedPrompts, enhancedSecretMenus, mockOffers, mockUserProfile, mockBadges, pointsEarningRules } from '@/lib/mock-data/user-mock-data'
import { useState } from 'react'
import React from 'react'
import Link from 'next/link'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  businessCards?: {
    id: string
    name: string
    tagline: string
    image: string
    rating: number
    distance: number
    activeOffers: number
  }[]
}

export function UserChatPage({ currentUser }: { currentUser?: any }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationContext, setConversationContext] = useState<{
    topic?: string
    waitingFor?: string
    lastCategory?: string
    offerInfo?: {
      id: string
      title: string
      businessName: string
    }
  }>({})
  const [hasAutoSent, setHasAutoSent] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const handleSendMessage = React.useCallback(async (message: string) => {
    if (!message.trim()) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => {
      const newMessages = [...prev, userMessage]
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('qwikker-chat-messages', JSON.stringify(newMessages))
      }
      return newMessages
    })
    setInputValue('')
    setIsTyping(true)

    // Simulate AI response with business recommendations
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: getMockResponse(message),
        timestamp: new Date().toISOString(),
        businessCards: getRelevantBusinesses(message)
      }

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage]
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('qwikker-chat-messages', JSON.stringify(newMessages))
        }
        return newMessages
      })
      setIsTyping(false)
    }, 1500)
  }, []) // Keep empty - getMockResponse and getRelevantBusinesses are stable functions

  // Initialize chat with context awareness but fresh UI
  React.useEffect(() => {
    if (isInitialized) return
    
    if (typeof window !== 'undefined') {
      // Load conversation context for AI memory (but don't display history)
      const savedMessages = localStorage.getItem('qwikker-chat-messages')
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages)
          
          // Store full context for AI memory (invisible to user)
          setConversationContext({
            previousTopics: parsedMessages.map((msg: ChatMessage) => msg.content).slice(-10), // Last 10 for context
            userPreferences: {}, // Could extract preferences from history
            businessInteractions: {} // Could track business mentions
          })
        } catch (error) {
          console.error('Error parsing saved messages:', error)
        }
      }
      
      // Always start with ONLY a fresh welcome message (no history shown)
      const userName = currentUser?.name || 'Explorer'
      const userLevel = currentUser?.level || 1
      const userTier = currentUser?.tier || 'explorer'
      
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Hey ${userName}! 👋 Welcome back, Level ${userLevel} ${userTier.charAt(0).toUpperCase() + userTier.slice(1)}! I'm your local guide for Bournemouth. I can help you discover amazing businesses, find deals, and explore hidden gems. What are you in the mood for today?`,
        timestamp: new Date().toISOString()
      }
      
      setMessages([welcomeMessage]) // Always start with just the welcome message
    }
    
    setIsInitialized(true)
  }, [isInitialized])

  // Handle URL parameters for auto-sending questions
  React.useEffect(() => {
    if (hasAutoSent || !isInitialized) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const business = urlParams.get('business')
    const topic = urlParams.get('topic')
    const offer = urlParams.get('offer')
    const item = urlParams.get('item')
    
    let autoQuestion = ''
    
    if (business && topic === 'offer' && offer) {
      autoQuestion = `Tell me more about the "${offer}" offer at ${business}. What are the details and how can I use it?`
    } else if (business && topic === 'secret-menu' && item) {
      autoQuestion = `I'm interested in the secret menu item "${item}" at ${business}. Can you give me some hints about what this might be?`
    } else if (business && topic === 'secret-menu') {
      autoQuestion = `What secret menu items does ${business} have? I'd love to know about their off-menu specialties!`
    } else if (business && !topic) {
      autoQuestion = `Tell me about ${business}. What makes them special and what should I try there?`
    }
    
    if (autoQuestion) {
      setHasAutoSent(true)
      setTimeout(() => {
        handleSendMessage(autoQuestion)
      }, 500) // Reduced delay
    }
  }, [isInitialized]) // Simplified: only depend on isInitialized

  const getMockResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase()
    
    // Handle offer-specific questions
    if (msg.includes('offer') && (msg.includes('tell me more') || msg.includes('details'))) {
      if (msg.includes('free pastry') || msg.includes('pastry')) {
        setConversationContext({ topic: 'offer', lastCategory: 'cafe', offerInfo: { id: '2', title: 'Free Pastry with Coffee', businessName: 'Artisan Coffee Co.' } })
        return "Great question! The 'Free Pastry with Coffee' offer at Artisan Coffee Co. is fantastic! ☕🥐 Here's what you need to know:\n\n• Get any pastry FREE when you buy a specialty coffee\n• Valid on croissants, muffins, Danish pastries\n• One per customer per day\n• Valid until Nov 30th\n\n📱 **How to claim:** You MUST add this offer to your mobile wallet first! I can help you do that right now.\n\nThe baristas are super friendly and will help you pick the perfect pastry to pair with your coffee. Their almond croissants are especially popular! Would you like me to show you directions to get there?"
      }
      if (msg.includes('fish') || msg.includes('2-for-1')) {
        setConversationContext({ topic: 'offer', lastCategory: 'restaurant', offerInfo: { id: '1', title: '2-for-1 Fish & Chips', businessName: 'The Seaside Bistro' } })
        return "Excellent choice! The '2-for-1 Fish & Chips' at The Seaside Bistro is one of our most popular offers! 🐟🍟 Here are the details:\n\n• Buy one fish & chips, get one completely FREE\n• Valid Monday-Thursday only\n• Fresh cod and hand-cut chips\n• Perfect for sharing or bringing a friend\n• One offer per table\n• Valid until Dec 31st\n\n📱 **How to claim:** First, add this offer to your mobile wallet. I can help you do that right now!\n\nThe portion sizes are generous, so this is incredible value! The fish is caught locally and the chips are made fresh daily. Would you like me to help you make a reservation?"
      }
      return "I'd love to help you with that offer! Can you tell me which specific offer you're asking about? I can give you all the details, terms, and tips on how to make the most of it!\n\n💡 **Pro tip:** Remember to add any offer to your mobile wallet first - that's how you'll claim it at the business!"
    }
    
    // Handle follow-up responses based on conversation context
    if (conversationContext.waitingFor === 'coffee-details') {
      if (msg.includes('trendy') || msg.includes('modern')) {
        setConversationContext({ topic: 'coffee', lastCategory: 'cafe' })
        return "Perfect choice! You want the hottest, most Instagram-worthy coffee spots. Here are Bournemouth's trendiest cafes with amazing coffee and killer vibes:"
      }
      if (msg.includes('cozy') || msg.includes('work')) {
        setConversationContext({ topic: 'coffee', lastCategory: 'cafe' })
        return "Perfect! I know exactly what you mean - a cozy spot to settle in with your laptop. Here are my top picks for coffee shops where you can work comfortably:"
      }
      if (msg.includes('quick') || msg.includes('grab') || msg.includes('go')) {
        setConversationContext({ topic: 'coffee', lastCategory: 'cafe' })
        return "Got it! You need something fast and convenient. Here are the best grab-and-go coffee spots:"
      }
      if (msg.includes('pastries') || msg.includes('food')) {
        setConversationContext({ topic: 'coffee', lastCategory: 'cafe' })
        return "Excellent choice! Coffee and pastries are the perfect combo. Here are places with amazing coffee AND delicious treats:"
      }
      if (msg.includes('traditional')) {
        setConversationContext({ topic: 'coffee', lastCategory: 'cafe' })
        return "Ah, a classic coffee lover! Here are some traditional, old-school coffee shops with that authentic, timeless atmosphere:"
      }
      // Default response if they don't give specific details
      setConversationContext({ topic: 'coffee', lastCategory: 'cafe' })
      return "I hear you! Let me show you some fantastic coffee spots that locals love:"
    }
    
    if (conversationContext.waitingFor === 'restaurant-details') {
      if (msg.includes('casual') || msg.includes('relaxed')) {
        setConversationContext({ topic: 'restaurant', lastCategory: 'restaurant' })
        return "Perfect! Casual and relaxed it is. Here are some fantastic laid-back restaurants where you can just enjoy good food:"
      }
      if (msg.includes('fancy') || msg.includes('special') || msg.includes('romantic')) {
        setConversationContext({ topic: 'restaurant', lastCategory: 'restaurant' })
        return "Ooh, special occasion! I love it. Here are some upscale restaurants perfect for a memorable dining experience:"
      }
      if (msg.includes('italian') || msg.includes('seafood') || msg.includes('cuisine')) {
        setConversationContext({ topic: 'restaurant', lastCategory: 'restaurant' })
        return "Great choice! I know some amazing places that specialize in exactly what you're craving:"
      }
      setConversationContext({ topic: 'restaurant', lastCategory: 'restaurant' })
      return "Sounds good! Here are some excellent restaurants I think you'll love:"
    }
    
    if (conversationContext.waitingFor === 'drinks-details') {
      if (msg.includes('craft beer') || msg.includes('beer')) {
        setConversationContext({ topic: 'drinks', lastCategory: 'bar' })
        return "Craft beer enthusiast! I respect that. Here are the best spots for amazing local brews:"
      }
      if (msg.includes('cocktails') || msg.includes('mixed')) {
        setConversationContext({ topic: 'drinks', lastCategory: 'bar' })
        return "Cocktails it is! Here are places that really know how to mix a perfect drink:"
      }
      if (msg.includes('friends') || msg.includes('group')) {
        setConversationContext({ topic: 'drinks', lastCategory: 'bar' })
        return "Fun with friends! Here are lively spots perfect for a group:"
      }
      setConversationContext({ topic: 'drinks', lastCategory: 'bar' })
      return "Great! Here are some excellent spots for drinks:"
    }
    
    // Direct category detection - simplified
    if (msg.includes('coffee') || msg.includes('cafe')) {
      setConversationContext({ topic: 'coffee', lastCategory: 'cafe' })
      return "Here are the best coffee spots in Bournemouth:"
    }
    
    if (msg.includes('dinner') || msg.includes('restaurant') || msg.includes('food')) {
      setConversationContext({ topic: 'restaurant', lastCategory: 'restaurant' })
      return "Here are the best restaurants in Bournemouth:"
    }
    
    if (msg.includes('drink') || msg.includes('bar') || msg.includes('beer')) {
      setConversationContext({ topic: 'drinks', lastCategory: 'bar' })
      return "Here are the best bars and pubs in Bournemouth:"
    }
    
    if (msg.includes('spa') || msg.includes('relax') || msg.includes('wellness')) {
      setConversationContext({ topic: 'spa', lastCategory: 'spa' })
      return "Here are the best wellness and spa options in Bournemouth:"
    }
    
    if (msg.includes('offer') || msg.includes('deal') || msg.includes('discount')) {
      setConversationContext({ topic: 'offers', showOffers: true })
      return "Here are the best current offers in Bournemouth:"
    }
    
    // Handle specific secret menu item questions
    if (msg.includes('interested in') && msg.includes('secret menu item')) {
      // Extract business and item name from the message
      const businessMatch = msg.match(/at (.+?)\./);
      const itemMatch = msg.match(/item "(.+?)"/);
      
      if (businessMatch && itemMatch) {
        const businessName = businessMatch[1];
        const itemName = itemMatch[1];
        
        // Find the secret menu item
        const secretMenu = enhancedSecretMenus.find(menu => 
          menu.businessName.toLowerCase().includes(businessName.toLowerCase())
        );
        
        if (secretMenu) {
          const secretItem = secretMenu.items.find(item => 
            item.name.toLowerCase().includes(itemName.toLowerCase())
          );
          
          if (secretItem) {
            return `Ah, you've discovered "${secretItem.name}" at ${secretMenu.businessName}! 🕵️‍♂️ You have excellent taste!\n\n🔍 **Here's what I can tell you:**\n${secretItem.hint}\n\n🗝️ **How to unlock the full details:**\n${secretItem.unlockMethods.map(method => {
              if (method.type === 'visit') return '• Visit the restaurant and scan their secret menu QR code';
              if (method.type === 'points') return `• Spend ${method.cost} points to unlock remotely`;
              if (method.type === 'social') return '• Get friends to join Qwikker';
              return `• ${method.description}`;
            }).join('\n')}\n\n✨ **Reward:** Unlock this item and earn ${secretItem.pointsReward} points!\n\nThis is definitely worth pursuing - would you like me to help you plan a visit to ${secretMenu.businessName}?`;
          }
        }
      }
      
      return "I'd love to help you with that secret menu item! Can you tell me which business and which item you're curious about? I can give you some tantalizing hints! 🤫"
    }
    
    if (msg.includes('secret menu items') && msg.includes('what') && msg.includes('have')) {
      // Extract business name
      const businessMatch = msg.match(/does (.+?) have/);
      
      if (businessMatch) {
        const businessName = businessMatch[1];
        const secretMenu = enhancedSecretMenus.find(menu => 
          menu.businessName.toLowerCase().includes(businessName.toLowerCase())
        );
        
        if (secretMenu) {
          const itemsList = secretMenu.items.map(item => {
            const rarityStars = '⭐'.repeat(item.rarity || 3);
            return `🔒 **${item.name}** ${rarityStars}\n   *${item.hint.substring(0, 80)}...*`;
          }).join('\n\n');
          
          return `Ooh, ${secretMenu.businessName} has some incredible secret treasures! 🏴‍☠️ Here's what I can whisper about:\n\n${itemsList}\n\n🎯 **Want the full details?** Each item can be unlocked by:\n• Visiting the restaurant and scanning their QR code\n• Using your Qwikker points\n• Social challenges\n\nWhich secret item intrigues you most? I can give you more specific hints! 😉`;
        }
      }
      
      return "Great question! Which business are you curious about? I can tell you about their secret menu items - some are legendary! 🗝️"
    }
    
    if (msg.includes('secret') || msg.includes('hidden')) {
      return "Ah, a fellow secret-seeker! 🤫 I love this question! Are you curious about off-menu items at restaurants, hidden speakeasy-style bars, or maybe secret spots that locals love but tourists don't know about? What kind of secrets intrigue you most?"
    }
    
    if (msg.includes('offer') || msg.includes('deal') || msg.includes('discount')) {
      return "Smart shopper! 💰 What kind of deals are you hunting for? Restaurant discounts, spa treatments, activities? Are you flexible with timing or looking for something specific today? I can help you find the best value!"
    }
    
    if (msg.includes('show me') || msg.includes('recommend') || msg.includes('suggest')) {
      return "I'd love to help you discover some amazing places! But first, tell me a bit more about what you're in the mood for. What brings you to Bournemouth today? Are you a local exploring or visiting? What sounds good to you right now?"
    }
    
    // Handle points and rewards questions
    if (msg.includes('points') || msg.includes('credits') || msg.includes('earn') || msg.includes('badges')) {
      const userPoints = mockUserProfile.totalPoints
      const userLevel = mockUserProfile.level
      const earnedBadges = mockUserProfile.badges.filter(b => b.unlockedDate).length
      const totalBadges = mockBadges.length
      
      return `Great question! Here's your current status:\n\n🏆 **Your Progress:**\n• Current Points: ${userPoints.toLocaleString()}\n• Level: ${userLevel}\n• Badges Earned: ${earnedBadges}/${totalBadges}\n\n💰 **Ways to Earn Points:**\n• Refer Friends: +${pointsEarningRules.friend_referral.points} points (highest earner!)\n• Redeem Offers: +${pointsEarningRules.offer_redeem.points} points\n• Visit Businesses: +${pointsEarningRules.business_visit.points} points\n• Write Reviews: +${pointsEarningRules.review_write.points} points\n• Share on Social: +${pointsEarningRules.social_share.points} points\n\nWant to see what badges you can unlock next or check out current offers?`
    }
    
    // Handle menu questions
    if (msg.includes('menu') || msg.includes('food options')) {
      const businessesWithMenus = mockBusinesses.filter(b => b.specialties && b.specialties.length > 0)
      return `I can show you menus from ${businessesWithMenus.length} amazing restaurants! Each place has their own specialties:\n\n• **${businessesWithMenus[0].name}**: ${businessesWithMenus[0].specialties?.join(', ')}\n• **${businessesWithMenus[1].name}**: ${businessesWithMenus[1].specialties?.join(', ')}\n• **${businessesWithMenus[2].name}**: ${businessesWithMenus[2].specialties?.join(', ')}\n\nPlus, ${mockBusinesses.filter(b => b.hasSecretMenu).length} places have secret menus with hidden items! Which type of cuisine interests you most?`
    }
    
    // Handle offers questions
    if (msg.includes('offers') || msg.includes('deals') || msg.includes('discounts')) {
      const totalOffers = mockOffers.length
      const endingSoon = mockOffers.filter(o => o.badge === 'Ends Soon').length
      return `Amazing timing! We currently have ${totalOffers} active offers available:\n\n🔥 **Hot Deals:**\n• ${mockOffers[0].title} at ${mockOffers[0].businessName}\n• ${mockOffers[1].title} at ${mockOffers[1].businessName}\n• ${mockOffers[2].title} at ${mockOffers[2].businessName}\n\n⚡ ${endingSoon} offers are ending soon!\n\n💡 **Pro tip:** Add offers to your mobile wallet to claim them easily. Want to see all offers or focus on a specific type of cuisine?`
    }
    
    // Default conversational responses with data awareness (NO welcome message)
    const totalBusinesses = mockBusinesses.length
    const secretMenuCount = mockBusinesses.filter(b => b.hasSecretMenu).length
    const responses = [
      `I'm here to help you explore Bournemouth! We have ${totalBusinesses} partner venues, ${secretMenuCount} with secret menus, and ${mockOffers.length} active offers. What sounds good?`,
      `Tell me what you're in the mood for! I can help with restaurants, offers, secret menus, or even show you how to earn more Qwikker Credits (you currently have ${mockUserProfile.totalPoints.toLocaleString()} points!).`,
      `Great! I can help you discover amazing places. Are you looking for food, drinks, deals, or want to know about earning more points? You're level ${mockUserProfile.level} with ${mockUserProfile.badges.filter(b => b.unlockedDate).length} badges!`,
      `Perfect! What kind of experience are you after? I know all ${totalBusinesses} partner venues and can show you the best deals and secret menu items!`
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const getRelevantBusinesses = (userMessage: string) => {
    const msg = userMessage.toLowerCase()
    
    // Show business cards based on conversation context
    const shouldShowBusinesses = 
      // Follow-up responses that should show businesses
      conversationContext.waitingFor === 'coffee-details' ||
      conversationContext.waitingFor === 'restaurant-details' ||
      conversationContext.waitingFor === 'drinks-details' ||
      conversationContext.lastCategory ||
      // Direct specific requests
      msg.includes('show me') || 
      msg.includes('yes') || 
      msg.includes('please') ||
      // Specific descriptors
      msg.includes('cozy') ||
      msg.includes('quick') ||
      msg.includes('fancy') ||
      msg.includes('casual') ||
      msg.includes('craft beer') ||
      msg.includes('cocktails') ||
      msg.includes('massage') ||
      msg.includes('facial') ||
      msg.includes('romantic') ||
      msg.includes('friends') ||
      msg.includes('date night') ||
      // Combined specific requests
      (msg.includes('coffee') && (msg.includes('work') || msg.includes('pastries') || msg.includes('cozy'))) ||
      (msg.includes('restaurant') && (msg.includes('italian') || msg.includes('seafood') || msg.includes('romantic')))
    
    if (!shouldShowBusinesses) {
      return [] // Don't show business cards for initial/general queries
    }
    
    let relevantBusinesses = mockBusinesses
    
    // Use conversation context to determine category
    if (conversationContext.lastCategory === 'cafe' || conversationContext.waitingFor === 'coffee-details' || msg.includes('coffee') || msg.includes('cafe')) {
      relevantBusinesses = mockBusinesses.filter(b => b.category.toLowerCase().includes('cafe'))
    } else if (conversationContext.lastCategory === 'restaurant' || conversationContext.waitingFor === 'restaurant-details' || msg.includes('restaurant') || msg.includes('dinner') || msg.includes('food')) {
      relevantBusinesses = mockBusinesses.filter(b => b.category.toLowerCase().includes('restaurant'))
    } else if (conversationContext.lastCategory === 'bar' || conversationContext.waitingFor === 'drinks-details' || msg.includes('bar') || msg.includes('drink') || msg.includes('beer')) {
      relevantBusinesses = mockBusinesses.filter(b => b.category.toLowerCase().includes('bar'))
    } else if (conversationContext.lastCategory === 'spa' || conversationContext.waitingFor === 'spa-details' || msg.includes('spa') || msg.includes('wellness')) {
      relevantBusinesses = mockBusinesses.filter(b => b.category.toLowerCase().includes('spa'))
    }
    
    return relevantBusinesses.slice(0, 2).map(business => ({
      id: business.id,
      name: business.name,
      tagline: business.tagline,
      image: business.images[0],
      rating: business.rating,
      distance: business.distance,
      activeOffers: business.activeOffers
    }))
  }

  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt)
  }

  const BusinessCard = ({ business }: { business: any }) => (
    <Card className="bg-gradient-to-br from-slate-700/50 to-slate-600/30 border-slate-600 hover:border-[#00d083]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00d083]/10 group cursor-pointer overflow-hidden max-w-xs">
      <div className="relative h-32 overflow-hidden">
        <img 
          src={business.image} 
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/70 text-slate-100 text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            {business.distance} miles
          </span>
        </div>
        {business.activeOffers > 0 && (
          <div className="absolute top-2 right-2">
            <span className="bg-orange-500 text-slate-100 text-xs px-2 py-1 rounded-full">
              {business.activeOffers} OFFERS
            </span>
          </div>
        )}
      </div>
      
      <CardContent className="p-3">
        <h4 className="text-slate-100 font-semibold text-sm mb-1">{business.name}</h4>
        <p className="text-[#00d083] text-xs mb-2">{business.tagline}</p>
        <div className="flex items-center gap-1 mb-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-3 h-3 ${star <= business.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-slate-100 text-xs font-medium">{business.rating}</span>
        </div>
        <Button asChild size="sm" className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-medium">
          <Link href={`/user/business/${mockBusinesses.find(b => b.id === business.id)?.slug}`}>View Details</Link>
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)]">
      {/* Page Header - More Exciting */}
      <div className="mb-6 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00d083]/10 via-purple-500/5 to-blue-500/10 rounded-2xl blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full animate-pulse">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00d083] via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Your AI Local Guide
            </h1>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        <p className="text-xl text-slate-300 mb-2">
          Discover Bournemouth's best kept secrets through conversation
        </p>
        <p className="text-slate-400">
          Ask about menus, deals, hidden gems, or get personalized recommendations
        </p>
        </div>
      </div>

      {/* Chat Container - Enhanced */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-700/30 rounded-2xl border border-slate-600 shadow-2xl shadow-[#00d083]/5 overflow-hidden backdrop-blur-sm">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`rounded-2xl px-4 py-3 shadow-lg ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black ml-auto shadow-[#00d083]/20' 
                    : 'bg-gradient-to-r from-slate-700/80 to-slate-600/80 text-slate-100 border border-slate-600/50 shadow-slate-900/20'
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                
                {/* Business Cards for Assistant Messages */}
                {message.businessCards && message.businessCards.length > 0 && (
                  <div className="flex gap-3 mt-3 overflow-x-auto">
                    {message.businessCards.map((business) => (
                      <BusinessCard key={business.id} business={business} />
                    ))}
                  </div>
                )}

                {/* Add to Wallet Button for Offer Messages */}
                {message.type === 'assistant' && conversationContext.offerInfo && message.content.includes('add this offer to your mobile wallet') && (
                  <div className="mt-3">
                    <Button 
                      onClick={() => {
                        // Simulate adding to wallet
                        alert(`"${conversationContext.offerInfo?.title}" has been added to your mobile wallet!`)
                      }}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-slate-100 font-semibold"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add "{conversationContext.offerInfo?.title}" to Wallet
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-slate-400 mt-1 px-2">
                  {new Date(message.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 border border-slate-600/50 rounded-2xl px-4 py-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#00d083] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-slate-300 text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Input Area - Enhanced */}
        <div className="p-4 border-t border-slate-600/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
          {/* Compact Suggested Prompts (only show when chat is empty) */}
          {messages.length === 1 && (
            <div className="mb-4">
              <p className="text-slate-400 text-xs mb-2 text-center">Try one of these:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.slice(0, 6).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="bg-slate-700/50 hover:bg-[#00d083]/20 text-slate-300 hover:text-[#00d083] px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border border-slate-600/50 hover:border-[#00d083]/50"
                  >
                    {prompt.length > 25 ? `${prompt.substring(0, 22)}...` : prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="relative">
            <div className="flex gap-3 bg-slate-800/50 rounded-2xl p-2 border border-slate-600/50 focus-within:border-[#00d083]/50 transition-all duration-300 focus-within:shadow-lg focus-within:shadow-[#00d083]/10">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                  placeholder="Ask me about restaurants, deals, secret menus, or anything..."
                  className="w-full bg-transparent px-4 py-3 text-slate-100 placeholder-gray-400 focus:outline-none text-lg"
                  disabled={isTyping}
                />
                {!inputValue && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-[#00d083] rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isTyping ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </Button>
            </div>
            
            {/* Quick Action Hints */}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <kbd className="bg-slate-700 px-2 py-1 rounded text-slate-400">Enter</kbd>
                to send
              </span>
              <span>•</span>
              <span>Powered by AI</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
