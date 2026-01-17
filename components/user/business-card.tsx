import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { BusinessCardImage } from '@/components/ui/business-card-image'
import { getBusinessStatusProps } from '@/lib/utils/business-hours'
import { formatPrice } from '@/lib/utils/price-formatter'
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
}

export function BusinessCard({ 
  business, 
  href, 
  onClick, 
  showDistance = true,
  className = '' 
}: BusinessCardProps) {
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
    return business.town || business.location || business.city || 'Bournemouth'
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
    <div className="relative">
      {/* Tier badge - half on/half off card (MOBILE ONLY) - OUTSIDE card to avoid clipping */}
      {(business.plan === 'spotlight' || business.plan === 'featured') && (
        <div className="absolute -top-2 right-3 z-30 sm:hidden">
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
        </div>
      )}
      
      <Card className={`bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 hover:border-[#00d083]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00d083]/10 group cursor-pointer overflow-hidden ${className}`}>
        
        {/* MOBILE LAYOUT: Thumbnail-left (default, hidden on sm:) */}
        <div className="sm:hidden p-2.5">
          <div className="flex gap-2.5">
          {/* Left: Thumbnail */}
          <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
            {(() => {
              if (business.status === 'unclaimed') {
                return (
                  <BusinessCardImage
                    businessName={business.name}
                    businessId={business.id}
                    systemCategory={systemCategory}
                    showUnclaimedBadge={false}
                    className="h-full w-full"
                  />
                )
              } else if (business.images && business.images.length > 0) {
                return (
                  <img 
                    src={business.images[0]} 
                    alt={business.name}
                    className="w-full h-full object-cover"
                  />
                )
              } else {
                return (
                  <BusinessCardImage
                    businessName={business.name}
                    businessId={business.id}
                    systemCategory={systemCategory}
                    showUnclaimedBadge={false}
                    className="h-full w-full"
                  />
                )
              }
            })()}
          </div>
          
          {/* Right: Info stack */}
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="text-slate-100 text-sm font-semibold mb-0.5 truncate group-hover:text-[#00d083] transition-colors">
              {business.name}
            </h3>
            
            <p className="text-slate-400 text-xs mb-0.5 truncate">
              {(() => {
                const label = getPrimaryLabel({
                  google_types: business.google_types,
                  google_primary_type: business.google_primary_type,
                  display_category: business.display_category,
                  system_category: business.system_category
                })
                return (label === 'Other' || label === 'Local business') ? '' : label
              })()}
            </p>
            
            {/* Compact meta row: rating + hours/location */}
            <div className="text-xs text-slate-400 mb-1 truncate">
              {(() => {
                const rating = typeof business.rating === 'number' ? business.rating : null
                const reviewCount = business.review_count ?? business.reviewCount ?? 0
                const utilityText = getUtilityLine()
                
                if (rating) {
                  return (
                    <span>
                      <span className="text-yellow-400">★</span>{' '}
                      <span className="text-slate-100 font-semibold">{rating.toFixed(1)}</span>
                      <span className="text-slate-400"> ({reviewCount})</span>
                      <span className="text-slate-500"> • </span>
                      <span>{utilityText}</span>
                    </span>
                  )
                } else {
                  return <span>{utilityText}</span>
                }
              })()}
            </div>
            
            {/* Signal badges (clean pills, no emojis) */}
            <div className="mt-auto">
              {/* Reserve consistent space so cards don't look randomly empty */}
              <div className="flex flex-wrap gap-1.5 min-h-[26px] items-center">
                {/* OFFERS */}
                {getOffersCount() > 0 && (
                  <span className="bg-[#00d083]/15 border border-[#00d083]/25 text-[#00d083] text-[10px] leading-none px-2 py-1 rounded-full font-semibold">
                    {getOffersCount()} {getOffersCount() === 1 ? 'Offer' : 'Offers'}
                  </span>
                )}

                {/* SECRET MENU */}
                {hasSecretMenu() && (
                  <span className="bg-purple-500/15 border border-purple-500/25 text-purple-200 text-[10px] leading-none px-2 py-1 rounded-full font-semibold">
                    Secret Menu
                  </span>
                )}

                {/* Listing not claimed (only for status === unclaimed) */}
                {business.status === 'unclaimed' && (
                  <span className="bg-slate-700/40 border border-slate-600/40 text-slate-200 text-[10px] leading-none px-2 py-1 rounded-full">
                    Listing not claimed
                  </span>
                )}

                {/* Claimed but no photos */}
                {business.status !== 'unclaimed' && !hasRealPhotos() && (
                  <span className="bg-slate-700/40 border border-slate-600/40 text-slate-200 text-[10px] leading-none px-2 py-1 rounded-full">
                    No photos yet
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Heart button */}
          <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* DESKTOP LAYOUT: Image-top (hidden by default, visible on sm:) */}
      <div className="hidden sm:block">
      {/* Business Image - Conditional logic based on status + images */}
      <div className="relative h-48 overflow-hidden">
        {(() => {
          const systemCategory = resolveSystemCategory(business)

          if (business.status === 'unclaimed') {
            // Case 1: Unclaimed → Placeholder WITH "UNCLAIMED" badge
            return (
              <BusinessCardImage
                businessName={business.name}
                businessId={business.id}
                systemCategory={systemCategory}
                showUnclaimedBadge={true}
                className="h-full w-full"
              />
            )
          } else if (business.images && business.images.length > 0) {
            // Case 2: Claimed + has images → ImageCarousel
            return (
              <>
                <ImageCarousel
                  images={business.images}
                  alt={business.name}
                  className="w-full h-full"
                  showArrows={true}
                  showDots={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </>
            )
          } else {
            // Case 3: Claimed + NO images → Placeholder WITHOUT "UNCLAIMED" badge
            return (
              <BusinessCardImage
                businessName={business.name}
                businessId={business.id}
                systemCategory={systemCategory}
                showUnclaimedBadge={false}
                className="h-full w-full"
              />
            )
          }
        })()}
        
        {/* Hero Badge - Show for ALL claimed businesses (regardless of images) */}
        {business.status !== 'unclaimed' && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
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
          </div>
        )}

        {/* Case 3 Override: Add "No Photos Yet" badge for claimed businesses without images */}
        {business.status !== 'unclaimed' && (!business.images || business.images.length === 0) && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
            <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-slate-700/90 backdrop-blur-sm border border-slate-600/30">
              <span className="text-[10px] sm:text-xs font-semibold text-white uppercase tracking-wide">
                No Photos Yet
              </span>
            </div>
          </div>
        )}

        {/* Distance Badge - Show for ALL businesses */}
        {showDistance && business.distance && (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-20">
            <span className="bg-black/70 text-slate-100 text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-2 rounded-full backdrop-blur-sm flex items-center gap-1">
              🚶 {Math.round(parseFloat(business.distance) * 20)} min • {business.distance} mi
            </span>
          </div>
        )}
      </div>

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
          <span className="text-sm">{business.address}, {business.town || business.location}</span>
        </div>

        {/* Phone - Hidden on mobile */}
        {business.phone && (
          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm">{business.phone}</span>
          </div>
        )}

        {/* Hours - Hidden on mobile */}
        {business.hours && (
          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{business.hours}</span>
            {(() => {
              const raw = business.hours
              const structured = business.hours_structured || business.business_hours_structured
              
              // If we have any hours data, try to show status
              if (!raw && !structured) return null
              
              const status = getBusinessStatusProps(raw, structured)
              if (!status) return null
              
              // Show status if we know it (true or false)
              if (status.isOpen === true || status.isOpen === false) {
                const line = getUtilityLine()
                // Don't show if it's just the town fallback
                if (!line || line === (business.town || business.location || business.city || 'Bournemouth')) return null
                return (
                  <span className="text-sm font-medium text-slate-300">
                    • {line}
                  </span>
                )
              }
              
              return null
            })()}
          </div>
        )}

        {/* Compact Menu Preview */}
        {business.menuPreview && business.menuPreview.length > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🍽</span>
              <p className="text-slate-100 text-sm font-medium">Popular items:</p>
            </div>
            <div className="space-y-1">
              {business.menuPreview?.slice(0, 2).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <p className="text-slate-300 text-xs">{item.name}</p>
                  <p className="text-[#00d083] text-xs font-medium">{formatPrice(item.price)}</p>
                </div>
              ))}
              {(business.menuPreview?.length || 0) > 2 && (
                <p className="text-slate-400 text-xs">+{(business.menuPreview?.length || 0) - 2} more items...</p>
              )}
            </div>
          </div>
        )}

        {/* Special Features */}
        <div className="flex items-center justify-between">
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
          
          {/* Save Button */}
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </Button>
        </div>
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

  // If href is provided, wrap in Link
  if (href) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    )
  }

  // Otherwise just return the card
  return cardContent
}

