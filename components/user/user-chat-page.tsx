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
import { useRouter, useSearchParams } from 'next/navigation'
import { Map } from 'lucide-react'
import {
  activateOffer,
  createPendingRedeem,
  isPendingRedeemValid,
  isRedeemConfirmPhrase,
  markOfferSavedLocally,
  redeemWarningCopy,
  redeemWorkingCopy,
  redeemSuccessCopy,
  saveOffer,
  saveSuccessCopy,
  type PendingRedeemAction,
} from '@/lib/offers/client-save-redeem'

function slugifyBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface ChatWalletAction {
  type: 'save_offer'
  offerId: string
  offerName: string
  offerDescription?: string | null
  offerValue?: string | null
  offerImage?: string | null
  businessName: string
  businessId: string
  businessSlug?: string | null
  activationWindowMinutes?: number
}

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
    slug?: string
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
  walletActions?: ChatWalletAction[]
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
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  // Chat business links only — show "Opening…" while the listing loads
  const [openingBusiness, setOpeningBusiness] = useState<string | null>(null)
  const openingLockRef = useRef(false)
  const [pendingRedeem, setPendingRedeem] = useState<PendingRedeemAction | null>(null)
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(new Set())
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const chatWrapperRef = useRef<HTMLDivElement>(null)
  const [chatHeight, setChatHeight] = useState<string>('80dvh')

  // Persistent session ID for chat_messages grouping
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())
  
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

  // Generate a welcome message (not persisted — client-side only)
  const buildWelcomeMessage = (): ChatMessage => {
    const userName = currentUser?.name?.split(' ')[0] || null
    const greetings = userName ? [
      `Hey ${userName}! Looking for something tasty in ${cityDisplayName}? I've got the inside scoop on great restaurants, exclusive offers, and secret menus!`,
      `${userName}! Ready to discover ${cityDisplayName}'s best spots? I can show you top-rated restaurants, unbeatable deals, and hidden gems!`,
      `Alright ${userName}, what's the vibe? Looking for food, drinks, or just somewhere new to explore in ${cityDisplayName}?`,
      `Hey ${userName}! Whether you're after a quick bite, a proper meal, or the best deals in town — I've got you covered!`,
      `${userName}! Let's find you something brilliant. Restaurants, offers, secret menus — what are you in the mood for?`
    ] : [
      `Hey! Looking for something tasty in ${cityDisplayName}? I've got the inside scoop on great restaurants, exclusive offers, and secret menus!`,
      `Ready to discover ${cityDisplayName}'s best spots? I can show you top-rated restaurants, unbeatable deals, and hidden gems!`,
      `Alright, what's the vibe? Looking for food, drinks, or just somewhere new to explore in ${cityDisplayName}?`,
      `Whether you're after a quick bite, a proper meal, or the best deals in town — I've got you covered!`,
      `Let's find you something brilliant. Restaurants, offers, secret menus — what are you in the mood for?`
    ]
    return {
      id: Date.now().toString(),
      type: 'ai',
      content: greetings[Math.floor(Math.random() * greetings.length)],
      timestamp: new Date().toISOString(),
      quickReplies: ["Show me Qwikker Picks", "Find restaurants", "Current deals"],
    }
  }

  // Load chat history from API (persisted) or show fresh welcome message
  useEffect(() => {
    const walletPassId = currentUser?.wallet_pass_id
    if (!walletPassId) {
      // Guest — show welcome message, no persistence
      const welcome = buildWelcomeMessage()
      setMessages([welcome])
      initialMessageCountRef.current = 1
      return
    }

    let cancelled = false

    async function loadHistory() {
      try {
        const res = await fetch(`/api/user/chat-history?walletPassId=${encodeURIComponent(walletPassId)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        if (cancelled) return

        if (data.sessionId) setSessionId(data.sessionId)

        if (data.messages && data.messages.length > 0) {
          console.log('Restoring chat session with', data.messages.length, 'messages')
          setMessages(data.messages)
          initialMessageCountRef.current = data.messages.length
        } else {
          const welcome = buildWelcomeMessage()
          setMessages([welcome])
          initialMessageCountRef.current = 1
        }
      } catch (err) {
        console.error('[chat-history] Failed to load — starting fresh:', err)
        if (!cancelled) {
          const welcome = buildWelcomeMessage()
          setMessages([welcome])
          initialMessageCountRef.current = 1
        }
      }
    }

    loadHistory()
    return () => { cancelled = true }
  }, [currentUser?.wallet_pass_id])

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

  const appendAiMessage = (content: string, extras?: Partial<ChatMessage>) => {
    const aiMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'ai',
      content,
      timestamp: new Date().toISOString(),
      ...extras,
    }
    setMessages((prev) => [...prev, aiMessage])
  }

  const handleConfirmRedeem = async (pending: PendingRedeemAction, confirmReplace = false) => {
    const walletPassId = currentUser?.wallet_pass_id
    if (!walletPassId || walletPassId.length < 10) {
      appendAiMessage('Add your Qwikker pass first to redeem offers.')
      return
    }

    setBusyOfferId(pending.offerId)
    appendAiMessage(redeemWorkingCopy(pending.offerName))

    try {
      const result = await activateOffer({
        walletPassId,
        offerId: pending.offerId,
        source: 'chat',
        confirmReplace,
      })

      if (!result.success && result.needsReplace) {
        const ok = window.confirm(
          `You already have an active offer at ${result.active.business_name || 'another venue'} with about ${result.active.minutes_left ?? '?'} minutes left. Activating this will end it. Continue?`
        )
        if (ok) {
          await handleConfirmRedeem(pending, true)
        } else {
          setPendingRedeem(null)
          appendAiMessage('Okay — left your current Wallet offer as-is.')
        }
        return
      }

      if (!result.success) {
        setPendingRedeem(null)
        appendAiMessage(
          `Sorry — I couldn’t put that on your Wallet. ${result.error || 'Please try again.'}`,
          { quickReplies: ['Try again', 'Open Offers page'] }
        )
        return
      }

      setPendingRedeem(null)
      markOfferSavedLocally(walletPassId, pending.offerId)
      setSavedOfferIds((prev) => new Set([...prev, pending.offerId]))
      appendAiMessage(redeemSuccessCopy(pending.offerName), {
        quickReplies: ['Open Offers page'],
      })
    } catch (error) {
      console.error('❌ Redeem error:', error)
      setPendingRedeem(null)
      appendAiMessage('Something went wrong redeeming that offer. Try again in a moment.', {
        quickReplies: ['Try again', 'Open Offers page'],
      })
    } finally {
      setBusyOfferId(null)
    }
  }

  const lastOfferAction = (): ChatWalletAction | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const actions = messages[i].walletActions
      if (actions && actions.length > 0) return actions[0]
    }
    if (pendingRedeem) {
      return {
        type: 'save_offer',
        offerId: pendingRedeem.offerId,
        offerName: pendingRedeem.offerName,
        businessName: pendingRedeem.businessName,
        businessId: '',
        activationWindowMinutes: pendingRedeem.windowMins,
      }
    }
    return null
  }

  const handleSaveOffer = async (action: ChatWalletAction) => {
    const walletPassId = currentUser?.wallet_pass_id
    if (!walletPassId || walletPassId.length < 10) {
      appendAiMessage('Add your Qwikker pass first to save offers.')
      return
    }

    setBusyOfferId(action.offerId)
    setSavedOfferIds((prev) => new Set([...prev, action.offerId]))
    markOfferSavedLocally(walletPassId, action.offerId)

    try {
      const result = await saveOffer({
        walletPassId,
        offerId: action.offerId,
        source: 'chat',
      })
      if (!result.success) {
        console.warn('Save offer API:', result.error)
      }
      setPendingRedeem(null)
      appendAiMessage(saveSuccessCopy(action.offerName), {
        // Card already has Redeem — keep nav chips only (avoids AI “can’t redeem” prose)
        quickReplies: ['View this offer', 'Open business page', 'Open Offers page'],
        walletActions: [{ ...action, type: 'save_offer' }],
      })
    } finally {
      setBusyOfferId(null)
    }
  }

  const handleStartRedeem = (action: ChatWalletAction) => {
    const windowMins = action.activationWindowMinutes || 60
    const pending = createPendingRedeem({
      offerId: action.offerId,
      offerName: action.offerName,
      businessName: action.businessName,
      windowMins,
    })
    setPendingRedeem(pending)
    appendAiMessage(redeemWarningCopy(action.offerName, windowMins), {
      quickReplies: ['Yes, redeem', 'Not now'],
    })
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isTyping) return

    // Never let Redeem / "redeem now" hit the AI prose path
    if (
      /^(redeem(\s+now)?|yes[,]?\s*redeem|confirm redeem)[\s!.]*$/i.test(message.trim()) ||
      /\bredeem(\s+now)?\b/i.test(message.trim()) && message.trim().split(/\s+/).length <= 4
    ) {
      const action = lastOfferAction()
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputValue('')

      if (isPendingRedeemValid(pendingRedeem) && isRedeemConfirmPhrase(message)) {
        await handleConfirmRedeem(pendingRedeem)
        return
      }
      if (action) {
        handleStartRedeem(action)
        return
      }
      appendAiMessage(
        'I can redeem offers right here — tap **Redeem** on a saved deal card first, or I can list a few.',
        { quickReplies: ['List a few', 'Open Offers page'] }
      )
      return
    }

    // "Can I save it?" with a bound card from chat → Save immediately
    if (/\b(save (it|this|that)|can i save|how (do i|to) save)\b/i.test(message)) {
      const action = lastOfferAction()
      if (action) {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, userMessage])
        setInputValue('')
        await handleSaveOffer(action)
        return
      }
      // No card yet — keep user's words in the bubble, but ask API for deal cards
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      setPendingRedeem(null)
      setIsTyping(true)
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'List a few deals',
            walletPassId: currentUser?.wallet_pass_id,
            city: currentCity,
            conversationHistory: [...messagesRef.current, userMessage]
              .filter((m) => !m.content?.startsWith('__qwikker_'))
              .slice(-8)
              .map((msg) => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content,
              })),
            userLocation:
              locationStatus === 'granted' && userLocation ? userLocation : null,
            sessionId,
          }),
        })
        const data = await response.json()
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content:
            data.response ||
            'Here are a few deals you can Save — tap Save on the card you want:',
          timestamp: new Date().toISOString(),
          quickReplies: data.quickReplies || ['Open Offers page'],
          walletActions: data.walletActions,
        }
        setMessages((prev) => [...prev, aiMessage])
      } catch (error) {
        console.error('❌ Save-intent deal fetch error:', error)
        appendAiMessage(
          'I can save offers here — tap Save on a deal card. Want me to list a few?',
          { quickReplies: ['List a few', 'Open Offers page'] }
        )
      } finally {
        setIsTyping(false)
      }
      return
    }

    // Bound confirm: typed "yes" only redeems when pending redeem is valid
    if (isRedeemConfirmPhrase(message) && isPendingRedeemValid(pendingRedeem)) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      await handleConfirmRedeem(pendingRedeem)
      return
    }

    // Explicit dismiss of pending redeem
    if (
      isPendingRedeemValid(pendingRedeem) &&
      /^(no|nope|not now|cancel|never ?mind)[\s!.]*$/i.test(message.trim())
    ) {
      setPendingRedeem(null)
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      appendAiMessage('No problem — nothing was added to your Wallet.')
      return
    }

    // New topic clears any pending redeem context
    setPendingRedeem(null)

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
          city: currentCity,
          conversationHistory: fullConversationHistory,
          userLocation: locationStatus === 'granted' && userLocation ? userLocation : null,
          sessionId,
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
  // (used by onRequestDetails — not Tell me more, which uses named chat)
  const fetchBusinessDetail = async (businessId: string) => {
    console.log(`🔍 Fetching business detail for ID: ${businessId}`)
    setIsTyping(true)
    
    try {
      const recentHistory = messagesRef.current
        .filter(m => !m.content?.startsWith('__qwikker_'))
        .slice(-6)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `__qwikker_business_detail__:${businessId}`,
          walletPassId: currentUser?.wallet_pass_id,
          city: currentCity,
          conversationHistory: recentHistory,
          userLocation: locationStatus === 'granted' && userLocation ? userLocation : null,
          sessionId,
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
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
          city: currentCity,
          conversationHistory: messages.slice(-4).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          sessionId,
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
        quickReplies: ['List a few', 'Tell me more', 'Show other businesses']
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

  const handleQuickReply = (reply: string) => {
    const normalized = reply.trim().toLowerCase()

    // Chip label is short; send an offer-hard-path phrase so we never continue Splash/detail chat
    if (normalized === 'list a few' || normalized === 'show more deals') {
      handleSendMessage('List a few deals')
      return
    }

    if (normalized === 'open offers page' || normalized === 'view all offers') {
      router.push(withWalletPass('/user/offers'))
      return
    }
    if (normalized === 'open discover') {
      router.push(withWalletPass('/user/dashboard'))
      return
    }
    if (normalized === 'yes, redeem' || normalized === 'yes redeem') {
      if (isPendingRedeemValid(pendingRedeem)) {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: reply,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, userMessage])
        void handleConfirmRedeem(pendingRedeem)
        return
      }
      appendAiMessage('Tap Redeem on a specific offer first — I won’t activate a random deal.')
      return
    }
    if (normalized === 'not now') {
      setPendingRedeem(null)
      appendAiMessage('No problem — nothing was added to your Wallet.')
      return
    }
    if (normalized === 'redeem now' || normalized === 'redeem') {
      const action = lastOfferAction()
      if (action) {
        handleStartRedeem(action)
        return
      }
      handleSendMessage('List a few deals')
      return
    }
    if (normalized === 'view this offer') {
      const action = lastOfferAction()
      if (action) {
        router.push(withWalletPass(`/user/offers?highlight=${action.offerId}`))
        return
      }
      router.push(withWalletPass('/user/offers'))
      return
    }
    if (normalized === 'open business page') {
      const action = lastOfferAction()
      if (action) {
        const slug = action.businessSlug || slugifyBusinessName(action.businessName)
        navigateToBusinessHref(`/user/business/${slug}`, action.businessName)
        return
      }
      appendAiMessage('Which business should I open? Name one and I’ll take you there.')
      return
    }

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

  const withWalletPass = (href: string) => {
    if (!currentUser?.wallet_pass_id || href.includes('wallet_pass_id=')) return href
    const join = href.includes('?') ? '&' : '?'
    return `${href}${join}wallet_pass_id=${currentUser.wallet_pass_id}`
  }

  // Soft-navigate — chat links get "Opening…" (tap flash left to CSS :active on the link)
  const navigateToBusinessHref = (href: string, label?: string, _tapEl?: HTMLElement | null) => {
    if (openingLockRef.current) return
    openingLockRef.current = true

    const url = withWalletPass(href)
    const nameFromPath = decodeURIComponent(href.split('/user/business/')[1]?.split('?')[0] || '')
      .replace(/-/g, ' ')
    const display = label || nameFromPath || 'listing'

    setOpeningBusiness(display)
    router.prefetch(url)
    router.push(url)

    window.setTimeout(() => {
      openingLockRef.current = false
      setOpeningBusiness(null)
    }, 8000)
  }

  const handleBusinessClick = (businessName: string, tapEl?: HTMLElement | null) => {
    const slug = slugifyBusinessName(businessName)
    navigateToBusinessHref(`/user/business/${slug}`, businessName, tapEl)
  }

  const handleMessageInteraction = (e: React.MouseEvent | React.PointerEvent) => {
    const target = e.target as HTMLElement

    const businessLink = target.closest('.business-link') as HTMLElement | null
    if (businessLink) {
      const businessName = businessLink.getAttribute('data-business')
      if (!businessName) return
      if (e.type === 'click') {
        e.preventDefault()
        handleBusinessClick(businessName, businessLink)
      } else if (e.type === 'pointerdown' || e.type === 'mouseover') {
        router.prefetch(withWalletPass(`/user/business/${slugifyBusinessName(businessName)}`))
      }
      return
    }

    const anchor = target.closest('a') as HTMLAnchorElement | null
    if (!anchor) return
    const href = anchor.getAttribute('href') || ''
    if (!href.startsWith('/user/business/')) return

    if (e.type === 'click') {
      e.preventDefault()
      const label = (anchor.textContent || '').trim() || undefined
      navigateToBusinessHref(href, label, anchor)
    } else if (e.type === 'pointerdown' || e.type === 'mouseover') {
      router.prefetch(withWalletPass(href))
    }
  }

  // Start a new chat — fresh sessionId, fresh welcome message
  const handleClearChat = () => {
    setSessionId(crypto.randomUUID())
    const welcome = buildWelcomeMessage()
    setMessages([welcome])
    initialMessageCountRef.current = 1
    setStreamingComplete(new Set())
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
            onTellMeMore={(text) => {
              setView('chat')
              // Named chat path — same as typing "Tell me about X". The ID detail
              // path (__qwikker_business_detail__) only hits paid Tier-1 views and
              // falsely says unclaimed imports aren't on Qwikker.
              handleSendMessage(text)
            }}
          />
        </div>
      )}
      
      {/* CHAT MODE: Regular chat interface */}
      {view === 'chat' && (
    <div ref={chatWrapperRef} className="relative flex flex-col max-w-4xl mx-auto" style={{ height: chatHeight }}>
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
        :global(.business-link),
        :global(a[href^="/user/business/"]) {
          -webkit-tap-highlight-color: transparent;
          transition: filter 0.1s ease, opacity 0.1s ease;
        }
        :global(.business-link:active),
        :global(a[href^="/user/business/"]:active) {
          filter: brightness(1.15);
          opacity: 0.9;
        }
      `}</style>

      {openingBusiness && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="mx-6 flex items-center gap-3 rounded-2xl border border-[#00d083]/35 bg-slate-900/95 px-5 py-4 shadow-xl shadow-black/40">
            <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[#00d083]/30 border-t-[#00d083] animate-spin" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">Opening {openingBusiness}</p>
              <p className="text-xs text-slate-400 mt-0.5">One moment…</p>
            </div>
          </div>
        </div>
      )}

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
            // Messages loaded from API should NOT re-stream
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
                      onClick={handleMessageInteraction}
                      onPointerDown={handleMessageInteraction}
                      onMouseOver={handleMessageInteraction}
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

                {/* Offer cards — Save → Redeem (compact, with thumbnail when present) */}
                {message.walletActions && message.walletActions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.walletActions.slice(0, 3).map((action) => {
                      const isSaved = savedOfferIds.has(action.offerId)
                      const isBusy = busyOfferId === action.offerId
                      const slug = action.businessSlug || slugifyBusinessName(action.businessName)
                      return (
                        <div
                          key={action.offerId}
                          className="rounded-xl border border-slate-600/50 bg-slate-800/70 overflow-hidden"
                        >
                          <div className="flex gap-3 p-3">
                            {action.offerImage ? (
                              <img
                                src={action.offerImage}
                                alt=""
                                className="w-14 h-14 rounded-lg object-cover border border-slate-600/60 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-slate-700/80 border border-slate-600/60 shrink-0 flex items-center justify-center text-slate-500 text-xs">
                                Deal
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-100 line-clamp-2">{action.offerName}</p>
                              <p className="text-xs text-slate-400 truncate">{action.businessName}</p>
                              {action.offerValue && (
                                <p className="text-xs text-emerald-400 mt-0.5">{action.offerValue}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 px-3 pb-3">
                            {!isSaved ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleSaveOffer(action)}
                                className="flex-1 min-w-[5.5rem] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold py-2 px-3 rounded-lg"
                              >
                                {isBusy ? 'Saving…' : 'Save'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleStartRedeem(action)}
                                className="flex-1 min-w-[5.5rem] bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-xs font-semibold py-2 px-3 rounded-lg"
                              >
                                Redeem
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                router.push(withWalletPass(`/user/offers?highlight=${action.offerId}`))
                              }
                              className="text-xs text-slate-300 hover:text-[#00d083] border border-slate-600/50 px-3 py-2 rounded-lg"
                            >
                              View offer
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigateToBusinessHref(`/user/business/${slug}`, action.businessName)
                              }
                              className="text-xs text-slate-300 hover:text-[#00d083] border border-slate-600/50 px-3 py-2 rounded-lg"
                            >
                              Business
                            </button>
                          </div>
                        </div>
                      )
                    })}
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
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Qwikker..."
                className="w-full h-12 box-border bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00d083]/40 text-sm leading-none"
                disabled={isTyping}
                enterKeyHint="send"
                autoComplete="off"
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