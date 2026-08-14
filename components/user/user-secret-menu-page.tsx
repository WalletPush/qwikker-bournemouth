'use client'

import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef } from 'react'
import { SecretUnlockModal } from '@/components/ui/secret-unlock-modal'
import { useSearchParams } from 'next/navigation'
import { getBadgeTracker } from '@/lib/utils/simple-badge-tracker'
import { getClientCityFallback, getCityDisplayName as getClientCityDisplayName } from '@/lib/utils/client-city-detection'

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
    image_url?: string
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

export function UserSecretMenuPage({ realSecretMenus = [], walletPassId, currentCity: currentCityProp, cityDisplayName: cityDisplayNameProp }: UserSecretMenuPageProps) {
  const currentCity = currentCityProp || getClientCityFallback()
  const cityDisplayName = cityDisplayNameProp || getClientCityDisplayName(currentCity)
  
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set())
  const [secretModal, setSecretModal] = useState<{
    isOpen: boolean
    item: any
    business: any
    badgeEarned?: string | null
  }>({ isOpen: false, item: null, business: null, badgeEarned: null })
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null)
  const [expandedBusinessIds, setExpandedBusinessIds] = useState<Set<string>>(new Set())
  const cardRefs = useRef<{ [key: string]: HTMLElement | null }>({})
  
  const searchParams = useSearchParams()
  const highlightBusiness = searchParams.get('highlight')

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
          // Expand matching venue so deep links land on visible secrets
          const match = allSecretMenus.find((menu) => {
            const slug = menu.businessName?.toLowerCase().replace(/[^a-z0-9]/g, '-') || menu.businessId
            return slug === businessSlug
          })
          if (match) {
            setExpandedBusinessIds((prev) => new Set([...prev, match.businessId]))
          }

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

  const unlockSecretItem = async (
    businessId: string,
    itemName: string,
    item: any,
    business: any
  ) => {
    const itemKey = `${businessId}-${itemName}`
    
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

    let badgeEarned: string | null = null
    if (typeof window !== 'undefined') {
      const userId = walletPassId || 'anonymous-user'
      const next = new Set([...unlockedItems, itemKey])
      localStorage.setItem(`qwikker-unlocked-secrets-${userId}`, JSON.stringify([...next]))
      // Silent badge award — chip inside unlock sheet, not a second toast
      const earned = getBadgeTracker(walletPassId).trackAction('secret_menu_unlocked', undefined, {
        notify: false,
      })
      badgeEarned = earned[0] || null
      setUnlockedItems(next)
    } else {
      setUnlockedItems(prev => new Set([...prev, itemKey]))
    }

    // One surface: how-to-order sheet
    setSecretModal({ isOpen: true, item, business, badgeEarned })
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
    const requiredBadge = item.requiredBadge
    const userBadges: string[] = []
    const canUnlock = !requiredBadge || userBadges.includes(requiredBadge)
    const isLocked = !canUnlock && !isUnlocked
    const coverImage = item.image_url || business?.image || null

    return (
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
          isUnlocked
            ? 'border-[#00d083]/40 bg-zinc-950'
            : 'border-zinc-800 bg-zinc-950'
        } ${showSecrets ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        onClick={() => {
          if (!isLocked && isUnlocked) {
            setSecretModal({ isOpen: true, item, business })
          }
        }}
      >
        <div className="relative h-44 sm:h-52 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                isUnlocked ? '' : 'scale-110 blur-md brightness-[0.45]'
              }`}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
          )}
          {!isUnlocked && <div className="absolute inset-0 bg-black/30" />}

          <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
            {(item.rarity || 0) >= 5 && (
              <span className="bg-amber-400 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">
                LEGENDARY
              </span>
            )}
            <div className="ml-auto rounded-full bg-black/55 border border-white/10 p-2">
              {isUnlocked ? (
                <svg className="w-3.5 h-3.5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <p className={`font-semibold text-sm ${isUnlocked ? 'text-white' : 'text-zinc-200 tracking-widest'}`}>
              {isUnlocked ? item.name : '••••••••'}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isUnlocked ? (item.price || 'Ask for price') : '£??'}
            </p>
          </div>
        </div>

        <div className="p-3 space-y-3">
          <p className={`text-xs leading-relaxed line-clamp-2 ${isUnlocked ? 'text-zinc-300' : 'text-zinc-500'}`}>
            {isUnlocked ? item.description : 'Unlock to reveal this off-menu item.'}
          </p>

          {isLocked ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-center">
              <p className="text-red-300 text-xs font-medium">Badge required to unlock</p>
            </div>
          ) : !isUnlocked ? (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                unlockSecretItem(menu.businessId, item.name, item, business)
              }}
              className="w-full h-11 text-sm bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold"
            >
              Unlock secret
            </Button>
          ) : (
            <button
              type="button"
              className="w-full h-11 text-sm rounded-xl border border-zinc-700 text-zinc-200 font-medium hover:bg-zinc-900"
              onClick={(e) => {
                e.stopPropagation()
                setSecretModal({ isOpen: true, item, business })
              }}
            >
              How to order
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 relative max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Secret Menu</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {totalSecretItems} off-menu item{totalSecretItems === 1 ? '' : 's'} in {cityDisplayName}
          {validUnlockedItems.length > 0 ? ` · ${validUnlockedItems.length} unlocked` : ''}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden -mx-1 px-1">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setSelectedFilter(filter.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedFilter === filter.id
                ? 'bg-[#00d083] text-black'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {filter.label}
            <span className="ml-1 opacity-70">{filter.count}</span>
          </button>
        ))}
      </div>

      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                selectedCategory === category
                  ? 'bg-zinc-100 text-black'
                  : 'bg-zinc-900/80 text-zinc-500 border border-zinc-800'
              }`}
            >
              {category === 'all' ? 'All venues' : category}
            </button>
          ))}
        </div>
      )}

      {getFilteredSecretMenus().length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-12 text-center">
          <p className="text-zinc-200 font-medium">
            {realSecretMenus.length === 0 ? 'Secret menus coming soon' : 'No secrets match these filters'}
          </p>
          <p className="text-zinc-500 text-sm mt-1">
            {realSecretMenus.length === 0
              ? 'Off-menu dishes appear once venues confirm what\'s available.'
              : 'Try another filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {getFilteredSecretMenus().map((menu) => {
            const business = {
              id: menu.businessId,
              name: menu.businessName,
              category: menu.businessCategory,
              address: menu.businessAddress,
              phone: menu.businessPhone,
              image: menu.businessImage,
            }
            const businessSlug = business?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || menu.businessId
            const isHighlighted = highlightedCard === businessSlug
            const isExpanded = expandedBusinessIds.has(menu.businessId)
            const secretCount = menu.items.length

            return (
              <section
                key={menu.businessId}
                ref={(el) => { cardRefs.current[businessSlug] = el }}
                className={`rounded-2xl border overflow-hidden transition-colors ${
                  isHighlighted
                    ? 'border-[#00d083]/60 bg-zinc-950'
                    : 'border-zinc-800 bg-zinc-950'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setExpandedBusinessIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(menu.businessId)) next.delete(menu.businessId)
                      else next.add(menu.businessId)
                      return next
                    })
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3.5 text-left active:bg-zinc-900/80 transition-colors touch-manipulation min-h-[64px]"
                  aria-expanded={isExpanded}
                >
                  {business.image ? (
                    <img
                      src={business.image}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover border border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-zinc-50 truncate">{business.name}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {secretCount} secret{secretCount === 1 ? '' : 's'}
                      {business.category ? ` · ${business.category}` : ''}
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-zinc-800/80 pt-3">
                    {menu.items.map((item: any, index: number) => (
                      <SecretMenuItem
                        key={`${menu.businessId}-${item.name}-${index}`}
                        menu={menu}
                        item={item}
                        business={business}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      <SecretUnlockModal
        isOpen={secretModal.isOpen}
        onClose={() => setSecretModal({ isOpen: false, item: null, business: null, badgeEarned: null })}
        item={secretModal.item || { name: '', description: '' }}
        business={secretModal.business || { name: '', address: '', phone: '' }}
        badgeEarned={secretModal.badgeEarned}
      />
    </div>
  )
}
