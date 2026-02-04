'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { useState } from 'react'
import Link from 'next/link'

interface Business {
  id: string
  business_name: string
  business_category: string
  business_tagline?: string
  business_town?: string
  business_images?: string[]
  business_tier: 'qwikker_picks' | 'featured' | 'starter' | 'recommended' | 'free_trial'
  rating?: number
  offers_count?: number
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
}

interface BusinessCarouselProps {
  businesses: Business[]
  currentUser?: any
  className?: string
  onShowOffers?: (businessId: string, businessName: string) => void
}

export function BusinessCarousel({ businesses, currentUser, className = '', onShowOffers }: BusinessCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Sort businesses by tier priority (CRITICAL: qwikker_picks ALWAYS first)
  const sortedBusinesses = [...businesses].sort((a, b) => {
    const tierPriority = {
      'qwikker_picks': 0,  // ⭐ QWIKKER PICK - ALWAYS FIRST
      'featured': 1,       // Featured badge
      'free_trial': 1,     // Free trial = Featured tier (same priority)
      'starter': 2,        // No badge
      'recommended': 3
    }
    const aPriority = tierPriority[a.business_tier] ?? 999
    const bPriority = tierPriority[b.business_tier] ?? 999
    return aPriority - bPriority
  })

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'qwikker_picks':
        return <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-2 py-1 rounded-full">⭐ Qwikker Pick</span>
      case 'featured':
      case 'free_trial':  // Free trial = Featured badge
        return <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Featured</span>
      case 'starter':
      case 'recommended':
        return null // No badge
      default:
        return null
    }
  }

  const getTierStyling = (tier: string) => {
    switch (tier) {
      case 'qwikker_picks':
        return 'border-2 border-yellow-400 shadow-lg shadow-yellow-400/20 bg-gradient-to-br from-slate-800 to-slate-900'
      case 'featured':
      case 'free_trial':  // Free trial = Featured styling
        return 'border-2 border-blue-500 shadow-lg shadow-blue-500/20 bg-gradient-to-br from-slate-800 to-slate-900'
      case 'starter':
      case 'recommended':
        return 'border border-slate-700 bg-slate-800'
      default:
        return 'border border-slate-700 bg-slate-800'
    }
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % sortedBusinesses.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + sortedBusinesses.length) % sortedBusinesses.length)
  }

  if (!sortedBusinesses.length) return null

  return (
    <div className={`relative ${className}`}>
      {/* Carousel Container */}
      <div className="overflow-hidden px-2">
        <div 
          className="flex transition-transform duration-300 ease-in-out gap-3"
          style={{ transform: `translateX(-${currentIndex * (280 + 12)}px)` }}
        >
          {sortedBusinesses.map((business) => (
            <Card 
              key={business.id} 
              className={`flex-shrink-0 w-[280px] h-[320px] ${getTierStyling(business.business_tier)} transition-colors duration-200`}
            >
              <CardContent className="p-0 h-full flex flex-col">
                {/* Business Image Carousel */}
                <div className="relative h-[160px] bg-slate-700 rounded-t-lg overflow-hidden">
                  <ImageCarousel
                    images={business.business_images || []}
                    alt={business.business_name}
                    className="w-full h-full"
                    showArrows={true}
                    showDots={false}
                  />
                  
                  {/* Tier Badge - Top Right */}
                  <div className="absolute top-2 right-2 z-20">
                    {getTierBadge(business.business_tier)}
                  </div>
                </div>

                {/* Business Info */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Business Name */}
                  <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">
                    {business.business_name}
                  </h3>
                  
                  {/* Category */}
                  <p className="text-slate-300 text-sm mb-2">
                    {business.business_category}
                  </p>
                  
                  {/* Location */}
                  {business.business_town && (
                    <p className="text-slate-400 text-xs mb-3 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {business.business_town}
                    </p>
                  )}

                  {/* Primary reason */}
                  {business.reason && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 mb-2 rounded-full bg-[#00d083]/10 border border-[#00d083]/30">
                      {business.reason.emoji && <span className="text-sm">{business.reason.emoji}</span>}
                      <span className="text-xs text-[#00d083] font-medium">{business.reason.label}</span>
                    </div>
                  )}

                  {/* Secondary metadata */}
                  {business.reasonMeta && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                      {business.reasonMeta.ratingBadge && (
                        <span>⭐ {business.reasonMeta.ratingBadge}</span>
                      )}
                      {business.reasonMeta.isOpenNow && (
                        <span className="text-[#00d083]">• 🕐 Open now</span>
                      )}
                      {business.reasonMeta.distanceMeters && (
                        <span>• 📍 {business.reasonMeta.distanceMeters}m</span>
                      )}
                    </div>
                  )}

                  {/* Rating & Offers - Only show if > 0 */}
                  <div className="flex items-center justify-between mb-3 text-xs">
                    {business.rating && business.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-slate-300">{business.rating.toFixed(1)}</span>
                      </div>
                    )}
                    
                    {business.offers_count && business.offers_count > 0 && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-slate-300">{business.offers_count} offer{business.offers_count !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto space-y-2">
                    <Link 
                      href={`/user/business/${business.id}${currentUser?.wallet_pass_id ? `?wallet_pass_id=${currentUser.wallet_pass_id}` : ''}`}
                      className="w-full"
                    >
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2">
                        View Details
                      </Button>
                    </Link>
                    
                    {business.offers_count && business.offers_count > 0 && (
                      <Button 
                        variant="outline" 
                        className="w-full border-green-500 text-green-400 hover:bg-green-500 hover:text-white text-sm py-2"
                        onClick={() => onShowOffers?.(business.id, business.business_name)}
                      >
                        Get Offers ({business.offers_count})
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Navigation Arrows - Only show if more than 1 business */}
      {sortedBusinesses.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full shadow-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full shadow-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator - Only show if more than 1 business */}
      {sortedBusinesses.length > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {sortedBusinesses.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-500' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
