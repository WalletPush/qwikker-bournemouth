'use client'

import { useState, CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, Gift, Menu, Stamp, ChevronDown } from 'lucide-react'
import {
  LandingPageConfig,
  resolveTemplate,
  resolveTheme,
  resolveSectionOrder,
  resolveCopy,
  isSectionEnabled,
  buildThemeStyle,
} from '@/lib/constants/landing-templates'
import { LiveOffersSection, LiveOffer } from '@/components/marketing/live-offers-section'
import { CategoryTilesSection } from '@/components/marketing/category-tiles-section'

interface FeaturedBusiness {
  id: string
  business_name: string
  business_tagline: string | null
  business_images: string[] | null
}

interface CityLandingPageProps {
  city: string
  displayName: string
  subdomain: string
  landingConfig?: LandingPageConfig
  foundingMemberSpotsLeft?: number
  featuredBusinesses?: FeaturedBusiness[]
  passHolderCount?: number
  trialEnabled?: boolean
  // Live offers fetched per-city (rendered only when the section is enabled)
  liveOffers?: LiveOffer[]
}

// Wraps logos/content in an external link when a URL is provided, otherwise renders inline.
function ClickableLogo({ url, className, children }: { url?: string | null; className?: string; children: React.ReactNode }) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className ?? 'inline-flex'} cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.04] active:scale-100`}
      >
        {children}
      </a>
    )
  }
  return <div className={className}>{children}</div>
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[var(--border-soft)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="text-base sm:text-lg font-medium text-[var(--text)]">{question}</span>
        <ChevronDown className={`w-5 h-5 text-[var(--text-faint)] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed pb-5 pr-10">
          {answer}
        </p>
      )}
    </div>
  )
}

