'use client'

import { motion } from 'framer-motion'
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
  }, [])

  const scrollToCity = () => {
    document.getElementById('live-cities')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Show loading state while mounting (prevents hydration issues)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl text-neutral-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="border-b border-neutral-800 backdrop-blur-sm sticky top-0 z-50 bg-black/80">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src="/qwikker-logo-web.svg"
              alt="QWIKKER"
              className="h-10 w-auto"
            />
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
      <section className="max-w-[1200px] mx-auto px-6 pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-7xl md:text-8xl font-bold tracking-tight text-white mb-8 max-w-[900px] leading-[0.95]">
            Your city, curated — not searched.
          </h1>
          
          <p className="text-xl md:text-2xl text-neutral-300 mb-12 max-w-[700px] leading-relaxed">
            QWIKKER is a city pass that lives in your phone wallet. It unlocks exclusive offers, hidden menu items, and truly specific recommendations — without apps, noise, or spam.
          </p>

          <div className="flex items-center gap-5 mb-4">
            <button 
              onClick={scrollToCity}
              className="px-8 py-4 bg-[#00d083] text-black text-base font-semibold rounded-xl hover:bg-[#00b86f] transition-colors shadow-lg shadow-[#00d083]/20"
            >
              Choose your city
            </button>
            <Link 
              href="/for-business"
              className="text-[#00d083] hover:text-[#00b86f] transition-colors flex items-center gap-2 text-base font-medium"
            >
              QWIKKER for Business
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <p className="text-sm text-neutral-500">
            Free. Works on iPhone and Android. No app required.
          </p>
        </motion.div>
      </section>

      {/* What is QWIKKER */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-[800px]"
        >
          <p className="text-2xl md:text-3xl text-neutral-200 leading-relaxed font-light">
            QWIKKER is a city-specific wallet pass.
            It's the fastest way to unlock local offers, discover hidden menu items, and find exactly what you're in the mood for — down to the dish.
          </p>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-20">
            How it works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              {
                step: '1',
                title: 'Choose your city',
                description: 'Every city is separate, curated, and local.'
              },
              {
                step: '2',
                title: 'Add the pass to your wallet',
                description: 'One tap. No app. Works instantly.'
              },
              {
                step: '3',
                title: 'Explore with intent',
                description: 'Ask for a dish, a vibe, a budget, or a constraint — QWIKKER responds like a local.'
              }
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <div className="text-sm font-semibold text-[#00d083] mb-6">Step {item.step}</div>
                <h3 className="text-2xl font-semibold text-white mb-4">{item.title}</h3>
                <p className="text-neutral-400 text-lg leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* The Companion */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">
            The companion that understands appetite.
          </h2>

          <div className="max-w-[800px] space-y-8 text-neutral-300 leading-relaxed text-lg">
            <p className="text-xl">
              This isn't a search engine. It's not "top 10 restaurants".
              QWIKKER starts with what you actually want — the dish, the craving, the vibe — and finds places that match.
            </p>

            <p className="text-xl">
              "Tuna tacos." "Vegan sushi." "A proper Sunday roast."
              <br />
              "Somewhere cosy, not loud, open right now."
              <br />
              Then you refine: closer, cheaper, quieter — and it adapts instantly.
            </p>

            {/* Example Chat Bubble */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-6 mt-12">
              <div className="flex gap-4">
                <div className="w-3 h-3 rounded-full bg-[#00d083] mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-base font-medium text-white mb-1">You</div>
                  <div className="text-base text-neutral-400">Tuna tacos, somewhere walkable</div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-3 h-3 rounded-full bg-neutral-600 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-base font-medium text-white mb-1">QWIKKER</div>
                  <div className="text-base text-neutral-400">Found 3 places within 10 minutes</div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-3 h-3 rounded-full bg-[#00d083] mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-base font-medium text-white mb-1">You</div>
                  <div className="text-base text-neutral-400">Cheaper</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Atlas Mode */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-semibold tracking-tight text-white/[0.92] mb-6">
            Atlas Mode
          </h2>

          <div className="max-w-[700px] space-y-4 text-white/[0.68] leading-relaxed">
            <p className="text-xl text-white/[0.92]">
              Chat decides. Atlas shows. You explore.
            </p>
            <p>
              Atlas is a living map that responds to intent — not pins on a screen.
            </p>
            <p className="text-sm text-white/[0.45]">
              Optional, cinematic, and seamless — you never lose your conversation.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Offers + Secret Menu */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#121214] border border-white/[0.06] rounded-lg p-8">
              <h3 className="text-xl font-medium text-white/[0.92] mb-3">Exclusive Offers</h3>
              <p className="text-white/[0.68]">
                Offers that are actually worth opening your wallet for.
              </p>
            </div>
            <div className="bg-[#121214] border border-white/[0.06] rounded-lg p-8">
              <h3 className="text-xl font-medium text-white/[0.92] mb-3">Secret Menu Club</h3>
              <p className="text-white/[0.68]">
                Hidden items and off-menu dishes — unlocked quietly.
              </p>
            </div>
          </div>
          <p className="text-xs text-white/[0.45] mt-6 text-center">
            No spam. No coupon landfill. Only real value.
          </p>
        </motion.div>
      </section>

      {/* Live Cities */}
      <section id="live-cities" className="max-w-[1200px] mx-auto px-6 py-24 border-t border-neutral-800">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Live cities
          </h2>
          <p className="text-neutral-400 text-lg mb-16 max-w-[600px]">
            Select your city to install the pass and start exploring.
          </p>

          {cities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cities.map((city, i) => (
                <motion.a
                  key={city.city}
                  href={`https://${city.subdomain}.qwikker.com`}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
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
                </motion.a>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-neutral-600 text-lg">
              No cities live yet
            </div>
          )}
        </motion.div>
      </section>

      {/* About */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-[700px]"
        >
          <h2 className="text-3xl font-semibold tracking-tight text-white/[0.92] mb-6">
            Built city-by-city.
          </h2>
          <p className="text-white/[0.68] leading-relaxed mb-4">
            QWIKKER is designed to make local discovery feel personal again — specific, honest, and fast.
          </p>
          <Link 
            href="/about"
            className="text-[#00d083] hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            Read more
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>
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
