'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { getBusinessStatusProps } from '@/lib/utils/business-hours'
import { formatPrice } from '@/lib/utils/price-formatter'

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
    <Card className={`relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-700/50 hover:border-[#00d083] transition-all duration-500 hover:shadow-2xl hover:shadow-[#00d083]/20 hover:scale-[1.02] group cursor-pointer overflow-hidden ${className}`}>
      {/* Ambient Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00d083]/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Business Image Carousel */}
      <div className="relative h-56 overflow-hidden">
        <ImageCarousel
          images={business.images || []}
          alt={business.name}
          className="w-full h-full group-hover:scale-110 transition-transform duration-700"
          showArrows={true}
          showDots={false}
        />
        {/* Enhanced gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d083]/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Hero Badge - Premium Styling */}
        <div className="absolute top-4 right-4 z-10">
          {business.plan === 'spotlight' && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 blur-xl opacity-60 animate-pulse"></div>
              <span className="relative bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 text-black text-sm px-4 py-2.5 rounded-full font-black shadow-2xl flex items-center gap-2 animate-pulse border-2 border-yellow-300">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                QWIKKER PICK
              </span>
            </div>
          )}
          {business.plan === 'featured' && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00d083] to-[#00b86f] blur-lg opacity-60"></div>
              <span className="relative bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black text-sm px-4 py-2.5 rounded-full font-black shadow-2xl flex items-center gap-2 border-2 border-emerald-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                FEATURED
              </span>
            </div>
          )}
        </div>

        {/* Distance Badge - Enhanced */}
        {showDistance && business.distance && (
          <div className="absolute bottom-4 left-4">
            <span className="bg-black/80 backdrop-blur-md text-white text-sm px-4 py-2.5 rounded-full flex items-center gap-2 border border-white/10 shadow-xl">
              <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="font-semibold">{Math.round(parseFloat(business.distance) * 20)} min</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{business.distance} mi</span>
            </span>
          </div>
        )}
      </div>

      <CardHeader className="pb-4 pt-5 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-xl font-bold mb-2 group-hover:text-[#00d083] transition-colors duration-300">
              {business.name}
            </CardTitle>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{business.category}</p>
            {business.tagline && (
              <p className="text-[#00d083] text-base font-semibold mt-2 leading-snug">{business.tagline}</p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pb-6 relative">
        {/* Rating and Reviews - Enhanced */}
        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1.5 rounded-lg border border-yellow-500/30">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-white font-bold text-lg">{business.rating || 4.5}</span>
            </div>
            <span className="text-slate-400 text-sm font-medium">({business.reviewCount || 0} reviews)</span>
          </div>
        </div>

        {/* Location - Enhanced */}
        <div className="flex items-center gap-3 text-slate-300 bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
          <div className="w-10 h-10 rounded-full bg-[#00d083]/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium leading-tight">{business.address}, {business.town || business.location}</span>
        </div>

        {/* Hours - Enhanced */}
        {business.hours && (
          <div className="flex items-center justify-between bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-300">{business.hours}</span>
            </div>
            {(() => {
              const status = getBusinessStatusProps(business.hours)
              return (
                <span className={`${status.statusColor} text-sm font-bold px-3 py-1 rounded-full bg-slate-800 border ${status.statusText === 'Open' ? 'border-green-500/30' : 'border-slate-600'}`}>
                  {status.statusText}
                </span>
              )
            })()}
          </div>
        )}

        {/* Menu Preview - Enhanced */}
        {business.menuPreview && business.menuPreview.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/40 rounded-xl p-4 border border-slate-600/50 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="text-base">🍽️</span>
              </div>
              <p className="text-white text-sm font-bold">Popular Items</p>
            </div>
            <div className="space-y-2">
              {business.menuPreview?.slice(0, 2).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <p className="text-slate-200 text-sm font-medium">{item.name}</p>
                  <p className="text-[#00d083] text-sm font-bold">{formatPrice(item.price)}</p>
                </div>
              ))}
              {(business.menuPreview?.length || 0) > 2 && (
                <p className="text-slate-400 text-xs text-center pt-2 font-medium">+{(business.menuPreview?.length || 0) - 2} more items available</p>
              )}
            </div>
          </div>
        )}

        {/* Special Features & Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-wrap gap-2">
            {business.hasSecretMenu && (
              <span className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/40 text-purple-300 text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Secret Menu
              </span>
            )}
            {business.activeOffers > 0 && (
              <span className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-500/40 text-orange-300 text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1 animate-pulse">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                {business.activeOffers} Offers
              </span>
            )}
          </div>
          
          {/* Save Button - Enhanced */}
          <Button 
            variant="outline" 
            size="sm" 
            className="border-2 border-slate-600 text-slate-300 hover:text-[#00d083] hover:border-[#00d083] hover:bg-[#00d083]/10 transition-all duration-300 p-2.5 shadow-lg group/btn"
          >
            <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