// Build the per-render CSS variables for the active theme. Scoped to the page
// wrapper only (never global state) so concurrent renders for different cities
// stay isolated.
export function CityLandingPage({
  city,
  displayName,
  subdomain,
  landingConfig = {},
  foundingMemberSpotsLeft = 0,
  featuredBusinesses = [],
  passHolderCount = 0,
  trialEnabled = false,
  liveOffers = [],
}: CityLandingPageProps) {
  const template = resolveTemplate(landingConfig)
  const theme = resolveTheme(landingConfig)
  const sectionOrder = resolveSectionOrder(landingConfig)

  const themeStyle = buildThemeStyle(template.id, theme.mode, theme.accent, theme.accent_hover) as CSSProperties
  const logoSrc = theme.mode === 'dark' ? '/qwikker-logo-web.svg' : '/qwikker-logo-dark.svg'

  // Per-template visual identity: typography, hero composition, section styling
  // (not just colour). This is what makes the three templates feel distinct.
  const flavor = {
    signature: {
      card: 'rounded-2xl',
      heading: 'font-bold tracking-tight',
      heroTitle: 'text-4xl sm:text-6xl md:text-7xl',
      heroOverlay: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0.65) 100%)',
      heroAlign: 'center' as const,
      featureStyle: 'card' as const,
      ctaBand: false,
      tintCards: false,
    },
    vibrant: {
      card: 'rounded-3xl',
      heading: 'font-extrabold tracking-tight',
      heroTitle: 'text-5xl sm:text-7xl md:text-8xl',
      heroOverlay: 'linear-gradient(to bottom, color-mix(in srgb, var(--accent) 72%, #05070a) 0%, rgba(5,7,10,0.40) 45%, color-mix(in srgb, var(--accent) 58%, #05070a) 100%)',
      heroAlign: 'center' as const,
      featureStyle: 'card' as const,
      ctaBand: true,
      tintCards: true,
    },
    editorial: {
      card: 'rounded-none',
      heading: 'font-serif font-medium tracking-tight',
      heroTitle: 'text-5xl sm:text-7xl md:text-8xl',
      heroOverlay: 'linear-gradient(to top, rgba(10,7,2,0.80) 0%, rgba(10,7,2,0.25) 50%, rgba(10,7,2,0.45) 100%)',
      heroAlign: 'left' as const,
      featureStyle: 'list' as const,
      ctaBand: false,
      tintCards: false,
    },
  }[template.id]

  const heroLeft = flavor.heroAlign === 'left'
  const isVibrant = template.id === 'vibrant'
  const isEditorial = template.id === 'editorial'
  const isSignature = template.id === 'signature'

  const copy = resolveCopy(landingConfig, displayName)
  const heroImageUrl = landingConfig.hero_image_url || template.defaultHeroImage || '/qwikkerhero.png'
  // Vibrant only: admin-adjustable strength (0–100) of the accent colour wash + blur
  // over the hero image. Other templates keep their fixed treatment.
  const heroWash = typeof landingConfig.hero_blur === 'number' ? landingConfig.hero_blur : 60
  const heroOverlay = isVibrant
    ? `linear-gradient(to bottom, color-mix(in srgb, var(--accent) ${Math.round(35 + heroWash * 0.55)}%, #05070a) 0%, rgba(5,7,10,0.40) 45%, color-mix(in srgb, var(--accent) ${Math.round(25 + heroWash * 0.5)}%, #05070a) 100%)`
    : flavor.heroOverlay
  const heroImageStyle: CSSProperties = isVibrant
    ? { opacity: 0.5 - (heroWash / 100) * 0.25, filter: `blur(${(0.5 + (heroWash / 100) * 6).toFixed(1)}px)` }
    : { opacity: 0.35, filter: 'blur(0.8px)' }
  // Content column padding: Signature keeps its original generous top padding.
  const contentPad = isEditorial
    ? 'max-w-5xl mx-auto pt-16 sm:pt-28 pb-16 sm:pb-24 text-left'
    : isVibrant
      ? 'max-w-3xl mx-auto pt-10 sm:pt-16 pb-32 sm:pb-44 text-center'
      : 'max-w-3xl mx-auto pt-32 sm:pt-40 pb-32 sm:pb-44 text-center'
  const showFoundingCounter = (landingConfig.show_founding_counter ?? false) && foundingMemberSpotsLeft > 0
  const tier2Sponsors = (landingConfig.tier2_sponsors || []).filter(s => s.logo_url)

  // Per-section "has the data + content to render" guards. Combined with the
  // toggle resolution from isSectionEnabled().
  const hasSponsorContent = !!(landingConfig.sponsor_name || landingConfig.sponsor_logo_url || tier2Sponsors.length > 0)
  const hasSupporters = (landingConfig.supporter_logos || []).length > 0
  const hasFeatured = featuredBusinesses.length > 0
  const hasPassCount = passHolderCount > 0
  const tileCategories = (landingConfig.category_tiles?.categories || []).filter(Boolean)
  const hasOffers = liveOffers.length > 0

  function sectionVisible(key: string): boolean {
    if (!isSectionEnabled(landingConfig, key)) return false
    switch (key) {
      case 'sponsors':
        return hasSponsorContent
      case 'supporters':
        return hasSupporters
      case 'featured':
        return hasFeatured
      case 'pass_count':
        return hasPassCount
      case 'offers':
        return hasOffers
      case 'category_tiles':
        return tileCategories.length > 0
      // Rendered inside the hero, not as a standalone section.
      case 'founding':
        return false
      default:
        return true
    }
  }

  const sections: Record<string, () => React.ReactNode> = {
    features: () => {
      const items = [
        { Icon: Gift, title: 'Local Offers', body: 'Exclusive deals from places you already love. Delivered straight to your wallet.' },
        { Icon: Stamp, title: 'Built-in Loyalty Cards', body: 'Ditch the paper stamp cards. Earn, collect, and redeem rewards digitally — powered by smart tracking.' },
        { Icon: Menu, title: 'Secret Menu Club', body: 'Hidden dishes and off-menu combos that unlock as local venues join.' },
        { Icon: Sparkles, title: 'AI Companion', body: 'Ask by craving, vibe, or budget. Powered by real menus and verified local data.' },
      ]

      // Editorial: a flat, serif, numbered list — magazine feel, no cards.
      if (flavor.featureStyle === 'list') {
        return (
          <section key="features" className="py-20 sm:py-28 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-faint)] mb-12">What you get</p>
              <div className="divide-y divide-[var(--border)]">
                {items.map(({ title, body }, i) => (
                  <div key={title} className="grid grid-cols-[auto_1fr] gap-6 sm:gap-10 py-8 sm:py-10">
                    <span className={`text-3xl sm:text-5xl ${flavor.heading} text-[var(--accent)] tabular-nums leading-none`}>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3 className={`text-2xl sm:text-3xl ${flavor.heading} mb-3 text-[var(--text)]`}>{title}</h3>
                      <p className="text-[var(--text-muted)] text-base sm:text-lg leading-relaxed max-w-xl">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      // Signature / Vibrant: card grid (Vibrant gets accent-tinted cards).
      return (
        <section key="features" className="py-20 sm:py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {items.map(({ Icon, title, body }) => (
                <div key={title} className={`p-6 sm:p-8 ${flavor.card} border border-[var(--border)] backdrop-blur hover:scale-[1.02] transition-all duration-300`} style={{ backgroundColor: flavor.tintCards ? 'color-mix(in srgb, var(--accent) 8%, var(--bg))' : 'var(--surface)' }}>
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-5 sm:mb-6" style={{ backgroundColor: flavor.tintCards ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 12%, transparent)', border: flavor.tintCards ? 'none' : '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: flavor.tintCards ? 'var(--accent-contrast)' : 'var(--accent)' }} />
                  </div>
                  <h3 className="text-base sm:text-xl font-semibold mb-2 sm:mb-3 text-[var(--text)]">{title}</h3>
                  <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    },

    business_cta: () => (
      <section key="business_cta" className="px-4 sm:px-6 pb-10">
        <div className="max-w-3xl mx-auto">
          <div className={`${flavor.card} border border-[var(--border)] bg-[var(--surface-2)] p-8 sm:p-10 text-center`}>
            <h3 className="text-xl sm:text-2xl font-semibold text-[var(--text)] mb-3">
              Own a local business in {displayName}?
            </h3>
            <p className="text-[var(--text-muted)] text-sm sm:text-base mb-6 max-w-lg mx-auto leading-relaxed">
              Get featured, manage offers, and build customer loyalty — all from one dashboard.
            </p>
            {trialEnabled && (
              <p className="text-[var(--accent)] text-sm mb-6 font-medium">
                Start with a free trial — no commitment.
              </p>
            )}
            <Link
              href="/for-business"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border font-medium text-sm transition-all hover:opacity-80"
              style={{ borderColor: 'color-mix(in srgb, var(--accent) 40%, transparent)', color: 'var(--accent)' }}
            >
              Learn more
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    ),

    final_cta: () => (
      <section
        key="final_cta"
        className="py-20 sm:py-24 px-4 sm:px-6"
        style={flavor.ctaBand ? { backgroundColor: 'var(--accent)' } : undefined}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-3xl sm:text-4xl md:text-5xl ${flavor.heading} mb-6`} style={{ color: flavor.ctaBand ? 'var(--accent-contrast)' : 'var(--text)' }}>
            Ready to explore {displayName}?
          </h2>
          <p className="text-lg sm:text-xl mb-10" style={{ color: flavor.ctaBand ? 'color-mix(in srgb, var(--accent-contrast) 85%, transparent)' : 'var(--text-muted)' }}>
            Add Qwikker to your mobile wallet and open your city dashboard.
          </p>
          <Link
            href="/join"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:opacity-90 shadow-lg"
            style={flavor.ctaBand
              ? { backgroundColor: 'var(--accent-contrast)', color: 'var(--accent)' }
              : { backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Get the {displayName} pass
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    ),

    why: () => (
      <section
        key="why"
        className="py-20 sm:py-24 px-4 sm:px-6 border-t border-[var(--border-soft)]"
        style={isVibrant ? { backgroundColor: 'color-mix(in srgb, var(--accent) 7%, var(--bg))' } : undefined}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className={`text-3xl md:text-4xl ${flavor.heading} mb-14 sm:mb-16 text-[var(--text)] text-center`}>
            Why Qwikker?
          </h2>
          <div className="space-y-10">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text)] mb-2">Real data, not scraped reviews</h3>
              <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed">
                Every menu, every offer, and every recommendation comes from verified business data — not aggregated reviews or pay-to-win listings.
              </p>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text)] mb-2">Your wallet, not another app</h3>
              <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed">
                No downloads, no accounts, no notifications you didn&apos;t ask for. Just a pass in your Apple or Google Wallet that opens your city dashboard.
              </p>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text)] mb-2">Built city by city</h3>
              <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed">
                Each city is curated individually with local knowledge baked in. No generic results — what you see is specific to {displayName}.
              </p>
            </div>
          </div>
        </div>
      </section>
    ),

    how: () => (
      <section key="how" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-soft)]">
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-3xl md:text-4xl ${flavor.heading} mb-14 sm:mb-20 text-[var(--text)] text-center`}>
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-10 md:gap-6 relative">
            <div className="hidden md:block absolute top-5 left-[16.67%] right-[16.67%] h-px border-t border-dashed border-[var(--border)]" />
            {[
              { n: '01', title: 'Add to your wallet', body: 'Tap the button. No app to download — Qwikker lives in Apple or Google Wallet.' },
              { n: '02', title: 'Explore your city', body: 'Browse offers, collect loyalty rewards, discover secret menus, and chat with the AI companion.' },
              { n: '03', title: 'It grows with your city', body: 'New businesses, offers, and rewards appear automatically. Your pass stays up to date.' },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-4 tabular-nums text-[var(--accent)]">{step.n}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-[var(--text)] mb-3">{step.title}</h3>
                <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    pass_count: () => (
      <section key="pass_count" className="py-10 px-4 sm:px-6">
        <p className="text-center text-[var(--text-faint)] text-sm sm:text-base">
          Join <span className="text-[var(--text)] font-semibold">{passHolderCount.toLocaleString()}</span> people already exploring {displayName}
        </p>
      </section>
    ),

    featured: () => (
      <section key="featured" className="py-20 px-4 sm:px-6 border-t border-[var(--border-soft)]">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-2xl md:text-3xl ${flavor.heading} mb-10 text-[var(--text)] text-center`}>
            Featured in {displayName}
          </h2>
          <div className="flex gap-4 justify-center flex-wrap">
            {featuredBusinesses.map((biz) => {
              const heroImage = biz.business_images?.[0]
              return (
                <div key={biz.id} className="w-64 sm:w-72">
                  <div className={`relative ${flavor.card} overflow-hidden h-44 sm:h-52 border border-[var(--border)]`}>
                    {heroImage ? (
                      <img src={heroImage} alt={biz.business_name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-base font-semibold text-white leading-tight mb-1">{biz.business_name}</h3>
                      {biz.business_tagline && (
                        <p className="text-xs text-white/60 line-clamp-2">{biz.business_tagline}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    ),

    faq: () => (
      <section key="faq" className="py-20 sm:py-24 px-4 sm:px-6 border-t border-[var(--border-soft)]">
        <div className="max-w-2xl mx-auto">
          <h2 className={`text-2xl md:text-3xl ${flavor.heading} mb-10 text-[var(--text)] text-center`}>
            Frequently asked questions
          </h2>
          <div>
            <FaqItem question="Is it free?" answer="Yes. Adding Qwikker to your wallet is completely free. You get access to offers, loyalty rewards, secret menus, and the AI companion at no cost." />
            <FaqItem question="Do I need to download an app?" answer="No. Qwikker lives in your Apple or Google Wallet. Tap the pass anytime to open your city dashboard in the browser — no app needed." />
            <FaqItem question="How do businesses join?" answer="Local businesses can claim their listing and start managing offers, loyalty cards, and their menu — all from a simple dashboard. Visit the For Business page to learn more." />
          </div>
        </div>
      </section>
    ),

    sponsors: () => (
      <section key="sponsors" className="border-t border-[var(--border-soft)] py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-8">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: 'color-mix(in srgb, var(--accent) 80%, transparent)' }}>
            Qwikker {displayName} is sponsored by
          </p>
          <ClickableLogo url={landingConfig.sponsor_url} className="group flex flex-col items-center gap-4">
            {landingConfig.sponsor_logo_url && (
              <img
                src={landingConfig.sponsor_logo_url}
                alt={landingConfig.sponsor_name || 'Sponsor'}
                className="h-16 sm:h-20 w-auto max-w-[280px] object-contain transition-transform duration-200 ease-out group-hover:scale-105"
              />
            )}
            <div className="text-center">
              {landingConfig.sponsor_name && (
                <p className="text-base sm:text-lg font-semibold text-[var(--text)]">{landingConfig.sponsor_name}</p>
              )}
              {landingConfig.sponsor_tagline && (
                <p className="text-sm text-[var(--text-muted)] mt-1">{landingConfig.sponsor_tagline}</p>
              )}
            </div>
          </ClickableLogo>
          {tier2Sponsors.length > 0 && (
            <div className="w-full flex flex-col items-center gap-4 pt-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">In partnership with</p>
              <div className="flex items-center justify-center gap-10 sm:gap-14 flex-wrap">
                {tier2Sponsors.map((sponsor, i) => (
                  <ClickableLogo key={i} url={sponsor.url}>
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      title={sponsor.name}
                      className="h-11 sm:h-12 w-auto max-w-[180px] object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
                    />
                  </ClickableLogo>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    ),

    supporters: () => (
      <section key="supporters" className="py-12 px-4 sm:px-6 border-t border-[var(--border-soft)]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-6">
            {landingConfig.supporters_heading || 'Proudly supported by'}
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-10 flex-wrap">
            {(landingConfig.supporter_logos || []).map((supporter, i) => (
              <ClickableLogo key={i} url={supporter.url}>
                <img
                  src={supporter.logo_url}
                  alt={supporter.name}
                  title={supporter.name}
                  style={{ height: '80px', maxWidth: '200px', width: 'auto' }}
                  className="object-contain opacity-40 grayscale hover:grayscale-0 hover:opacity-90 transition-all duration-300"
                />
              </ClickableLogo>
            ))}
          </div>
        </div>
      </section>
    ),

    offers: () => (
      <LiveOffersSection
        key="offers"
        displayName={displayName}
        heading={copy.offersHeading}
        offers={liveOffers}
        cardClass={flavor.card}
        headingClass={flavor.heading}
        variant={template.id}
        wash={heroWash}
      />
    ),

    category_tiles: () => (
      <CategoryTilesSection
        key="category_tiles"
        displayName={displayName}
        heading={copy.tilesHeading}
        categories={tileCategories}
        cardClass={flavor.card}
        headingClass={flavor.heading}
        variant={template.id}
        wash={heroWash}
      />
    ),
  }

  return (
    <div className={`min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text)] ${isVibrant ? 'pb-24 sm:pb-0' : ''}`} style={themeStyle}>
      {/* Header (template-aware: masthead for editorial, app pill for vibrant) */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl ${template.id === 'editorial' ? 'border-b-2 border-[var(--text)]' : 'border-b border-[var(--border-soft)]'}`}
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 80%, transparent)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          {template.id === 'editorial' ? (
            <span className={`text-sm sm:text-base ${flavor.heading} uppercase tracking-[0.3em] text-[var(--text)]`}>
              {displayName}
            </span>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-[var(--text-muted)]">{displayName} — Live</span>
            </div>
          )}
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/for-business"
              className={`text-sm transition-colors ${template.id === 'editorial' ? 'uppercase tracking-widest text-xs text-[var(--text-muted)] hover:text-[var(--text)]' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`}
            >
              For Business
            </Link>
            <Link
              href="/about"
              className={`text-sm transition-colors ${template.id === 'editorial' ? 'uppercase tracking-widest text-xs text-[var(--text-muted)] hover:text-[var(--text)]' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`}
            >
              About
            </Link>
            {template.id === 'vibrant' && (
              <Link
                href="/join"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
              >
                Get the pass
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero (always first; white text over darkened image works on any theme) */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImageUrl}
            alt="City background"
            fill
            priority
            quality={85}
            className="object-cover"
            style={heroImageStyle}
          />
          <div className="absolute inset-0 z-10" style={{ background: heroOverlay }} />
        </div>

        <div className="relative z-10">
          {/* Hero content column */}
          <div className={`px-6 ${contentPad}`}>
          {/* Original centred Qwikker logo — identical across all templates */}
          <div className="mb-12 flex justify-center">
            <img
              src="/qwikker-logo-web.svg"
              alt="QWIKKER"
              className="h-9 sm:h-11 w-auto"
              style={{ filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.5))' }}
            />
          </div>
          {/* Eyebrow — pill (vibrant), masthead rule (editorial), small caps (signature) */}
          {copy.heroEyebrow && (
            isVibrant ? (
              <div className="flex justify-center mb-6">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-lg" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                  {copy.heroEyebrow}
                </span>
              </div>
            ) : heroLeft ? (
              <div className="mb-5">
                <span className="text-xs uppercase tracking-[0.25em] text-white/75" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>{copy.heroEyebrow}</span>
                <div className="mt-4 h-px w-16 bg-white/40" />
              </div>
            ) : (
              <p className="text-xs uppercase tracking-[0.25em] text-white/60 mb-5" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>{copy.heroEyebrow}</p>
            )
          )}

          <h1 className={`${flavor.heroTitle} ${flavor.heading} mb-6 text-white whitespace-pre-line`} style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            {copy.heroHeadline}
          </h1>

          <p className={`text-base sm:text-lg text-neutral-200 mb-6 leading-relaxed ${heroLeft ? 'max-w-xl' : 'max-w-2xl mx-auto'}`} style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
            {copy.heroSubtitle}
          </p>

          {copy.heroSupporting && (
            <p className={`text-sm text-neutral-400 mb-8 leading-relaxed max-w-xl ${heroLeft ? '' : 'mx-auto'}`} style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
              {copy.heroSupporting}
            </p>
          )}

          {/* CTA — text-link (editorial), dual buttons (vibrant), single button (signature) */}
          <div className={`mb-6 ${copy.heroSupporting ? '' : 'mt-8'}`}>
            {isEditorial ? (
              <Link
                href="/join"
                className="inline-flex items-center gap-2 text-base font-semibold text-white border-b-2 pb-1 transition-opacity hover:opacity-70"
                style={{ borderColor: 'var(--accent)' }}
              >
                {copy.heroCtaLabel}
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : isVibrant ? (
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/join"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-full font-bold transition-all shadow-lg active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)', boxShadow: '0 10px 30px color-mix(in srgb, var(--accent) 35%, transparent)' }}
                >
                  {copy.heroCtaLabel}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/join"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-full font-bold text-white border border-white/40 backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  Browse offers
                </Link>
              </div>
            ) : (
              <Link
                href="/join"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)', boxShadow: '0 10px 30px color-mix(in srgb, var(--accent) 25%, transparent)' }}
              >
                {copy.heroCtaLabel}
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
          </div>

          {showFoundingCounter ? (
            <p className="text-sm text-white/50">
              Are you a business?{' '}
              <Link href="/claim" className="font-medium transition-colors" style={{ color: 'var(--accent)' }}>Click here</Link>
              {' '}to join now — only{' '}
              <span className="text-white font-semibold">{foundingMemberSpotsLeft}</span>
              {' '}founding member {foundingMemberSpotsLeft === 1 ? 'spot' : 'spots'} available
            </p>
          ) : (
            <p className="text-sm text-white/50">
              Are you a business?{' '}
              <Link href="/claim" className="font-medium transition-colors" style={{ color: 'var(--accent)' }}>Click here to join</Link>
            </p>
          )}
          </div>
        </div>
      </section>

      {/* Ordered, toggleable sections */}
      {sectionOrder.map((key) => (sectionVisible(key) ? sections[key]?.() : null))}

      {/* Footer */}
      <footer className="border-t border-[var(--border-soft)] py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-8 mb-8">
            <div className="flex flex-col items-center gap-1">
              <img src={logoSrc} alt="QWIKKER" className="h-6 w-auto" />
              <span className="text-[var(--text-faint)] text-sm">{displayName}</span>
            </div>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <Link href="/for-business" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">For Business</Link>
              <Link href="/about" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">About</Link>
              <Link href="https://qwikker.com" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">Other Cities</Link>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--text-faint)]">© Qwikker 2026</p>
          </div>
        </div>
      </footer>

      {/* App-style sticky CTA (Vibrant, mobile only) */}
      {isVibrant && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 sm:hidden px-4 py-3"
          style={{ background: 'color-mix(in srgb, var(--bg) 90%, transparent)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border)' }}
        >
          <Link
            href="/join"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-base shadow-lg"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Get the {displayName} pass
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  )
}
