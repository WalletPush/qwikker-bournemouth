'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

interface OfferActivatingOverlayProps {
  offerTitle: string
  businessName: string
}

/**
 * Full-screen busy state while activate + WalletPush morph (~2–4s).
 * Hands off to the success/countdown modal when the parent clears this.
 */
export function OfferActivatingOverlay({
  offerTitle,
  businessName,
}: OfferActivatingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="bg-zinc-800 border border-[#00d083]/25 rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-2xl shadow-black/40 ring-1 ring-white/5">
        {/* Pass + offer chip animation */}
        <div className="relative mx-auto mb-5 h-28 w-40">
          <motion.div
            className="absolute inset-x-4 top-6 bottom-0 rounded-xl border border-zinc-600 bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-lg overflow-hidden"
            initial={{ opacity: 0.7, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute inset-x-0 top-0 h-8 bg-[#00d083]/15 border-b border-[#00d083]/25 flex items-center justify-center px-3">
              <Image
                src="/wallet/qwikker-logo-white-160.png"
                alt="Qwikker"
                width={72}
                height={20}
                className="h-4 w-auto object-contain"
                priority
              />
            </div>
            <div className="absolute inset-x-3 bottom-3 top-10 rounded-md bg-zinc-950/40 border border-dashed border-zinc-600/80" />
          </motion.div>

          {/* Offer chip locking onto the pass */}
          <motion.div
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
            initial={{ y: -28, opacity: 0, scale: 0.85 }}
            animate={{ y: 52, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.15 }}
          >
            <div className="rounded-full bg-[#00d083] px-3 py-1.5 shadow-[0_0_20px_rgba(0,208,131,0.45)] border border-[#9dffc0]/40">
              <span className="text-xs font-bold text-black whitespace-nowrap">
                Locked in
              </span>
            </div>
          </motion.div>

          {/* Soft reward sparks */}
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute text-[#00d083]/90 text-sm font-bold pointer-events-none"
              style={{ left: `${18 + i * 28}%`, top: '8%' }}
              initial={{ opacity: 0, y: 8, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], y: [8, -12, -28], scale: [0.5, 1, 0.8] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: 0.35 + i * 0.25,
                ease: 'easeOut',
              }}
            >
              {i === 1 ? '%' : '✦'}
            </motion.span>
          ))}
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          Putting it on your Wallet…
        </h3>
        <p className="text-zinc-300 text-sm mb-0.5 line-clamp-2">
          &ldquo;{offerTitle}&rdquo;
        </p>
        <p className="text-zinc-500 text-xs mb-4">at {businessName}</p>

        <div className="flex items-center justify-center gap-2 text-[#00d083]">
          <motion.span
            className="inline-block h-4 w-4 rounded-full border-2 border-[#00d083]/30 border-t-[#00d083]"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
          <span className="text-xs font-medium">Almost there</span>
        </div>
      </div>
    </div>
  )
}
