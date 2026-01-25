'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, MapPin, Gift, Menu } from 'lucide-react'

interface CityLandingPageProps {
  city: string
  displayName: string
  subdomain: string
}

export function CityLandingPage({ city, displayName, subdomain }: CityLandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      {/* Header - Minimal status + nav */}
      <header className="border-b border-white/5 bg-[#0b0d10]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          {/* Left: Status label - quieter */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00d083]" />
            <span className="text-white/50">{displayName} — Live</span>
          </div>
          
          {/* Right: Minimal nav */}
          <nav className="flex items-center gap-6">
            <Link href="/for-business" className="text-sm text-white/40 hover:text-white/60 transition-colors">
              For Business
            </Link>
            <Link href="/about" className="text-sm text-white/40 hover:text-white/60 transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero - Cinematic with editorial spacing */}
      <section className="relative overflow-hidden">
        {/* Background: Cinematic abstract city bokeh */}
        <div className="absolute inset-0 z-0">
          {/* Next.js Image with priority loading */}
          <Image
            src="/qwikkerhero.png"
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
          
          {/* Gradient overlay */}
          <div 
            className="absolute inset-0 z-10"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0.65) 100%)'
            }}
          />
        </div>

        {/* Content - elevated with text shadow */}
        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-40 pb-48 text-center">
          {/* Logo - reduced by ~7% for better balance */}
          <div className="mb-12 flex justify-center">
            <img 
              src="/qwikker-logo-web.svg" 
              alt="QWIKKER" 
              className="h-11 w-auto"
              style={{ filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.5))' }}
            />
          </div>

          {/* Main headline - increased contrast on "in your wallet" */}
          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            {displayName}, <br/>
            <span className="text-white/70">in your wallet</span>
          </h1>
          
          {/* Supporting line */}
          <p className="text-lg text-neutral-300 mb-6 leading-relaxed max-w-2xl mx-auto" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
            Local offers, secret menus, and dish-level recommendations — delivered to your mobile wallet.
          </p>

          {/* Trust line */}
          <p className="text-sm text-neutral-400 mb-12 leading-relaxed max-w-xl mx-auto" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
            Powered by real menus, real hours, and local context — not scraped reviews.
          </p>

          {/* Single CTA */}
          <Link
            href="/join"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#00d083]/10 hover:bg-[#00d083]/15 border border-[#00d083]/30 text-[#00d083] rounded-xl font-medium transition-all"
          >
            Add to your mobile wallet
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <div className="w-12 h-12 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-6">
                <Gift className="w-6 h-6 text-[#00d083]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Local Offers</h3>
              <p className="text-white/60 leading-relaxed">
                Quiet perks from places you already trust. Delivered to your wallet.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <div className="w-12 h-12 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-6">
                <Menu className="w-6 h-6 text-[#00d083]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secret Menu Club</h3>
              <p className="text-white/60 leading-relaxed">
                Off-menu dishes and hidden combinations. Unlocks as venues join.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <div className="w-12 h-12 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-[#00d083]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Companion</h3>
              <p className="text-white/60 leading-relaxed">
                Ask by craving, vibe, or budget. Gets sharper as businesses verify details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to explore {displayName}?
          </h2>
          <p className="text-xl text-white/60 mb-10">
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

      {/* How it works - Soft step indicators */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-white text-center">
            How it works
          </h2>
          
          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 text-sm font-medium">
                  ①
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Add the pass</h3>
                <p className="text-white/60 leading-relaxed">
                  Add Qwikker to your mobile wallet. You&apos;ll be taken straight to your city dashboard.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 text-sm font-medium">
                  ②
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Your access stays with you</h3>
                <p className="text-white/60 leading-relaxed">
                  Flip the pass anytime to return — your dashboard link is always saved on the back.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 text-sm font-medium">
                  ③
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">No setup, no maintenance</h3>
                <p className="text-white/60 leading-relaxed">
                  No app. No accounts. Your city updates automatically as it grows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle divider */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="h-px bg-white/5" />
      </div>

      {/* Cities grow over time - Soft step indicators */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-white text-center">
            Cities grow over time
          </h2>
          
          <div className="space-y-12">
            {/* Point 1 */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Curated first</h3>
              <p className="text-white/60 leading-relaxed">
                Every city launches with hand-picked places to explore.
              </p>
            </div>

            {/* Point 2 */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Features unlock quietly</h3>
              <p className="text-white/60 leading-relaxed">
                Offers, secret menus, and companion features appear as local businesses join.
              </p>
            </div>

            {/* Point 3 */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Nothing to manage</h3>
              <p className="text-white/60 leading-relaxed">
                Your pass updates on its own — your city just keeps getting better.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <img 
                src="/qwikker-logo-web.svg" 
                alt="QWIKKER" 
                className="h-6 w-auto"
              />
              <span className="text-white/40">·</span>
              <span className="text-white/40 text-sm">{displayName}</span>
            </div>
            <div className="flex items-center gap-6">
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
          
          {/* Copyright */}
          <div className="text-center">
            <p className="text-sm text-white/40">© Qwikker 2026</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
