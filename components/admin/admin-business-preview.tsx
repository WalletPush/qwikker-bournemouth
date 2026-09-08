'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { BusinessCardImage } from '@/components/ui/business-card-image'
import { resolveSystemCategory } from '@/lib/utils/resolve-system-category'
import { getBusinessStatusProps } from '@/lib/utils/business-hours'
import {
  formatBusinessHours,
  getFullWeeklyScheduleArray,
} from '@/lib/utils/business-hours-formatter'
import { getHeroLine } from '@/lib/utils/business-labels'
import { getFeaturedItemsLabels } from '@/lib/utils/featured-items-labels'
interface AdminBusinessPreviewProps {
  business: any
  onClose: () => void
}

/**
 * Admin “User View” click-through — mirrors the public listing content
 * (hours, booking CTAs, offers, featured items, secret menu, vibes).
 */
export function AdminBusinessPreview({ business, onClose }: AdminBusinessPreviewProps) {
  const systemCategory = resolveSystemCategory(business)
  const itemLabels = getFeaturedItemsLabels(systemCategory)

  const hoursStatus = (() => {
    const raw = business.hours || business.business_hours
    const structured = business.hours_structured || business.business_hours_structured
    if (!raw && !structured) return null
    return getBusinessStatusProps(raw, structured)
  })()

  const fullScheduleText = formatBusinessHours(
    business.hours || business.business_hours,
    business.business_hours_structured,
    true
  )
  const scheduleRows = getFullWeeklyScheduleArray(business.business_hours_structured)

  const offers = business.offers || []
  const menuPreview = (business.menuPreview || []).filter((i: { name?: string }) => i?.name?.trim())
  const secretItems = business.secretMenuItems || []
  const vibeTags = (() => {
    const vt = business.vibe_tags as { selected?: string[]; custom?: string[] } | null
    if (!vt) return []
    return [...(vt.selected || []), ...(vt.custom || [])].filter(Boolean)
  })()

  const pref = business.booking_preference as string | null
  const showBookUrl = pref === 'url' && Boolean(business.booking_url)
  const showBookPhone = pref === 'phone' && Boolean(business.phone)
  const showBookEmail = pref === 'phone' && Boolean(business.email)

  const categoryLabel = (() => {
    if (business.google_primary_type) {
      return String(business.google_primary_type)
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
    return business.display_category || business.category || 'Business'
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-slate-800/90 hover:bg-slate-700 backdrop-blur-sm text-white transition-colors"
          aria-label="Close preview"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero Image */}
        <div className="relative h-56 md:h-72 overflow-hidden">
          {business.status === 'unclaimed' ||
          !business.images ||
          business.images.length === 0 ||
          (business.images.length === 1 && business.images[0] === '/placeholder-business.jpg') ? (
            <BusinessCardImage
              businessName={business.name}
              businessId={business.id}
              systemCategory={systemCategory}
              placeholderVariant={business.placeholder_variant}
              customPlaceholderUrl={business.placeholder_custom_url}
              heroMedia={business.heroMedia || null}
              showUnclaimedBadge={false}
              className="h-full w-full"
            />
          ) : (
            <ImageCarousel
              images={business.images || []}
              alt={business.name}
              className="w-full h-full"
              showArrows={true}
              showDots={true}
            />
          )}

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

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
            {offers.length > 0 && (
              <span className="bg-slate-800/80 backdrop-blur-sm text-slate-100 text-xs px-3 py-1 rounded-full border border-slate-600/50">
                {offers.length} {offers.length === 1 ? 'Offer' : 'Offers'}
              </span>
            )}
            {business.status === 'unclaimed' && (
              <span className="bg-slate-800/80 backdrop-blur-sm text-slate-300 text-xs px-3 py-1 rounded-full border border-slate-600/50">
                Unclaimed
              </span>
            )}
          </div>

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
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 01-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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

        <div className="p-6 space-y-6">
          <p className="text-xs text-slate-500 -mt-2">
            Admin preview of what customers see on the listing. Wallet save/redeem is disabled here.
          </p>

          {/* Booking + contact CTAs (same rules as live page) */}
          {(showBookUrl || showBookPhone || showBookEmail || business.phone || business.website || business.google_place_id) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {showBookUrl && (
                <Button
                  className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold"
                  onClick={() => {
                    const url = String(business.booking_url).startsWith('http')
                      ? business.booking_url
                      : `https://${business.booking_url}`
                    window.open(url, '_blank', 'noopener,noreferrer')
                  }}
                >
                  Book Now
                </Button>
              )}
              {showBookPhone && (
                <Button
                  className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold"
                  onClick={() => {
                    window.location.href = `tel:${business.phone}`
                  }}
                >
                  Book by Phone
                </Button>
              )}
              {showBookEmail && (
                <Button
                  className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold"
                  onClick={() => {
                    const subject = encodeURIComponent(`Booking enquiry — ${business.name}`)
                    window.location.href = `mailto:${business.email}?subject=${subject}`
                  }}
                >
                  Book by Email
                </Button>
              )}
              {business.phone && !showBookPhone && (
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    window.location.href = `tel:${business.phone}`
                  }}
                >
                  Call Now
                </Button>
              )}
              {business.website && (
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    const url = String(business.website).startsWith('http')
                      ? business.website
                      : `https://${business.website}`
                    window.open(url, '_blank', 'noopener,noreferrer')
                  }}
                >
                  Website
                </Button>
              )}
            </div>
          )}

          {/* About */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">About {business.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 leading-relaxed">
                {business.description || (
                  <span className="text-slate-500 italic">
                    This business hasn&apos;t added a description yet.
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Location, hours, contact */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Location & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(business.address || business.town) && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#00d083] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-slate-300">
                    {[business.address, business.town, business.postcode].filter(Boolean).join(', ')}
                  </span>
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

              {business.email && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-300">{business.email}</span>
                </div>
              )}

              {business.website && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="text-slate-300 truncate">{business.website}</span>
                </div>
              )}

              {(business.instagram_handle || business.facebook_url) && (
                <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                  {business.instagram_handle && (
                    <span className="rounded-md border border-slate-600 px-2 py-1">
                      IG @{String(business.instagram_handle).replace(/^@/, '')}
                    </span>
                  )}
                  {business.facebook_url && (
                    <span className="rounded-md border border-slate-600 px-2 py-1">Facebook</span>
                  )}
                </div>
              )}

              {/* Hours status + full week (what users see) */}
              {(hoursStatus || scheduleRows.length > 0 || fullScheduleText) && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#00d083] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="min-w-0 flex-1 space-y-2">
                    {hoursStatus && (
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
                    )}
                    {scheduleRows.length > 0 ? (
                      <ul className="divide-y divide-slate-700/60 rounded-lg border border-slate-700/50 overflow-hidden">
                        {scheduleRows.map((row) => (
                          <li
                            key={row.day}
                            className="flex items-center justify-between gap-4 bg-slate-900/40 px-3 py-1.5 text-sm"
                          >
                            <span className="text-slate-400">{row.day}</span>
                            <span className="text-right text-slate-200">{row.hours}</span>
                          </li>
                        ))}
                      </ul>
                    ) : fullScheduleText ? (
                      <div className="text-sm text-slate-400 whitespace-pre-line">{fullScheduleText}</div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-slate-300">{categoryLabel}</span>
              </div>

              {(business.hasSecretMenu || business.hasLoyalty || vibeTags.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {business.hasSecretMenu && (
                    <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                      Secret Menu
                    </span>
                  )}
                  {business.hasLoyalty && (
                    <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs px-2 py-1 rounded-full">
                      Loyalty
                      {business.loyaltyMemberCount != null ? ` · ${business.loyaltyMemberCount}` : ''}
                    </span>
                  )}
                  {vibeTags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-slate-700/50 border border-slate-600/40 text-slate-300 text-xs px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offers */}
          {offers.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Active Offers ({offers.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {offers.map((offer: {
                  id: string
                  title?: string
                  value?: string
                  type?: string
                  image?: string | null
                  terms?: string | null
                  description?: string | null
                }) => (
                  <div
                    key={offer.id}
                    className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30"
                  >
                    {offer.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={offer.image}
                        alt={offer.title || 'Offer'}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-slate-500 flex-shrink-0">
                        Offer
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-100 font-medium">{offer.title || 'Untitled offer'}</p>
                      {(offer.value || offer.type) && (
                        <p className="text-[#00d083] text-sm">
                          {[offer.value, offer.type].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {offer.description && (
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{offer.description}</p>
                      )}
                      {offer.terms && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{offer.terms}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Featured / menu preview */}
          {menuPreview.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">{itemLabels.sectionTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {menuPreview.map((item: {
                    name: string
                    price?: string
                    description?: string
                    image_url?: string
                  }, idx: number) => (
                    <li
                      key={`${item.name}-${idx}`}
                      className="flex gap-3 rounded-lg border border-slate-600/30 bg-slate-700/20 px-3 py-2"
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-md object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        {item.price && <p className="text-xs text-[#00d083]">{item.price}</p>}
                        {item.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Secret menu */}
          {secretItems.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Secret Menu ({secretItems.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {secretItems.map((item: {
                  name: string
                  description?: string
                  price?: string
                  image_url?: string
                }, idx: number) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex gap-3 rounded-lg border border-purple-500/20 bg-purple-950/20 px-3 py-2"
                  >
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{item.name}</p>
                      {item.price && <p className="text-xs text-[#00d083]">{item.price}</p>}
                      {item.description && (
                        <p className="mt-0.5 text-xs text-slate-400">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
