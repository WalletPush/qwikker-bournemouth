'use client'

/**
 * Present Mode — the prospecting demo a franchisee shows a business owner in
 * person (or that's dropped in the claim email as a /demo/<token> link).
 *
 * Two halves, exactly per the spec:
 *   (A) "This is you, right now" — the REAL, grounded listing (description, real
 *       featured items, suggested offers + why-they-work, real Google social proof).
 *   (B) "What you'd unlock" — the SAME brand with clearly-labelled EXAMPLE data:
 *       analytics, loyalty, AI concierge, push, branded wallet pass, tiers.
 *
 * A Presentation-Mode dropdown (Food-first / Services / General) reorders and
 * toggles sections for the business in front of the presenter. Claim = the
 * existing claim flow (claimUrl deep-links to /claim?business_id=...).
 *
 * Honesty rule: real content stays grounded; every mock panel is badged "Example".
 */

import { useMemo, useState } from 'react'
import type { DemoData, DemoPreset } from '@/lib/listing-engine/get-demo-data'
import { getFeaturedItemsLabels } from '@/lib/utils/featured-items-labels'
import type { SystemCategory } from '@/lib/constants/system-categories'
import { DemoAnalytics } from '@/components/demo/demo-analytics'
import { DemoDashboard } from '@/components/demo/demo-dashboard'
import { DemoProfilePhones } from '@/components/demo/demo-profile-phones'
import { DemoLaunchPack } from '@/components/demo/demo-launch-pack'
import { cleanBusinessName } from '@/lib/utils/clean-business-name'
import { LockScreenPush, WalletPassPhone, ChatPhone } from '@/components/demo/phone-mockups'
import { useInView, isPdfMode } from '@/components/demo/use-in-view'
import { formatPrice, hasDisplayablePrice } from '@/lib/utils/price-formatter'
import { Tag } from 'lucide-react'

const ACCENT = '#00d083'

/**
 * Marketing qualifiers we strip when turning a specific menu item into a natural
 * "craving" — so "Signature Tropical Cocktails" → "cocktails" and "Wood-Fired
 * Margherita Pizza" → "margherita pizza". The remaining words stay real (they're
 * the SAME dish the AI answer highlights), just phrased like a person would ask.
 */
const CRAVING_STOP_WORDS = new Set([
  'signature', 'classic', 'house', 'special', 'famous', 'homemade', 'home-made',
  'traditional', 'authentic', 'fresh', 'tropical', 'original', 'deluxe', 'premium',
  'our', 'the', 'a', 'an', 'specialty', 'speciality', 'award-winning', 'award',
  'winning', 'best', 'ultimate', 'gourmet', 'artisan', 'artisanal', 'craft',
  'wood-fired', 'woodfired', 'hand-made', 'handmade', 'hand', 'iconic', 'legendary',
  'real', 'proper', 'style', 'famous',
])

/**
 * Turn a real featured item into a natural craving noun the answer will echo.
 * Returns '' when nothing meaningful remains (caller falls back to a category noun).
 */
function generalizeCraving(itemName: string): string {
  return itemName
    .toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !CRAVING_STOP_WORDS.has(w))
    .join(' ')
    .trim()
}

/**
 * FALLBACK craving noun from the business category, used ONLY when we have no
 * featured item to key off (so the question can't contradict the answer). When
 * an item exists we always generalise THAT instead — see aiQuestion.
 */
function foodCravingNoun(categoryText: string): string {
  const c = categoryText.toLowerCase()
  if (/coffee|caf[eé]|espresso|barista/.test(c)) return 'coffee'
  if (/cocktail|wine|lounge/.test(c)) return 'cocktails'
  if (/\bbar\b|\bpub\b|tavern|brew/.test(c)) return 'cocktails'
  if (/pizz/.test(c)) return 'pizza'
  if (/burger/.test(c)) return 'burgers'
  if (/sushi|japanese|ramen/.test(c)) return 'sushi'
  if (/indian|curry|balti/.test(c)) return 'a curry'
  if (/thai/.test(c)) return 'Thai food'
  if (/chinese|cantonese/.test(c)) return 'Chinese food'
  if (/italian|pasta|trattoria/.test(c)) return 'Italian food'
  if (/mexican|taco|burrito/.test(c)) return 'tacos'
  if (/bakery|patisserie|cake|bake/.test(c)) return 'fresh cakes'
  if (/dessert|ice.?cream|gelato/.test(c)) return 'desserts'
  if (/brunch|breakfast/.test(c)) return 'brunch'
  if (/steak|grill|bbq|smokehouse/.test(c)) return 'a great steak'
  if (/seafood|fish/.test(c)) return 'fresh seafood'
  if (/vegan|vegetarian|plant/.test(c)) return 'vegan food'
  if (/tapas|spanish/.test(c)) return 'tapas'
  return 'great food'
}

