'use client'

import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'

export interface LiveOffer {
  id: string
  offer_name: string
  offer_value: string | null
  offer_image: string | null
  offer_end_date: string | null
  business_id: string
  business_name: string
  business_image: string | null
  // Precomputed on the server to avoid locale/timezone hydration mismatches.
  expiry_label?: string | null
}

type Variant = 'signature' | 'vibrant' | 'editorial'

// Resize large originals (esp. Cloudinary) so offer cards load fast.
function optimizeImage(url: string | null, ar = 'ar_4:3', w = 700): string | null {
  if (!url) return url
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${w},c_fill,${ar}/`)
  }
  return url
}

interface LiveOffersSectionProps {
  displayName: string
  heading?: string | null
  offers: LiveOffer[]
  cardClass: string
  headingClass: string
  variant?: Variant
  // Vibrant only: 0–100 accent colour wash strength (mirrors the hero wash slider).
  wash?: number
}

// Deep-link a non-pass-holder straight to this offer: install the city pass,
// then auto-add the offer to their wallet (handled on /user/offers).
function offerClaimHref(offerId: string): string {
  const returnTo = `/user/offers?autoClaim=${offerId}`
  return `/join?returnTo=${encodeURIComponent(returnTo)}`
}

export function LiveOffersSection({ displayName, heading, offers, cardClass, headingClass, variant = 'signature', wash = 60 }: LiveOffersSectionProps) {
  if (offers.length === 0) return null
  const title = heading || `Live offers in ${displayName}`
  // Vibrant card tint scales with the hero wash slider.
  const cardTint = Math.round(wash * 0.16)
  const cardBorderTint = Math.round(wash * 0.32)

  // ── EDITORIAL: large alternating magazine rows ──────────────────────────
  if (variant === 'editorial') {
    return (
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-soft)]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-faint)] mb-3">This week in {displayName}</p>
            <h2 className={`text-3xl sm:text-5xl ${headingClass} text-[var(--text)]`}>{title}</h2>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {offers.map((offer, i) => {
              const image = optimizeImage(offer.offer_image || offer.business_image, 'ar_3:2', 900)
              const flip = i % 2 === 1
              return (
                <article key={offer.id} className="grid md:grid-cols-2 gap-6 sm:gap-10 items-center py-10 sm:py-12">
                  <div className={`relative h-56 sm:h-72 w-full overflow-hidden ${flip ? 'md:order-2' : ''}`}>
                    {image ? (
                      <img src={image} alt={offer.offer_name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 25%, transparent), transparent)' }} />
                    )}
                  </div>
                  <div className={flip ? 'md:order-1' : ''}>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-faint)] mb-3">{offer.business_name}</p>
                    <h3 className={`text-2xl sm:text-4xl ${headingClass} text-[var(--text)] mb-4 leading-tight`}>{offer.offer_name}</h3>
                    {offer.offer_value && (
                      <p className="text-lg font-medium mb-4" style={{ color: 'var(--accent)' }}>{offer.offer_value}</p>
                    )}
                    {offer.expiry_label && (
                      <p className="text-xs text-[var(--text-faint)] mb-6 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {offer.expiry_label}
                      </p>
                    )}
                    <Link
                      href={offerClaimHref(offer.id)}
                      className="inline-flex items-center gap-2 text-sm font-semibold border-b-2 pb-1 transition-opacity hover:opacity-70"
                      style={{ color: 'var(--text)', borderColor: 'var(--accent)' }}
                    >
                      Claim this offer
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // ── VIBRANT: swipeable horizontal carousel of big rounded cards ─────────
  if (variant === 'vibrant') {
    return (
      <section className="py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-6 gap-4">
            <h2 className={`text-3xl sm:text-4xl ${headingClass} text-[var(--text)]`}>{title}</h2>
            <Link href="/join" className="text-sm font-bold whitespace-nowrap flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: 'var(--accent)' }}>
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {offers.map((offer) => {
              const image = optimizeImage(offer.offer_image || offer.business_image, 'ar_4:3', 700)
              return (
                <div
                  key={offer.id}
                  className={`group flex flex-col shrink-0 w-[80%] sm:w-72 snap-start ${cardClass} overflow-hidden border shadow-sm`}
                  style={{
                    background: `color-mix(in srgb, var(--accent) ${cardTint}%, var(--surface))`,
                    borderColor: `color-mix(in srgb, var(--accent) ${cardBorderTint}%, var(--border))`,
                  }}
                >
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
                  {image ? (
                    <img src={image} alt={offer.offer_name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 30%, transparent))' }} />
                  )}
                  {offer.offer_value && (
                    <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-extrabold shadow-lg" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                      {offer.offer_value}
                    </span>
                  )}
                </div>
                <div className="flex flex-col flex-1 p-5">
                  <div className="flex-1">
                    <h3 className="text-lg font-extrabold text-[var(--text)] leading-tight line-clamp-2">{offer.offer_name}</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{offer.business_name}</p>
                    {offer.expiry_label && (
                      <p className="text-xs text-[var(--text-faint)] mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {offer.expiry_label}
                      </p>
                    )}
                  </div>
                  <Link
                    href={offerClaimHref(offer.id)}
                    className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
                  >
                    Claim this offer
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
            <div className="shrink-0 w-1" aria-hidden />
          </div>
        </div>
      </section>
    )
  }

  // ── SIGNATURE: restrained 3-column grid ─────────────────────────────────
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-8 gap-4">
          <h2 className={`text-2xl sm:text-3xl ${headingClass} text-[var(--text)]`}>{title}</h2>
          <Link href="/join" className="text-sm font-medium whitespace-nowrap hover:opacity-80 transition-opacity" style={{ color: 'var(--accent)' }}>
            See all
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {offers.map((offer) => {
            const image = optimizeImage(offer.offer_image || offer.business_image)
            return (
              <div key={offer.id} className={`group flex flex-col ${cardClass} overflow-hidden bg-[var(--surface)] border border-[var(--border)]`}>
                <div className="relative h-40 w-full overflow-hidden">
                  {image ? (
                    <img src={image} alt={offer.offer_name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 30%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))' }} />
                  )}
                  {offer.offer_value && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold shadow" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                      {offer.offer_value}
                    </span>
                  )}
                </div>

                <div className="flex flex-col flex-1 p-4">
                  <h3 className="text-base font-semibold text-[var(--text)] leading-tight line-clamp-2">{offer.offer_name}</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{offer.business_name}</p>
                  {offer.expiry_label && (
                    <p className="text-xs text-[var(--text-faint)] mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {offer.expiry_label}
                    </p>
                  )}
                  <Link
                    href={offerClaimHref(offer.id)}
                    className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
                  >
                    Claim this offer
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
