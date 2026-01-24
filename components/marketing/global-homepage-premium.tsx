'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { X, Menu } from 'lucide-react'

interface LiveCity {
  city: string
  display_name: string
  subdomain: string
  country_name: string | null
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

// Section wrapper with reveal animation
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeInUp}
      className={className}
    >
      {children}
    </motion.section>
  )
}

export function GlobalHomepagePremium({ cities }: { cities: LiveCity[] }) {
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [cities])

  const scrollToCity = () => {
    document.getElementById('live-cities')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-white flex items-center justify-center">
        <div className="text-lg text-neutral-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      {/* Sticky Nav - Small logo on left */}
      <nav className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50 bg-[#0b0d10]/80">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Logo - Bigger with explicit styles */}
          <Link href="/" className="flex items-center">
            <img
              src="/qwikker-logo-web.svg"
              alt="QWIKKER"
              style={{ height: '48px', width: 'auto', minWidth: '150px' }}
              className="h-10 md:h-12 w-auto"
              onError={(e) => {
                console.error('Header logo failed to load')
                e.currentTarget.src = '/Qwikker Logo web.svg'
                e.currentTarget.onerror = () => {
                  console.error('Fallback logo also failed')
                  const textLogo = document.getElementById('header-text-logo')
                  if (textLogo) textLogo.style.display = 'block'
                  e.currentTarget.style.display = 'none'
                }
              }}
              onLoad={() => console.log('✅ Header logo loaded successfully')}
            />
            <span id="header-text-logo" className="text-2xl font-bold hidden text-white">QWIKKER</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
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
              onClick={scrollToHowItWorks}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              How it works
            </button>
            <button 
              onClick={scrollToCity}
              className="px-5 py-2.5 border border-[#00d083]/40 text-[#00d083] hover:bg-[#00d083]/5 rounded-lg text-sm font-medium transition-all"
            >
              Choose a city
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-400 hover:text-white"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-[#0b0d10]"
          >
            <div className="px-6 py-6 space-y-6">
              <button 
                onClick={scrollToHowItWorks}
                className="block w-full text-left text-neutral-400 hover:text-white transition-colors"
              >
                How it works
              </button>
              <button 
                onClick={scrollToCity}
                className="block w-full text-left text-neutral-400 hover:text-white transition-colors"
              >
                Live cities
              </button>
              <Link 
                href="/for-business" 
                className="block text-neutral-400 hover:text-white transition-colors"
              >
                For business
              </Link>
              <Link 
                href="/about" 
                className="block text-neutral-400 hover:text-white transition-colors"
              >
                About
              </Link>
              <button 
                onClick={scrollToCity}
                className="w-full px-5 py-3 border border-[#00d083]/40 text-[#00d083] rounded-lg text-sm font-medium"
              >
                Choose a city
              </button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero - Intent → Response */}
      <section className="max-w-[1200px] mx-auto px-6 pt-24 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-8 leading-[1.05]">
              Your city, curated.<br />
              Not searched.
            </h1>
            
            <p className="text-lg text-neutral-400 mb-10 leading-relaxed max-w-[480px]">
              A city pass that lives in your phone wallet. Unlocks real local offers, Secret Menu items, and dish-level recommendations — without apps, noise, or spam.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
              <button 
                onClick={scrollToCity}
                className="px-8 py-4 bg-[#00d083] text-black text-base font-medium rounded-xl hover:bg-[#00b86f] transition-all shadow-lg shadow-[#00d083]/20"
              >
                Choose your city
              </button>
              <Link 
                href="/for-business"
                className="text-[#00d083] hover:text-[#00b86f] transition-colors flex items-center gap-2 text-base font-medium"
              >
                For business
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <p className="text-sm text-neutral-600">
              Free. Works on iPhone & Android. No app required.
            </p>
          </motion.div>

          {/* Right: Intent → Response Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-[#00d083] opacity-[0.08] blur-[100px] rounded-full" />
            
            {/* Conversational Response Card */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl"
            >
              {/* User Intent */}
              <div className="mb-6">
                <div className="text-xs text-neutral-500 mb-3 uppercase tracking-wider">You ask</div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="text-neutral-300 text-sm font-mono">
                    "Anywhere open now for pizza and cocktails"
                  </p>
                </div>
              </div>

              {/* QWIKKER Response */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-[#00d083]/20 rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-[#00d083] text-xs font-bold">Q</span>
                  </div>
                  <div className="text-xs text-[#00d083] uppercase tracking-wider">QWIKKER</div>
                </div>
                <div className="bg-[#00d083]/10 border border-[#00d083]/20 rounded-xl p-5">
                  <p className="text-white text-sm leading-relaxed mb-3">
                    Oh, you&apos;re in for a treat. Check out <span className="font-semibold">Artisan Pizza</span> on High Street.
                  </p>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    They&apos;re open until midnight, wood-fired sourdough base, and they&apos;ve got a full cocktail bar. Their Nduja pizza + an Espresso Martini is absolutely the move.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <AnimatedSection id="how-it-works" className="max-w-7xl mx-auto px-6 py-32 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-20 text-center">
          How it works
        </h2>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              num: '01',
              title: 'Choose your city',
              desc: 'Every city is separate, curated, and local.'
            },
            {
              num: '02',
              title: 'Add the pass to your wallet',
              desc: 'One tap. No app. Works instantly.'
            },
            {
              num: '03',
              title: 'Ask by craving',
              desc: 'Dish-level recommendations or open Atlas for a living map.'
            }
          ].map((step) => (
            <motion.div
              key={step.num}
              variants={fadeInUp}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors"
            >
              <div className="text-5xl font-bold text-[#00d083]/30 mb-6">{step.num}</div>
              <h3 className="text-2xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-neutral-400 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* The AI Companion - Tightened */}
      <AnimatedSection className="max-w-6xl mx-auto px-6 py-32 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-8">
              A taste-based city companion.
            </h2>
            
            <div className="space-y-6 text-base text-neutral-400 leading-relaxed max-w-[500px]">
              <p>
                It&apos;s not a search engine. It&apos;s a concierge that uses menus, opening hours, dietary filters, and context.
              </p>
              
              <div className="space-y-3">
                <div className="inline-block bg-white/5 border border-white/10 rounded-lg px-4 py-2">
                  <p className="text-[#00d083] text-sm font-mono">"tuna tacos, not 'mexican'"</p>
                </div>
                <div className="inline-block bg-white/5 border border-white/10 rounded-lg px-4 py-2 ml-3">
                  <p className="text-[#00d083] text-sm font-mono">"date night under £60, open now"</p>
                </div>
              </div>
              
              <p className="text-white">
                It won&apos;t give you generic 5-star lists. It&apos;ll tell you exactly where to go, and why.
              </p>
            </div>
          </div>
          
          {/* Chat Mock */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors">
            <div className="space-y-6">
              <div className="bg-[#00d083]/10 border border-[#00d083]/20 rounded-xl p-5">
                <p className="text-neutral-300 text-sm mb-4 font-mono">"Best pizza near me that&apos;s open past 11pm?"</p>
                <div className="h-px bg-white/10 my-4" />
                <p className="text-[#00d083] text-sm font-medium leading-relaxed">
                  Artisan Pizza on High Street.<br />
                  Open until midnight. Sourdough base.<br />
                  Their Nduja pizza is incredible.
                </p>
              </div>
              
              <p className="text-center text-neutral-600 text-xs">
                Powered by real menus and hours — not scraped reviews.
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Atlas - Floating image, no border */}
      <AnimatedSection className="max-w-6xl mx-auto px-6 py-32 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Map Visual - Floating Atlas Screenshot */}
          <div className="order-2 lg:order-1 relative">
            <img
              src="/atlas-map-screenshot.png"
              alt="QWIKKER Atlas - 3D city map with restaurant recommendations"
              className="w-full h-auto rounded-2xl shadow-2xl"
              onError={(e) => {
                console.error('Atlas image failed to load')
                // Fallback: show a placeholder
                e.currentTarget.style.display = 'none'
                const fallback = document.getElementById('atlas-fallback')
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            {/* Fallback if image doesn't load */}
            <div id="atlas-fallback" className="hidden w-full aspect-square bg-gradient-to-br from-[#0a1525] via-[#0f1d2d] to-[#152535] rounded-2xl items-center justify-center">
              <p className="text-neutral-500 text-center">Atlas Map Preview</p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-3">
              <span className="text-[#00d083]">Atlas</span> — by Qwikker.
            </h2>
            <p className="text-xl text-neutral-400 mb-8">
              A living map that moves with intent.
            </p>
            
            <div className="space-y-6 text-base text-neutral-400 leading-relaxed max-w-[500px]">
              <p>
                Atlas is a cinematic map projection of the same chat — filters update visually when you refine (closer, cheaper, open now).
              </p>
              
              <p className="text-white">
                It&apos;s not another map app. It&apos;s a spatial conversation.
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Offers - Matching How it Works style */}
      <AnimatedSection className="max-w-7xl mx-auto px-6 py-32 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-6 text-center">
          Offers worth opening your wallet for.
        </h2>
        <p className="text-sm text-neutral-500 mb-16 text-center">Delivered quietly. Removed anytime.</p>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              num: '01',
              title: 'Local perks',
              desc: '20% off brunch. Free dessert with mains. Happy hour extensions.'
            },
            {
              num: '02',
              title: 'No coupon landfill',
              desc: 'No spam, no affiliate deals. Just real partnerships with local spots.'
            },
            {
              num: '03',
              title: 'Quietly delivered',
              desc: 'Offers appear in your pass. No emails, no push notifications.'
            }
          ].map((item) => (
            <motion.div
              key={item.num}
              variants={fadeInUp}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors"
            >
              <div className="text-5xl font-bold text-[#00d083]/30 mb-6">{item.num}</div>
              <h3 className="text-2xl font-semibold text-white mb-3">{item.title}</h3>
              <p className="text-neutral-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* Secret Menu Club - Matching How it Works style */}
      <AnimatedSection className="max-w-7xl mx-auto px-6 py-32 border-t border-white/10">
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-6 text-center">
          Join The Secret Menu Club
        </h2>
        
        <p className="text-base text-neutral-400 mb-16 text-center max-w-xl mx-auto">
          Off-menu items and hidden combos unlocked with the pass.
        </p>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              num: '01',
              title: 'Off-menu dishes',
              desc: "Items that aren't on the public menu. Things only locals know about."
            },
            {
              num: '02',
              title: 'Local-only',
              desc: 'Not advertised. Not promoted. Only revealed to pass holders.'
            },
            {
              num: '03',
              title: 'Unlocked quietly',
              desc: 'No fanfare. Just show your pass and ask.'
            }
          ].map((item) => (
            <motion.div
              key={item.num}
              variants={fadeInUp}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors"
            >
              <div className="text-5xl font-bold text-[#00d083]/30 mb-6">{item.num}</div>
              <h3 className="text-2xl font-semibold text-white mb-3">{item.title}</h3>
              <p className="text-neutral-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* Live Cities - With ghost cards */}
      <section id="live-cities" className="max-w-7xl mx-auto px-6 py-32 border-t border-white/10">
        <AnimatedSection>
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-6 text-center">
            Live cities
          </h2>
          <p className="text-neutral-400 text-base mb-16 text-center max-w-2xl mx-auto">
            Select your city to install the pass and start exploring.
          </p>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {/* Live cities */}
            {cities && cities.length > 0 && cities.map((city) => (
              <motion.a
                key={city.city}
                href={`https://${city.subdomain}.qwikker.com`}
                variants={fadeInUp}
                className="bg-white/5 border border-white/10 hover:border-[#00d083]/40 rounded-2xl p-8 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#00d083]" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Live</span>
                </div>
                <h3 className="text-3xl font-semibold text-white mb-2 group-hover:text-[#00d083] transition-colors">
                  {city.display_name}
                </h3>
                {city.country_name && (
                  <p className="text-sm text-neutral-500">{city.country_name}</p>
                )}
              </motion.a>
            ))}

            {/* Ghost cards - Coming soon with city names */}
            {[
              { name: 'Southampton', country: 'United Kingdom' },
              { name: 'Brighton', country: 'United Kingdom' },
              { name: 'London', country: 'United Kingdom' },
              { name: 'Cornwall', country: 'United Kingdom' },
              { name: 'Calgary', country: 'Canada' },
              { name: 'Las Vegas', country: 'United States' },
              { name: 'Dubai', country: 'United Arab Emirates' },
              { name: 'Shrewsbury', country: 'United Kingdom' },
              { name: 'Costa Blanca', country: 'Spain' },
              { name: 'Paris', country: 'France' }
            ].map((ghost, i) => (
              <motion.div
                key={ghost.name}
                variants={fadeInUp}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 opacity-40 blur-[0.5px] cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-neutral-600" />
                  <span className="text-xs font-medium text-neutral-600 uppercase tracking-wider">Soon</span>
                </div>
                <h3 className="text-3xl font-semibold text-neutral-600 mb-2">
                  {ghost.name}
                </h3>
                <p className="text-sm text-neutral-700">{ghost.country}</p>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-center text-sm text-neutral-600 mt-12">
            More cities unlocking soon
          </p>
        </AnimatedSection>
      </section>

      {/* Search/Request City */}
      <AnimatedSection className="max-w-5xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Search for your city */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-semibold text-white mb-4">Search for your city</h3>
            <p className="text-neutral-400 text-sm mb-6">
              Can&apos;t find your city above? Search to see if we&apos;re already working on it.
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter your city name"
                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00d083]/40 focus:border-transparent transition-all"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-[#00d083]/20 hover:bg-[#00d083]/30 text-[#00d083] rounded-md text-sm font-medium transition-colors">
                Search
              </button>
            </div>
          </div>

          {/* Request your city */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-semibold text-white mb-4">Request your city</h3>
            <p className="text-neutral-400 text-sm mb-6">
              Want QWIKKER in your city? Let us know and we&apos;ll add you to our waitlist.
            </p>
            <a
              href="mailto:hello@qwikker.com?subject=City Request"
              className="block w-full px-5 py-3 bg-[#00d083] hover:bg-[#00b86f] text-black text-center font-medium rounded-lg transition-colors"
            >
              Request your city
            </a>
          </div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-32">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <button onClick={scrollToCity} className="text-sm text-neutral-500 hover:text-white transition-colors">
                Live cities
              </button>
              <Link href="/for-business" className="text-sm text-neutral-500 hover:text-white transition-colors">
                For business
              </Link>
              <Link href="/about" className="text-sm text-neutral-500 hover:text-white transition-colors">
                About
              </Link>
              <Link href="/privacy-policy" className="text-sm text-neutral-500 hover:text-white transition-colors">
                Privacy
              </Link>
              <a href="mailto:support@qwikker.com" className="text-sm text-neutral-500 hover:text-white transition-colors">
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