function serviceCravingNoun(categoryText: string): string {
  const c = categoryText.toLowerCase()
  if (/barber/.test(c)) return 'a haircut'
  if (/hair|salon/.test(c)) return 'a hair appointment'
  if (/nail/.test(c)) return 'a manicure'
  if (/spa|massage/.test(c)) return 'a spa treatment'
  if (/beauty|facial|aesthet|brow|lash/.test(c)) return 'a beauty treatment'
  if (/gym|fitness|pilates|yoga/.test(c)) return 'a gym'
  if (/tattoo/.test(c)) return 'a tattoo'
  if (/garage|\bmot\b|mechanic|automotive|car\b/.test(c)) return 'a car service'
  if (/dental|dentist/.test(c)) return 'a dentist'
  return categoryText.toLowerCase() || 'a local expert'
}

// Loyalty stamp card — the earned stamps "stamp in" one-by-one on scroll.
function StampCard({
  name,
  logo,
  placeholder,
  earned = 6,
  total = 10,
}: {
  name: string
  logo?: string | null
  placeholder?: string
  earned?: number
  total?: number
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.35)
  return (
    <div className="pdf-avoid-break rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
      <div className="flex items-center gap-3">
        <BrandMark logo={logo} placeholder={placeholder} name={name} size={40} />
        <div>
          <p className="font-semibold text-white">{name}</p>
          <p className="text-xs text-slate-400">Buy {total - 1}, get the {total}th free</p>
        </div>
      </div>
      <div ref={ref} className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const isEarned = i < earned
          // Earned stamps pop in sequentially; empty slots are just static.
          const stampedIn = inView || !isEarned
          return (
            <div
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ease-out motion-reduce:transition-none"
              style={{
                ...(isEarned
                  ? { background: ACCENT, color: '#000' }
                  : { border: '1px dashed #475569', color: '#64748b' }),
                transform: stampedIn ? 'scale(1)' : 'scale(0.4)',
                opacity: stampedIn ? 1 : 0,
                transitionDelay: isEarned ? `${i * 110}ms` : '0ms',
              }}
            >
              {isEarned ? '★' : i + 1}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-slate-400">34 cards started · they come back to earn, you see every visit.</p>
    </div>
  )
}

// ---- tiny presentational helpers -------------------------------------------

function ExampleBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
      Example
    </span>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill={n <= Math.round(rating) ? '#fbbf24' : 'none'}
          stroke="#fbbf24"
          strokeWidth={1.25}
        >
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.94a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.94c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.94a1 1 0 00-.36-1.12L2.83 9.37c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.28-3.94z" />
        </svg>
      ))}
    </span>
  )
}

