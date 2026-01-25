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
  status: 'active' | 'coming_soon'
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as any } }
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

// Helper: Section wrapper with subtle gradients and optional glow
function SectionShell({ 
  children, 
  className = '', 
  variant = 'plain' 
}: { 
  children: React.ReactNode
  className?: string
  variant?: 'plain' | 'soft' | 'glow'
}) {
  const baseClasses = 'relative'
  
  const variantClasses = {
    plain: '',
    soft: 'bg-gradient-to-b from-[#0b0d10] via-[#0f1418] to-[#0b0d10]',
    glow: 'bg-gradient-to-b from-[#0b0d10] via-[#0f1418] to-[#0b0d10]'
  }
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {variant === 'glow' && (
        <div className="absolute inset-0 bg-[#00d083] opacity-[0.03] blur-[120px] pointer-events-none" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// Helper: Glass card with consistent styling
function GlassCard({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg ${className}`}>
      {children}
    </div>
  )
}

// Section wrapper with reveal animation
function AnimatedSection({ 
  children, 
  className = '',
  id
}: { 
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '0px', amount: 0.1 })

  return (
    <motion.section
      ref={ref}
      id={id}
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

  // Group cities by country
  const groupedCities: Record<string, LiveCity[]> = {}
  cities?.forEach((city) => {
    const country = city.country_name || 'Other'
    if (!groupedCities[country]) {
      groupedCities[country] = []
    }
    groupedCities[country].push(city)
  })

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
      {/* Sticky Nav */}
      <nav className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50 bg-[#0b0d10]/80">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src="/qwikker-logo-web.svg"
              alt="QWIKKER"
              style={{ height: '48px', width: 'auto', minWidth: '150px' }}
              className="h-10 md:h-12 w-auto"
              onError={(e) => {
                e.currentTarget.src = '/Qwikker Logo web.svg'
                e.currentTarget.onerror = () => {
                  const textLogo = document.getElementById('header-text-logo')
                  if (textLogo) textLogo.style.display = 'block'
                  e.currentTarget.style.display = 'none'
                }
              }}
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

      {/* Hero - Cinematic with bokeh background */}
      <section className="relative overflow-hidden">
        {/* Background: Cinematic city bokeh with layered treatment */}
        <div className="absolute inset-0 z-0">
          {/* Image layer with opacity and blur */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/qwikkerhero.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.2,
              filter: 'blur(1.5px)'
            }}
          />
          
          {/* Strong vertical gradient overlay */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.95) 100%)'
            }}
          />
        </div>

        {/* Content - elevated above background */}
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-32 pb-48">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-10 leading-[1.05]">
                Your city, curated.<br />
                Not searched.
              </h1>
              
              <p className="text-base text-neutral-400 mb-12 leading-relaxed max-w-md mx-auto">
                Your city, in your wallet.<br />
                Local offers, secret menus, and dish-level recommendations. No app required.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-8">
                <button 
                  onClick={scrollToCity}
                  className="px-8 py-4 bg-[#00d083]/10 hover:bg-[#00d083]/15 border border-[#00d083]/30 text-[#00d083] text-base font-medium rounded-xl transition-all"
                >
                  Choose your city
                </button>
                <Link 
                  href="/for-business"
                  className="text-neutral-400 hover:text-neutral-300 transition-colors flex items-center gap-2 text-base font-medium"
                >
                  For business
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <p className="text-sm text-neutral-600">
                100% free. No ads. No spam. Works on iPhone & Android. No app required.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <SectionShell variant="soft">
        <section id="how-it-works" className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-24 text-center">
            How it works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: '01',
                title: 'Choose your city',
                desc: 'Every city is separate, curated, and local.'
              },
              {
                num: '02',
                title: 'Add to your wallet',
                desc: 'One tap. No app. Works instantly.'
              },
              {
                num: '03',
                title: 'Ask by craving',
                desc: 'Dish-level recommendations or open Atlas for a living map.'
              }
            ].map((step) => (
              <div key={step.num}>
                <GlassCard className="p-10 h-full hover:border-white/20 transition-colors">
                  <div className="text-5xl font-bold text-[#00d083]/30 mb-8">{step.num}</div>
                  <h3 className="text-2xl font-semibold text-white mb-4 leading-snug">{step.title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">{step.desc}</p>
                </GlassCard>
              </div>
            ))}
          </div>
        </section>
      </SectionShell>

      {/* The AI Companion */}
      <SectionShell variant="glow">
        <section className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-10 leading-tight">
                A taste-based city companion.
              </h2>
              
              <div className="space-y-8 text-sm text-neutral-400 leading-relaxed max-w-md">
                <p className="text-base">
                  It&apos;s not a search engine. It&apos;s a concierge that uses menus, opening hours, dietary filters, and context.
                </p>
                
                <div className="space-y-3">
                  <div className="inline-block bg-white/5 border border-white/10 rounded-lg px-5 py-3">
                    <p className="text-[#00d083] text-sm font-mono">"I'm in the mood for a spicy pizza. Walking distance and free wifi"</p>
                  </div>
                  <div className="inline-block bg-white/5 border border-white/10 rounded-lg px-5 py-3 ml-3">
                    <p className="text-[#00d083] text-sm font-mono">"show me good places for date night under £60, open now, nothing too loud"</p>
                  </div>
                </div>
                
                <p className="text-white text-base">
                  It won&apos;t give you generic 5-star lists. It&apos;ll tell you exactly where to go, and why.
                </p>
              </div>
            </div>
            
            {/* Chat Mock - Mobile Phone Style */}
            <div className="relative flex justify-center">
              {/* Phone Frame - Narrower width */}
              <div className="bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0b] rounded-[3rem] p-3 shadow-2xl border border-white/10 w-full max-w-[340px]">
                {/* Screen */}
                <div className="bg-[#0a0a0b] rounded-[2.5rem] overflow-hidden">
                  {/* Status Bar */}
                  <div className="px-6 pt-4 pb-2 flex items-center justify-between text-white/80 text-xs">
                    <span className="font-semibold">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-3 border border-white/60 rounded-sm relative">
                        <div className="absolute inset-0.5 bg-white/60 rounded-[1px]" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat Header */}
                  <div className="px-6 py-3 border-b border-white/10 flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#00d083]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#00d083] text-xs font-bold">Q</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">QWIKKER</div>
                      <div className="text-neutral-500 text-xs">Always available</div>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="px-4 py-6 space-y-4 min-h-[320px] flex flex-col justify-end">
                    {/* User message - Faded iPhone blue */}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-[#3478f6]/80 text-white rounded-2xl rounded-tr-md px-4 py-2.5">
                        <p className="text-sm leading-relaxed">
                          Anywhere with cocktails and kids menus within walking distance?
                        </p>
                      </div>
                    </div>
                    
                    {/* QWIKKER response */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] bg-white/10 backdrop-blur-sm text-white rounded-2xl rounded-tl-md px-4 py-2.5 border border-white/10">
                        <p className="text-sm leading-relaxed">
                          Qwikker&apos;s got you covered 😉
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-start">
                      <div className="max-w-[85%] bg-white/10 backdrop-blur-sm text-white rounded-2xl rounded-tl-md px-4 py-2.5 border border-white/10">
                        <p className="text-sm leading-relaxed">
                          Ember and Oak Bistro has some tasty cocktails for the adults and a great kids menu including mini chicken burgers and fish nuggets! Kids meals include a scoop of ice cream too! Would you like me to pull up their menu or show you on Atlas? They&apos;re only a 12 minute walk from you!
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Input bar */}
                  <div className="px-4 pb-6 pt-2">
                    <div className="bg-white/5 border border-white/10 rounded-full px-4 py-2.5 flex items-center gap-2">
                      <span className="text-neutral-600 text-sm flex-1">Message</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Caption below phone */}
              <p className="text-center text-neutral-600 text-xs mt-6 absolute -bottom-8 left-0 right-0">
                Powered by real menus and hours — not scraped reviews.
              </p>
            </div>
          </div>
        </section>
      </SectionShell>

      {/* Atlas */}
      <SectionShell variant="soft">
        <section className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            {/* Map Visual - Floating Atlas Screenshot */}
            <div className="order-2 lg:order-1 relative">
              <img
                src="/atlas-map-screenshot.png"
                alt="QWIKKER Atlas - 3D city map with restaurant recommendations"
                className="w-full h-auto rounded-2xl shadow-2xl"
                onError={(e) => {
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

            <div className="order-1 lg:order-2 lg:pl-8">
              <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-2 leading-tight">
                <span className="text-[#00d083]">Atlas.</span>
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                by Qwikker
              </p>
              <p className="text-lg text-white font-semibold mb-10">
                A living map that moves with intent.
              </p>
              
              <div className="space-y-6 text-sm text-neutral-400 leading-relaxed max-w-md">
                <p>
                  Atlas is a cinematic map projection of the same chat — filters update visually as you refine (closer, cheaper, open now).
                </p>
                
                <p className="text-white text-base">
                  It&apos;s not another map app. It&apos;s a spatial conversation.
                </p>
              </div>
            </div>
          </div>
        </section>
      </SectionShell>

      {/* Offers */}
      <SectionShell variant="glow">
        <section className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-6 text-center">
            Offers worth opening your wallet for.
          </h2>
          <p className="text-sm text-neutral-500 mb-20 text-center">Delivered discreetly. Removed anytime.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                title: 'Discreetly delivered',
                desc: 'Offers appear in your pass. No emails. No inbox clutter.'
              }
            ].map((item) => (
              <div key={item.num}>
                <GlassCard className="p-10 h-full hover:border-white/20 transition-colors">
                  <div className="text-5xl font-bold text-[#00d083]/30 mb-8">{item.num}</div>
                  <h3 className="text-2xl font-semibold text-white mb-4 leading-snug">{item.title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">{item.desc}</p>
                </GlassCard>
              </div>
            ))}
          </div>
        </section>
      </SectionShell>

      {/* Secret Menu Club */}
      <SectionShell variant="soft">
        <section className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            {/* LEFT: 2 Featured Cards */}
            <div className="order-2 lg:order-1">
              <div className="space-y-6">
                {/* Card 1 - The Secret Stack */}
                <GlassCard className="p-10 hover:shadow-xl hover:shadow-[#00d083]/5 hover:border-[#00d083]/20 transition-all duration-300">
                  <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                    The Secret Stack
                  </h3>
                  <p className="text-base text-neutral-400 mb-5 leading-relaxed">
                    Two smashed beef patties, caramelised onions cooked into the meat, American cheese, pickles, and a mustard-laced house sauce — stacked the way staff actually order it after service.
                  </p>
                  <p className="text-sm text-neutral-500 italic">
                    Not listed. Ask for "the stack".
                  </p>
                </GlassCard>

                {/* Card 2 - Midnight Nduja Flatbread */}
                <GlassCard className="p-10 hover:shadow-xl hover:shadow-[#00d083]/5 hover:border-[#00d083]/20 transition-all duration-300">
                  <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                    Midnight Nduja Flatbread
                  </h3>
                  <p className="text-base text-neutral-400 mb-5 leading-relaxed">
                    Charred sourdough flatbread with whipped ricotta, spicy nduja, honey drizzle, and fresh basil. Only made late when the ovens are still hot.
                  </p>
                  <p className="text-sm text-neutral-500 italic">
                    Available after 9pm. Off-menu.
                  </p>
                </GlassCard>
              </div>
            </div>

            {/* RIGHT: Bold Header + Paragraph + CTA */}
            <div className="order-1 lg:order-2">
              <h2 className="text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
                The Secret Menu Club.
              </h2>
              
              <div className="space-y-6 text-lg text-neutral-300 leading-relaxed mb-10 max-w-md">
                <p>
                  Some of the best things in your city aren&apos;t advertised.<br />
                  They&apos;re not on Google. They&apos;re not on the menu.
                </p>
                
                <p>
                  The Secret Menu Club unlocks what locals already know — off-menu dishes, hidden combinations, and quiet perks that only appear when you ask the right way.
                </p>
              </div>

              <button 
                onClick={scrollToCity}
                className="px-8 py-4 border-2 border-[#00d083] text-[#00d083] hover:bg-[#00d083]/10 text-base font-medium rounded-xl transition-all"
              >
                Add to your wallet
              </button>
            </div>
          </div>
        </section>
      </SectionShell>

      {/* Live Cities */}
      <SectionShell variant="glow">
        <section id="live-cities" className="max-w-5xl mx-auto px-6 pt-48 pb-48 border-t border-white/10">
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-6 text-center">
            Live cities
          </h2>
          <p className="text-neutral-400 text-sm mb-20 text-center max-w-2xl mx-auto leading-relaxed">
            Cities launch individually, each with its own curated pass.
          </p>

          {cities && cities.length > 0 ? (
            <div className="space-y-16 max-w-4xl mx-auto">
              {Object.keys(groupedCities).map((country) => (
                <div key={country}>
                  <h3 className="text-2xl font-semibold text-white mb-8">{country}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {groupedCities[country].map((city) => (
                      <a
                        key={city.city}
                        href={`https://${city.subdomain}.qwikker.com`}
                      >
                        <GlassCard className={`p-10 transition-colors group h-full ${
                          city.status === 'active' 
                            ? 'hover:border-[#00d083]/40' 
                            : 'opacity-40 blur-[0.5px] cursor-not-allowed'
                        }`}>
                          <div className="flex items-center gap-2 mb-8">
                            <div className={`w-2 h-2 rounded-full ${
                              city.status === 'active' ? 'bg-[#00d083]' : 'bg-neutral-600'
                            }`} />
                            <span className={`text-xs font-medium uppercase tracking-wider ${
                              city.status === 'active' ? 'text-[#00d083]' : 'text-neutral-600'
                            }`}>
                              {city.status === 'active' ? 'Live' : 'Coming soon'}
                            </span>
                          </div>
                          <h3 className={`text-3xl font-semibold mb-2 transition-colors ${
                            city.status === 'active' 
                              ? 'text-white group-hover:text-[#00d083]' 
                              : 'text-neutral-600'
                          }`}>
                            {city.display_name}
                          </h3>
                        </GlassCard>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-600">
              <p>No cities available yet. Check back soon!</p>
            </div>
          )}

          <p className="text-center text-sm text-neutral-500 mt-16">
            Don&apos;t see your city yet? You can request it below.
          </p>
        </section>
      </SectionShell>

      {/* Request City */}
      <SectionShell variant="soft">
        <section className="max-w-3xl mx-auto px-6 pt-40 pb-40 border-t border-white/10 text-center">
          <h2 className="text-3xl lg:text-4xl font-semibold text-white mb-6">
            Request your city
          </h2>
          <p className="text-neutral-400 text-base mb-10 leading-relaxed max-w-xl mx-auto">
            Cities launch individually. If yours isn&apos;t live yet, let us know.
          </p>
          <a
            href="mailto:hello@qwikker.com?subject=City Request"
            className="inline-block px-8 py-4 bg-[#00d083] hover:bg-[#00b86f] text-black text-base font-medium rounded-xl transition-colors"
          >
            Request your city
          </a>
        </section>
      </SectionShell>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
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
