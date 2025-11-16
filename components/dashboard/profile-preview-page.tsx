'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessCard } from '@/components/user/business-card'
import { Button } from '@/components/ui/button'
import { formatBusinessHours } from '@/lib/utils/business-hours-formatter'

interface ProfilePreviewPageProps {
  profile: any
}

export function ProfilePreviewPage({ profile }: ProfilePreviewPageProps) {
  const router = useRouter()
  const [showHero, setShowHero] = useState(false)

  // Transform profile data to match BusinessCard format
  const businessData = {
    id: profile.id,
    name: profile.business_name || 'Your Business',
    category: profile.business_category || profile.business_type || 'Business',
    location: profile.business_town || '',
    address: profile.business_address || '',
    town: profile.business_town || '',
    tagline: profile.business_tagline || '',
    description: profile.business_description || '',
    hours: formatBusinessHours(profile.business_hours, profile.business_hours_structured),
    fullSchedule: formatBusinessHours(profile.business_hours, profile.business_hours_structured, true),
    images: profile.business_images && profile.business_images.length > 0 
      ? profile.business_images 
      : profile.logo 
      ? [profile.logo]
      : ['/placeholder-business.jpg'],
    logo: profile.logo || '/placeholder-logo.jpg',
    slug: profile.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || profile.id,
    offers: profile.business_offers?.filter((offer: any) => offer.status === 'approved') || [],
    plan: profile.plan || 'starter',
    rating: profile.rating || 4.5,
    reviewCount: profile.review_count || 0,
    menuPreview: profile.menu_preview || [],
    hasSecretMenu: false, // Can add secret menu detection if needed
    activeOffers: profile.business_offers?.filter((offer: any) => offer.status === 'approved')?.length || 0
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Preview Your Listing</h1>
            <p className="text-slate-400 mt-2">
              This is how your business will appear to customers. Click the card to see the full hero view.
            </p>
          </div>
        </div>

        {/* Preview Card - Centered */}
        <div className="max-w-md mx-auto">
          <BusinessCard 
            business={businessData}
            onClick={() => setShowHero(true)}
            showDistance={false}
          />
        </div>

        {/* Action Buttons */}
        <div className="max-w-md mx-auto flex gap-4 pt-4">
          <Button
            onClick={() => router.push('/dashboard/profile')}
            variant="outline"
            size="lg"
            className="flex-1 border-2 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
          >
            I Want to Change Something
          </Button>
          
          <Button
            onClick={() => router.push('/dashboard/action-items')}
            size="lg"
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] border-2 border-green-400/30"
          >
            I'm Happy - Submit!
          </Button>
        </div>
      </div>
      
      {/* Hero Modal - Full Screen */}
      {showHero && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowHero(false)}>
          <div className="max-w-4xl w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Hero Image */}
            <div className="relative h-96 overflow-hidden">
              <img 
                src={businessData.images[0]} 
                alt={businessData.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
              
              {/* Close Button */}
              <button
                onClick={() => setShowHero(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Logo */}
              {businessData.logo && (
                <div className="absolute bottom-4 left-4">
                  <img 
                    src={businessData.logo} 
                    alt={`${businessData.name} logo`}
                    className="w-20 h-20 rounded-xl border-4 border-white/20 shadow-xl object-cover"
                  />
                </div>
              )}

              {/* Business Name Overlay */}
              <div className="absolute bottom-4 left-28">
                <h2 className="text-3xl font-bold text-white">{businessData.name}</h2>
                <p className="text-[#00d083] text-lg font-medium mt-1">{businessData.tagline}</p>
              </div>
            </div>

            {/* Business Details */}
            <div className="p-8 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-xl font-bold text-white mb-2">About</h3>
                <p className="text-slate-300">{businessData.description}</p>
              </div>

              {/* Hours */}
              {businessData.fullSchedule && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Opening Hours</h3>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans">{businessData.fullSchedule}</pre>
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Location</h3>
                <div className="flex items-center gap-2 text-slate-300">
                  <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{businessData.address}, {businessData.town}</span>
                </div>
              </div>

              {/* Offers */}
              {businessData.activeOffers > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Current Offers</h3>
                  <div className="grid gap-3">
                    {profile.business_offers?.filter((offer: any) => offer.status === 'approved').map((offer: any) => (
                      <div key={offer.id} className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-4">
                        <h4 className="text-orange-300 font-bold">{offer.offer_name}</h4>
                        <p className="text-slate-400 text-sm mt-1">{offer.offer_terms}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

