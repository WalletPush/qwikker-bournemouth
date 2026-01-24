'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface LiveCity {
  city: string
  display_name: string
  subdomain: string
  country_name: string | null
}

export function GlobalHomepage({ cities }: { cities: LiveCity[] }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log('GlobalHomepage mounted, cities:', cities)
  }, [cities])

  const scrollToCity = () => {
    document.getElementById('live-cities')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Show loading state while mounting
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl text-neutral-400">Loading QWIKKER...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="border-b border-neutral-800 backdrop-blur-sm sticky top-0 z-50 bg-black/80">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* Try multiple logo paths */}
            <img
              src="/qwikker-logo-web.svg"
              alt="QWIKKER"
              style={{ height: '40px', width: 'auto', minWidth: '100px' }}
              className="h-10 w-auto"
              onError={(e) => {
                console.error('Logo 1 failed, trying /Qwikker Logo web.svg')
                e.currentTarget.src = '/Qwikker Logo web.svg'
                e.currentTarget.onerror = (e2) => {
                  console.error('Logo 2 failed, trying /qwikker-icon.svg')
                  ;(e2.currentTarget as HTMLImageElement).src = '/qwikker-icon.svg'
                  ;(e2.currentTarget as HTMLImageElement).onerror = () => {
                    console.error('All logos failed, showing text fallback')
                    const img = document.querySelector('nav img[alt="QWIKKER"]') as HTMLElement
                    if (img) img.style.display = 'none'
                    const textLogo = document.getElementById('text-logo-fallback')
                    if (textLogo) textLogo.style.display = 'block'
                  }
                }
              }}
              onLoad={(e) => {
                const img = e.currentTarget
                console.log('✅ Logo loaded successfully', {
                  src: img.src,
                  width: img.width,
                  height: img.height,
                  naturalWidth: img.naturalWidth,
                  naturalHeight: img.naturalHeight,
                  offsetWidth: img.offsetWidth,
                  offsetHeight: img.offsetHeight
                })
                
                // If loaded but dimensions are 0, show fallback
                if (img.offsetWidth === 0 || img.offsetHeight === 0) {
                  console.error('❌ Logo loaded but has 0 dimensions, showing text fallback')
                  img.style.display = 'none'
                  const textLogo = document.getElementById('text-logo-fallback')
                  if (textLogo) textLogo.style.display = 'block'
                }
              }}
            />
            <span id="text-logo-fallback" className="text-2xl font-bold hidden">
              <span className="text-white">QWIKKER</span>
            </span>
          </Link>
          
          <div className="flex items-center gap-8">
            <button 
              onClick={scrollToCity}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Live cities
            </button>
            <Link 
              href="/for-business" 
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              For business
            </Link>
            <Link 
              href="/about" 
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              About
            </Link>
            <button 
              onClick={scrollToCity}
              className="px-5 py-2.5 border border-[#00d083] text-[#00d083] hover:bg-[#00d083]/10 rounded-lg text-sm font-medium transition-all"
            >
              Choose a city
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-6 pt-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div>
            <h1 className="text-6xl md:text-7xl xl:text-8xl font-bold tracking-tight text-white mb-8 leading-[0.95]">
              Your city, curated — not searched.
            </h1>
            
            <p className="text-xl md:text-2xl text-neutral-400 mb-10 leading-relaxed max-w-[600px]">
              QWIKKER is a city pass that lives in your phone wallet. It unlocks exclusive offers, hidden menu items, and truly specific recommendations — without apps, noise, or spam.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-5">
              <button 
                onClick={scrollToCity}
                className="px-10 py-5 bg-[#00d083] text-black text-lg font-bold rounded-2xl hover:bg-[#00b86f] transition-all shadow-2xl shadow-[#00d083]/30 hover:shadow-[#00d083]/50"
              >
                Choose your city
              </button>
              <Link 
                href="/for-business"
                className="text-[#00d083] hover:text-[#00b86f] transition-colors flex items-center gap-2 text-lg font-medium"
              >
                QWIKKER for Business
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <p className="text-sm text-neutral-600">
              Free. Works on iPhone and Android. No app required.
            </p>
          </div>

          {/* Right: Visual Element */}
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-[#00d083]/20 to-transparent rounded-3xl border border-neutral-800 p-12 backdrop-blur-sm relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-[#00d083]/10 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-[#00d083]/5 rounded-full blur-2xl" />
              
              {/* Mock Phone Wallet */}
              <div className="relative z-10 bg-neutral-900 rounded-3xl border border-neutral-700 p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <div className="text-neutral-400 text-sm mb-4">Apple Wallet</div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-[#00d083]/20 rounded-2xl flex items-center justify-center">
                    <div className="text-[#00d083] text-2xl font-bold">Q</div>
                  </div>
                  <div>
                    <div className="text-white font-bold text-xl">QWIKKER</div>
                    <div className="text-neutral-500 text-sm">Bournemouth</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-neutral-800 rounded w-3/4" />
                  <div className="h-2 bg-neutral-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is QWIKKER */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <div>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-12">
            What is QWIKKER?
          </h2>
          
          <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed max-w-[900px]">
            QWIKKER is <span className="text-white font-semibold">not a review site.</span> It's not Yelp, TripAdvisor, or Google Maps. 
            It's a <span className="text-white font-semibold">city pass</span> that lives in your phone's wallet — giving you instant 
            access to <span className="text-[#00d083]">exclusive offers, secret menus, and an AI companion</span> that knows your city inside out.
          </p>
        </div>
      </section>

      {/* How it works - with visual cards */}
      <section className="max-w-[1400px] mx-auto px-6 py-32 border-t border-neutral-800">
        <div>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-24 text-center">
            How it works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Choose your city',
                description: 'Every city is separate, curated, and local.',
                gradient: 'from-[#00d083]/10 to-transparent'
              },
              {
                step: '02',
                title: 'Add the pass to your wallet',
                description: 'One tap. No app. Works instantly.',
                gradient: 'from-[#00d083]/15 to-transparent'
              },
              {
                step: '03',
                title: 'Explore with intent',
                description: 'Ask for a dish, a vibe, a budget, or a constraint — QWIKKER responds like a local.',
                gradient: 'from-[#00d083]/20 to-transparent'
              }
            ].map((item) => (
              <div
                key={item.step}
                className={`bg-gradient-to-br ${item.gradient} border border-neutral-800 rounded-3xl p-10 hover:border-neutral-700 transition-all group`}
              >
                <div className="text-6xl font-bold text-[#00d083]/30 mb-6 group-hover:text-[#00d083]/50 transition-colors">{item.step}</div>
                <h3 className="text-3xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-neutral-400 text-lg leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Companion */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-8">
              The AI Companion
            </h2>
            
            <div className="space-y-6 text-lg text-neutral-300 leading-relaxed">
              <p>
                QWIKKER isn't built on reviews. It's built on <span className="text-white font-semibold">menus, opening hours, dietary filters, and context.</span>
              </p>
              
              <p>
                Ask it anything:
              </p>
              
              <ul className="space-y-3 pl-6 border-l-2 border-[#00d083]/30">
                <li><span className="text-[#00d083]">"Gluten-free brunch near the waterfront"</span></li>
                <li><span className="text-[#00d083]">"Date night under £60"</span></li>
                <li><span className="text-[#00d083]">"Best jerk chicken in town"</span></li>
              </ul>
              
              <p>
                It won't give you generic 5-star lists. <br />
                <span className="text-white font-semibold">It'll tell you exactly where to go, and why.</span>
              </p>
            </div>
          </div>
          
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10">
            <div className="space-y-6">
              <div className="bg-neutral-800 rounded-2xl p-6">
                <p className="text-neutral-300 text-base mb-3">"Best pizza near me that's open past 11pm?"</p>
                <div className="h-px bg-neutral-700 my-4" />
                <p className="text-[#00d083] text-sm font-medium">
                  Artisan Pizza on High Street. <br />
                  Open until midnight. Sourdough base. <br />
                  Their Nduja pizza is incredible.
                </p>
              </div>
              
              <div className="text-center text-neutral-600 text-sm">
                Powered by your city's real data — not scraped reviews.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Atlas Mode */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <div>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-8">
            Atlas Mode
          </h2>
          
          <p className="text-xl text-neutral-300 mb-12 max-w-[800px] leading-relaxed">
            Turn on <span className="text-white font-semibold">Atlas Mode</span>, and QWIKKER becomes your <span className="text-[#00d083]">ambient city guide.</span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px]">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">Walk past a spot</h3>
              <p className="text-neutral-400 text-lg">
                Your phone buzzes. QWIKKER tells you: <span className="text-[#00d083]">"This place does the best espresso martini in Bournemouth."</span>
              </p>
            </div>
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">No searching required</h3>
              <p className="text-neutral-400 text-lg">
                It's <span className="text-white font-semibold">contextual intelligence</span> — recommendations triggered by where you are, not what you search.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Offers + Secret Menu Club */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <div>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-8">
            Offers + Secret Menu Club
          </h2>
          
          <p className="text-xl text-neutral-300 mb-12 max-w-[800px] leading-relaxed">
            Holding a QWIKKER pass unlocks <span className="text-white font-semibold">real, local perks</span> — not coupons, not spam.
          </p>
          
          <div className="space-y-6 text-lg text-neutral-300 max-w-[800px]">
            <p>
              <span className="text-[#00d083] font-semibold">Exclusive offers:</span> 20% off brunch. Free dessert with mains. Happy hour extensions.
            </p>
            
            <p>
              <span className="text-[#00d083] font-semibold">Secret Menu Club:</span> Dishes that aren't on the public menu. 
              Things only locals know about. <span className="text-white font-semibold">Now you're in on it.</span>
            </p>
            
            <p className="text-base text-neutral-500 pt-6">
              These aren't affiliate deals. They're partnerships — built with businesses that want to reward their community, not chase algorithms.
            </p>
          </div>
        </div>
      </section>

      {/* Live Cities */}
      <section id="live-cities" className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <div>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Live cities
          </h2>
          <p className="text-neutral-400 text-xl mb-16 max-w-[600px]">
            Select your city to install the pass and start exploring.
          </p>

          {cities && cities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cities.map((city) => (
                <a
                  key={city.city}
                  href={`https://${city.subdomain}.qwikker.com`}
                  className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-8 transition-all hover:translate-y-[-4px] group"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00d083]" />
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Live</span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2 group-hover:text-[#00d083] transition-colors">
                    {city.display_name}
                  </h3>
                  {city.country_name && (
                    <p className="text-base text-neutral-500">{city.country_name}</p>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-neutral-600 text-lg">
              No cities live yet
            </div>
          )}
        </div>
      </section>

      {/* About */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <div className="max-w-[900px]">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-12">
            About QWIKKER
          </h2>
          
          <div className="space-y-6 text-lg text-neutral-300 leading-relaxed">
            <p>
              QWIKKER started because <span className="text-white font-semibold">local discovery is broken.</span>
            </p>
            
            <p>
              Google Maps shows you everything. Yelp drowns you in reviews. Instagram makes you scroll for hours. 
              <span className="text-white font-semibold"> None of them tell you where to actually go.</span>
            </p>
            
            <p>
              We built QWIKKER to fix that — by creating <span className="text-[#00d083]">city-specific passes</span> that live 
              in your phone's wallet, powered by an AI that knows your city like a local guide, and rewarding exploration 
              with real perks from businesses that care.
            </p>
            
            <p className="text-white font-semibold pt-4">
              No ads. No algorithms gaming your attention. <br />
              Just your city — curated, contextual, and yours.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 mt-32">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
            <div className="flex flex-wrap gap-x-10 gap-y-4 text-base">
              <button onClick={scrollToCity} className="text-neutral-500 hover:text-white transition-colors">
                Live cities
              </button>
              <Link href="/for-business" className="text-neutral-500 hover:text-white transition-colors">
                For business
              </Link>
              <Link href="/about" className="text-neutral-500 hover:text-white transition-colors">
                About
              </Link>
              <Link href="/privacy-policy" className="text-neutral-500 hover:text-white transition-colors">
                Privacy
              </Link>
              <a href="mailto:support@qwikker.com" className="text-neutral-500 hover:text-white transition-colors">
                Contact
              </a>
            </div>
            <p className="text-base text-neutral-600">
              © QWIKKER — Built for cities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
