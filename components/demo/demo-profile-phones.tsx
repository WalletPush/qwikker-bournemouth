'use client'

/**
 * "This is your actual profile" — two phones side-by-side showing the REAL
 * customer-facing views of the business, faithfully mirrored from the live app:
 *
 *   Phone 1 — the Discover card (components/user/business-card.tsx, mobile layout)
 *   Phone 2 — the business detail / hero page (components/user/user-business-detail-page.tsx)
 *
 * Everything here is grounded (their real name, category, rating, photo, offers).
 * The action buttons mirror the real page (Book Now / Directions / Call / Website
 * / Save) so the owner sees exactly what a customer gets.
 */

import type { DemoData } from '@/lib/listing-engine/get-demo-data'
import { PhoneFrame, StatusBar } from '@/components/demo/phone-mockups'

const ACCENT = '#00d083'

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 20 20" fill={n <= Math.round(rating) ? '#facc15' : '#475569'}>
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.94a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.94c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.94a1 1 0 00-.36-1.12L2.83 9.37c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.28-3.94z" />
        </svg>
      ))}
    </span>
  )
}

/** Small self-healing image with a placeholder fallback. */
function Img({ src, placeholder, className }: { src: string | null; placeholder: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src || placeholder}
      alt=""
      className={className}
      onError={(e) => {
        const el = e.currentTarget
        if (el.src !== placeholder) el.src = placeholder
      }}
    />
  )
}

// ---- Phone 1: Discover card -------------------------------------------------

