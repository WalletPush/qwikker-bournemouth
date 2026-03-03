'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { CreditCard, QrCode, BellRing, Sparkles, BarChart3, SlidersHorizontal } from 'lucide-react'
import { LoyaltyCardPreview } from '@/components/loyalty/loyalty-card-preview'

const SLIDES = [
  { id: 0, text: 'Bring customers back.', classes: 'text-4xl sm:text-5xl lg:text-7xl font-semibold' },
  { id: 1, text: 'Again.', classes: 'text-5xl sm:text-6xl lg:text-[5.5rem] font-semibold' },
  { id: 2, text: 'And again!', classes: 'text-5xl sm:text-7xl lg:text-[6.5rem] font-bold' },
  { id: 3, text: 'AND AGAIN.', classes: 'text-6xl sm:text-8xl lg:text-[8rem] font-bold leading-none' },
]

const SAMPLE_CARDS = [
  {
    programName: 'David\'s Loyalty',
    businessName: 'David\'s Grill & Bar',
    rewardDescription: 'a free cocktail of your choice',
    rewardThreshold: 8,
    stampLabel: 'stamps',
    stampIcon: 'Flame',
    primaryColor: '#00d083',
    backgroundColor: '#0b0f14',
    sampleFill: 5,
  },
  {
    programName: 'Bean Rewards',
    businessName: 'The Bean Counter',
    rewardDescription: 'a free coffee & pastry',
    rewardThreshold: 10,
    stampLabel: 'stamps',
    stampIcon: 'Bean',
    primaryColor: '#f59e0b',
    backgroundColor: '#1a1207',
    sampleFill: 7,
  },
  {
    programName: 'Studio Perks',
    businessName: 'Studio Glow',
    rewardDescription: 'a complimentary treatment',
    rewardThreshold: 6,
    stampLabel: 'visits',
    stampIcon: 'Star',
    primaryColor: '#a78bfa',
    backgroundColor: '#110e1a',
    sampleFill: 4,
  },
]

const LOYALTY_FEATURES = [
  {
    icon: CreditCard,
    title: 'Your brand, in their wallet',
    desc: 'Custom branded loyalty cards that sit alongside boarding passes and bank cards in Apple & Google Wallet. Always visible. Always on their phone.',
  },
  {
    icon: SlidersHorizontal,
    title: 'You set the rules',
    desc: 'Stamp thresholds, reward descriptions, daily limits, cooldown periods — everything is yours to control. Change it anytime.',
  },
  {
    icon: BellRing,
    title: 'Talk to them directly',
    desc: 'Push notifications straight to their lock screen. Target everyone, members close to a reward, or those you haven\'t seen in a while.',
  },
  {
    icon: QrCode,
    title: 'Nothing at the till',
    desc: 'No POS integration. No tablet. No staff app. Customers scan a single QR code when they visit. That\'s it.',
  },
  {
    icon: Sparkles,
    title: 'AI that knows their progress',
    desc: 'The Qwikker companion tracks loyalty across every conversation. It nudges users when they\'re close, and mentions your business first.',
  },
  {
    icon: BarChart3,
    title: 'See everything in real time',
    desc: 'Who joined, who\'s earning, who redeemed, estimated value given away — a live dashboard that tells you exactly what\'s working.',
  },
]

function FeatureCard({ feature, index }: { feature: typeof LOYALTY_FEATURES[number]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-20px', amount: 0.3 })
  const Icon = feature.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent p-8 lg:p-10"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#00d083]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mb-6">
          <Icon className="w-5 h-5 text-[#00d083]" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-3 leading-snug">{feature.title}</h3>
        <p className="text-sm text-neutral-400 leading-relaxed">{feature.desc}</p>
      </div>
    </motion.div>
  )
}

function StickyScrollSequence() {
  const [activeSlide, setActiveSlide] = useState(0)
  const triggerRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    triggerRefs.current.forEach((el, index) => {
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSlide(index)
          }
        },
        { threshold: 0.5 }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  const totalSlides = SLIDES.length + 3 // 4 text + introducing + single card + 3 cards

  return (
    <div className="relative" style={{ height: `${totalSlides * 100}vh` }}>
      {/* Trigger zones */}
      <div className="absolute inset-0" aria-hidden="true">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { triggerRefs.current[i] = el }}
            style={{ height: `${100 / totalSlides}%` }}
          />
        ))}
      </div>

      {/* Sticky viewport */}
      <div
        className="sticky top-0 z-30 flex items-center justify-center overflow-hidden bg-[#0b0d10]"
        style={{ height: '100vh' }}
      >
        <AnimatePresence mode="wait">
          {/* Text slides 0-3 */}
          {activeSlide <= 3 && (
            <motion.div
              key={`slide-${activeSlide}`}
              initial={{ opacity: 0, filter: 'blur(12px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(12px)' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center px-8"
            >
              <p className={`${SLIDES[activeSlide].classes} tracking-tight text-white text-center`}>
                {SLIDES[activeSlide].text}
              </p>
            </motion.div>
          )}

          {/* Introducing Qwikker Loyalty */}
          {activeSlide === 4 && (
            <motion.div
              key="introducing"
              initial={{ opacity: 0, filter: 'blur(12px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(12px)' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center px-8 gap-5"
            >
              <p className="text-sm text-[#00d083] font-medium tracking-widest uppercase">
                Introducing
              </p>
              <p className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight text-white text-center">
                Qwikker Loyalty
              </p>
            </motion.div>
          )}

          {/* Single loyalty card */}
          {activeSlide === 5 && (
            <motion.div
              key="single-card"
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center px-8"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-[280px] sm:w-[300px]"
              >
                <LoyaltyCardPreview
                  {...SAMPLE_CARDS[0]}
                  className="!max-w-none !mx-0"
                />
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-sm text-neutral-500 text-center mt-6"
              >
                Lives in Apple &amp; Google Wallet
              </motion.p>
            </motion.div>
          )}

          {/* 3 cards fanning out side by side */}
          {activeSlide === 6 && (
            <motion.div
              key="three-cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8"
            >
              <div className="flex items-start gap-4 lg:gap-6">
                {SAMPLE_CARDS.map((card, i) => (
                  <motion.div
                    key={card.businessName}
                    initial={{ opacity: 0, x: 200 + i * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.7,
                      delay: i * 0.12,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="w-[200px] lg:w-[240px] shrink-0"
                  >
                    <LoyaltyCardPreview
                      {...card}
                      className="!max-w-none !mx-0"
                    />
                  </motion.div>
                ))}
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-sm text-neutral-500 text-center mt-8"
              >
                Every business gets their own branded card
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function LoyaltyScrollSection() {
  const revealRef = useRef(null)
  const isRevealInView = useInView(revealRef, { once: true, amount: 0.1 })

  return (
    <div className="border-t border-white/10">
      <StickyScrollSequence />

      {/* Feature grid */}
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-48 border-t border-white/10">
        <motion.div
          ref={revealRef}
          initial={{ opacity: 0, y: 50 }}
          animate={isRevealInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-semibold tracking-tight text-white mb-6">
              Built-in retention. Not bolted on.
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              The whole system works together — discovery, AI, wallet, loyalty. One platform.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {LOYALTY_FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isRevealInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-center text-sm text-neutral-600 mt-20"
        >
          Zero setup cost. Go live in minutes.
        </motion.p>
      </div>
    </div>
  )
}
