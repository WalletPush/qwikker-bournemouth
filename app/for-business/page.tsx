import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'For Business | QWIKKER',
  description: 'Turn local discovery into real customers with QWIKKER — intent-first, local by design.',
}

export default async function ForBusinessPage() {
  // Fetch live cities
  const supabase = await createClient()
  const { data: cities } = await supabase
    .from('franchise_public_info')
    .select('city, display_name, subdomain, status')
    .eq('status', 'active')
    .order('display_name')

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

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-32">
        <div className="max-w-3xl">
          <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-8 leading-[1.05]">
            Turn local discovery into real customers.
          </h1>
          
          <p className="text-xl text-neutral-400 mb-10 leading-relaxed">
            QWIKKER connects your business to people who are already looking — by craving, not keywords.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <a
              href="#check-city"
              className="px-8 py-4 bg-[#00d083] text-black text-base font-medium rounded-xl hover:bg-[#00b86f] transition-all shadow-lg shadow-[#00d083]/20"
            >
              Check your city
            </a>
            <a
              href="#how-it-works"
              className="text-[#00d083] hover:text-[#00b86f] transition-colors flex items-center gap-2 text-base font-medium"
            >
              How it works
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Why QWIKKER works for businesses */}
      <section className="max-w-6xl mx-auto px-6 py-32 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-20">
          Why QWIKKER works for businesses
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Intent-first discovery',
              desc: 'Customers ask for exact dishes, moods, budgets — not vague searches.'
            },
            {
              title: 'No coupon landfill',
              desc: 'You control offers. No race to the bottom.'
            },
            {
              title: 'Local by design',
              desc: 'You only compete with businesses in your city.'
            }
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors"
            >
              <h3 className="text-2xl font-semibold text-white mb-4">{item.title}</h3>
              <p className="text-neutral-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="max-w-6xl mx-auto px-6 py-32 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-20">
          What you get
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            'Featured placement in city discovery',
            'Dish-level visibility (menus + specials)',
            'Secret Menu Club participation',
            'Wallet-based offers (no app installs)',
            'Atlas map presence (when applicable)',
            'Real-time customer insights'
          ].map((item) => (
            <div
              key={item}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#00d083]/30 transition-colors flex items-start gap-4"
            >
              <div className="w-2 h-2 rounded-full bg-[#00d083] mt-2 flex-shrink-0" />
              <p className="text-neutral-300">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How onboarding works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-32 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-20">
          How onboarding works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { num: '01', title: 'Select your city', desc: 'Choose from our live locations' },
            { num: '02', title: 'Claim or add your business', desc: 'Quick and simple setup' },
            { num: '03', title: 'Choose how you want to appear', desc: 'Control your presence' },
            { num: '04', title: 'Start getting discovered', desc: 'Go live immediately' }
          ].map((step) => (
            <div key={step.num} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-4xl font-bold text-[#00d083]/30 mb-4">{step.num}</div>
              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-neutral-400 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* City availability selector */}
      <section id="check-city" className="max-w-6xl mx-auto px-6 py-32 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-8 text-center">
            Is QWIKKER live in your city?
          </h2>
          <p className="text-neutral-400 text-center mb-12">
            Select your city to get started with the business dashboard.
          </p>

          {cities && cities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {cities.map((city) => (
                <a
                  key={city.city}
                  href={`https://${city.subdomain}.qwikker.com/business-signup`}
                  className="bg-white/5 border border-white/10 hover:border-[#00d083]/40 rounded-xl p-6 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00d083]" />
                    <span className="text-white font-medium text-lg">{city.display_name}</span>
                  </div>
                  <svg className="w-5 h-5 text-neutral-500 group-hover:text-[#00d083] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-600">
              <p>No cities available yet. Check back soon!</p>
            </div>
          )}

          {/* Coming soon cities */}
          <div className="border-t border-white/10 pt-12">
            <h3 className="text-xl font-semibold text-white mb-6 text-center">Coming soon</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {['Southampton', 'Brighton', 'London', 'Cornwall', 'Calgary', 'Las Vegas'].map((cityName) => (
                <div key={cityName} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center opacity-50">
                  <p className="text-neutral-500 text-sm">{cityName}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <a
                href="mailto:hello@qwikker.com?subject=Business Waitlist"
                className="inline-block px-6 py-3 border border-white/20 text-neutral-300 hover:text-white hover:border-white/40 rounded-lg text-sm transition-colors"
              >
                Join the waitlist for your city
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16">
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
              © QWIKKER — Built for businesses, city by city.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
