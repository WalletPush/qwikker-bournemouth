'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { SecretUnlockModal } from '@/components/ui/secret-unlock-modal'
import { useElegantModal } from '@/components/ui/elegant-modal'
import { AiCompanionCard } from '@/components/ui/ai-companion-card'
import { useSearchParams } from 'next/navigation'
import { getBadgeTracker } from '@/lib/utils/simple-badge-tracker'

interface RealSecretMenu {
  businessId: string
  businessName: string
  businessCategory: string
  businessAddress?: string
  businessPhone?: string
  businessImage?: string
  items: Array<{
    name: string
    description: string
    price?: string
    hint: string
    rarity: number
    pointsReward: number
    unlockMethods: Array<{
      type: string
      cost?: number
      description: string
    }>
    isReal: boolean
  }>
}

interface UserSecretMenuPageProps {
  realSecretMenus?: RealSecretMenu[]
  walletPassId?: string
  currentCity?: string
  cityDisplayName?: string
}

export function UserSecretMenuPage({ realSecretMenus = [], walletPassId, currentCity = 'bournemouth', cityDisplayName = 'Bournemouth' }: UserSecretMenuPageProps) {
  
  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set())
  const [secretModal, setSecretModal] = useState<{
    isOpen: boolean
    item: any
    business: any
  }>({ isOpen: false, item: null, business: null })
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null)
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  
  const searchParams = useSearchParams()
  const highlightBusiness = searchParams.get('highlight')
  const { showSuccess, ModalComponent } = useElegantModal()

  // Load from localStorage after component mounts to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userId = walletPassId || 'anonymous-user'
      const saved = localStorage.getItem(`qwikker-unlocked-secrets-${userId}`)
      if (saved) {
        setUnlockedItems(new Set(JSON.parse(saved)))
      }
    }
  }, [walletPassId])

  // Remove membership tiers - Qwikker is FREE for everyone!

  // Animation state for mysterious effects
  const [showSecrets, setShowSecrets] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSecrets(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // Use only real secret menus (no mock data)
  const allSecretMenus = realSecretMenus

  // ✅ NEW: Clean up stale localStorage entries when real menus load
  // This removes item IDs for items that no longer exist
  useEffect(() => {
    if (typeof window !== 'undefined' && realSecretMenus.length > 0 && unlockedItems.size > 0) {
      const userId = walletPassId || 'anonymous-user'
      
      // Filter out stale item IDs
      const validItemKeys = Array.from(unlockedItems).filter(itemKey => {
        return allSecretMenus.some(menu => 
          menu.items.some(item => {
            const currentItemKey = `${menu.businessId}-${item.name}`
            return currentItemKey === itemKey
          })
        )
      })
      
      // If we removed any stale entries, update localStorage
      if (validItemKeys.length !== unlockedItems.size) {
        localStorage.setItem(`qwikker-unlocked-secrets-${userId}`, JSON.stringify(validItemKeys))
        setUnlockedItems(new Set(validItemKeys))
        console.log(`🧹 Cleaned up ${unlockedItems.size - validItemKeys.length} stale localStorage entries`)
      }
    }
  }, [walletPassId, realSecretMenus, unlockedItems, allSecretMenus])

  // Handle QR deep linking auto-scroll and highlight for secret menus
  useEffect(() => {
    if (highlightBusiness) {
      const timer = setTimeout(() => {
        const businessSlug = highlightBusiness.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const targetCard = cardRefs.current[businessSlug]
        
        if (targetCard) {
          targetCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
          
          setHighlightedCard(businessSlug)
          
          setTimeout(() => {
            setHighlightedCard(null)
          }, 3000)
        }
      }, 800)
      
      return () => clearTimeout(timer)
    }
  }, [highlightBusiness, allSecretMenus])
  
  // Get unique categories from all businesses with secret menus
  const realCategories = realSecretMenus.map(menu => menu.businessCategory)
  const categories = ['all', ...Array.from(new Set(realCategories))]

  // Calculate counts including real secret menu items
  const totalSecretItems = allSecretMenus.reduce((acc, menu) => acc + menu.items.length, 0)
  // For now, assume all users can see legendary items (can be updated later)
  const legendaryCount = allSecretMenus.reduce((acc, menu) => acc + menu.items.filter(item => (item.rarity || 0) >= 5).length, 0)

  // ✅ FIX: Validate localStorage against real items (filter out stale/deleted items)
  // localStorage format: ["businessId-itemName", ...]
  // Only count items that actually exist in allSecretMenus
  const validUnlockedItems = Array.from(unlockedItems).filter(itemKey => {
    return allSecretMenus.some(menu => 
      menu.items.some(item => {
        const currentItemKey = `${menu.businessId}-${item.name}`
        return currentItemKey === itemKey
      })
    )
  })

  const filters = [
    { id: 'all', label: 'All Secrets', count: totalSecretItems },
    { id: 'unlocked', label: 'My Unlocked', count: validUnlockedItems.length }, // ✅ Now uses validated count
    { id: 'legendary', label: 'Legendary Items', count: legendaryCount },
  ]

  // Classy badge popup function
  const showBadgeEarnedPopup = (badgeName: string, reward?: string) => {
    const popup = document.createElement('div')
    popup.className = 'fixed top-4 right-4 z-50 bg-gradient-to-r from-slate-800 to-slate-700 border border-[#00d083]/50 rounded-xl p-4 shadow-2xl max-w-sm animate-slide-in'
    popup.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="p-2 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-lg">
          <svg class="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <div class="flex-1">
          <h4 class="text-slate-100 font-semibold text-sm">Badge Earned!</h4>
          <p class="text-slate-300 text-xs">${badgeName}</p>
          ${reward ? `<p class="text-[#00d083] text-xs font-medium mt-1">${reward}</p>` : ''}
          <Link href={getNavUrl("/user/badges")} className="text-[#00d083] text-xs hover:underline">View Badges →</Link>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-slate-300">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    `
    document.body.appendChild(popup)
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (popup.parentElement) {
        popup.remove()
      }
    }, 5000)
    
    // Add ESC key listener
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        popup.remove()
        document.removeEventListener('keydown', handleEsc)
      }
    }
    document.addEventListener('keydown', handleEsc)
  }

  const unlockSecretItem = async (businessId: string, itemName: string) => {
    const itemKey = `${businessId}-${itemName}`
    const newCount = unlockedItems.size + 1
    
    // Track in database if user is logged in
    if (walletPassId) {
      try {
        const { trackSecretUnlock } = await import('@/lib/actions/secret-unlock-actions')
        const result = await trackSecretUnlock({
          businessId,
          itemName,
          visitorWalletPassId: walletPassId
        })
        
        if (result.success) {
          console.log('🤫 ✅ Secret unlock tracked in database:', result.message)
        } else {
          console.error('🤫 ❌ Failed to track secret unlock:', result.error)
        }
      } catch (error) {
        console.error('🤫 ❌ Error calling trackSecretUnlock:', error)
      }
    }
    
    setUnlockedItems(prev => {
      const newUnlocked = new Set([...prev, itemKey])
      if (typeof window !== 'undefined') {
        const userId = walletPassId || 'anonymous-user'
        localStorage.setItem(`qwikker-unlocked-secrets-${userId}`, JSON.stringify([...newUnlocked]))
        
        // Track badge progress
        const badgeTracker = getBadgeTracker(walletPassId)
        badgeTracker.trackAction('secret_menu_unlocked')
      }
      return newUnlocked
    })
    
    // Check if this unlock triggers a badge (Secret Seeker badges are NOT paid rewards)
    if (newCount === 5) {
      showBadgeEarnedPopup('Secret Seeker', undefined) // No reward for secret menu badges
    } else if (newCount === 15) {
      showBadgeEarnedPopup('Secret Menu Explorer', undefined)
    } else if (newCount === 25) {
      showBadgeEarnedPopup('Secret Menu Master', undefined) // No paid reward
    }
  }

  const getFilteredSecretMenus = () => {
    let filtered = allSecretMenus

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(menu => menu.businessCategory === selectedCategory)
    }

    // Filter by type
    if (selectedFilter === 'unlocked') {
      // Show only unlocked items - filter items within each menu
      filtered = filtered.map(menu => ({
        ...menu,
        items: menu.items.filter(item => {
          const itemKey = `${menu.businessId}-${item.name}`
          return unlockedItems.has(itemKey)
        })
      })).filter(menu => menu.items.length > 0)
    } else if (selectedFilter === 'legendary') {
      // Show legendary items to all users (can be restricted later)
      filtered = filtered.map(menu => ({
        ...menu,
        items: menu.items.filter(item => (item.rarity || 0) >= 5)
      })).filter(menu => menu.items.length > 0)
    }

    return filtered
  }

  // Qwikker is FREE - no membership tiers needed!

  const SecretMenuItem = ({ menu, item, business }: { menu: any, item: any, business: any }) => {
    const itemKey = `${menu.businessId}-${item.name}`
    const isUnlocked = unlockedItems.has(itemKey)
    
    // Check if item requires specific badge
    const requiredBadge = item.requiredBadge // e.g., "secret_seeker", "deal_hunter"
    // For now, assume no badge requirements (can be updated later with real user data)
    const userBadges = []
    const canUnlock = !requiredBadge || userBadges.includes(requiredBadge)
    const isLocked = !canUnlock && !isUnlocked
    
    // Determine if this is a real business item
    const isRealItem = item.isReal || false
    
    return (
      <Card 
        className={`relative overflow-hidden transition-all duration-500 hover:scale-105 cursor-pointer ${
          isUnlocked 
            ? 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/50 shadow-purple-500/20' 
            : isLocked
            ? 'bg-gradient-to-br from-red-900/20 to-red-800/20 border-red-700/50'
            : 'bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50'
        } ${showSecrets ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        onClick={() => {
          if (!isLocked) {
            setSecretModal({
              isOpen: true,
              item,
              business
            })
          }
        }}
      >
        
        {/* Mysterious Glow Effect */}
        {isUnlocked && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 animate-pulse"></div>
        )}
        
        {/* Top badges row */}
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex justify-between items-start z-10">
          {/* Rarity Badge - Only for Spotlight subscribers */}
          {(item.rarity || 0) >= 5 && (
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-bold shadow-lg">
              LEGENDARY
            </span>
          )}
          
          {/* Lock/Unlock Status */}
          <div className="ml-auto">
            {isUnlocked ? (
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
            ) : (
              <div className="p-1.5 sm:p-2 bg-slate-700/80 rounded-full">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            )}
          </div>
        </div>


        <CardHeader className="pb-2 sm:pb-3 pt-10 sm:pt-12 px-3 sm:px-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className={`text-base sm:text-lg mb-1.5 sm:mb-2 transition-all duration-300 ${
                isUnlocked 
                  ? 'text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text' 
                  : 'text-slate-300'
              }`}>
                {isUnlocked ? item.name : '• • • • • • • •'}
              </CardTitle>
              <p className="text-xs sm:text-sm text-slate-400 mb-0.5 sm:mb-1">{business?.name}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">{business?.category}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
          {/* Item Description */}
          <div className={`transition-all duration-500 ${isUnlocked ? 'opacity-100' : 'opacity-30'}`}>
            <p className={`text-xs sm:text-sm leading-relaxed ${isUnlocked ? 'text-slate-300' : 'text-gray-500 blur-sm'}`}>
              {isUnlocked ? item.description : 'Unlock this secret to reveal the mysterious description...'}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className={`font-bold text-base sm:text-lg ${
              isUnlocked 
                ? 'text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text' 
                : 'text-gray-500'
            }`}>
              {isUnlocked ? item.price : '£??'}
            </span>
            
            {/* Difficulty/Rarity */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {Array.from({ length: item.rarity || 3 }).map((_, i) => (
                <svg key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>

          {/* Status and Action */}
          <div className="space-y-1.5 sm:space-y-2">
            {isLocked ? (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2.5 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5 sm:mb-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-red-300 font-semibold text-xs sm:text-sm">Badge Required</span>
                </div>
                <p className="text-red-200 text-xs sm:text-sm">
                  Earn the "{requiredBadge?.replace('_', ' ')}" badge to unlock this secret
                </p>
              </div>
            ) : !isUnlocked ? (
              <Button 
                onClick={(e) => {
                  e.stopPropagation()
                  unlockSecretItem(menu.businessId, item.name)
                  showSuccess(
                    'Secret Unlocked!',
                    `"${item.name}" has been added to your collection. Click the card to see how to order it.`
                  )
                }}
                className="w-full h-[44px] text-sm sm:text-base bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-bold shadow-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Unlock Secret Item (Free!)
              </Button>
            ) : (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-2.5 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-0.5 sm:mb-1">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-purple-300 font-semibold text-xs sm:text-sm">Unlocked!</span>
                </div>
                <p className="text-purple-200 text-[10px] sm:text-sm">Click card for ordering info</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 relative">
      {/* Mysterious Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-pink-900/5 pointer-events-none"></div>
      <div className="fixed top-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse pointer-events-none"></div>

      {/* Page Header - Clean and Aligned */}
      <div className="text-center relative">
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">
          Secret Menu Club
        </h1>
        <p className="text-xl text-slate-300 mb-2">
          Unlock {cityDisplayName}'s most guarded culinary secrets
        </p>
        <p className="text-slate-400 max-w-2xl mx-auto">
          These exclusive off-menu items are known only to insiders. Each secret tells a story, 
          each dish holds mystery. Start your culinary adventure!
        </p>
      </div>

      {/* Stats Dashboard - Dark & Mysterious */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all duration-200 text-center p-4 hover:scale-105 ${
            selectedFilter === 'all' 
              ? 'bg-gradient-to-br from-purple-900/40 to-purple-800/40 border-purple-500/50 ring-2 ring-purple-400/30' 
              : 'bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/30 hover:border-purple-600/50'
          }`}
          onClick={() => setSelectedFilter('all')}
        >
          <div className="flex flex-col items-center">
            <div className="mb-2">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-purple-400 mb-1">{totalSecretItems}</p>
            <p className="text-sm text-slate-400">All Secrets</p>
          </div>
        </Card>
        <Card 
          className={`cursor-pointer transition-all duration-200 text-center p-4 hover:scale-105 ${
            selectedFilter === 'unlocked' 
              ? 'bg-gradient-to-br from-pink-900/40 to-pink-800/40 border-pink-500/50 ring-2 ring-pink-400/30' 
              : 'bg-gradient-to-br from-pink-900/20 to-pink-800/20 border-pink-700/30 hover:border-pink-600/50'
          }`}
          onClick={() => setSelectedFilter('unlocked')}
        >
          <div className="flex flex-col items-center">
            <div className="mb-2">
              <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.414-6.414A6 6 0 0121 9z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-pink-400 mb-1">{Array.from(unlockedItems).length}</p>
            <p className="text-sm text-slate-400">My Unlocked</p>
          </div>
        </Card>
        <Card 
          className={`cursor-pointer transition-all duration-200 text-center p-4 hover:scale-105 ${
            selectedFilter === 'legendary' 
              ? 'bg-gradient-to-br from-yellow-900/40 to-yellow-800/40 border-yellow-500/50 ring-2 ring-yellow-400/30' 
              : 'bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border-yellow-700/30 hover:border-yellow-600/50'
          }`}
          onClick={() => setSelectedFilter('legendary')}
        >
          <div className="flex flex-col items-center">
            <div className="mb-2">
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-yellow-400 mb-1">{legendaryCount}</p>
            <p className="text-sm text-slate-400">Legendary Items</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/20 border-emerald-700/30 text-center p-4">
          <div className="flex flex-col items-center">
            <div className="mb-2">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-emerald-400 mb-1">
              {Array.from(unlockedItems).length} / {totalSecretItems}
            </p>
            <p className="text-sm text-slate-400">Secrets Unlocked</p>
          </div>
        </Card>
      </div>

      {/* AI Companion Card - Replace Category Filter */}
      <div className="mb-4">
        <AiCompanionCard 
          title="Unlock Hidden Culinary Secrets"
          description="Our AI knows every secret menu item in the city! Ask about off-menu dishes, hidden specialties, or get personalized recommendations based on your taste."
          prompts={[
            "What secret items does The Seaside Bistro have?",
            "Find me hidden desserts I can unlock", 
            "Show me legendary secret menu items"
          ]}
          walletPassId={walletPassId}
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2">
        <span className="text-slate-400 text-sm mr-2">Filter by venue type:</span>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-slate-100'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600 border border-slate-600'
            }`}
          >
            {category === 'all' ? 'All Venues' : category}
          </button>
        ))}
      </div>

      {/* Secret Menu Items - Grouped by Business */}
      <div className="space-y-8">
        {getFilteredSecretMenus().map((menu) => {
          // Create business object from menu data
          const business = {
            id: menu.businessId,
            name: menu.businessName,
            category: menu.businessCategory,
            address: menu.businessAddress,
            phone: menu.businessPhone,
            image: menu.businessImage
          }
          
          const businessSlug = business?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || menu.businessId
          const isHighlighted = highlightedCard === businessSlug
          
          return (
            <Card 
              key={menu.businessId}
              ref={(el) => { cardRefs.current[businessSlug] = el }}
              className={`bg-gradient-to-br from-slate-900/60 to-slate-800/40 border-slate-700/50 transition-all duration-300 ${
                isHighlighted 
                  ? 'qr-highlight ring-4 ring-[#00d083]/60 shadow-2xl shadow-[#00d083]/20 scale-105 border-[#00d083]/50' 
                  : ''
              }`}
            >
              {/* Business Header */}
              <CardHeader className="pb-3 sm:pb-4 pt-3 sm:pt-6 px-3 sm:px-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  {business?.image && (
                    <img 
                      src={business.image} 
                      alt={business.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-purple-500/30"
                    />
                  )}
                  <div>
                    <CardTitle className="text-base sm:text-xl text-slate-100 mb-1">
                      {business?.name || 'Unknown Business'}
                    </CardTitle>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      {business?.category} • Secret Menu Collection
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              {/* Secret Items Grid */}
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {menu.items.map((item: any, index: number) => (
                    <SecretMenuItem 
                      key={`${menu.businessId}-${item.name}-${index}`} 
                      menu={menu} 
                      item={item} 
                      business={business}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Free Discovery Encouragement */}
      <Card className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-700/30 text-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-teal-500/5 animate-pulse"></div>
        <div className="relative">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-emerald-400">Keep Exploring!</h3>
          </div>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Every secret you unlock brings you closer to becoming a true {cityDisplayName} foodie insider. 
            Chat with our AI to discover more hidden gems and get personalized recommendations!
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-bold px-6 py-3">
              <Link href={getNavUrl("/user/chat")}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat with AI Guide
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 px-6 py-3">
              <Link href={getNavUrl("/user/discover")}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Discover More Places
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Elegant Modals */}
      <ModalComponent />
      
      <SecretUnlockModal
        isOpen={secretModal.isOpen}
        onClose={() => setSecretModal({ isOpen: false, item: null, business: null })}
        item={secretModal.item || { name: '', description: '' }}
        business={secretModal.business || { name: '', address: '', phone: '' }}
      />
    </div>
  )
}
