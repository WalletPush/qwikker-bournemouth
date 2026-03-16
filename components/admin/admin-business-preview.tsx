'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { BusinessCardImage } from '@/components/ui/business-card-image'
import { resolveSystemCategory } from '@/lib/utils/resolve-system-category'
import { getBusinessStatusProps } from '@/lib/utils/business-hours'
import { getHeroLine } from '@/lib/utils/business-labels'

interface AdminBusinessPreviewProps {
  business: any
  onClose: () => void
}

export function AdminBusinessPreview({ business, onClose }: AdminBusinessPreviewProps) {
  const systemCategory = resolveSystemCategory(business)

  const hoursStatus = (() => {
    const raw = business.hours || business.business_hours
    const structured = business.hours_structured || business.business_hours_structured
    if (!raw && !structured) return null
    return getBusinessStatusProps(raw, structured)
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 rounded-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-slate-800/90 hover:bg-slate-700 backdrop-blur-sm text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero Image */}
        <div className="relative h-64 md:h-80 overflow-hidden">
          {business.status === 'unclaimed' || (!business.images || business.images.length === 0 || (business.images.length === 1 && business.images[0] === '/placeholder-business.jpg')) ? (
            <BusinessCardImage
              businessName={business.name}
              businessId={business.id}
              systemCategory={systemCategory}
              placeholderVariant={business.placeholder_variant}
              showUnclaimedBadge={false}
              className="h-full w-full"
            />
          ) : (
            <>
              <ImageCarousel
                images={business.images || []}
                alt={business.name}
                className="w-full h-full"
                showArrows={true}
                showDots={true}
              />
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Tier badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            {business.plan === 'spotlight' && (
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs px-3 py-1 rounded-full font-extrabold shadow-lg uppercase tracking-wide">
                QWIKKER PICK
              </span>
            )}
            {business.plan === 'featured' && (
              <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black text-xs px-3 py-1 rounded-full font-extrabold shadow-lg uppercase tracking-wide">
                FEATURED
              </span>
            )}
            {business.status === 'unclaimed' && (
              <span className="bg-slate-800/80 backdrop-blur-sm text-slate-300 text-xs px-3 py-1 rounded-full border border-slate-600/50">
                Unclaimed
              </span>
            )}
          </div>

          {/* Business info overlay */}
          <div className="absolute bottom-4 left-4 right-14">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-1">{business.name}</h1>
            <p className="text-lg text-[#00d083]">
              {getHeroLine({
                business_tagline: business.tagline || business.business_tagline,
                business_town: business.town || business.business_town,
                google_types: business.google_types,
                google_primary_type: business.google_primary_type,
                display_category: business.display_category,
                system_category: business.system_category,
              })}
            </p>

            {/* Rating */}
            {business.rating > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${star <= Math.round(business.rating) ? 'text-yellow-400' : 'text-gray-600'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-slate-100 font-semibold">{business.rating}</span>
                {business.reviewCount > 0 && (
                  <span className="text-slate-300 text-sm">({business.reviewCount})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* About */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">About {business.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 leading-relaxed">
                {business.description || (
                  <span className="text-slate-500 italic">
                    This business hasn't added a description yet.
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Location & Contact */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Location & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(business.address || business.town) && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-slate-300">{[business.address, business.town].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {business.phone && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-slate-300">{business.phone}</span>
                </div>
              )}

              {business.website && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="text-slate-300">{business.website}</span>
                </div>
              )}

              {/* Hours */}
              {hoursStatus && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#00d083] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className={`text-sm font-medium ${hoursStatus.isOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                      {hoursStatus.isOpen ? 'Open' : 'Closed'}
                    </span>
                    {hoursStatus.nextChange && (
                      <span className="text-slate-400 text-sm ml-1">
                        &middot; {hoursStatus.nextChange}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-slate-300">{business.category || 'Uncategorized'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Offers */}
          {business.offers && business.offers.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Active Offers ({business.offers.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {business.offers.map((offer: any) => (
                  <div key={offer.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    {offer.image && (
                      <img src={offer.image} alt={offer.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-100 font-medium truncate">{offer.title}</p>
                      {offer.value && <p className="text-[#00d083] text-sm">{offer.value}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Special Features */}
          {(business.hasSecretMenu || business.hasLoyalty) && (
            <div className="flex flex-wrap gap-2">
              {business.hasSecretMenu && (
                <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm px-3 py-1 rounded-full">
                  Secret Menu
                </span>
              )}
              {business.hasLoyalty && (
                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm px-3 py-1 rounded-full">
                  Loyalty Program
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