function DiscoverPhone({ business, listing, offers }: Pick<DemoData, 'business' | 'listing' | 'offers'>) {
  const loc = business.town || (business.city ? business.city.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Near you')
  const hasOffers = offers.length > 0

  return (
    <PhoneFrame>
      <div className="flex h-full w-full flex-col bg-slate-950">
        <StatusBar tone="light" />

        {/* discover header */}
        <div className="px-4 pb-1 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Discover</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {loc}
            </span>
          </div>
          {/* search */}
          <div className="mt-2 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-500">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Search restaurants, bars, cafés…
          </div>
          {/* filter chips */}
          <div className="mt-2 flex gap-1.5 overflow-hidden">
            {['Open now', 'Offers', 'Top rated'].map((c, i) => (
              <span
                key={c}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  i === 0 ? 'text-black' : 'border border-slate-700 bg-slate-900 text-slate-300'
                }`}
                style={i === 0 ? { background: ACCENT } : undefined}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* their card (mobile horizontal layout, highlighted) */}
        <div className="px-3 pt-1.5">
          <div className="relative rounded-2xl border border-[#00d083]/50 bg-gradient-to-br from-slate-800/70 to-slate-700/30 p-2.5 shadow-lg shadow-[#00d083]/10">
            <span className="absolute -top-2 right-3 rounded-full bg-gradient-to-r from-[#00d083] to-[#00b86f] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-black shadow">
              You
            </span>
            <div className="flex gap-3">
              <Img src={business.images[0] || null} placeholder={business.placeholderImage} className="h-[92px] w-[92px] shrink-0 rounded-xl object-cover" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                  ● Open
                </span>
                <p className="truncate text-sm font-semibold text-white">{business.name}</p>
                <p className="truncate text-[11px] text-slate-400">{business.category}</p>
                {business.rating != null && (
                  <div className="mt-0.5 flex items-center gap-1">
                    <Stars rating={business.rating} size={11} />
                    <span className="text-[11px] font-medium text-slate-300">{business.rating.toFixed(1)}</span>
                    {business.reviewCount != null && <span className="text-[10px] text-slate-500">({business.reviewCount.toLocaleString()})</span>}
                  </div>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {hasOffers && (
                    <span className="rounded-full border border-[#00d083]/25 bg-[#00d083]/15 px-1.5 py-0.5 text-[9px] font-medium" style={{ color: ACCENT }}>
                      🔥 {offers.length} Offer{offers.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="rounded-full border border-purple-500/25 bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-300">🔒 Secret Menu</span>
                </div>
              </div>
            </div>
          </div>

          {/* faded neighbour card peeking below, for context */}
          <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-800/30 p-2.5 opacity-40">
            <div className="flex gap-3">
              <div className="h-14 w-14 shrink-0 rounded-xl bg-slate-700" />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="h-2.5 w-2/3 rounded bg-slate-700" />
                <div className="h-2 w-1/3 rounded bg-slate-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

// ---- Phone 2: business hero / detail page -----------------------------------

function ActionBtn({ label, d, primary }: { label: string; d: string; primary?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold ${
        primary ? 'text-black' : 'border border-slate-700 bg-slate-800/60 text-slate-200'
      }`}
      style={primary ? { background: `linear-gradient(90deg, ${ACCENT}, #00b86f)` } : undefined}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} /></svg>
      {label}
    </div>
  )
}

function BusinessPagePhone({ business, listing, offers }: Pick<DemoData, 'business' | 'listing' | 'offers'>) {
  const heroLine = listing.tagline || `${business.category}${business.town ? ` in ${business.town}` : ''}`
  const feat = listing.featuredItems[0]

  return (
    <PhoneFrame>
      <div className="flex h-full w-full flex-col overflow-hidden bg-slate-950">
        <StatusBar tone="light" />

        {/* hero image */}
        <div className="relative h-36 w-full shrink-0 overflow-hidden">
          <Img src={business.images[0] || null} placeholder={business.placeholderImage} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
          {/* back chip */}
          <div className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </div>
          {offers.length > 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              {offers.length} Offer{offers.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-hidden px-4 pt-2">
          <h3 className="line-clamp-2 text-lg font-bold leading-tight text-white">{business.name}</h3>
          <p className="truncate text-[12px] font-medium" style={{ color: ACCENT }}>{heroLine}</p>
          {business.rating != null && (
            <div className="mt-1 flex items-center gap-1.5">
              <Stars rating={business.rating} size={12} />
              <span className="text-[11px] font-medium text-slate-300">{business.rating.toFixed(1)}</span>
              {business.reviewCount != null && <span className="text-[10px] text-slate-500">({business.reviewCount.toLocaleString()} reviews)</span>}
            </div>
          )}

          {/* action buttons — mirror the real page */}
          <div className="mt-3 space-y-1.5">
            <ActionBtn primary label="Book Now" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            <div className="grid grid-cols-3 gap-1.5">
              <ActionBtn label="Directions" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              <ActionBtn label="Call" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              <ActionBtn label="Website" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M3.6 9h16.8 M3.6 15h16.8 M12 3a15 15 0 010 18 15 15 0 010-18z" />
            </div>
            <ActionBtn label="Save" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </div>

          {/* tabs */}
          <div className="mt-3 flex gap-1.5 text-[11px]">
            {['Overview', listing.featuredItems.length > 0 ? 'Menu' : null, offers.length > 0 ? 'Offers' : null].filter(Boolean).map((t, i) => (
              <span
                key={t as string}
                className={`rounded-lg px-2.5 py-1 font-semibold ${i === 0 ? 'text-black' : 'bg-slate-800/60 text-slate-400'}`}
                style={i === 0 ? { background: `linear-gradient(90deg, ${ACCENT}, #00b86f)` } : undefined}
              >
                {t}
              </span>
            ))}
          </div>

          {/* overview snippet */}
          <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-900/50 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">About {business.name}</p>
            {listing.description ? (
              <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-300">{listing.description}</p>
            ) : feat ? (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">Known for {feat.name.toLowerCase()} — and much more.</p>
            ) : (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">Your story, hours, location & contact — all here.</p>
            )}
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

// ---- exported section body --------------------------------------------------

/** Numbered label pill sitting above each phone, guiding the eye left → right. */
function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 py-1 pl-1 pr-3">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-black"
        style={{ background: ACCENT }}
      >
        {n}
      </span>
      <span className="text-xs font-semibold text-white">{children}</span>
    </div>
  )
}

export function DemoProfilePhones({ business, listing, offers }: Pick<DemoData, 'business' | 'listing' | 'offers'>) {
  return (
    <div className="mx-auto grid max-w-3xl gap-y-10 sm:grid-cols-2 sm:gap-x-10">
      <figure className="flex flex-col items-center text-center">
        <StepLabel n={1}>In Discover</StepLabel>
        <DiscoverPhone business={business} listing={listing} offers={offers} />
        <figcaption className="mt-4 max-w-[15rem] text-xs leading-relaxed text-slate-400">
          How locals find you — your card stands out with photo, rating &amp; offers.
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center text-center">
        <StepLabel n={2}>Your business page</StepLabel>
        <BusinessPagePhone business={business} listing={listing} offers={offers} />
        <figcaption className="mt-4 max-w-[15rem] text-xs leading-relaxed text-slate-400">
          Tap to call, get directions, book &amp; browse your menu and offers.
        </figcaption>
      </figure>
    </div>
  )
}