/** Section wrapper: benefit headline + one plain line, optional Example badge. */
function Section({
  eyebrow,
  title,
  subtitle,
  example,
  wide,
  breakBefore,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  example?: boolean
  wide?: boolean
  /** Start this section on a fresh PDF page (major chapters only). */
  breakBefore?: boolean
  children?: React.ReactNode
}) {
  // No pdf-avoid-break on whole sections — they're taller than a page and
  // Chromium then ignores the rule and splits mid-card. Break smaller units.
  return (
    <section
      className={`border-b border-slate-900 px-5 py-10 sm:px-8 sm:py-12 ${breakBefore ? 'pdf-break-before' : ''}`}
    >
      <div className={`mx-auto ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <div className="mb-6">
          {eyebrow && (
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
              {eyebrow}
            </p>
          )}
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">{title}</h2>
            {example && <ExampleBadge />}
          </div>
          {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

function BrandMark({
  logo,
  name,
  size = 40,
  placeholder,
}: {
  logo: string | null
  name: string
  size?: number
  /** Category placeholder image, shown when there's no real logo (matches live listings). */
  placeholder?: string
}) {
  const src = logo || placeholder
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-xl font-bold text-black"
      style={{ width: size, height: size, background: ACCENT }}
    >
      {initials || 'Q'}
    </div>
  )
}

// ---- example (mock) datasets — clearly labelled, never claimed as real --------

// ---- main component ---------------------------------------------------------

export function PresentMode({
  data,
  claimUrl,
  pdfMode = false,
  forcedPreset,
  capture = false,
}: {
  data: DemoData
  claimUrl: string
  /** Rendered for PDF/print: freezes animations + shows a Save-as-PDF button. */
  pdfMode?: boolean
  /** When set (from ?preset=), locks the presentation preset for the PDF. */
  forcedPreset?: DemoPreset
  /** Headless server capture — omit presenter chrome from the DOM entirely. */
  capture?: boolean
}) {
  const [preset, setPreset] = useState<DemoPreset>(forcedPreset ?? data.defaultPreset)
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const { business, listing, offers, insight, reviewHighlights, currencySymbol, listingUrl, reviewUrl, walletTryUrl, qrUrls } = data

  /** One-click download via the token-gated PDF API (same engine as the pipeline). */
  const downloadPdf = async () => {
    setPdfDownloading(true)
    try {
      const parts = window.location.pathname.split('/').filter(Boolean)
      const token = parts[parts.length - 1]
      if (!token) throw new Error('Missing demo token')
      const res = await fetch(`/api/demo/${encodeURIComponent(token)}/pdf?preset=${preset}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not generate PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safe = (business.name || 'Qwikker listing').replace(/[^\w\s-]/g, '').trim() || 'Qwikker listing'
      a.download = `${safe} - Qwikker.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) {
      console.error(e)
      window.alert(e instanceof Error ? e.message : 'Could not generate PDF')
    } finally {
      setPdfDownloading(false)
    }
  }

  const featured = useMemo(() => {
    if (preset === 'food') return { title: 'Your signature dishes', sub: 'The dishes people rave about — pulled from your menu & reviews, so diners crave before they arrive.' }
    if (preset === 'services') return { title: 'Your featured services', sub: 'Your most-wanted treatments & services, front and centre.' }
    const labels = getFeaturedItemsLabels((business.systemCategory as SystemCategory) || ('other' as SystemCategory))
    return { title: labels.sectionTitle, sub: labels.sectionSubtitle }
  }, [preset, business.systemCategory])

  // Section order + visibility per presentation preset.
  const sections = useMemo<string[]>(() => {
    const hasFeatured = listing.featuredItems.length > 0
    const hasOffers = offers.length > 0
    if (preset === 'food') {
      return [
        'hero',
        'profile',
        hasFeatured && 'featured',
        'secret',
        hasOffers && 'offers',
        'foodAI',
        'ai',
        'analytics',
        'loyalty',
        'push',
        'wallet',
        'launch',
        'dashboard',
        'closer',
      ].filter(Boolean) as string[]
    }
    if (preset === 'services') {
      return [
        'hero',
        'profile',
        hasFeatured && 'featured',
        hasOffers && 'offers',
        'analytics',
        'loyalty',
        'push',
        'wallet',
        'ai',
        'launch',
        'dashboard',
        'closer',
      ].filter(Boolean) as string[]
    }
    return [
      'hero',
      'profile',
      hasFeatured && 'featured',
      hasOffers && 'offers',
      'analytics',
      'loyalty',
      'ai',
      'push',
      'wallet',
      'launch',
      'dashboard',
      'closer',
    ].filter(Boolean) as string[]
  }, [preset, listing.featuredItems.length, offers.length])

  const hook =
    insight.summary ||
    (reviewHighlights.length > 0 ? reviewHighlights[0] : null) ||
    (business.reviewCount
      ? `You've already earned ${business.reviewCount.toLocaleString()} Google reviews — here's what people love.`
      : null)

  // ---- REAL-data samples so every mock is about THIS business ---------------
  // A real signature item (from their menu/services) and a real suggested offer,
  // used to make the AI companion + push mockups feel genuinely personalised.
  const primaryItem =
    listing.featuredItems[0]?.name || insight.signatureItems[0] || null
  const secondaryItem = listing.featuredItems[1]?.name || insight.signatureItems[1] || null
  const primaryOffer = offers[0] || null

  // Location handling. `business_town` sometimes just echoes the franchise city
  // (a region covering several towns, e.g. "Bournemouth" spanning Poole &
  // Christchurch). Treat that as "no specific town" so the AI never claims a
  // Poole business is "in Bournemouth". A genuine sub-town (differs from the
  // region) is used verbatim.
  const regionLabel = (business.city || '').replace(/\b\w/g, (c) => c.toUpperCase())
  const town =
    business.town && business.town.trim().toLowerCase() !== (business.city || '').trim().toLowerCase()
      ? business.town.trim()
      : null
  // Grammatical place phrase used in every query/chip: a genuine sub-town reads
  // "in Poole", otherwise just "near me" — so we NEVER produce "...in near me"
  // (and avoid naming the wider franchise region, e.g. a Poole café asking for
  // things "in Bournemouth").
  const placePhrase = town ? `in ${town}` : 'near me'

  // A believable question a diner/visitor would actually type. CRITICAL: it must
  // match the AI ANSWER, which is built from `primaryItem` (their real featured
  // item). So we derive the craving from that SAME item — generalised, not
  // verbatim — e.g. "Signature Tropical Cocktails" → "anywhere with amazing
  // cocktails near me?", "Mixed Grill" → "anywhere with amazing mixed grill near
  // me?". Only when there's no item do we fall back to a category noun (the
  // answer then has no dish to contradict).
  const aiQuestion = useMemo(() => {
    const categoryText = `${business.category} ${business.systemCategory || ''}`
    if (preset === 'services') {
      const craving = (primaryItem && generalizeCraving(primaryItem)) || serviceCravingNoun(categoryText)
      return `where can I book ${craving} ${placePhrase}?`
    }
    if (preset === 'food') {
      const craving = (primaryItem && generalizeCraving(primaryItem)) || foodCravingNoun(categoryText)
      return `anywhere with amazing ${craving} ${placePhrase}?`
    }
    return `best ${business.category.toLowerCase()} ${placePhrase}?`
  }, [preset, primaryItem, placePhrase, business.category, business.systemCategory])

  const aiAnswer = useMemo(() => {
    const praise = insight.strengths[0] || (reviewHighlights[0] ? null : 'locals love it')
    const bits: string[] = [`You'll love **${business.name}**${town ? ` in ${town}` : ''}.`]
    if (primaryItem) bits.push(`Their ${primaryItem} is a real favourite${secondaryItem ? ` (the ${secondaryItem} too)` : ''}.`)
    if (praise) bits.push(`${praise[0].toUpperCase()}${praise.slice(1)}.`)
    if (primaryOffer) bits.push(`And there's **${primaryOffer.value}** on right now — ${primaryOffer.name}.`)
    return bits.join(' ')
  }, [business.name, town, primaryItem, secondaryItem, primaryOffer, insight.strengths, reviewHighlights])

  // A natural, impressive follow-up the AI would offer — category-aware.
  const aiFollowUp = useMemo(() => {
    if (preset === 'services') return 'Would you like to see their full list of treatments? 💆'
    if (preset === 'food' || listing.featuredItems.length > 0) return 'Would you like to see their full menu? 🍽️'
    return `Want me to show you everything ${business.name} has on?`
  }, [preset, listing.featuredItems.length, business.name])

  // Real "cravings" people actually type — broad and human, anchored to what this
  // place is known for (from its category), NOT specific dish names. No one types
  // "best chocolate covered almond butter stuffed dates near me".
  const cravingChips = useMemo(() => {
    // placePhrase is "in Poole" or "near me" — never "in near me".
    const noun = foodCravingNoun(`${business.category} ${business.systemCategory || ''}`)
    return [
      `best ${noun} ${placePhrase}`,
      `where to eat ${placePhrase}`,
      `hidden gems ${placePhrase}`,
      `gluten-free options ${placePhrase}`,
      'something tasty under £10',
    ]
  }, [business.category, business.systemCategory, placePhrase])

  // "menu" vs "service list" wording, and a relevant example secret-menu item.
  const menuWord = preset === 'services' ? 'service list' : 'menu'
  const cravingWord = preset === 'services' ? 'the treatment they want' : 'what you sell'
  const secretItemName = useMemo(() => {
    if (preset === 'services') return 'A members-only treatment add-on'
    if (primaryItem) return `An off-menu twist on the ${primaryItem}`
    return 'An off-menu house special'
  }, [preset, primaryItem])

  return (
    <div className={`min-h-screen bg-slate-950 pb-28 text-white ${pdfMode ? 'pdf-mode' : ''}`}>
      {/* Presenter chrome — omitted entirely for headless capture so it never
          appears in the generated PDF (CSS hide alone was unreliable). */}
      {!capture && (
        <div className="pdf-hide sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-2.5 backdrop-blur print:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <BrandMark logo={business.logo} placeholder={business.placeholderImage} name={business.name} size={28} />
            <span className="truncate text-sm font-medium text-slate-200">{business.name}</span>
          </div>
          {pdfMode ? (
            <button
              type="button"
              onClick={() => window.print()}
              className="shrink-0 rounded-md px-3 py-1.5 text-xs font-bold text-black"
              style={{ background: ACCENT }}
            >
              Save as PDF
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <span className="hidden sm:inline">Present as</span>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as DemoPreset)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-100 focus:outline-none"
                >
                  <option value="food">Food-first</option>
                  <option value="services">Services / Treatments</option>
                  <option value="general">General</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void downloadPdf()}
                disabled={pdfDownloading}
                className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-60"
              >
                {pdfDownloading ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* PDF hint bar — browser print path only (never in headless capture). */}
      {pdfMode && !capture && (
        <div className="pdf-hide border-b border-slate-800 bg-emerald-400/10 px-4 py-2.5 text-center text-xs leading-relaxed text-emerald-200 print:hidden">
          <span className="font-semibold">Save as PDF:</span> click below (or ⌘/Ctrl&nbsp;+&nbsp;P) → in the dialog tick{' '}
          <span className="font-semibold">“Print backgrounds”</span>, then set the destination /{' '}
          <span className="font-semibold">PDF</span> menu to <span className="font-semibold">“Save as PDF”</span>.
        </div>
      )}

      {sections.map((key) => {
        switch (key) {
          case 'hero':
            return (
              <div key={key} className="relative overflow-hidden border-b border-slate-800">
                {/* Ambient background: real photo if any, else the category placeholder */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={business.images[0] || business.placeholderImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950" />
                <div className="relative px-6 py-14 sm:px-10 sm:py-20">
                  <div className="mx-auto max-w-3xl">
                    <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold" style={{ color: ACCENT }}>
                      You’re already on Qwikker
                    </p>
                    <div className="flex items-center gap-5">
                      {/* Placeholder listing image (or their logo if they have one) */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={business.logo || business.placeholderImage}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-white/10 sm:h-24 sm:w-24"
                      />
                      <div className="min-w-0">
                        <h1 className="text-3xl font-extrabold leading-tight [text-wrap:balance] sm:text-5xl">{business.name}</h1>
                        <p className="mt-1 text-sm text-slate-400 sm:text-base">
                          {business.category}
                          {town ? ` · ${town}` : regionLabel ? ` · ${regionLabel}` : ''}
                        </p>
                      </div>
                    </div>

                    {(business.rating || business.reviewCount) && (
                      <div className="mt-6 flex items-center gap-2 text-sm text-slate-300">
                        {business.rating != null && <Stars rating={business.rating} />}
                        {business.rating != null && <span className="font-semibold">{business.rating.toFixed(1)}</span>}
                        {business.reviewCount != null && (
                          <span className="text-slate-500">({business.reviewCount.toLocaleString()} Google reviews)</span>
                        )}
                      </div>
                    )}

                    {listing.description && (
                      <p className="mt-6 text-base leading-relaxed text-slate-200">{listing.description}</p>
                    )}

                    {hook && (
                      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
                          Why people choose you
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-200">{hook}</p>
                        {insight.strengths.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {insight.strengths.slice(0, 4).map((s) => (
                              <span key={s} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="mt-6 text-xs text-slate-500">
                      This is your <span className="text-slate-300">real</span> listing — already discoverable in Qwikker. Everything below shows what you’d unlock.
                    </p>
                  </div>
                </div>
              </div>
            )

          case 'profile':
            return (
              <Section
                key={key}
                eyebrow="Real — already live"
                title="How you look on Qwikker"
                subtitle="Your real listing, live right now — the card locals see in Discover, and your full business page with tap-to-call, directions, booking and offers."
                wide
              >
                <DemoProfilePhones business={business} listing={listing} offers={offers} />
              </Section>
            )

          case 'featured':
            return (
              <Section key={key} eyebrow="Real — from your menu & reviews" title={featured.title} subtitle={featured.sub}>
                <div className="space-y-3">
                  {listing.featuredItems.map((it, i) => (
                    <div key={i} className="pdf-avoid-break rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-semibold text-white">{it.name}</h3>
                        {hasDisplayablePrice(it.price) && (
                          <span className="shrink-0 font-semibold" style={{ color: ACCENT }}>
                            {formatPrice(it.price, currencySymbol)}
                          </span>
                        )}
                      </div>
                      {it.description && <p className="mt-1 text-sm text-slate-400">{it.description}</p>}
                    </div>
                  ))}
                </div>

                {/* Upload full menu / service list → AI indexes it */}
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4">
                  <span className="mt-0.5 text-lg">📤</span>
                  <p className="text-sm leading-relaxed text-slate-200">
                    <span className="font-semibold text-emerald-300">Upload your full {menuWord}</span> (PDF, photo or link) and
                    Qwikker indexes <span className="text-white">every item</span> — so the AI can recommend you the moment someone’s
                    craving {cravingWord}.
                  </p>
                </div>
              </Section>
            )

          case 'secret':
            return (
              <Section
                key={key}
                eyebrow="Unlock"
                title="A secret menu only Qwikker unlocks"
                subtitle="Hidden, off-menu items diners discover and unlock in-app — the insider find that gets shared and pulls people in."
                example
              >
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔓</span>
                    <span className="font-semibold text-white">{secretItemName}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">Unlocked by 41 diners this month · shared 12 times</p>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  You choose your own hidden items — a secret dish, a regulars-only deal — and Qwikker keeps them locked until a
                  customer unlocks them in-app.
                </p>
              </Section>
            )

          case 'offers':
            return (
              <Section
                key={key}
                eyebrow="Real — ready to switch on"
                title="Offers that actually bring people in"
                subtitle="Ready-made offers built from your reviews & menu."
                wide
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {offers.map((o, i) => (
                    <div key={i} className="flex flex-col">
                      {/* Smaller card — mirrors the real offer-preview-card.tsx */}
                      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900">
                        <div className="space-y-3 p-4">
                          <div className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
                              Special Offer
                            </span>
                          </div>
                          <h3 className="text-base font-bold leading-snug text-white">{o.name}</h3>
                          <p className="text-xs text-slate-400">
                            at <span className="font-medium text-slate-300">{business.name}</span>
                          </p>
                          <div className="rounded-lg border border-[#00d083]/30 bg-[#00d083]/10 p-3">
                            <div className="text-center text-base font-bold leading-snug" style={{ color: ACCENT }}>
                              {o.value}
                            </div>
                          </div>
                          <div
                            className="w-full rounded-md py-2.5 text-center text-xs font-semibold text-black"
                            style={{ background: ACCENT }}
                          >
                            Add to Wallet
                          </div>
                        </div>
                      </div>

                      {/* Reason it works — OUTSIDE the card, underneath it (more visible) */}
                      {o.rationale && (
                        <div className="mt-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5">
                          <p className="text-xs leading-relaxed text-slate-300">
                            <span className="font-semibold" style={{ color: ACCENT }}>Why this works: </span>
                            {o.rationale}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-slate-500">
                  Free listings can run one offer. Claim to switch it on — add more with a trial or Spotlight.
                </p>
              </Section>
            )

          case 'launch':
            return (
              <Section
                key={key}
                eyebrow="Unlock · in-store"
                title="Everything you need to launch"
                subtitle="We’ll automatically create personalised table tents, window stickers and counter displays using your branding and QR codes."
                wide
              >
                <DemoLaunchPack
                  businessName={cleanBusinessName(business.name, [business.town, business.city, regionLabel])}
                  listingUrl={listingUrl}
                  reviewUrl={reviewUrl}
                  walletTryUrl={walletTryUrl}
                  qrUrls={qrUrls}
                />
              </Section>
            )

          case 'dashboard':
            return (
              <Section
                key={key}
                eyebrow="How it works · Unlock"
                title="Everything in one place"
                subtitle="This is your main control hub — manage offers, send pushes and set up loyalty, all from one place. The exact dashboard you get once live, shown with example data in your brand."
                example
                wide
              >
                <DemoDashboard
                  businessName={business.name}
                  logo={business.logo}
                  placeholderImage={business.placeholderImage}
                  category={business.category}
                  town={town}
                  city={business.city}
                  currencySymbol={currencySymbol}
                />
              </Section>
            )

          case 'analytics':
            return (
              <Section
                key={key}
                eyebrow="How it works · Unlock"
                title="Your real analytics dashboard"
                subtitle="This is the exact dashboard you get once live — shown with example data. Every number fills in automatically as customers interact. No spreadsheets, no setup."
                example
                wide
              >
                <DemoAnalytics
                  businessName={business.name}
                  offers={offers.map((o) => o.name)}
                  featuredItems={listing.featuredItems.map((f) => f.name)}
                  place={placePhrase}
                />
              </Section>
            )

          case 'loyalty':
            return (
              <Section
                key={key}
                eyebrow="Unlock"
                title="Turn first-timers into regulars"
                subtitle="A digital stamp card that lives in their Apple & Google Wallet — no app, no paper card to lose."
                example
              >
                <StampCard
                  name={business.name}
                  logo={business.logo}
                  placeholder={business.placeholderImage}
                  earned={6}
                  total={10}
                />

                {/* How loyalty actually works — no app, no terminal */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      t: 'No app. No terminal. No hardware.',
                      d: 'Nothing to buy or install. Stamps are added with a quick tap or QR scan — the card already lives in the customer’s wallet.',
                    },
                    {
                      t: 'Customers track it themselves',
                      d: 'They see stamps, rewards and how close they are to a freebie right inside their Qwikker dashboard & wallet pass — it updates instantly.',
                    },
                    {
                      t: 'You see every visit',
                      d: 'Members, stamps earned and rewards redeemed all land in your analytics — real proof of who’s coming back, not guesswork.',
                    },
                    {
                      t: 'Set your own reward',
                      d: 'Buy 9 get the 10th free, a birthday treat, a “5 visits = free dessert” — you decide the rule, we handle the rest.',
                    },
                  ].map((f) => (
                    <div key={f.t} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                      <p className="flex items-start gap-2 text-sm font-semibold text-white">
                        <span style={{ color: ACCENT }}>✓</span>
                        {f.t}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.d}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )

          case 'ai':
            return (
              <Section
                key={key}
                eyebrow="How it works · Unlock"
                title="Be the answer when someone asks ‘where should we go?’"
                subtitle={`Your menu, offers & reviews feed the Qwikker AI chat — so when a visitor asks, it recommends ${business.name} with your live offer attached.`}
                example
              >
                <div className="flex justify-center">
                  <ChatPhone
                    question={aiQuestion}
                    answer={aiAnswer}
                    followUp={aiFollowUp}
                    business={business}
                    offer={primaryOffer ? { name: primaryOffer.name, value: primaryOffer.value } : null}
                  />
                </div>
                <p className="mx-auto mt-4 max-w-md text-center text-xs text-slate-500">
                  This is the real Qwikker AI chat — shown here with <span className="text-slate-300">your</span> details.
                  It also nudges the right people (“you saved {business.name} but haven’t been — offer on tonight”).
                </p>
              </Section>
            )

          case 'foodAI':
            return (
              <Section
                key={key}
                eyebrow="How it works · food-smart"
                title="When diners ask what to eat, the AI recommends you"
                subtitle="The Qwikker AI understands the craving, not just keywords — so it points hungry diners straight to your dishes, learning their tastes & allergies over time."
                example
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Real cravings it understands</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {cravingChips.map((c) => (
                        <span key={c} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200">
                          “{c}”
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">It learns each diner</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {['Favourite cuisines & go-to dishes', 'Allergies & dietary needs', 'Spice level & budget'].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span style={{ color: ACCENT }}>✓</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                    {primaryItem && (
                      <p className="mt-3 text-xs text-slate-500">
                        …so it can steer the right diner straight to your <span className="text-slate-300">{primaryItem}</span>.
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload full menu → AI indexes it */}
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4">
                  <span className="mt-0.5 text-lg">📤</span>
                  <p className="text-sm leading-relaxed text-slate-200">
                    <span className="font-semibold text-emerald-300">Upload your full {menuWord}</span> and Qwikker indexes every
                    dish — so the AI suggests you the moment someone’s craving {cravingWord}, even for items not in your featured list.
                  </p>
                </div>
              </Section>
            )

          case 'push':
            return (
              <Section
                key={key}
                eyebrow="How it works · Unlock"
                title="Reach them on the lock screen"
                subtitle="Send a branded offer straight to their phone — it lands like a text, no ‘open the app’. Fire one off whenever you want to fill a quiet night."
                example
              >
                <LockScreenPush
                  businessName={business.name}
                  offer={primaryOffer ? { name: primaryOffer.name, value: primaryOffer.value } : null}
                />
              </Section>
            )

          case 'wallet':
            return (
              <Section
                key={key}
                eyebrow="How it works · Unlock"
                title="Your brand, in their pocket"
                subtitle="A branded Qwikker wallet pass with your offer on it — added straight to their Apple & Google Wallet. (iOS 27 makes these passes far more white-label — even closer to fully your own brand.)"
                example
              >
                <WalletPassPhone
                  businessName={business.name}
                  city={business.city}
                  offer={primaryOffer ? { name: primaryOffer.name, value: primaryOffer.value } : null}
                  heroImage={business.images[0] || null}
                  placeholderImage={business.placeholderImage}
                  logo={business.logo}
                />
              </Section>
            )

          case 'closer':
            return (
              <Section
                key={key}
                title="Everything is ready"
                subtitle="We’ve already built your Qwikker presence. All that’s left is to take ownership."
                wide
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Already live with… */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">You’re already live with…</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                      {[
                        'A discoverable business profile',
                        'AI-ready business information',
                        'Suggested offers',
                        'Wallet integration',
                        'Customer analytics',
                        'Print-ready launch materials',
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span style={{ color: ACCENT }}>✓</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* When you claim today… */}
                  <div className="rounded-2xl border border-[#00d083]/30 bg-gradient-to-br from-[#00d083]/10 to-emerald-900/10 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>When you claim today…</p>
                    <ul className="mt-3 space-y-2 text-sm text-white">
                      {[
                        'Edit your business',
                        'Publish your first offer',
                        'Activate loyalty',
                        'Start sending push notifications',
                        'Unlock your 60-day Spotlight trial',
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span style={{ color: ACCENT }}>✓</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* The memorable closing line */}
                <p className="mx-auto mt-8 max-w-2xl text-center text-xl font-bold leading-snug text-white sm:text-2xl">
                  You’re not starting from scratch.{' '}
                  <span style={{ color: ACCENT }}>You’re simply taking control.</span>
                </p>
                <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-400">
                  Everything you’ve seen today has already been created for your business.
                </p>

                {/* Big closing button */}
                <div className="mt-7 flex justify-center">
                  <a
                    href={claimUrl}
                    className="rounded-xl px-8 py-4 text-base font-bold text-black transition-transform active:scale-95 sm:text-lg"
                    style={{ background: ACCENT }}
                  >
                    Claim my business →
                  </a>
                </div>
                <p className="mt-3 text-center text-xs text-slate-500">
                  Takes less than 2 minutes · No card required
                </p>
              </Section>
            )

          default:
            return null
        }
      })}

      {/* Sticky Claim CTA — omitted in headless capture (closer + sign-off
          already carry the claim call-to-action). */}
      {!capture && (
      <div className="pdf-hide fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">Claim {business.name}</p>
            <p className="truncate text-xs text-slate-400">Free · takes about 2 minutes</p>
          </div>
          <a
            href={claimUrl}
            className="shrink-0 rounded-xl px-5 py-3 text-sm font-bold text-black transition-transform active:scale-95"
            style={{ background: ACCENT }}
          >
            Claim now →
          </a>
        </div>
      </div>
      )}

      {/* End-of-journey sign-off — the completion of the story, not a footnote. */}
      <div className="px-5 pb-28 pt-12 text-center">
        <p className="text-2xl font-bold leading-tight text-white sm:text-3xl">Your business is live.</p>
        <p className="mt-1 text-2xl font-bold leading-tight sm:text-3xl" style={{ color: ACCENT }}>Claim it today.</p>
        <p className="mt-3 text-sm text-slate-400">Takes less than 2 minutes · No card required</p>
        <p className="mt-8 text-xs text-slate-600">Powered by Qwikker</p>
      </div>
    </div>
  )
}
