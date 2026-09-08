'use client'

import { ImageCarousel } from '@/components/ui/image-carousel'
import { BusinessCardImage } from '@/components/ui/business-card-image'
import type { BusinessCRMData } from '@/types/billing'
import { getBusinessStatus, getFullWeeklyScheduleArray } from '@/lib/utils/business-hours-formatter'
import { resolveSystemCategory } from '@/lib/utils/resolve-system-category'

interface CrmListingPreviewTabProps {
  business: BusinessCRMData
}

/**
 * Read-only full listing preview inside Manage — hours, offers, images, contact.
 * Complements the page-level User View cards which are intentionally lighter.
 */
export function CrmListingPreviewTab({ business }: CrmListingPreviewTabProps) {
  const record = business as BusinessCRMData & {
    business_description?: string | null
    business_tagline?: string | null
  }

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
  const secretItems = (business.secret_menu_items || []).filter(
    (i) => !i.status || i.status === 'approved'
  )
  const menus = business.business_menus || []
  const description = record.business_description?.trim()
  const tagline = record.business_tagline?.trim()
  const category =
    business.display_category ||
    business.business_category ||
    (business.google_primary_type
      ? business.google_primary_type.replace(/_/g, ' ')
      : null)

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        What customers see on the listing — photos, hours, offers, and contact. Edit elsewhere in Manage.
      </p>

      {/* Hero */}
      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60">
        <div className="relative h-52 sm:h-64 bg-slate-800">
          {images.length > 0 ? (
            <ImageCarousel
              images={images}
              alt={business.business_name}
              className="h-full w-full"
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
              className="h-full w-full"
            />
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

      {/* About */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">About</h4>
        <p className="text-sm leading-relaxed text-slate-300">
          {description || (
            <span className="italic text-slate-500">No description yet.</span>
          )}
        </p>
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
            <dt className="text-slate-500">Website</dt>
            <dd className="truncate text-slate-200">{business.website_url || '—'}</dd>
          </div>
          <div>
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
      {(business.menu_preview || []).filter((i) => i.name?.trim()).length > 0 && (
        <section className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Featured items
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(business.menu_preview || [])
              .filter((i) => i.name?.trim())
              .map((item, idx) => (
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
