'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, MapPin, Gift, Menu } from 'lucide-react'

interface CityLandingPageProps {
  city: string
  displayName: string
  subdomain: string
}

export function CityLandingPage({ city, displayName, subdomain }: CityLandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0b0d10]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">QWIKKER</span>
            <span className="text-white/40">·</span>
            <span className="text-white/60">{displayName}</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/for-business" className="text-sm text-white/60 hover:text-white transition-colors">
              For Business
            </Link>
            <Link href="/about" className="text-sm text-white/60 hover:text-white transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00d083]/10 border border-[#00d083]/20 text-[#00d083] text-sm font-medium mb-8">
            <MapPin className="w-4 h-4" />
            Now live in {displayName}
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight">
            {displayName}, <br/>
            <span className="text-white/60">in your wallet</span>
          </h1>
          
          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
            Local offers, secret menus, and dish-level recommendations for {displayName}. 
            No app required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/join"
              className="px-8 py-4 bg-[#00d083]/10 hover:bg-[#00d083]/15 border border-[#00d083]/30 text-[#00d083] rounded-xl font-medium transition-all flex items-center gap-2 group"
            >
              Add to Apple Wallet
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/user"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
            >
              Explore {displayName}
            </Link>
          </div>

          <p className="text-sm text-white/40 mt-6">
            100% free. No ads. No spam. Works instantly.
          </p>
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
                Real perks from local businesses in {displayName}. No coupon codes, no spam.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <div className="w-12 h-12 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-6">
                <Menu className="w-6 h-6 text-[#00d083]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secret Menu Club</h3>
              <p className="text-white/60 leading-relaxed">
                Off-menu dishes and hidden combinations from {displayName}'s best spots.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <div className="w-12 h-12 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-[#00d083]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Companion</h3>
              <p className="text-white/60 leading-relaxed">
                Ask for specific dishes, vibes, or budgets. Get recommendations that match.
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
            Add QWIKKER to your Apple Wallet and start discovering.
          </p>
          <Link
            href="/join"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#00d083] hover:bg-[#00b86f] text-white rounded-xl font-medium transition-all"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">QWIKKER</span>
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
        </div>
      </footer>
    </div>
  )
}
