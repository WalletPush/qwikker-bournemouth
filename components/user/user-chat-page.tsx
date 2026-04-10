'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BusinessCarousel } from '@/components/ui/business-carousel'
import { EventCarousel } from '@/components/ui/event-carousel'
import { AtlasMode } from '@/components/atlas/AtlasMode'
import { useTenantAtlasConfig } from '@/lib/atlas/useTenantAtlasConfig'
import { StreamingText } from '@/components/ui/streaming-text'
import { useUserLocation, primeLocationCache } from '@/lib/location/useUserLocation'
import { useState, useEffect, useRef, useMemo } from 'react'
import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Map } from 'lucide-react'

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: string
  sources?: Array<{
    type: 'business' | 'city'
    businessName?: string
    content: string
    similarity: number
  }>
  quickReplies?: string[]
  hasBusinessResults?: boolean // For Atlas "earned moment" without carousel spam
  intent?: 'near_me' | 'browse' | 'events' | 'offers' | 'unknown'
  needsLocation?: boolean // If true, user asked "near me" but no location available
  showAtlasCta?: boolean // If true, show inline Atlas CTA in message
  locationReason?: string // Why we need location (for CTA copy)
  queryCategories?: string[] // ✅ ATLAS: Categories detected in query (for filtering businesses)
  queryKeywords?: string[] // ✅ ATLAS: Keywords detected in query (for filtering businesses)
  businessCarousel?: Array<{
    id: string
    business_name: string
    business_tagline?: string
    business_category?: string
    business_tier: 'free_trial' | 'featured' | 'qwikker_picks' | 'recommended'
    business_address?: string
    business_town?: string
    logo?: string
    business_images?: string[]
    rating?: number
    review_count?: number
    offers_count?: number
    latitude?: number // ✅ ATLAS: For map pins
    longitude?: number // ✅ ATLAS: For map pins
    phone?: string // ✅ ATLAS: For contact info
    website_url?: string // ✅ ATLAS: For website link
    google_place_id?: string // ✅ ATLAS: For Google reviews link
  }>
  mapPins?: Array<{
    // ✅ ATLAS: ALL businesses for map (paid + unclaimed)
    id: string
    business_name: string
    latitude: number
    longitude: number
    rating?: number
    review_count?: number
    display_category?: string
    business_tier: 'paid' | 'unclaimed' // For pin coloring
    phone?: string
    website_url?: string
    google_place_id?: string
    // ✅ Explainability fields
    reason?: {
      type: string
      label: string
      emoji: string
    }
    reasonMeta?: {
      isOpenNow: boolean
      distanceMeters: number | null
      ratingBadge: string | null
    }
  }>
  walletActions?: Array<{
    type: 'add_to_wallet'
    offerId: string
    offerName: string
    businessName: string
    businessId: string
  }>
  eventCards?: Array<{
    id: string
    title: string
    description: string
    event_type: string
    start_date: string
    start_time?: string
    end_date?: string
    end_time?: string
    location: string
    ticket_url?: string
    image_url?: string
    business_name: string
    business_id: string
  }>
}

