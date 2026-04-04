'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, Gift, Menu, Stamp } from 'lucide-react'

interface SupporterLogo {
  name: string
  logo_url: string
}

interface LandingPageConfig {
  hero_headline?: string | null
  hero_subtitle?: string | null
  hero_image_url?: string | null
  sponsor_enabled?: boolean
  sponsor_name?: string | null
  sponsor_tagline?: string | null
  sponsor_logo_url?: string | null
  supporters_enabled?: boolean
  supporters_heading?: string | null
  supporter_logos?: SupporterLogo[] | null
  show_founding_counter?: boolean
  founding_member_total_spots?: number
  show_featured_businesses?: boolean
  featured_business_ids?: string[] | null
}

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
}

export function CityLandingPage({
  city,
  displayName,
  subdomain,
  landingConfig = {},
  foundingMemberSpotsLeft = 0,
  featuredBusinesses = [],
}: CityLandingPageProps) {
  const heroHeadline = landingConfig.hero_headline || null
  const heroSubtitle = landingConfig.hero_subtitle || null
  const heroImageUrl = landingConfig.hero_image_url || '/qwikkerhero.png'
  const showFoundingCounter = landingConfig.show_founding_counter && foundingMemberSpotsLeft > 0
  const showSponsor = landingConfig.sponsor_enabled && (landingConfig.sponsor_name || landingConfig.sponsor_logo_url)
  const showSupporters = landingConfig.supporters_enabled && (landingConfig.supporter_logos || []).length > 0
  const showFeatured = landingConfig.show_featured_businesses && featuredBusinesses.length > 0

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0b0d10]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00d083]" />
            <span className="text-white/50">{displayName} — Live</span>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/for-business" className="text-sm text-white/40 hover:text-white/60 transition-colors">
              For Business
            </Link>
            <Link href="/about" className="text-sm text-white/40 hover:text-white/60 transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImageUrl}
            alt="City background"
            fill
            priority
            quality={85}
            className="object-cover"
            style={{
              opacity: 0.35,
              filter: 'blur(0.8px)'
            }}
          />
          <div 
            className="absolute inset-0 z-10"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0.65) 100%)'
            }}
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-32 sm:pt-40 pb-36 sm:pb-48 text-center">
          <div className="mb-12 flex justify-center">
            <img 
              src="/qwikker-logo-web.svg" 
              alt="QWIKKER" 
              className="h-9 sm:h-11 w-auto"
              style={{ filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.5))' }}
            />
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            {heroHeadline ? (
              <span>{heroHeadline}</span>
            ) : (
              <>{displayName}, <br/><span className="text-white/70">in your wallet</span></>
            )}
          </h1>
          
          <p className="text-base sm:text-lg text-neutral-300 mb-6 leading-relaxed max-w-2xl mx-auto" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
            {heroSubtitle || 'Local offers, loyalty rewards, secret menus, and dish-level recommendations — delivered to your mobile wallet.'}
          </p>

          <p className="text-sm text-neutral-400 mb-8 leading-relaxed max-w-xl mx-auto" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
            Powered by real menus, real hours, and local context — not scraped reviews.
          </p>

          <div className="mb-6">
            <Link
              href="/join"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#00d083] hover:bg-[#00b86f] text-white rounded-xl font-semibold transition-all shadow-lg shadow-[#00d083]/20"
            >
              Add to your mobile wallet
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {showFoundingCounter ? (
            <p className="text-sm text-white/50" style={{ textShadow: 'none' }}>
              Are you a business?{' '}
              <Link href="/claim" className="text-[#00d083] hover:text-[#00d083]/80 font-medium transition-colors">
                Click here
              </Link>
              {' '}to join now — only{' '}
              <span className="text-white font-semibold">{foundingMemberSpotsLeft}</span>
              {' '}founding member {foundingMemberSpotsLeft === 1 ? 'spot' : 'spots'} available
            </p>
          ) : (
            <p className="text-sm text-white/50" style={{ textShadow: 'none' }}>
              Are you a business?{' '}
              <Link href="/claim" className="text-[#00d083] hover:text-[#00d083]/80 font-medium transition-colors">
                Click here to join
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* Features Grid — 4 cards */}
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:scale-[1.02] hover:border-[#00d083]/30 transition-all duration-300">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-5 sm:mb-6">
                <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d083]" />
              </div>
              <h3 className="text-base sm:text-xl font-semibold mb-2 sm:mb-3">Local Offers</h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                Exclusive deals from places you already love. Delivered straight to your wallet.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:scale-[1.02] hover:border-[#00d083]/30 transition-all duration-300">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-5 sm:mb-6">
                <Stamp className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d083]" />
              </div>
              <h3 className="text-base sm:text-xl font-semibold mb-2 sm:mb-3">Built-in Loyalty Cards</h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                Ditch the paper stamp cards. Earn, collect, and redeem rewards digitally — powered by smart tracking.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:scale-[1.02] hover:border-[#00d083]/30 transition-all duration-300">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-5 sm:mb-6">
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d083]" />
              </div>
              <h3 className="text-base sm:text-xl font-semibold mb-2 sm:mb-3">Secret Menu Club</h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                Hidden dishes and off-menu combos that unlock as local venues join.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:scale-[1.02] hover:border-[#00d083]/30 transition-all duration-300">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-5 sm:mb-6">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d083]" />
              </div>
              <h3 className="text-base sm:text-xl font-semibold mb-2 sm:mb-3">AI Companion</h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                Ask by craving, vibe, or budget. Powered by real menus and verified local data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Ready to explore {displayName}?
          </h2>
          <p className="text-lg sm:text-xl text-white/60 mb-10">
            Add Qwikker to your mobile wallet and open your city dashboard.
          </p>
          <Link
            href="/join"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#00d083] hover:bg-[#00b86f] text-white rounded-xl font-medium transition-all"
          >
            Get the {displayName} pass
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* How it works — 3-column steps */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-14 sm:mb-20 text-white text-center">
            How it works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-10 md:gap-6 relative">
            <div className="hidden md:block absolute top-5 left-[16.67%] right-[16.67%] h-px border-t border-dashed border-white/10" />

            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#00d083] mb-4 tabular-nums">01</div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">Add to your wallet</h3>
              <p className="text-white/50 text-sm sm:text-base leading-relaxed">
                Tap the button. No app to download — Qwikker lives in Apple or Google Wallet.
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#00d083] mb-4 tabular-nums">02</div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">Explore your city</h3>
              <p className="text-white/50 text-sm sm:text-base leading-relaxed">
                Browse offers, collect loyalty rewards, discover secret menus, and chat with the AI companion.
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#00d083] mb-4 tabular-nums">03</div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">It grows with your city</h3>
              <p className="text-white/50 text-sm sm:text-base leading-relaxed">
                New businesses, offers, and rewards appear automatically. Your pass stays up to date.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      {showFeatured && (
        <section className="py-20 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold mb-10 text-white text-center">
              Featured in {displayName}
            </h2>
            <div className="flex gap-4 justify-center flex-wrap">
              {featuredBusinesses.map((biz) => {
                const heroImage = biz.business_images?.[0]
                return (
                  <div
                    key={biz.id}
                    className="w-64 sm:w-72"
                  >
                    <div className="relative rounded-2xl overflow-hidden h-44 sm:h-52 border border-white/10">
                      {heroImage ? (
                        <img src={heroImage} alt={biz.business_name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h3 className="text-base font-semibold text-white leading-tight mb-1">
                          {biz.business_name}
                        </h3>
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
      )}

      {/* Supporters Section */}
      {showSupporters && (
        <section className="py-12 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs uppercase tracking-widest text-white/50 mb-6">
              {landingConfig.supporters_heading || 'Proudly supported by'}
            </p>
            <div className="flex items-center justify-center gap-8 md:gap-10 flex-wrap">
              {(landingConfig.supporter_logos || []).map((supporter, i) => (
                <img
                  key={i}
                  src={supporter.logo_url}
                  alt={supporter.name}
                  title={supporter.name}
                  style={{ height: '120px', maxWidth: '320px', width: 'auto' }}
                  className="object-contain opacity-40 grayscale hover:grayscale-0 hover:opacity-90 transition-all duration-300"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sponsor Banner */}
      {showSponsor && (
        <div className="border-t border-white/5 py-8 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto flex flex-col items-center gap-3">
            <div className="text-center">
              {landingConfig.sponsor_name && (
                <p className="text-sm text-white/60">
                  Qwikker {displayName} is sponsored by {landingConfig.sponsor_name}
                </p>
              )}
              {landingConfig.sponsor_tagline && (
                <p className="text-xs text-white/40 mt-0.5">{landingConfig.sponsor_tagline}</p>
              )}
            </div>
            {landingConfig.sponsor_logo_url && (
              <img
                src={landingConfig.sponsor_logo_url}
                alt={landingConfig.sponsor_name || 'Sponsor'}
                className="h-10 w-auto"
              />
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-8 mb-8">
            <div className="flex flex-col items-center gap-1">
              <img 
                src="/qwikker-logo-web.svg" 
                alt="QWIKKER" 
                className="h-6 w-auto"
              />
              <span className="text-white/40 text-sm">{displayName}</span>
            </div>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <Link href="/for-business" className="text-sm text-white/60 hover:text-white transition-colors">
                For Business
              </Link>
              <Link href="/about" className="text-sm text-white/60 hover:text-white transition-colors">
                About
              </Link>
              <Link href="https://qwikker.com" className="text-sm text-white/60 hover:text-white transition-colors">
                Other Cities
              </Link>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-white/40">© Qwikker 2026</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
