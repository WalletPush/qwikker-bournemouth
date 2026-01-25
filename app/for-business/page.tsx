import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { BusinessCitiesSection } from '@/components/marketing/business-cities-section'

export const metadata = {
  title: 'For Business | QWIKKER',
  description: 'Turn local discovery into real customers with QWIKKER — intent-first, local by design.',
}

export default async function ForBusinessPage() {
  // Fetch all cities (active + coming_soon)
  const supabase = await createClient()
  const { data: cities } = await supabase
    .from('franchise_public_info')
    .select('city, display_name, subdomain, status, country_name')
    .in('status', ['active', 'coming_soon'])
    .order('country_name')
    .order('display_name')
  
  // Group cities by country
  const groupedCities: Record<string, typeof cities> = {}
  cities?.forEach((city) => {
    const country = city.country_name || 'Other'
    if (!groupedCities[country]) {
      groupedCities[country] = []
    }
    groupedCities[country].push(city)
  })

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50 bg-[#0b0d10]/80">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src="/qwikker-logo-web.svg"
              alt="QWIKKER"
              style={{ height: '48px', width: 'auto', minWidth: '150px' }}
              className="h-10 md:h-12 w-auto"
            />
          </Link>
          
          <div className="flex items-center gap-8">
            <Link href="/" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="#check-city" className="px-5 py-2.5 border border-[#00d083]/40 text-[#00d083] hover:bg-[#00d083]/5 rounded-lg text-sm font-medium transition-all">
              Check your city
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero - Cinematic with business bokeh background */}
      <section className="relative overflow-hidden">
        {/* Background: Cinematic business bokeh with layered treatment */}
        <div className="absolute inset-0 z-0">
          {/* Next.js Image with priority loading for instant display */}
          <Image
            src="/qwikkerbusiness.png"
            alt="Business bokeh background"
            fill
            priority
            quality={85}
            className="object-cover"
            style={{
              opacity: 0.35,
              filter: 'blur(0.8px)'
            }}
          />
          
          {/* Subtle vertical gradient overlay */}
          <div 
            className="absolute inset-0 z-10"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0.65) 100%)'
            }}
          />
        </div>

        {/* Content - elevated above background with text shadow for readability */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-48">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-8 leading-[1.05]" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
              Turn local discovery into real customers.
            </h1>
            
            <p className="text-xl text-neutral-300 mb-10 leading-relaxed max-w-2xl mx-auto" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
              QWIKKER connects your business to people who are already looking — by craving, not keywords.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <a
                href="#check-city"
                className="px-8 py-4 bg-[#00d083]/10 hover:bg-[#00d083]/15 border border-[#00d083]/30 text-[#00d083] text-base font-medium rounded-xl transition-all"
              >
                Check your city
              </a>
              <a
                href="#how-it-works"
                className="text-neutral-300 hover:text-white transition-colors flex items-center gap-2 text-base font-medium"
              >
                How it works
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why QWIKKER works for businesses */}
      <section className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 text-center">
          Why QWIKKER works for local businesses
        </h2>
        <p className="text-sm text-neutral-500 mb-24 text-center">
          Built to reward relevance, not ad spend.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Intent-first discovery',
              desc: 'Customers arrive with intent — specific dishes, moods, and budgets — not casual browsing.'
            },
            {
              title: 'No coupon landfill',
              desc: 'You control when and how you offer value — no discount wars.'
            },
            {
              title: 'Local by design',
              desc: 'You only compete locally — not with chains or national platforms.'
            }
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 hover:border-white/20 transition-colors shadow-lg"
            >
              <h3 className="text-2xl font-semibold text-white mb-4 leading-snug">{item.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 text-center">
          Your presence on QWIKKER
        </h2>
        <p className="text-sm text-neutral-500 mb-24 text-center max-w-2xl mx-auto">
          Everything here works automatically — no apps, no setup, no noise.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: 'Featured placement in city discovery',
              desc: 'Appears when customers ask for what you actually serve.'
            },
            {
              title: 'Dish-level visibility (menus + specials)',
              desc: 'Customers discover specific dishes — not just your name.'
            },
            {
              title: 'Secret Menu Club participation',
              desc: 'Off-menu dishes, hidden combinations, local-only perks.'
            },
            {
              title: 'Wallet-based offers (no app installs)',
              desc: 'Offers live in the phone wallet. One tap to save.'
            },
            {
              title: 'Atlas map presence (when applicable)',
              desc: 'Highlighted visually when users explore by location.'
            },
            {
              title: 'Real-time customer insights',
              desc: 'See what people are asking for — and when.'
            }
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-[#00d083]/30 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-[#00d083] mt-2 flex-shrink-0" />
                <div>
                  <h3 className="text-neutral-300 font-medium mb-1">{item.title}</h3>
                  <p className="text-sm text-neutral-500">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-neutral-600 mt-16">
          Managed from a simple dashboard. Updated instantly.
        </p>
      </section>

      {/* How customers find you */}
      <section className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 text-center">
          How customers find you
        </h2>
        <p className="text-base text-neutral-400 mb-24 text-center max-w-2xl mx-auto leading-relaxed">
          Customers don&apos;t browse QWIKKER. They ask — and you appear when you&apos;re relevant.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Step 01 */}
          <div>
            <div className="text-5xl font-bold text-[#00d083]/30 mb-6">01</div>
            <h3 className="text-2xl font-semibold text-white mb-6 leading-snug">
              A real craving
            </h3>
            <p className="text-sm text-neutral-500 mb-8">
              Customers ask in plain English
            </p>
            
            {/* Text bubbles */}
            <div className="space-y-3 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-sm text-neutral-300">&quot;Spicy pizza, open now&quot;</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-sm text-neutral-300">&quot;Date night under £60&quot;</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-sm text-neutral-300">&quot;Kids menu, cocktails, walkable&quot;</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 italic">
              No keywords. No filters. Just intent.
            </p>
          </div>

          {/* Step 02 */}
          <div>
            <div className="text-5xl font-bold text-[#00d083]/30 mb-6">02</div>
            <h3 className="text-2xl font-semibold text-white mb-6 leading-snug">
              QWIKKER matches intent to your menu
            </h3>
            <p className="text-sm text-neutral-500 mb-8">
              Menus, hours, and context do the work
            </p>
            
            <p className="text-base text-neutral-300 leading-relaxed">
              QWIKKER reads real menus, opening hours, and constraints — not scraped reviews.
            </p>
          </div>

          {/* Step 03 */}
          <div>
            <div className="text-5xl font-bold text-[#00d083]/30 mb-6">03</div>
            <h3 className="text-2xl font-semibold text-white mb-6 leading-snug">
              You appear for the right reasons
            </h3>
            <p className="text-sm text-neutral-500 mb-8">
              Relevant local businesses are shown first
            </p>
            
            <p className="text-base text-neutral-300 leading-relaxed mb-6">
              You&apos;re surfaced because you fit — not because you paid more.
            </p>

            <p className="text-xs text-neutral-600 italic">
              Chains don&apos;t outrank locals. Relevance wins.
            </p>
          </div>
        </div>
      </section>

      {/* What your business looks like on QWIKKER */}
      <section className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 text-center">
          What your business looks like on QWIKKER
        </h2>
        <p className="text-base text-neutral-400 mb-24 text-center max-w-2xl mx-auto leading-relaxed">
          You don&apos;t advertise. You appear when you&apos;re relevant.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: 'Dish-level discovery',
              desc: 'Customers find you for what you actually serve — not just your name.'
            },
            {
              title: 'Contextual visibility',
              desc: 'You appear based on time, location, budget, and intent — automatically.'
            },
            {
              title: "Offers that don't feel like coupons",
              desc: 'Wallet-based perks that reward relevance, not discounts.'
            },
            {
              title: 'Local-first positioning',
              desc: 'You compete locally — not against chains or national ad budgets.'
            }
          ].map((item) => (
            <div
              key={item.title}
              className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-10 hover:border-[#00d083]/30 transition-all duration-300 group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#00d083]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              <div className="relative">
                <h3 className="text-2xl font-semibold text-white mb-4 leading-snug">
                  {item.title}
                </h3>
                <p className="text-base text-neutral-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How onboarding works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 text-center">
          How onboarding works
        </h2>
        <p className="text-sm text-neutral-500 mb-24 text-center">
          No sales calls. Cancel anytime. Go live in minutes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { num: '01', title: 'Select your city', desc: 'Choose from our live locations' },
            { num: '02', title: 'Claim or add your business', desc: 'Claim your existing listing or add your business in minutes' },
            { num: '03', title: 'Choose how you want to appear', desc: 'Control what appears — menus, offers, and visibility' },
            { num: '04', title: 'Start getting discovered', desc: 'Appear when customers ask — no ads required' }
          ].map((step) => (
            <div key={step.num} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 h-full hover:border-white/20 transition-colors shadow-lg">
              <div className="text-5xl font-bold text-[#00d083]/30 mb-8">{step.num}</div>
              <h3 className="text-2xl font-semibold text-white mb-4 leading-snug">{step.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-neutral-600 mt-16">
          Managed from a simple dashboard. Changes update instantly.
        </p>
      </section>

      {/* City availability selector */}
      <section id="check-city" className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 text-center">
            Is QWIKKER live in your city?
          </h2>
          <p className="text-sm text-neutral-500 mb-8 text-center">
            Start managing your business presence in minutes.
          </p>
          <p className="text-neutral-400 text-center mb-12">
            Select your city to get started on QWIKKER.
          </p>

          {cities && cities.length > 0 ? (
            <BusinessCitiesSection cities={cities} />
          ) : (
            <div className="text-center py-12 text-neutral-600">
              <p>No cities available yet. Check back soon!</p>
            </div>
          )}

          {/* Join waitlist CTA */}
          <div className="text-center mt-16 pt-12 border-t border-white/10">
            <p className="text-sm text-neutral-500 mb-6">
              Don&apos;t see your city? Join the waitlist.
            </p>
            <a
              href="mailto:hello@qwikker.com?subject=Business Waitlist"
              className="inline-block px-6 py-3 border border-white/20 text-neutral-300 hover:text-white hover:border-white/40 rounded-lg text-sm transition-colors"
            >
              Join the waitlist for your city
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <Link href="/" className="text-sm text-neutral-500 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/for-business" className="text-sm text-neutral-500 hover:text-white transition-colors">
                For business
              </Link>
              <Link href="/about" className="text-sm text-neutral-500 hover:text-white transition-colors">
                About
              </Link>
              <a href="mailto:hello@qwikker.com" className="text-sm text-neutral-500 hover:text-white transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm text-neutral-600">
              © QWIKKER — Built city by city.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