export function UserChatPage({ currentUser, currentCity, cityDisplayName = 'Bournemouth' }: { currentUser?: any, currentCity?: string, cityDisplayName?: string }) {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const chatWrapperRef = useRef<HTMLDivElement>(null)
  const [chatHeight, setChatHeight] = useState<string>('80dvh')
  
  // ✅ MVP-CRITICAL: messagesRef to prevent race conditions on fast interactions
  const messagesRef = useRef<ChatMessage[]>([])
  
  // ✅ Keep messagesRef synced with messages state
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  const [hasAutoSent, setHasAutoSent] = useState(false)
  
  // ATLAS: View state management
  const [view, setView] = useState<'chat' | 'atlas'>('chat')
  const [atlasEverOpened, setAtlasEverOpened] = useState(false)
  
  // ATLAS: Detail request (hidden ID-based handoff)
  const [detailRequest, setDetailRequest] = useState<string | null>(null)
  
  // Near-me query flow
  const [pendingNearMeQuery, setPendingNearMeQuery] = useState<string | null>(null)
  const [lastBusinessQuery, setLastBusinessQuery] = useState<string | null>(null)
  const [atlasInitialQuery, setAtlasInitialQuery] = useState<string | null>(null)
  
  // Track which messages have completed streaming (for Atlas CTA gating)
  const [streamingComplete, setStreamingComplete] = useState<Set<string>>(new Set())
  
  // Track initial message count on page load (to prevent re-streaming old messages)
  const initialMessageCountRef = useRef<number>(0)
  
  // ATLAS: Load tenant config
  const { config: tenantConfig, loading: configLoading } = useTenantAtlasConfig()
  const atlasEnabled = tenantConfig?.atlas?.enabled && tenantConfig?.atlas?.mapboxPublicToken
  
  // Debug logging
  useEffect(() => {
    if (tenantConfig) {
      console.log('🗺️ [Atlas Debug] Config loaded:', {
        atlasEnabled,
        hasToken: !!tenantConfig?.atlas?.mapboxPublicToken,
        hasCenter: !!tenantConfig?.center,
        view,
        config: tenantConfig.atlas
      })
    }
  }, [tenantConfig, atlasEnabled, view])
  
  // STABLE center prop (prevent map re-init)
  const atlasCenter = useMemo(() => {
    const c = tenantConfig?.center
    return c ? { lat: c.lat, lng: c.lng } : null
  }, [tenantConfig?.center?.lat, tenantConfig?.center?.lng])
  
  // ATLAS: User location
  const { coords: userLocation, requestPermission, status: locationStatus } = useUserLocation(
    tenantConfig?.center ? { lat: tenantConfig.center.lat, lng: tenantConfig.center.lng } : undefined
  )
  
  // Soft location priming: silently cache if permission already granted
  useEffect(() => {
    primeLocationCache()
  }, [])
  
  // ATLAS: Auto-request location when Atlas opens (once per session)
  const locationRequestedRef = useRef(false)
  const autoResentRef = useRef<string | null>(null)
  
  useEffect(() => {
    if (view !== 'atlas') {
      // Reset when leaving Atlas so it can request again next time
      locationRequestedRef.current = false
      return
    }
    
    if (!locationRequestedRef.current && locationStatus === 'idle') {
      locationRequestedRef.current = true
      if (process.env.NODE_ENV === 'development') {
        console.log('[Atlas] Auto-requesting location permission')
      }
      requestPermission()
    }
  }, [view, locationStatus, requestPermission])
  
  // Auto-resend near-me query when location becomes available (prevent double-sends)
  useEffect(() => {
    if (locationStatus === 'granted' && userLocation && pendingNearMeQuery) {
      // Guard: prevent double-send of the same query
      if (autoResentRef.current === pendingNearMeQuery) return
      autoResentRef.current = pendingNearMeQuery
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Chat] Location granted, auto-resending query:', pendingNearMeQuery)
      }
      handleSendMessage(pendingNearMeQuery)
      setPendingNearMeQuery(null)
      
      // Reset ref after clearing
      setTimeout(() => { autoResentRef.current = null }, 0)
    }
  }, [locationStatus, userLocation, pendingNearMeQuery])
  
  // Session storage keys for chat memory
  const chatSessionKey = `qwikker-chat-session-${currentUser?.wallet_pass_id || 'guest'}`
  const chatStreamCountKey = `qwikker-chat-stream-count-${currentUser?.wallet_pass_id || 'guest'}`

  // Measure exact position and fill to bottom of viewport
  useEffect(() => {
    const el = chatWrapperRef.current
    if (!el) return
    const update = () => {
      const top = el.getBoundingClientRect().top
      setChatHeight(`calc(100dvh - ${Math.round(top)}px)`)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [view])

  // ✅ SMART SCROLL: Scroll when NEW messages arrive, but not during streaming
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    // Only scroll when messages array changes (new message added)
    // The streaming component handles its own rendering without changing the array
    scrollToBottom()
  }, [messages.length]) // Changed from [messages] to [messages.length]

  // Load chat history from session storage or initialize with welcome message
  useEffect(() => {
    try {
      // Try to load existing session
      const savedMessages = sessionStorage.getItem(chatSessionKey)
      const savedStreamCount = sessionStorage.getItem(chatStreamCountKey)
      
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages)
        // Only restore if messages are from today (session-based, not persistent)
        const latestMessage = parsedMessages[parsedMessages.length - 1]
        const messageDate = new Date(latestMessage.timestamp).toDateString()
        const today = new Date().toDateString()
        
        if (messageDate === today && parsedMessages.length > 0) {
          console.log('🔄 Restoring chat session with', parsedMessages.length, 'messages')
          setMessages(parsedMessages)
          
          // Restore the stream count from session storage (all these messages have been streamed)
          const streamCount = savedStreamCount ? parseInt(savedStreamCount, 10) : parsedMessages.length
          initialMessageCountRef.current = streamCount
          console.log('📊 Restored stream count:', streamCount, '(preventing re-stream)')
          return
        }
      }
    } catch (error) {
      console.log('📝 No valid chat session found, starting fresh')
    }

    // Create fresh welcome message if no valid session
    const userName = currentUser?.name?.split(' ')[0] || null
    
    // 🎯 DYNAMIC GREETINGS: Rotate through different welcome messages  
    const greetings = userName ? [
      `Hey ${userName}! 👋 Looking for something tasty in ${cityDisplayName}? I've got the inside scoop on great restaurants, exclusive offers, and secret menus!`,
      `${userName}! Ready to discover ${cityDisplayName}'s best spots? I can show you top-rated restaurants, unbeatable deals, and hidden gems!`,
      `Alright ${userName}, what's the vibe? Looking for food, drinks, or just somewhere new to explore in ${cityDisplayName}?`,
      `Hey ${userName}! Whether you're after a quick bite, a proper meal, or the best deals in town—I've got you covered!`,
      `${userName}! Let's find you something brilliant. Restaurants, offers, secret menus—what are you in the mood for?`
    ] : [
      `Hey! 👋 Looking for something tasty in ${cityDisplayName}? I've got the inside scoop on great restaurants, exclusive offers, and secret menus!`,
      `Ready to discover ${cityDisplayName}'s best spots? I can show you top-rated restaurants, unbeatable deals, and hidden gems!`,
      `Alright, what's the vibe? Looking for food, drinks, or just somewhere new to explore in ${cityDisplayName}?`,
      `Whether you're after a quick bite, a proper meal, or the best deals in town—I've got you covered!`,
      `Let's find you something brilliant. Restaurants, offers, secret menus—what are you in the mood for?`
    ]
    
    // Pick a random greeting
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)]
    
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: randomGreeting,
      timestamp: new Date().toISOString(),
      quickReplies: [
        "Show me Qwikker Picks",
        "Find restaurants",
        "Current deals"
      ]
    }
    setMessages([welcomeMessage])
    // Track initial count (welcome message = 1)
    initialMessageCountRef.current = 1
    // Save stream count to session storage
    sessionStorage.setItem(chatStreamCountKey, '1')
  }, [currentUser, chatSessionKey, chatStreamCountKey])

  // Save messages to session storage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(chatSessionKey, JSON.stringify(messages))
        // Save the current message count as the stream count
        // This ensures that when we reload, we know how many messages have already been streamed
        sessionStorage.setItem(chatStreamCountKey, messages.length.toString())
      } catch (error) {
        console.log('💾 Could not save chat session:', error)
      }
    }
  }, [messages, chatSessionKey, chatStreamCountKey])

  // Handle pre-filled message from URL parameter
  useEffect(() => {
    const prefilledMessage = searchParams.get('message')
    if (prefilledMessage && !hasAutoSent && messages.length > 0) {
      console.log('📨 Auto-sending pre-filled message:', prefilledMessage)
      setHasAutoSent(true)
      
      // Clear the URL parameter immediately
      const newUrl = window.location.pathname + (currentUser?.wallet_pass_id ? `?wallet_pass_id=${currentUser.wallet_pass_id}` : '')
      window.history.replaceState({}, '', newUrl)
      
      // Wait a moment for welcome message to render, then send
      setTimeout(() => {
        handleSendMessage(prefilledMessage)
      }, 500)
    }
  }, [searchParams, hasAutoSent, messages.length, currentUser])

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isTyping) return

    // Track chat usage for badge
    if (typeof window !== 'undefined') {
      const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
      const badgeTracker = getBadgeTracker(currentUser?.wallet_pass_id)
      badgeTracker.trackAction('ai_chat_used')
    }

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    // Client-side "near me" detection: if user asks for nearby results and we don't have
    // location yet, show the location prompt BEFORE calling the AI
    const isNearMeQuery = /\b(near\s*me|nearby|close\s*by|around\s*me|closest|nearest|walking\s*distance)\b/i.test(message)
    if (isNearMeQuery && locationStatus !== 'granted') {
      setPendingNearMeQuery(message)
      const locationPrompt: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        processedContent: '',
        needsLocation: true,
        locationReason: 'I need your location to find the best places near you'
      }
      setMessages(prev => [...prev, locationPrompt])
      setStreamingComplete(prev => new Set(prev).add(locationPrompt.id))
      return
    }

    setIsTyping(true)

    try {
      // 🚨 CRITICAL FIX: Include the current user message in conversation history!
      // ✅ MVP-CRITICAL: Use messagesRef + filter hidden commands
      const fullConversationHistory = [...messagesRef.current, userMessage]
        .filter(m => !m.content?.startsWith('__qwikker_')) // Strip hidden commands
        .slice(-8)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      
      console.log(`💬 Sending conversation history with ${fullConversationHistory.length} messages (hidden commands filtered):`, fullConversationHistory)

      // Call the real AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          walletPassId: currentUser?.wallet_pass_id,
          city: currentCity, // Send city for proper filtering
          conversationHistory: fullConversationHistory,
          userLocation: locationStatus === 'granted' && userLocation ? userLocation : null
        })
      })

      const data = await response.json()

      console.log('📦 AI Response Data:', {
        hasResponse: !!data.response,
        responsePreview: data.response?.substring(0, 100),
        intent: data.intent,
        needsLocation: data.needsLocation,
        showAtlasCta: data.showAtlasCta,
        hasEventCards: !!data.eventCards,
        eventCardsCount: data.eventCards?.length || 0
      })
      
      // Store pending query if location is needed
      if (data.needsLocation) {
        setPendingNearMeQuery(message)
      }
      
      // Store last business query for Atlas CTA
      if (data.hasBusinessResults) {
        setLastBusinessQuery(message)
      }

      // Add AI response
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || "I'm having trouble accessing my knowledge base right now. Please try again in a moment!",
        timestamp: new Date().toISOString(),
        sources: data.sources || [],
        quickReplies: data.quickReplies || [],
        hasBusinessResults: data.hasBusinessResults,
        businessCarousel: data.businessCarousel,
        mapPins: data.mapPins, // ✅ ATLAS: All businesses for map (paid + unclaimed)
        queryCategories: data.queryCategories || [], // ✅ ATLAS: For filtering businesses
        queryKeywords: data.queryKeywords || [], // ✅ ATLAS: For filtering businesses
        walletActions: data.walletActions,
        eventCards: data.eventCards,
        intent: data.intent,
        needsLocation: data.needsLocation,
        showAtlasCta: data.showAtlasCta,
        locationReason: data.locationReason
      }

      console.log('💬 AI Message created:', {
        hasEventCards: !!aiMessage.eventCards,
        eventCardsCount: aiMessage.eventCards?.length || 0
      })

      setMessages(prev => [...prev, aiMessage])

        } catch (error) {
      console.error('❌ AI Chat error:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm experiencing some technical difficulties right now. Please try again in a moment!",
        timestamp: new Date().toISOString(),
        quickReplies: ['Try again', 'Show me offers', 'Find restaurants']
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  // ATLAS: Fetch business detail using hidden ID-based command
  const fetchBusinessDetail = async (businessId: string) => {
    console.log(`🔍 Fetching business detail for ID: ${businessId}`)
    setIsTyping(true)
    
    try {
      // ✅ FIXED: Pass last 6 messages for context (keeps AI tone/constraints)
      // But do NOT include the hidden command as a visible user message
      const recentHistory = messagesRef.current
        .filter(m => !m.content?.startsWith('__qwikker_')) // Strip hidden commands defensively
        .slice(-6)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      
      // Call AI API with HIDDEN command (no user message)
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `__qwikker_business_detail__:${businessId}`, // Hidden command
          walletPassId: currentUser?.wallet_pass_id,
          city: currentCity,
          conversationHistory: recentHistory, // ✅ Pass context for smarter responses
          userLocation: locationStatus === 'granted' && userLocation ? userLocation : null
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Add ONLY the AI response (no user message)
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: data.response || 'Here are the details:',
          timestamp: new Date().toISOString(),
          businessCarousel: data.businessCarousel || [],
          quickReplies: data.quickReplies || ['Back to Atlas', 'Directions', 'Tell me more'],
        }
        
        setMessages(prev => [...prev, aiMessage])
        console.log(`✅ Business detail fetched successfully`)
      } else {
        console.error('❌ Business detail fetch failed:', data.error)
        
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: 'Sorry, I couldn\'t find details for that business.',
          timestamp: new Date().toISOString(),
          quickReplies: ['Back to Atlas', 'Try another search']
        }
        
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('❌ Error fetching business detail:', error)
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sorry, something went wrong loading the details.',
        timestamp: new Date().toISOString(),
        quickReplies: ['Back to Atlas']
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }
  
  // useEffect to trigger detail fetch when detailRequest changes
  useEffect(() => {
    if (detailRequest) {
      fetchBusinessDetail(detailRequest)
      setDetailRequest(null) // Reset after triggering
    }
  }, [detailRequest])

  const handleShowOffers = async (businessId: string, businessName: string) => {
    // Add a user message asking for offers
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: `Show me offers from ${businessName}`,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    try {
      // Call the AI API to get offers for this specific business
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Show me all current offers and deals from ${businessName}. Include details like discount amount, terms, and expiry dates. Ask if I want to add any to my wallet.`,
          walletPassId: currentUser?.wallet_pass_id,
          city: currentCity, // Send city for proper filtering
          conversationHistory: messages.slice(-4).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        })
      })

      const data = await response.json()

      // Add AI response with offers
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || `Here are the current offers from ${businessName}!`,
        timestamp: new Date().toISOString(),
        sources: data.sources || [],
        quickReplies: ['Add to wallet', 'Tell me more', 'Show other businesses']
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('❌ Error fetching offers:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Sorry, I couldn't fetch the offers from ${businessName} right now. You can visit their page directly or try again in a moment!`,
        timestamp: new Date().toISOString(),
        quickReplies: ['Try again', 'Show other businesses']
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleAddToWallet = async (offerId: string, offerName: string, businessName: string) => {
    if (!currentUser?.wallet_pass_id) {
      alert('You need to sign up first to get your Qwikker wallet pass')
      return
    }

    try {
      const response = await fetch('/api/ai/add-to-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userWalletPassId: currentUser.wallet_pass_id,
          offerId: offerId,
          businessName: businessName
        })
      })

      const result = await response.json()

      if (result.success) {
        // Add success message to chat
        const successMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: `🎉 Perfect! "${offerName}" has been added to your wallet pass! It expires in 12 hours, so make sure to use it soon. Check your wallet to see the details!`,
          timestamp: new Date().toISOString(),
          quickReplies: ['Show me more offers', 'Find restaurants', 'What else is available?']
        }
        setMessages(prev => [...prev, successMessage])
      } else {
        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: `Sorry, I couldn't add that offer to your wallet right now. ${result.error || 'Please try again in a moment.'}`,
          timestamp: new Date().toISOString(),
          quickReplies: ['Try again', 'Show me other offers', 'Contact support']
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('❌ Wallet action error:', error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: "I'm having trouble adding that to your wallet right now. Please try again in a moment!",
        timestamp: new Date().toISOString(),
        quickReplies: ['Try again', 'Show me other offers', 'Contact support']
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply)
  }


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(inputValue)
    }
  }

  // Helper function to process AI response and make business names clickable
  const processAIResponse = (content: string, sources: any[] = []) => {
    let processedContent = content

    // Parse markdown links (before bold text)
    // Pattern: [**text**](/url) or [text](/url)
    processedContent = processedContent.replace(/\[(\*\*)?([^\]]+)(\*\*)?\]\(([^)]+)\)/g, (match, bold1, text, bold2, url) => {
      return `<a href="${url}" class="text-[#00d083] hover:text-[#00b86f] underline font-semibold cursor-pointer">${text}</a>`
    })

    // Extract business names from sources
    const businessNames = sources
      .filter(source => source.type === 'business' && source.businessName)
      .map(source => source.businessName)

    // 🎯 ENHANCED: Add known business names even if not in sources
    const knownBusinessNames = [
      "David's Grill Shack", "Julie's Sports Pub", "Orchid & Ivy", 
      "Mike's Pool Bar", "Venezy Burgers", "David's grill shack", 
      "Julie's sports pub", "davids grill shack", "julies sports pub",
      "Triangle GYROSS", "Kalimera Bournemouth" // Add Tier 3 businesses
    ]
    
    // Merge sources with known business names (remove duplicates)
    const allBusinessNames = [...new Set([...businessNames, ...knownBusinessNames])]

    // Convert **text** to bold and make business names clickable (only if NOT already a link)
    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, (match, text) => {
      // Check if this bold text is a business name
      const isBusinessName = allBusinessNames.some(name => 
        text.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(text.toLowerCase())
      )
      
      if (isBusinessName) {
        // Find the actual business name (prefer exact matches)
        let businessName = allBusinessNames.find(name => 
          text.toLowerCase() === name.toLowerCase()
        )
        
        // Fallback to partial matches
        if (!businessName) {
          businessName = allBusinessNames.find(name => 
            text.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(text.toLowerCase())
          )
        }
        
        // Return as clickable business link
        return `<strong class="business-link cursor-pointer text-[#00d083] hover:text-[#00b86f] underline" data-business="${businessName}">${text}</strong>`
      } else {
        // Just return as bold
        return `<strong>${text}</strong>`
      }
    })

    // Auto-link phone numbers (UK and international formats)
    processedContent = processedContent.replace(
      /(?<!href="|">)(\+?[\d\s\-()]{10,})(?=\s|$|<|,|\.|\n)/g,
      (match) => {
        const trimmed = match.trim()
        const digits = trimmed.replace(/[\s\-()]/g, '')
        if (digits.length < 10 || digits.length > 15) return match
        return `<a href="tel:${digits}" class="text-[#00d083] hover:text-[#00b86f] underline">${trimmed}</a>`
      }
    )

    // Auto-link URLs that aren't already inside href="" or <a> tags
    processedContent = processedContent.replace(
      /(?<!href="|">)(https?:\/\/[^\s<,"]+)/g,
      (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#00d083] hover:text-[#00b86f] underline">${url}</a>`
    )

    // Auto-link addresses (lines starting with "Address:")
    processedContent = processedContent.replace(
      /Address:\s*(.+?)(?=\n|<br|$)/gi,
      (match, addr) => {
        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(addr.trim())}`
        return `Address: <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="text-[#00d083] hover:text-[#00b86f] underline">${addr.trim()}</a>`
      }
    )

    return processedContent
  }

  // 🚀 PERFORMANCE FIX: Memoize processed messages to avoid re-processing on every render
  const processedMessages = useMemo(() => {
    return messages.map(message => ({
      ...message,
      processedContent: message.type === 'ai' 
        ? processAIResponse(message.content, message.sources)
        : message.content
    }))
  }, [messages])

  // Push messages to bottom of scroll area (iMessage style)
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const recalc = () => {
      const gap = el.clientHeight - el.scrollHeight + parseInt(el.style.paddingTop || '0')
      el.style.paddingTop = gap > 0 ? `${gap}px` : '16px'
    }
    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [processedMessages.length])

  // Handle business name clicks
  const handleBusinessClick = (businessName: string) => {
    // Convert business name to slug format (match business page generation)
    const slug = businessName.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const url = `/user/business/${slug}${currentUser?.wallet_pass_id ? `?wallet_pass_id=${currentUser.wallet_pass_id}` : ''}`
    window.location.href = url
  }

  // Clear chat session
  const handleClearChat = () => {
    try {
      sessionStorage.removeItem(chatSessionKey)
      sessionStorage.removeItem(chatStreamCountKey)
      // Reinitialize with welcome message
      const userName = currentUser?.name?.split(' ')[0] || 'Explorer'
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Hi ${userName}! I'm here to help you discover the best of ${cityDisplayName}. I can show you great restaurants, exclusive offers, and even add deals straight to your wallet! What are you looking for?`,
        timestamp: new Date().toISOString(),
        quickReplies: [
          "Show me Qwikker Picks",
          "Find restaurants",
          "Current deals"
        ]
      }
      setMessages([welcomeMessage])
      console.log('🗑️ Chat session cleared')
    } catch (error) {
      console.log('❌ Could not clear chat session:', error)
    }
  }

  // Memoize atlas businesses to prevent unnecessary re-renders when Atlas is kept mounted
  const atlasBusinesses = useMemo(() => {
    const lastAIMessage = messages.filter(m => m.type === 'ai').slice(-1)[0]
    const businessesToShow = lastAIMessage?.businessCarousel || lastAIMessage?.mapPins
    
    if (!businessesToShow || businessesToShow.length === 0) return undefined
    
    return businessesToShow.map((pin: any) => ({
      id: pin.id,
      business_name: pin.business_name,
      latitude: pin.latitude,
      longitude: pin.longitude,
      rating: pin.rating || 0,
      review_count: pin.review_count || 0,
      business_tagline: pin.business_tagline,
      display_category: pin.display_category,
      business_address: pin.business_address,
      google_place_id: pin.google_place_id,
      website_url: pin.website_url,
      phone: pin.phone,
      isPaid: pin.business_tier === 'paid',
      isUnclaimed: pin.business_tier === 'unclaimed',
      hasLoyalty: pin.hasLoyalty || false,
      loyaltyReward: pin.loyaltyReward,
      loyaltyThreshold: pin.loyaltyThreshold,
      userStamps: pin.userStamps,
      userStampsRemaining: pin.userStampsRemaining,
      reason: pin.reason,
      reasonMeta: pin.reasonMeta
    })).filter((b: any) => b.latitude && b.longitude)
  }, [messages])

  return (
    <>
      {/* ATLAS MODE: Mount on first open, then keep alive with visibility toggle (not display:none) */}
      {atlasEnabled && tenantConfig?.atlas && atlasCenter && atlasEverOpened && (
        <div className={`fixed inset-0 z-[9999] ${view === 'atlas' ? '' : 'invisible pointer-events-none'}`}>
          <AtlasMode
            config={tenantConfig.atlas}
            center={atlasCenter}
            userLocation={userLocation}
            locationStatus={locationStatus}
            isActive={view === 'atlas'}
            onClose={() => setView('chat')}
            city={tenantConfig.city || 'unknown'}
            userId={currentUser?.wallet_pass_id}
            lastUserQuery={messages.length > 0 ? messages.filter(m => m.type === 'user').slice(-1)[0]?.content : undefined}
            lastAIResponse={messages.length > 0 ? messages.filter(m => m.type === 'ai').slice(-1)[0]?.content : undefined}
            onRequestLocation={requestPermission}
            onRequestDetails={(businessId: string) => {
              setView('chat')
              setDetailRequest(businessId)
            }}
            initialQuery={atlasInitialQuery}
            onInitialQueryConsumed={() => setAtlasInitialQuery(null)}
            businesses={atlasBusinesses}
            onTellMeMore={(text, businessId) => {
              setView('chat')
              handleSendMessage(text)
            }}
          />
        </div>
      )}
      
      {/* CHAT MODE: Regular chat interface */}
      {view === 'chat' && (
    <div ref={chatWrapperRef} className="flex flex-col max-w-4xl mx-auto" style={{ height: chatHeight }}>
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out both;
        }
      `}</style>
      
      {/* Toolbar -- Atlas + clear chat */}
      <div className="flex items-center justify-end gap-1 px-1 mb-2">
        {atlasEnabled && (
          <button
            onClick={() => {
              setAtlasEverOpened(true)
              setView('atlas')
              if (userLocation === null) {
                requestPermission()
              }
            }}
            className="p-2 text-[#00d083] hover:bg-[#00d083]/10 rounded-lg transition-colors flex items-center gap-1.5"
            title="Open Atlas"
          >
            <Map className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Atlas</span>
          </button>
        )}
        {messages.length > 1 && (
          <button
            onClick={handleClearChat}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
            title="New conversation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-slate-800/60">
        
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
          {processedMessages.map((message, messageIndex) => {
            // Only stream NEW messages (added after page load)
            // Messages loaded from sessionStorage should NOT re-stream
            const isNewMessage = messageIndex >= initialMessageCountRef.current
            const isLastAiMessage = message.type === 'ai' && messageIndex === processedMessages.length - 1
            const alreadyStreamed = streamingComplete.has(message.id)
            const skipStreaming = !isNewMessage || !isLastAiMessage || alreadyStreamed || message.needsLocation
            
            return (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                
                {/* Message Bubble */}
                <div className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-[#00d083]/20 text-slate-100 border border-[#00d083]/30'
                }`}>
                  {message.type === 'ai' ? (
                    <div
                      onClick={(e) => {
                        const target = e.target as HTMLElement
                        console.log('🖱️ Click detected on:', target.tagName, target.className)
                        if (target.classList.contains('business-link')) {
                          const businessName = target.getAttribute('data-business')
                          console.log('🏢 Business link clicked:', businessName)
                          if (businessName) {
                            handleBusinessClick(businessName)
                          }
                        }
                      }}
                    >
                      <StreamingText 
                        htmlContent={message.processedContent}
                        skipStreaming={skipStreaming}
                        onUpdate={() => {
                          // Scroll as streaming happens to keep text visible
                          if (!skipStreaming) {
                            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                          }
                        }}
                        onComplete={() => {
                          // Mark this message as streaming complete
                          setStreamingComplete(prev => new Set(prev).add(message.id))
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                
                {/* Location Permission CTA - Show when needsLocation is true */}
                {message.type === 'ai' && message.needsLocation && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl">
                    <p className="text-xs text-slate-300 mb-3">
                      {message.locationReason || 'I need your location to help you find the best places nearby'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await requestPermission()
                        }}
                        className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        📍 Use my location
                      </button>
                      <button
                        onClick={() => {
                          setPendingNearMeQuery(null)
                          handleSendMessage(`Show me options in ${tenantConfig?.city || 'the city centre'}`)
                        }}
                        className="flex-1 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border border-slate-600/50"
                      >
                        Show city centre
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Atlas CTA - inline at bottom of AI message */}
                {message.type === 'ai' && message.showAtlasCta && !message.needsLocation && atlasEnabled && streamingComplete.has(message.id) && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        if (lastBusinessQuery) {
                          setAtlasInitialQuery(lastBusinessQuery)
                        }
                        setAtlasEverOpened(true)
                        setView('atlas')
                      }}
                      className="w-full bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 border border-cyan-500/30 hover:border-cyan-400/50 text-cyan-300 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 group"
                    >
                      <Map className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>Explore on Qwikker Atlas</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {message.businessCarousel && message.businessCarousel.length > 0 && (
                  <div className="mt-3 -mx-2 sm:mx-0">
                    <BusinessCarousel 
                      businesses={message.businessCarousel}
                      currentUser={currentUser}
                      className="w-full"
                      onShowOffers={handleShowOffers}
                    />
                  </div>
                )}

                {/* Wallet Actions */}
                {message.walletActions && message.walletActions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-2 px-2">🎫 Add to wallet:</p>
                    <div className="flex flex-col gap-2">
                      {message.walletActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleAddToWallet(action.offerId, action.offerName, action.businessName)}
                          className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-[#00d083]/20 flex items-center justify-between group"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-semibold">{action.offerName}</span>
                            <span className="text-xs opacity-80">at {action.businessName}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs mr-2 opacity-80">Add to Wallet</span>
                            <svg className="w-4 h-4 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Cards -- shown after text finishes streaming */}
                {message.eventCards && message.eventCards.length > 0 && streamingComplete.has(message.id) && (
                  <div className="mt-3 -mx-2 sm:mx-0">
                    <EventCarousel 
                      events={message.eventCards}
                      currentUser={currentUser}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Simplified Quick Replies - Only show for AI messages and limit to 3 */}
                {message.type === 'ai' && message.quickReplies && message.quickReplies.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2 justify-start">
                      {message.quickReplies.slice(0, 3).map((reply, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickReply(reply)}
                          className="bg-slate-700/40 hover:bg-[#00d083]/20 text-slate-300 hover:text-[#00d083] px-3 py-1.5 rounded-full text-xs transition-all duration-200 border border-slate-600/30 hover:border-[#00d083]/50"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Timestamp */}
                <p className="text-xs text-slate-400 mt-2 px-2">
                  {new Date(message.timestamp).toLocaleTimeString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
            )
          })}
          
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#00d083] rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-slate-400 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-slate-800/60">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about restaurants, deals, menus..."
                className="w-full bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00d083]/40 text-sm resize-none min-h-[44px] max-h-32 transition-colors"
                disabled={isTyping}
                rows={1}
                style={{ height: 'auto', minHeight: '44px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px'
                }}
              />
            </div>
            <Button 
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {isTyping ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </Button>
          </div>
        </div>
        
      </div>
    </div>
      )}
    </>
  )
}