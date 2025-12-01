'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { mockBusinesses, mockOffers, mockSecretMenus, mockClaimedOffers } from '@/lib/mock-data/user-mock-data'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AddToWalletButton from '@/components/ui/add-to-wallet-button'
import { getBusinessStatusProps } from '@/lib/utils/business-hours'
import { formatPrice } from '@/lib/utils/price-formatter'

interface UserBusinessDetailPageProps {
  slug: string
  businesses?: any[]
  walletPassId?: string
  trackingData?: {
    businessId: string
    visitorWalletPassId?: string
  } | null
}

export function UserBusinessDetailPage({ slug, businesses = mockBusinesses, walletPassId, trackingData }: UserBusinessDetailPageProps) {
  
  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'offers' | 'reviews'>('overview')
  const [claimedOffers, setClaimedOffers] = useState<Set<string>>(new Set())
  
  // Track business visit after component mounts
  useEffect(() => {
    if (trackingData) {
      console.log('🔍 Tracking business visit with data:', trackingData)
      const trackVisit = async () => {
        try {
          const { trackBusinessVisit } = await import('@/lib/actions/business-visit-actions')
          const result = await trackBusinessVisit(trackingData)
          console.log('✅ Business visit tracked:', result)
        } catch (error) {
          console.error('❌ Failed to track business visit:', error)
        }
      }
      trackVisit()
    } else {
      console.log('⚠️ No tracking data provided for business visit')
    }
  }, [trackingData])

  // Load claimed offers after component mounts with user-specific key
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userId = walletPassId || 'anonymous-user'
      const saved = localStorage.getItem(`qwikker-claimed-${userId}`)
      if (saved) {
        setClaimedOffers(new Set(JSON.parse(saved)))
      } else {
        // For development, start with mock data, but real users start fresh
        setClaimedOffers(new Set(mockClaimedOffers.map(co => co.offerId)))
      }
    }
  }, [walletPassId])
  
  // Find business by slug in the combined businesses list
  const business = businesses.find(b => b.slug === slug)
  
  // Handle case where business is not found
  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Business Not Found</h1>
        <p className="text-gray-400 mb-6">The business you're looking for doesn't exist.</p>
        <Link href={getNavUrl("/user/discover")}>
          <Button className="bg-[#00d083] hover:bg-[#00b86f] text-black">
            Back to Discover
          </Button>
        </Link>
      </div>
    )
  }
  
  const claimOffer = async (offerId: string, offerTitle: string, businessName: string) => {
    const userId = walletPassId || 'anonymous-user'
    
    // Update UI immediately
    setClaimedOffers(prev => {
      const newClaimed = new Set([...prev, offerId])
      // Save to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem(`qwikker-claimed-${userId}`, JSON.stringify([...newClaimed]))
      }
      return newClaimed
    })
    
    // Store in database AND update wallet pass
    try {
      const { claimOffer: claimOfferAction } = await import('@/lib/actions/offer-claim-actions')
      const result = await claimOfferAction({
        offerId,
        offerTitle,
        businessName,
        businessId: business.id,
        visitorWalletPassId: walletPassId
      })
      
      // Show success message - wallet pass should be updated
      console.log('✅ Offer claimed and wallet pass updated:', result)
    } catch (error) {
      console.error('Failed to claim offer:', error)
      // UI already updated, so don't fail the user experience
    }
    
    // Create styled modal matching offers page
    const modalOverlay = document.createElement('div')
    modalOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm opacity-0 transition-opacity duration-300'
    
    const modal = document.createElement('div')
    modal.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 transform scale-95 transition-transform duration-300 shadow-2xl'
    modal.innerHTML = `
      <div class="text-center">
        <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-slate-100 mb-2">Pass Updated!</h3>
        <p class="text-slate-300 mb-1">"${offerTitle}"</p>
        <p class="text-slate-400 text-sm mb-2">from ${businessName}</p>
        <p class="text-slate-300 text-sm mb-2">Your wallet pass has been updated with this offer.</p>
        <p class="text-sm text-slate-400 mb-6">Check your mobile wallet to view the updated pass.</p>
        <button id="modal-close" class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200">
          Got it!
        </button>
      </div>
    `
    
    document.body.appendChild(modalOverlay)
    
    // Animate in
    requestAnimationFrame(() => {
      modalOverlay.style.opacity = '1'
      modal.style.transform = 'scale(1)'
    })
    
    // Close handler
    const closeModal = () => {
      modalOverlay.style.opacity = '0'
      modal.style.transform = 'scale(0.95)'
      setTimeout(() => {
        document.body.removeChild(modalOverlay)
        // Refresh the page to show updated offer state
        window.location.reload()
      }, 300)
    }
    
    modal.querySelector('#modal-close')?.addEventListener('click', closeModal)
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal()
    })
  }
  
  if (!business) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-slate-100 mb-4">Business Not Found</h1>
        <p className="text-slate-400 mb-6">The business you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href={getNavUrl("/user/discover")}>Back to Discover</Link>
        </Button>
      </div>
    )
  }

  // Get related data - Use real business offers from transformed data
  const businessOffers = business.offers || []
  const secretMenu = mockSecretMenus.find(menu => menu.businessId === business.id)
  
  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'menu', label: 'Menu', count: business.menuPreview?.length || 0 },
    { id: 'offers', label: 'Offers', count: businessOffers.length },
    { id: 'reviews', label: 'Reviews', count: business.reviewCount || 0 },
  ]

  const mockReviews = [
    {
      id: '1',
      author: 'Sarah M.',
      rating: 5,
      date: '2 days ago',
      comment: 'Absolutely incredible! The atmosphere is perfect and the staff are so friendly. Will definitely be back!'
    },
    {
      id: '2', 
      author: 'James K.',
      rating: 5,
      date: '1 week ago',
      comment: 'Hidden gem! The quality is outstanding and the prices are very reasonable. Highly recommend!'
    },
    {
      id: '3',
      author: 'Emma L.',
      rating: 4,
      date: '2 weeks ago',
      comment: 'Great experience overall. Love the ambiance and the service was excellent.'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Button variant="outline" asChild className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <Link href={getNavUrl("/user/discover")}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Discover
          </Link>
        </Button>
      </div>

      {/* Hero Section with Image Carousel */}
      <div className="relative h-64 md:h-80 rounded-xl overflow-hidden">
        <ImageCarousel
          images={business.images || []}
          alt={business.name}
          className="w-full h-full"
          showArrows={true}
          showDots={true}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        {/* Badges - Based on Subscription Plan */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {business.plan === 'spotlight' && (
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-sm px-3 py-1 rounded-full font-bold shadow-lg">
              QWIKKER PICK
            </span>
          )}
          {business.plan === 'featured' && (
            <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black text-sm px-3 py-1 rounded-full font-bold shadow-lg">
              FEATURED
            </span>
          )}
          {business.activeOffers > 0 && (
            <span className="bg-orange-500 text-slate-100 text-sm px-3 py-1 rounded-full shadow-lg">
              {business.activeOffers} ACTIVE OFFERS
            </span>
          )}
        </div>

        {/* Business Info Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">{business.name}</h1>
          <p className="text-xl text-[#00d083] mb-3">{business.tagline}</p>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-5 h-5 ${star <= business.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-slate-100 font-semibold text-lg">{business.rating}</span>
              <span className="text-slate-300">({business.reviewCount} reviews)</span>
            </div>
            <span className="text-slate-300">•</span>
            <span className="text-slate-300">{business.distance} miles away</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Button className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Book Now
        </Button>
        
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Get Directions
        </Button>
        
        {business.phone && (
          <Button 
            variant="outline" 
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => window.location.href = `tel:${business.phone}`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call Now
          </Button>
        )}
        
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Save
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
            }`}
          >
            <span className="block sm:inline">{tab.label}</span>
            {tab.count !== null && (
              <span className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                activeTab === tab.id ? 'bg-black/20' : 'bg-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* About Section */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">About {business.name}</CardTitle>
              </CardHeader>
              <CardContent>
            <p className="text-slate-300 leading-relaxed mb-4">
              {business.description}
            </p>
            
            {/* Gamification Info */}
            
            {business.specialties && business.specialties.length > 0 && (
              <div>
                <p className="text-slate-100 font-medium mb-2">What makes us special:</p>
                <div className="flex flex-wrap gap-2">
                  {business.specialties.map((specialty, index) => (
                    <span 
                      key={index}
                      className="bg-[#00d083]/10 border border-[#00d083]/20 text-[#00d083] px-3 py-1 rounded-full text-sm"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}
              </CardContent>
            </Card>

            {/* Contact & Location Info */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Location & Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <p className="text-slate-100 font-medium">Address</p>
                        <p className="text-slate-400">{business.address}, {business.town}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-slate-100 font-medium">Hours</p>
                        <div className="text-slate-400">
                          {business.fullSchedule ? (
                            <div className="space-y-1">
                              {business.fullSchedule.split('\n').map((line: string, index: number) => (
                                <div key={index} className="text-sm">
                                  {line}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p>{business.hours}</p>
                          )}
                        </div>
                        {(() => {
                          const status = getBusinessStatusProps(business.hours)
                          return (
                            <span className={`${status.statusColor} text-sm font-medium`}>
                              {status.statusText}
                              {status.nextChange && (
                                <span className="text-slate-500 ml-2">• {status.nextChange}</span>
                              )}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <div>
                        <p className="text-slate-100 font-medium">Category</p>
                        <p className="text-slate-400">{business.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div>
                        <p className="text-slate-100 font-medium">Special Features</p>
                        <div className="flex gap-2 mt-1">
                          {business.hasSecretMenu && (
                            <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                              Secret Menu
                            </span>
                          )}
                          <span className="bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs px-2 py-1 rounded-full">
                            Highly Rated
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Offers */}
            {businessOffers.length > 0 && (
              <Card className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-700/30">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Active Offers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {businessOffers.map((offer) => {
                      const isClaimed = claimedOffers.has(offer.id)
                      const claimedOfferData = mockClaimedOffers.find(co => co.offerId === offer.id)
                      
                      return (
                        <div key={offer.id} className="bg-slate-700/50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="text-slate-100 font-semibold mb-1">{offer.title}</h4>
                              <p className="text-slate-300 text-sm mb-2">{offer.description}</p>
                              <p className="text-slate-400 text-xs">{offer.terms}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button className="p-2 bg-slate-600/50 hover:bg-red-500/20 rounded-full transition-colors duration-200">
                                <svg className="w-4 h-4 text-slate-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              </button>
                              <span className="bg-orange-500 text-slate-100 text-sm px-3 py-1 rounded-full font-bold">
                                {offer.badge}
                              </span>
                            </div>
                          </div>
                          
                          {isClaimed && (
                            <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg p-2 mb-3">
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-green-400 text-sm font-medium">
                                {claimedOfferData?.status === 'redeemed' ? 'Redeemed' : 
                                 claimedOfferData?.status === 'wallet_added' ? 'In Your Wallet' : 'Claimed'}
                              </span>
                              {claimedOfferData?.redemptionCode && (
                                <span className="text-xs text-slate-400 ml-auto">
                                  Code: {claimedOfferData.redemptionCode}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            {!isClaimed ? (
                              <Button 
                                onClick={() => claimOffer(offer.id, offer.title, business.name)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold text-sm"
                              >
                                Claim Offer
                              </Button>
                            ) : claimedOfferData?.status === 'redeemed' ? (
                              <Button 
                                disabled
                                className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 font-semibold text-sm cursor-not-allowed"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Already Redeemed
                              </Button>
                            ) : (
                              <AddToWalletButton 
                                offer={{
                                  id: offer.id,
                                  title: offer.title,
                                  description: offer.description,
                                  business_name: business.name,
                                  valid_until: offer.valid_until,
                                  terms: offer.terms,
                                  offer_value: offer.discount || offer.type
                                }}
                                userWalletPassId={walletPassId}
                                variant="default"
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-sm"
                              />
                            )}
                            
                            {/* Only show Ask AI for non-redeemed offers */}
                            {claimedOfferData?.status !== 'redeemed' && (
                              <Button 
                                asChild
                                variant="outline" 
                                className="border-[#00d083]/50 text-[#00d083] hover:bg-[#00d083]/10 text-sm"
                              >
                                <Link href={getNavUrl(`/user/chat?business=${business.name}&topic=offer&offer=${offer.title}`)}>
                                  Ask About Offer
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* AI Chat Prompt - Primary CTA */}
            <Card className="bg-gradient-to-br from-[#00d083]/10 to-[#00b86f]/10 border-[#00d083]/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#00d083]/20 to-transparent rounded-bl-full"></div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full">
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-100 mb-2">Discover the Full Menu with AI</h3>
                    <p className="text-slate-300 mb-4">
                      Chat with your local guide to explore the complete menu, get personalized recommendations, and discover hidden gems!
                    </p>
                    <Button asChild className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold">
                      <Link href={getNavUrl(`/user/chat?business=${business.name}`)}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Ask About {business.name}'s Menu
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Featured Menu Items - Secondary */}
            {business.menuPreview && business.menuPreview.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-100">Featured Menu Items</CardTitle>
                  <span className="text-slate-400 text-sm">Our most popular dishes</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {business.menuPreview && business.menuPreview.map((item: any, index: number) => (
                    <div key={index} className="flex items-start justify-between py-4 border-b border-slate-600 last:border-b-0">
                      <div className="flex-1">
                        <p className="text-slate-100 font-medium text-lg">{item.name}</p>
                        {item.description && (
                          <p className="text-slate-400 text-sm mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-[#00d083]/10 text-[#00d083] text-xs px-2 py-1 rounded-full">
                            Popular Choice
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className="text-[#00d083] font-bold text-xl">{formatPrice(item.price)}</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* See More Prompt */}
                  <div className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600 text-center">
                    <p className="text-slate-300 text-sm mb-3">
                      Want to see the full menu, daily specials, and get personalized recommendations?
                    </p>
                    <Button asChild variant="outline" className="border-[#00d083] text-[#00d083] hover:bg-[#00d083]/10">
                      <Link href={getNavUrl(`/user/chat?business=${business.name}`)}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat for Full Menu
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
                
            {/* Secret Menu - Enhanced with Chat CTA */}
            {secretMenu && (
              <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-700/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full"></div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                      <svg className="w-5 h-5 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-purple-300 font-semibold text-lg">Secret Menu Preview</h4>
                      <p className="text-purple-200 text-sm">Exclusive off-menu items</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {secretMenu.items.slice(0, 2).map((item, index) => (
                      <div key={index} className="flex items-start justify-between bg-slate-800/30 rounded-lg p-3">
                        <div className="flex-1">
                          <p className="text-slate-100 font-medium">{item.name}</p>
                          <p className="text-slate-300 text-sm">{item.description}</p>
                        </div>
                        {item.price && (
                          <span className="text-purple-400 font-semibold ml-4">{item.price}</span>
                        )}
                      </div>
                    ))}
                    {secretMenu.items.length > 2 && (
                      <div className="bg-slate-800/30 rounded-lg p-3 text-center border-2 border-dashed border-purple-500/30">
                        <p className="text-purple-300 text-sm font-medium mb-2">
                          + {secretMenu.items.length - 2} more secret items
                        </p>
                        <p className="text-slate-400 text-xs">Ask your AI guide to unlock them all</p>
                      </div>
                    )}
                  </div>

                  <Button asChild className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-slate-100 font-semibold">
                    <Link href={getNavUrl(`/user/chat?business=${business.name}&topic=secret-menu`)}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Unlock All Secret Items
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="space-y-4">
            {businessOffers.length > 0 ? (
              businessOffers.map((offer) => (
                <Card key={offer.id} className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-700/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-100 mb-2">{offer.title}</h3>
                        <p className="text-slate-300 mb-3">{offer.description}</p>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-400"><strong>Terms:</strong> {offer.terms}</p>
                          <p className="text-sm text-slate-400"><strong>Valid until:</strong> {offer.expiryDate}</p>
                        </div>
                      </div>
                      <div className="ml-6 space-y-3 w-[160px] flex-shrink-0">
                        <button 
                          onClick={() => claimOffer(offer.id, offer.title, business.name)}
                          className="w-full h-11 px-4 py-2 bg-[#00d083] text-black font-semibold rounded-lg text-sm hover:opacity-80 cursor-pointer"
                        >
                          Claim Offer
                        </button>
                        <Link 
                          href={`${getNavUrl('/user/offers')}${walletPassId ? '&' : '?'}highlight=${business.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          className="w-full h-11 px-4 py-2 border border-slate-600 text-slate-300 font-semibold rounded-lg text-sm flex items-center justify-center hover:opacity-80 cursor-pointer"
                        >
                          View Offer
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center">
                  <p className="text-slate-400">No active offers at the moment.</p>
                  <p className="text-gray-500 text-sm mt-2">Check back later for exclusive deals!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {mockReviews.map((review) => (
              <Card key={review.id} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-slate-100 font-semibold">{review.author}</h4>
                      <p className="text-slate-400 text-sm">{review.date}</p>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{review.comment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
