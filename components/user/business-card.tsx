'use client'

import { useState } from 'react'
import { PendingLink } from '@/components/ui/nav-pending'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BusinessCardImage } from '@/components/ui/business-card-image'
import { getBusinessStatusProps } from '@/lib/utils/business-hours'
import type { SystemCategory } from '@/lib/constants/system-categories'
import { resolveSystemCategory } from '@/lib/utils/resolve-system-category'
import { getCategoryLabel } from '@/lib/utils/google-category-label'
import { getPrimaryLabel, getHeroLine } from '@/lib/utils/business-labels'

interface BusinessCardProps {
  business: any
  href?: string
  onClick?: () => void
  showDistance?: boolean
  className?: string
  isSaved?: boolean
  onToggleSave?: () => void
  adminOverlay?: React.ReactNode
}

export function BusinessCard({ 
  business, 
  href, 
  onClick, 
  showDistance = true,
  className = '',
  isSaved = false,
  onToggleSave,
  adminOverlay
}: BusinessCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const systemCategory = resolveSystemCategory(business)
  
  // Helper to get utility line for mobile
  const getUtilityLine = () => {
    const raw = business.hours || business.business_hours
    const structured = business.hours_structured || business.business_hours_structured

    // If we have ANY hours data, try to parse it
    if (raw || structured) {
      const statusProps = getBusinessStatusProps(raw, structured)
      
      if (statusProps) {
        // Better time extractor: handles "7 PM", "7:30 PM", "21:00", "09:00"
        const extractTime = (s?: string | null) => {
          if (!s) return null
          // Try AM/PM format first (e.g., "7:30 PM" or "7 PM")
          const ampm = s.match(/(\d{1,2})(?::(\d{2}))?\s*([AP]M)/i)
          if (ampm) {
            const h = ampm[1]
            const m = ampm[2]
            const ap = ampm[3].toUpperCase()
            return m && m !== '00' ? `${h}:${m} ${ap}` : `${h} ${ap}`
          }
          // Try 24-hour format (e.g., "21:00" or "09:00")
          const hm = s.match(/(\d{1,2}):(\d{2})/)
          if (hm) {
            let h = parseInt(hm[1], 10)
            const m = hm[2]
            const ap = h >= 12 ? 'PM' : 'AM'
            if (h === 0) h = 12
            else if (h > 12) h -= 12
            return m !== '00' ? `${h}:${m} ${ap}` : `${h} ${ap}`
          }
          return null
        }

        const t = extractTime(statusProps.nextChange)

        // Show status if we know it
        if (statusProps.isOpen === true) {
          return t ? `Open • Closes ${t}` : 'Open'
        } else if (statusProps.isOpen === false) {
          return t ? `Closed • Opens ${t}` : 'Closed'
        }
      }
    }
    
    // Fallback to town
    return business.town || business.location || business.city || 'Location'
  }
  
  // Helper to resolve offers count from various possible fields
  const getOffersCount = () => {
    return business.activeOffers 
      || business.offers?.length 
      || business.offers_count 
      || 0
  }
  
  // Helper to resolve secret menu presence
  const hasSecretMenu = () => {
    return business.hasSecretMenu 
      || (business.secretMenuCount && business.secretMenuCount > 0)
      || (business.secret_menu_count && business.secret_menu_count > 0)
      || false
  }
  
  // Helper to check if business has real photos
  const hasRealPhotos = () => {
    return business.status !== 'unclaimed' 
      && business.images 
      && business.images.length > 0
  }
  
  const cardContent = (
    <div className="relative h-full">
      {/* Tier badge - half on/half off card (MOBILE ONLY) - OUTSIDE card to avoid clipping */}
      {(business.plan === 'spotlight' || business.plan === 'featured' || business.plan === 'starter') && (
        <div className="absolute -top-2 right-3 z-[1] sm:hidden">
          {business.plan === 'spotlight' && (
            <span className="inline-block px-3 py-1 rounded-full shadow-lg border border-white/10 backdrop-blur bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-[11px] font-extrabold tracking-wide uppercase">
              QWIKKER PICK
            </span>
          )}
          {business.plan === 'featured' && (
            <span className="inline-block px-3 py-1 rounded-full shadow-lg border border-white/10 backdrop-blur bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black text-[11px] font-extrabold tracking-wide uppercase">
              FEATURED
            </span>
          )}
          {business.plan === 'starter' && (
            <span className="inline-block px-3 py-1 rounded-full shadow-lg border border-white/10 backdrop-blur bg-gradient-to-r from-violet-400 to-purple-500 text-black text-[11px] font-extrabold tracking-wide uppercase">
              RECOMMENDED
            </span>
          )}
        </div>
      )}
      
      <Card className={`bg-gradient-to-br from-zinc-800 via-zinc-800 to-zinc-800/95 border-zinc-600/90 shadow-md shadow-black/40 hover:border-[#00d083]/50 hover:shadow-lg hover:shadow-[#00d083]/10 transition-all duration-300 group cursor-pointer sm:py-6 p-0 h-full ring-1 ring-white/5 ${className}`}>
        
        {/* MOBILE LAYOUT: Thumbnail-left (horizontal layout) */}
        <div className="sm:hidden">
          <div className="flex flex-row items-stretch gap-4 p-3 relative min-h-[156px]">
            {/* Left: Image Thumbnail - REASONABLE SIZE (80px square) */}
            <div className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: '140px', height: '140px', minWidth: '140px', minHeight: '140px', maxWidth: '140px', maxHeight: '140px', padding: 0, margin: 0, lineHeight: 0, fontSize: 0 }}>
              <BusinessCardImage
                businessName={business.name}
                businessId={business.id}
                systemCategory={systemCategory}
                heroMedia={business.heroMedia || null}
                heroImage={
                  business.images && business.images.length > 0 && business.images[0] !== '/placeholder-business.jpg'
                    ? business.images[0]
                    : null
                }
                placeholderVariant={business.placeholder_variant}
                customPlaceholderUrl={business.placeholder_custom_url}
                showUnclaimedBadge={false}
                preset="card_mobile"
                className="h-full w-full"
              />
              {business.status === 'unclaimed' && (
                <div className="absolute bottom-2 left-2 z-[1] bg-zinc-950/90 backdrop-blur-md px-2 py-1 rounded-md text-[11px] text-zinc-100 font-medium flex items-center gap-1 border border-zinc-600/60">
                  <span>ⓘ</span>
                  <span>Unclaimed</span>
                </div>
              )}
            </div>
            
            {/* Right: Content Stack */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              {(() => {
                // Get business hours status
                const raw = business.hours || business.business_hours
                const structured = business.hours_structured || business.business_hours_structured
                const statusProps = raw || structured ? getBusinessStatusProps(raw, structured) : null
                const isOpen = statusProps?.isOpen
                
                // Get category - prioritize google_primary_type first, then display_category
                const displayCategory = (() => {
                  // 1. Priority: google_primary_type (format nicely)
                  if (business.google_primary_type) {
                    return business.google_primary_type
                      .split('_')
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')
                  }
                  
                  // 2. Fall back to display_category
                  if (business.display_category) {
                    return business.display_category
                  }
                  
                  // 3. Try getPrimaryLabel (derives from google_types)
                  const label = getPrimaryLabel({
                    google_types: business.google_types,
                    google_primary_type: business.google_primary_type,
                    display_category: business.display_category,
                    system_category: business.system_category
                  })
                  
                  if (label && label !== 'Other' && label !== 'Local business') {
                    return label
                  }
                  
                  // 4. Last resort: business_category or "Business"
                  return business.business_category || 'Business'
                })()
                
                // Get rating
                const rating = typeof business.rating === 'number' ? business.rating : null
                const reviewCount = business.review_count ?? business.reviewCount ?? 0
                
                // Get hours text for distance line
                const utilityText = getUtilityLine()
                
                return (
                  <>
                    {/* Open/Closed/Hours Pill - FIRST, above name (transparent colors with border) */}
                    {isOpen !== null && isOpen !== undefined ? (
                      <div className={`inline-flex self-start px-2.5 py-0.5 rounded-full text-[10px] font-semibold border mb-1 ${
                        isOpen 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' 
                          : 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                      }`}>
                        {isOpen ? '● Open' : '● Closed'}
                      </div>
                    ) : (
                      <div className="inline-flex self-start px-2.5 py-0.5 rounded-full text-[10px] font-medium border mb-1 bg-zinc-800/60 text-zinc-400 border-zinc-700/50">
                        Hours not available
                      </div>
                    )}
                    
                    {/* Business Name */}
                    <h3 className="text-white text-[17px] font-bold leading-tight line-clamp-1 mb-1.5 tracking-tight">
                      {business.name}
                    </h3>
                    
                    {/* Category */}
                    <p className="text-zinc-300 text-xs line-clamp-1 mb-1.5">
                      {displayCategory}
                    </p>
                    
                    {/* Rating */}
                    {rating && rating > 0 && (
                      <div className="flex items-center gap-1 text-xs mb-2">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-white font-semibold">{rating.toFixed(1)}</span>
                        <span className="text-zinc-400">({reviewCount})</span>
                      </div>
                    )}
                    
                    {/* Distance + Hours - wrapped in subtle pill */}
                    <div className="inline-flex self-start items-center gap-1 text-[10px] text-zinc-300 bg-zinc-800/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-zinc-700/40">
                      <span>ⓘ</span>
                      {business.distance !== null && business.distance !== undefined ? (
                        <>
                          <span>{business.distance < 0.1 ? '< 0.1 mi' : (() => {
                            const dist = parseFloat(business.distance)
                            // If close to whole number (within 0.1), show whole number
                            if (Math.abs(dist - Math.round(dist)) < 0.1) {
                              return `${Math.round(dist)} mi`
                            }
                            // Otherwise show 1 decimal place
                            return `${dist.toFixed(1)} mi`
                          })()}</span>
                          {statusProps?.nextChange && (
                            <>
                              <span>•</span>
                              <span>{statusProps.nextChange}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {/* No distance - just show next opening/closing time */}
                          {statusProps?.nextChange ? (
                            <span>{statusProps.nextChange}</span>
                          ) : (
                            <span>{business.business_town || business.location || business.city || 'Location'}</span>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Signal badges for offers/secret menu/loyalty */}
                    {(getOffersCount() > 0 || hasSecretMenu() || business.hasLoyalty) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {getOffersCount() > 0 && (
                          <span className="bg-[#00d083]/15 border border-[#00d083]/25 text-[#00d083] text-[10px] leading-none px-2 py-0.5 rounded-full font-semibold">
                            {getOffersCount()} {getOffersCount() === 1 ? 'Offer' : 'Offers'}
                          </span>
                        )}
                        {hasSecretMenu() && (
                          <span className="bg-purple-500/15 border border-purple-500/25 text-purple-200 text-[10px] leading-none px-2 py-0.5 rounded-full font-semibold">
                            Secret Menu
                          </span>
                        )}
                        {business.hasLoyalty && (
                          <span className="bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[10px] leading-none px-2 py-0.5 rounded-full font-semibold">
                            Loyalty
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
            
            {/* Heart — drop below tier badge when present so they don't overlap */}
            <button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onToggleSave) {
                  onToggleSave()
                }
              }}
              className={`absolute right-1 z-[2] w-7 h-7 flex items-center justify-center backdrop-blur-sm rounded-full transition-all ${
                business.plan === 'spotlight' || business.plan === 'featured' || business.plan === 'starter'
                  ? 'top-8'
                  : 'top-1'
              } ${
                isSaved 
                  ? 'bg-pink-500/90 hover:bg-pink-600/90' 
                  : 'bg-zinc-700/90 hover:bg-zinc-600'
              }`}
            >
              <svg 
                className={`w-3.5 h-3.5 transition-colors ${isSaved ? 'text-white' : 'text-white'}`} 
                fill={isSaved ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
      
      {/* DESKTOP LAYOUT: Image-top (hidden on mobile, visible on desktop) */}
      <div className="hidden sm:block">
      {/* Business Image - Conditional logic based on status + images */}
      <div className="relative h-48 overflow-hidden rounded-t-lg">
        {(() => {
          const systemCategory = resolveSystemCategory(business)

          const hasHero =
            !!business.heroMedia?.source_url ||
            (business.images &&
              business.images.length > 0 &&
              business.images[0] !== '/placeholder-business.jpg')

          if (business.status === 'unclaimed') {
            return (
              <BusinessCardImage
                businessName={business.name}
                businessId={business.id}
                systemCategory={systemCategory}
                heroMedia={business.heroMedia || null}
                heroImage={hasHero ? business.images?.[0] : null}
                placeholderVariant={business.placeholder_variant}
                customPlaceholderUrl={business.placeholder_custom_url}
                showUnclaimedBadge={true}
                preset="card_desktop"
                className="h-full w-full"
                onBadgeHover={(isHovering) => setShowTooltip(isHovering)}
                onBadgeClick={() => setShowTooltip(!showTooltip)}
              />
            )
          }

          // Claimed: prefer media_assets presentation via QwikkerImage
          return (
            <BusinessCardImage
              businessName={business.name}
              businessId={business.id}
              systemCategory={systemCategory}
              heroMedia={business.heroMedia || null}
              heroImage={hasHero ? business.images?.[0] : null}
              placeholderVariant={business.placeholder_variant}
              customPlaceholderUrl={business.placeholder_custom_url}
              showUnclaimedBadge={false}
              preset="card_desktop"
              className="h-full w-full"
            />
          )
        })()}
        
        {/* Hero Badge - Show for ALL claimed businesses (regardless of images) */}
        {business.status !== 'unclaimed' && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-[1]">
            {business.plan === 'spotlight' && (
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-2 rounded-full font-bold shadow-lg animate-pulse">
                ⭐ QWIKKER PICK
              </span>
            )}
            {business.plan === 'featured' && (
              <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-2 rounded-full font-bold shadow-lg">
                FEATURED
              </span>
            )}
            {business.plan === 'starter' && (
              <span className="bg-gradient-to-r from-violet-400 to-purple-500 text-black text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-2 rounded-full font-bold shadow-lg">
                RECOMMENDED
              </span>
            )}
          </div>
        )}

        {/* Case 3 Override: Add "No Photos Yet" badge for claimed businesses without images */}
        {business.status !== 'unclaimed' && (!business.images || business.images.length === 0) && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-[1]">
            <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-slate-700/90 backdrop-blur-sm border border-slate-600/30">
              <span className="text-[10px] sm:text-xs font-semibold text-white uppercase tracking-wide">
                No Photos Yet
              </span>
            </div>
          </div>
        )}

        {/* Save/Favourite Heart - Desktop only, top-left of image */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleSave()
            }}
            className={`absolute top-2 left-2 sm:top-3 sm:left-3 z-[2] w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-sm transition-all ${
              isSaved
                ? 'bg-pink-500/90 hover:bg-pink-600/90'
                : 'bg-slate-800/70 hover:bg-slate-700/80'
            }`}
          >
            <svg
              className="w-4 h-4 text-white"
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}

        {/* Admin overlay (e.g. "Change image" button) - top-left, only when no save heart */}
        {!onToggleSave && adminOverlay && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-[2]">
            {adminOverlay}
          </div>
        )}

        {/* Distance Badge - Show for ALL businesses */}
        {showDistance && business.distance && (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-[1]">
            <span className="bg-black/70 text-slate-100 text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-2 rounded-full backdrop-blur-sm flex items-center gap-1">
              {(() => {
                const walkMinutes = Math.round(parseFloat(business.distance) * 20)
                if (walkMinutes >= 60) {
                  const hours = walkMinutes / 60
                  return `${hours.toFixed(1)} hr walk`
                }
                return `${walkMinutes} min walk`
              })()} • {(() => {
                const dist = parseFloat(business.distance)
                // If close to whole number (within 0.1), show whole number
                if (Math.abs(dist - Math.round(dist)) < 0.1) {
                  return Math.round(dist)
                }
                // Otherwise show 1 decimal place
                return dist.toFixed(1)
              })()} mi
            </span>
          </div>
        )}

      </div>

      {/* Unclaimed Tooltip - Rendered OUTSIDE overflow container */}
      {business.status === 'unclaimed' && showTooltip && (
        <div className="absolute top-52 right-3 w-64 px-4 py-3 rounded-lg bg-slate-900/95 border-2 border-[#00d083] shadow-2xl z-[5] backdrop-blur-sm">
          <p className="text-sm text-slate-200 leading-relaxed">
            This business hasn't claimed their Qwikker listing yet.
          </p>
          {/* Arrow */}
          <div className="absolute -top-1.5 right-4 w-3 h-3 bg-slate-900 border-l-2 border-t-2 border-[#00d083] transform rotate-45" />
        </div>
      )}

      <CardHeader className="pb-2 sm:pb-3 pt-2 sm:pt-4 px-3 sm:px-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-slate-100 text-base sm:text-lg mb-0.5 sm:mb-1 group-hover:text-[#00d083] transition-colors">
              {business.name}
            </CardTitle>
            <p className="text-slate-400 text-xs sm:text-sm mb-0.5 sm:mb-1">
              {(() => {
                // Use smart label (cuisine-specific if available, fallback to category)
                const label = getPrimaryLabel({
                  google_types: business.google_types,
                  google_primary_type: business.google_primary_type,
                  display_category: business.display_category,
                  system_category: business.system_category
                })
                // Hide "Other" and "Local business" - show nothing instead
                return (label === 'Other' || label === 'Local business') ? '' : label
              })()}
            </p>
            <p className="text-[#00d083] text-xs sm:text-sm font-medium">
              {(() => {
                // Use smart hero line (tagline if exists, otherwise generated)
                const heroLine = getHeroLine({
                  business_tagline: business.tagline || business.business_tagline,
                  business_town: business.town || business.business_town,
                  city: business.city,
                  google_types: business.google_types,
                  google_primary_type: business.google_primary_type,
                  display_category: business.display_category,
                  system_category: business.system_category
                })
                return heroLine
              })()}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 sm:space-y-4 px-3 sm:px-6 pb-2 sm:pb-6">
        {/* Rating and Reviews (REAL ONLY - no fake defaults) */}
        {(() => {
          // 🔍 DEV DEBUG: See what fields are actually present
          if (process.env.NODE_ENV === 'development' && business.name) {
            console.log('🔍 BUSINESS RATING DATA:', business.name, {
              rating: business.rating,
              review_count: business.review_count,
              reviewCount: business.reviewCount,
              user_ratings_total: business.user_ratings_total,
              google_rating: business.google_rating,
              google_review_count: business.google_review_count
            })
          }

          const ratingRaw =
            typeof business.rating === 'number'
              ? business.rating
              : typeof business.google_rating === 'number'
                ? business.google_rating
                : typeof business.rating === 'string'
                  ? Number(business.rating)
                  : null

          const rating = Number.isFinite(ratingRaw as number) ? (ratingRaw as number) : null

          const reviewCount =
            business.review_count ??
            business.reviewCount ??
            business.user_ratings_total ??
            business.google_review_count ??
            0

          const safeReviewCount = Number.isFinite(Number(reviewCount)) ? Number(reviewCount) : 0

          // If we don't have a REAL rating, show "No rating yet"
          if (rating === null) {
            return (
              <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
                <span>No rating yet</span>
              </div>
            )
          }

          const fullStars = Math.floor(rating)
          const hasHalf = rating - fullStars >= 0.5

          return (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFull = star <= fullStars
                    const isHalfStar = star === fullStars + 1 && hasHalf

                    return (
                      <svg
                        key={star}
                        className={`w-3 h-3 sm:w-4 sm:h-4 ${
                          isFull || isHalfStar ? 'text-yellow-400' : 'text-gray-600'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )
                  })}
                </div>

                <span className="text-slate-100 font-semibold text-sm">{rating.toFixed(1)}</span>
                <span className="text-slate-400 text-xs sm:text-sm">
                  ({safeReviewCount.toLocaleString()})
                </span>
              </div>
            </div>
          )
        })()}

        {/* Town/Area - Mobile only micro line */}
        <div className="flex sm:hidden items-center gap-1 text-slate-400 text-xs">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <span>{business.town || business.location || business.city}</span>
        </div>

        {/* Location - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm line-clamp-2">{business.address}, {business.town || business.location}</span>
        </div>

        {/* Phone - Hidden on mobile */}
        {business.phone && (
          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm">Call</span>
          </div>
        )}

        {/* Website - Hidden on mobile */}
        {business.website && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const url = business.website.startsWith('http') ? business.website : `https://${business.website}`
              window.open(url, '_blank', 'noopener,noreferrer')
            }}
            className="hidden sm:flex items-center gap-2 text-slate-400 hover:text-[#00d083] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="text-sm">Visit website</span>
          </button>
        )}

        {/* Hours - Hidden on mobile */}
        {(() => {
          const raw = business.hours || business.business_hours
          const structured = business.hours_structured || business.business_hours_structured
          
          if (!raw && !structured) return null
          
          const status = getBusinessStatusProps(raw, structured)
          if (!status) return null
          
          return (
            <div className="hidden sm:flex items-center gap-2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-sm font-medium ${status.isOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                {status.isOpen ? 'Open' : 'Closed'}
              </span>
              {status.nextChange && (
                <span className="text-sm text-slate-400">
                  • {status.nextChange}
                </span>
              )}
            </div>
          )
        })()}

        {/* Special Features */}
        {(business.hasSecretMenu || business.activeOffers > 0) && (
          <div className="flex flex-wrap gap-2">
            {business.hasSecretMenu && (
              <span className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                🔒 Secret Menu
              </span>
            )}
            {business.activeOffers > 0 && (
              <span className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-300 text-xs px-2 py-1 rounded-full">
                🔥 {business.activeOffers} Offers
              </span>
            )}
          </div>
        )}
      </CardContent>
      </div>
      {/* End Desktop Layout */}
    </Card>
    </div>
  )

  // If onClick is provided, make it clickable without Link
  if (onClick) {
    return (
      <div onClick={onClick} className="block">
        {cardContent}
      </div>
    )
  }

  // If href is provided, wrap in Link with instant opening feedback
  if (href) {
    return (
      <PendingLink
        href={href}
        className="block"
        pendingLabel={business.name || business.business_name || 'listing'}
      >
        {cardContent}
      </PendingLink>
    )
  }

  // Otherwise just return the card
  return cardContent
}

