import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { BusinessCardImage } from '@/components/ui/business-card-image'
import { getBusinessStatusProps } from '@/lib/utils/business-hours'
import { formatPrice } from '@/lib/utils/price-formatter'
import type { SystemCategory } from '@/lib/constants/system-categories'
import { resolveSystemCategory } from '@/lib/utils/resolve-system-category'

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
  const cardContent = (
    <Card className={`bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 hover:border-[#00d083]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00d083]/10 group cursor-pointer overflow-hidden ${className}`}>
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
          <div className="absolute top-3 right-3 z-20">
            {business.plan === 'spotlight' && (
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs px-3 py-2 rounded-full font-bold shadow-lg animate-pulse">
                ⭐ QWIKKER PICK
              </span>
            )}
            {business.plan === 'featured' && (
              <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black text-xs px-3 py-2 rounded-full font-bold shadow-lg">
                FEATURED
              </span>
            )}
          </div>
        )}

        {/* Case 3 Override: Add "No Photos Yet" badge for claimed businesses without images */}
        {business.status !== 'unclaimed' && (!business.images || business.images.length === 0) && (
          <div className="absolute top-3 right-3 z-20">
            <div className="px-2.5 py-1 rounded-md bg-slate-700/90 backdrop-blur-sm border border-slate-600/30">
              <span className="text-xs font-semibold text-white uppercase tracking-wide">
                No Photos Yet
              </span>
            </div>
          </div>
        )}

        {/* Distance Badge - Show for ALL businesses */}
        {showDistance && business.distance && (
          <div className="absolute bottom-3 left-3 z-20">
            <span className="bg-black/70 text-slate-100 text-xs px-3 py-2 rounded-full backdrop-blur-sm flex items-center gap-1">
              🚶 {Math.round(parseFloat(business.distance) * 20)} min walk • {business.distance} miles
            </span>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-slate-100 text-lg mb-1 group-hover:text-[#00d083] transition-colors">
              {business.name}
            </CardTitle>
            <p className="text-slate-400 text-sm">
              {(() => {
                const category = business.display_category ?? business.business_category ?? business.category ?? 'Other'
                // Hide "Other" label - show nothing instead (display_category is more descriptive)
                return category === 'Other' ? '' : category
              })()}
            </p>
            <p className="text-[#00d083] text-sm font-medium mt-1">{business.tagline}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Rating and Reviews */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${star <= (business.rating || 4.5) ? 'text-yellow-400' : 'text-gray-600'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-slate-100 font-semibold">{business.rating || 4.5}</span>
            <span className="text-slate-400 text-sm">({business.reviewCount || 0} reviews)</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm">{business.address}, {business.town || business.location}</span>
        </div>

        {/* Phone */}
        {business.phone && (
          <div className="flex items-center gap-2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm">{business.phone}</span>
          </div>
        )}

        {/* Hours */}
        {business.hours && (
          <div className="flex items-center gap-2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{business.hours}</span>
            {(() => {
              const status = getBusinessStatusProps(business.hours)
              return (
                <span className={`${status.statusColor} text-sm font-medium`}>
                  • {status.statusText}
                </span>
              )
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
    </Card>
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

