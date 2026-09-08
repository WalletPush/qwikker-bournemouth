'use client'

import { ImageCarousel } from '@/components/ui/image-carousel'
import { BusinessCardImage } from '@/components/ui/business-card-image'
import type { BusinessCRMData } from '@/types/billing'
import { getBusinessStatus, getFullWeeklyScheduleArray } from '@/lib/utils/business-hours-formatter'
import { resolveSystemCategory } from '@/lib/utils/resolve-system-category'
import { getFeaturedItemsLabels } from '@/lib/utils/featured-items-labels'

interface CrmListingPreviewTabProps {
  business: BusinessCRMData
}

type ListingBusiness = BusinessCRMData & {
  business_description?: string | null
  business_tagline?: string | null
  booking_preference?: string | null
  booking_url?: string | null
  email?: string | null
}

/**
 * Read-only public listing preview inside Manage —
 * same customer-facing content as the live page (hero, CTAs, hours, offers, etc.).
 */
export function CrmListingPreviewTab({ business }: CrmListingPreviewTabProps) {
  const record = business as ListingBusiness

  const images = (business.business_images || []).filter(Boolean)
  const offers = (business.business_offers || []).filter(
    (o: { status?: string }) => !o.status || o.status === 'approved' || o.status === 'active'
  )
  const schedule = getFullWeeklyScheduleArray(business.business_hours_structured)
  const hoursStatus = getBusinessStatus(
    business.business_hours,
    business.business_hours_structured
  )
  const systemCategory = resolveSystemCategory(business)
  const itemLabels = getFeaturedItemsLabels(systemCategory)
  const secretItems = (business.secret_menu_items || []).filter(
    (i) => !i.status || i.status === 'approved'
  )
  const menus = business.business_menus || []
  const menuPreview = (business.menu_preview || []).filter((i) => i.name?.trim())
  const description = record.business_description?.trim()
  const tagline = record.business_tagline?.trim()
  const category =
    business.display_category ||
    business.business_category ||
    (business.google_primary_type
      ? business.google_primary_type.replace(/_/g, ' ')
      : null)

  const vibeTags = (() => {
    const vt = business.vibe_tags
    if (!vt) return []
    return [...(vt.selected || []), ...(vt.custom || [])].filter(Boolean)
  })()

  const pref = record.booking_preference
  const showBookUrl = pref === 'url' && Boolean(record.booking_url)
  const showBookPhone = pref === 'phone' && Boolean(business.phone)
  const showBookEmail = pref === 'phone' && Boolean(record.email)
  const hasBookingCtas = showBookUrl || showBookPhone || showBookEmail

  return (
    <div className="space-y-6 pb-4">
      <p className="text-sm text-slate-400">
        Full public listing preview — scroll for hours, offers, featured items, and contact.
        Edit elsewhere in Manage.
      </p>

      {/* Hero — compact so the rest of the public listing stays visible */}
      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60">
        <div className="relative h-40 sm:h-48 w-full bg-slate-800">
          {images.length > 0 ? (
            <ImageCarousel
              images={images}
              alt={business.business_name}
              className="absolute inset-0 h-full w-full"
              showArrows={images.length > 1}
              showDots={images.length > 1}
            />
          ) : (
            <BusinessCardImage
              businessName={business.business_name}
              businessId={business.id}
              systemCategory={systemCategory}
              placeholderVariant={business.placeholder_variant}
              customPlaceholderUrl={business.placeholder_custom_url}
              showUnclaimedBadge={business.status === 'unclaimed'}
              className="absolute inset-0 h-full w-full"
            />
          )}
          {offers.length > 0 && (
            <span className="absolute top-3 left-3 z-10 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-white border border-slate-600/50">
              {offers.length} {offers.length === 1 ? 'Offer' : 'Offers'}
            </span>
          )}
        </div>
        <div className="space-y-2 border-t border-slate-700/50 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-xl font-semibold text-white">{business.business_name}</h3>
            {category && (
              <span className="text-sm capitalize text-slate-400">{category}</span>
            )}
          </div>
          {tagline && <p className="text-sm text-[#00d083]">{tagline}</p>}
          {(business.rating || business.review_count) && (
            <p className="text-sm text-slate-300">
              {business.rating != null && (
                <span className="font-medium text-white">{business.rating.toFixed(1)}</span>
              )}
              {business.review_count != null && (
                <span className="text-slate-400"> · {business.review_count} reviews</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Booking CTAs — same rules as live listing */}
      {hasBookingCtas && (
        <section className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Booking
          </h4>
          <div className="flex flex-wrap gap-2">
            {showBookUrl && (
              <span className="rounded-md bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/40 px-3 py-1.5 text-sm font-medium text-[#00d083]">
                Book Now
              </span>
            )}
            {showBookPhone && (
              <span className="rounded-md bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/40 px-3 py-1.5 text-sm font-medium text-[#00d083]">
                Book by Phone
              </span>
            )}
            {showBookEmail && (
              <span className="rounded-md bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/40 px-3 py-1.5 text-sm font-medium text-[#00d083]">
                Book by Email
              </span>
            )}
          </div>
          {showBookUrl && record.booking_url && (
            <p className="truncate text-xs text-slate-500">{record.booking_url}</p>
          )}
        </section>
      )}

      {/* About */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">About</h4>
        <p className="text-sm leading-relaxed text-slate-300">
          {description || (
            <span className="italic text-slate-500">No description yet.</span>
          )}
        </p>
        {vibeTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {vibeTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-600/50 bg-slate-800/60 px-2.5 py-0.5 text-xs text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Hours */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Opening hours
          </h4>
          {schedule.length > 0 && (
            <span
              className={`text-sm font-medium ${
                hoursStatus.isOpen ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {hoursStatus.statusText}
              {hoursStatus.nextChange ? ` · ${hoursStatus.nextChange}` : ''}
            </span>
          )}
        </div>
        {schedule.length > 0 ? (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-700/50 overflow-hidden">
            {schedule.map((row) => (
              <li
                key={row.day}
                className="flex items-center justify-between gap-4 bg-slate-900/40 px-3 py-2 text-sm"
              >
                <span className="text-slate-400">{row.day}</span>
                <span className="text-right text-slate-200">{row.hours}</span>
              </li>
            ))}
          </ul>
        ) : business.business_hours ? (
          <p className="whitespace-pre-line text-sm text-slate-300">{business.business_hours}</p>
        ) : (
          <p className="text-sm italic text-slate-500">No hours set.</p>
        )}
      </section>

      {/* Contact */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Contact</h4>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Address</dt>
            <dd className="text-slate-200">
              {[business.business_address, business.business_town, business.business_postcode]
                .filter(Boolean)
                .join(', ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Phone</dt>
            <dd className="text-slate-200">{business.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="truncate text-slate-200">{record.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Website</dt>
            <dd className="truncate text-slate-200">{business.website_url || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Social</dt>
            <dd className="text-slate-200">
              {[
                business.instagram_handle && `IG ${business.instagram_handle}`,
                business.facebook_url && 'Facebook',
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Offers */}
      <section className="space-y-3">
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Offers {offers.length > 0 ? `(${offers.length})` : ''}
        </h4>
        {offers.length > 0 ? (
          <ul className="space-y-2">
            {offers.map((offer: {
              id?: string
              offer_name?: string
              offer_value?: string
              offer_type?: string
              offer_image?: string | null
              offer_terms?: string | null
            }, idx: number) => (
              <li
                key={offer.id || idx}
                className="flex gap-3 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3"
              >
                {offer.offer_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={offer.offer_image}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-800 text-xs text-slate-500">
                    Offer
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">
                    {offer.offer_name || 'Untitled offer'}
                  </p>
                  {(offer.offer_value || offer.offer_type) && (
                    <p className="text-sm text-[#00d083]">
                      {[offer.offer_value, offer.offer_type].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {offer.offer_terms && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{offer.offer_terms}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-slate-500">No active offers.</p>
        )}
      </section>

      {/* Featured / menu preview */}
      {menuPreview.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {itemLabels.sectionTitle}
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {menuPreview.map((item, idx) => (
              <li
                key={`${item.name}-${idx}`}
                className="flex gap-3 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2"
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
        </section>
      )}

      {/* Secret menu */}
      {secretItems.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Secret menu ({secretItems.length})
          </h4>
          <ul className="space-y-2">
            {secretItems.map((item, idx) => (
              <li
                key={`${item.itemName}-${idx}`}
                className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2"
              >
                <p className="text-sm font-medium text-white">{item.itemName}</p>
                {item.price && <p className="text-xs text-[#00d083]">{item.price}</p>}
                {item.description && (
                  <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Menus */}
      {menus.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Menus / PDFs ({menus.length})
          </h4>
          <ul className="space-y-1 text-sm">
            {menus.map((menu) => (
              <li key={menu.id} className="flex items-center justify-between gap-3 text-slate-300">
                <span className="truncate">{menu.menu_name}</span>
                <span className="shrink-0 text-xs capitalize text-slate-500">{menu.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Flags */}
      <div className="flex flex-wrap gap-2 pt-1">
        {business.loyalty_program_status === 'active' && (
          <span className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300">
            Loyalty active
            {business.loyalty_member_count != null ? ` · ${business.loyalty_member_count}` : ''}
          </span>
        )}
        {secretItems.length > 0 && (
          <span className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300">
            Secret menu
          </span>
        )}
        {images.length === 0 && (
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
            No photos
          </span>
        )}
        {!schedule.length && !business.business_hours && (
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
            No hours
          </span>
        )}
      </div>
    </div>
  )
}
