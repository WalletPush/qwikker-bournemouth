'use client'

/**
 * Realistic iPhone-style mockups for Present Mode:
 *   - PhoneFrame: a proper full-size iPhone body (dynamic island, status bar).
 *   - LockScreenPush: a lock screen with a Qwikker notification banner.
 *   - WalletPassPhone: the Apple Wallet view showing a real-looking Qwikker pass
 *     (matches the live pass: Qwikker wordmark + city, hero, current offer, QR).
 *   - ChatPhone: the Qwikker AI chat, framed on a phone (iMessage-style).
 *
 * All content is example/mock but uses the business's REAL name, city & offer.
 * No geofence claims (not shipped) — framed as "sent to their lock screen".
 */

import { useEffect, useRef, useState } from 'react'
import { useInView } from '@/components/demo/use-in-view'

const ACCENT = '#00d083'

/** Three bouncing dots — the AI "typing…" indicator in the chat mockup. */
function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="animate-chat-in flex items-center gap-1 rounded-[20px] rounded-bl-md border border-[#00d083]/30 bg-[#00d083]/20 px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-300"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}

/** Renders **bold** spans inside otherwise-plain text. */
function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

/** Logo/placeholder thumbnail with graceful fallback to initials. */
function BrandThumb({
  logo,
  placeholder,
  name,
  size = 34,
}: {
  logo: string | null
  placeholder?: string | null
  name: string
  size?: number
}) {
  const [src, setSrc] = useState<string | null>(logo || placeholder || null)
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        onError={() => setSrc(src !== placeholder && placeholder ? placeholder : null)}
        className="shrink-0 rounded-lg object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg text-xs font-bold text-black"
      style={{ width: size, height: size, background: ACCENT }}
    >
      {initials || 'Q'}
    </div>
  )
}

/**
 * Self-healing strip/hero image: tries the real photo, falls back to the
 * category placeholder, then to a gradient — so the pass strip is NEVER blank.
 */
function StripImage({ primary, placeholder }: { primary: string | null; placeholder?: string | null }) {
  const [src, setSrc] = useState<string | null>(primary || placeholder || null)
  const handleError = () => {
    if (src !== placeholder && placeholder) setSrc(placeholder)
    else setSrc(null)
  }
  if (!src) return <div className="h-full w-full bg-gradient-to-br from-sky-300 via-cyan-200 to-amber-100" />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={handleError} className="block h-full w-full object-cover" />
  )
}

// ---- shared bits ------------------------------------------------------------

function QIcon({ size = 22, radius = 6 }: { size?: number; radius?: number }) {
  return (
    <div
      className="flex items-center justify-center font-extrabold text-black"
      style={{ width: size, height: size, borderRadius: radius, background: ACCENT, fontSize: size * 0.55 }}
    >
      Q
    </div>
  )
}

export function StatusBar({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const color = tone === 'light' ? 'text-white' : 'text-slate-900'
  return (
    <div className={`flex items-center justify-between px-7 pt-4 text-[13px] font-semibold tabular-nums ${color}`}>
      <span className="tracking-tight">9:41</span>
      <div className="flex items-center gap-1">
        {/* signal */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="0.5" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" opacity="0.4" />
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
          <path d="M7.5 2.2c2.4 0 4.6.9 6.2 2.5l-1.3 1.3A6.9 6.9 0 007.5 4 6.9 6.9 0 002.6 6L1.3 4.7A8.8 8.8 0 017.5 2.2zm0 3.3c1.5 0 2.9.6 3.9 1.6L10 8.4a4 4 0 00-5 0L3.6 7.1a5.6 5.6 0 013.9-1.6zm0 3.2c.7 0 1.3.3 1.8.8L7.5 11 5.7 9.5c.5-.5 1.1-.8 1.8-.8z" />
        </svg>
        {/* battery */}
        <svg width="26" height="13" viewBox="0 0 26 13" fill="none">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="9" rx="1.5" fill="currentColor" />
          <rect x="24" y="4" width="1.5" height="5" rx="0.75" fill="currentColor" opacity="0.4" />
        </svg>
      </div>
    </div>
  )
}

/** A believable QR code (deterministic finder patterns + seeded modules). */
export function QrPlaceholder({ size = 112, seed = 'qwikker' }: { size?: number; seed?: string }) {
  const n = 25
  let s = 0
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  const inBox = (r: number, c: number, br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7
  const isFinder = (r: number, c: number) => inBox(r, c, 0, 0) || inBox(r, c, 0, n - 7) || inBox(r, c, n - 7, 0)
  const finderOn = (r: number, c: number) => {
    const ring = (br: number, bc: number): boolean | null => {
      const rr = r - br
      const cc = c - bc
      if (rr < 0 || cc < 0 || rr > 6 || cc > 6) return null
      const border = rr === 0 || rr === 6 || cc === 0 || cc === 6
      const inner = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4
      return border || inner
    }
    const a = ring(0, 0)
    if (a !== null) return a
    const b = ring(0, n - 7)
    if (b !== null) return b
    const d = ring(n - 7, 0)
    return d ?? false
  }
  const cell = size / n
  const rects: React.ReactElement[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const on = isFinder(r, c) ? finderOn(r, c) : rand() > 0.55
      if (on) rects.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#000" />)
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded bg-white">
      {rects}
    </svg>
  )
}

// ---- iPhone frame -----------------------------------------------------------

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[270px] sm:w-[300px]">
      <div
        className="relative overflow-hidden rounded-[3rem] border-[10px] border-slate-950 bg-black shadow-2xl ring-1 ring-slate-800"
        style={{ aspectRatio: '9 / 19.5' }}
      >
        {/* dynamic island */}
        <div className="absolute left-1/2 top-2.5 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  )
}

// ---- lock-screen push -------------------------------------------------------

export function LockScreenPush({
  businessName,
  offer,
}: {
  businessName: string
  offer: { name: string; value: string } | null
}) {
  // Animate only while on-screen: the phone gives a haptic wobble and the banner
  // drops in like a real push, looping every few seconds.
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.35,
      rootMargin: '0px 0px -18% 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={inView ? 'animate-qwikker-wobble' : ''}>
      <PhoneFrame>
        <div className="relative flex h-full w-full flex-col bg-gradient-to-b from-indigo-900 via-slate-900 to-black">
          <StatusBar tone="light" />

          {/* lock glyph */}
          <div className="mt-6 flex justify-center text-white/70">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm3 8H9V6a3 3 0 016 0v3z" />
            </svg>
          </div>

          {/* clock */}
          <div className="mt-1 text-center text-white">
            <p className="text-[15px] font-medium text-white/80">Friday, 23 July</p>
            <p className="text-[64px] font-semibold leading-none tracking-tight">9:41</p>
          </div>

          {/* notification — centred roughly half way up the screen */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-2.5">
            {/* faded older notification behind, for realism (static) */}
            <div className="mx-4 h-9 rounded-[26px] border border-white/5 bg-white/[0.06] backdrop-blur-md" />

            {/* the real push — drops in + fades, looped while visible */}
            <div
              className={`rounded-[26px] border border-white/15 bg-white/[0.18] px-4 py-3.5 shadow-xl backdrop-blur-md ${
                inView ? 'animate-qwikker-push' : 'opacity-0'
              }`}
            >
              <div className="flex items-center gap-2">
                <QIcon size={22} radius={7} />
                <span className="text-[12px] font-semibold uppercase tracking-wide text-white/90">Qwikker</span>
                <span className="ml-auto text-[11px] text-white/60">now</span>
              </div>
              <p className="mt-2.5 text-[14px] font-semibold leading-snug text-white">{businessName}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/90">
                {offer ? `${offer.value} — ${offer.name}. Tap to add to your wallet 🎉` : 'A new offer just dropped. Tap to claim 🎉'}
              </p>
            </div>
          </div>

          {/* home indicator */}
          <div className="absolute bottom-2.5 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/60" />
        </div>
      </PhoneFrame>
    </div>
  )
}

// ---- wallet pass ------------------------------------------------------------

function QwikkerPass({
  businessName,
  city,
  offer,
  heroImage,
  placeholderImage,
  logo,
}: {
  businessName: string
  city: string
  offer: { name: string; value: string } | null
  heroImage: string | null
  placeholderImage?: string | null
  logo: string | null
}) {
  const cityLabel = city ? city.charAt(0).toUpperCase() + city.slice(1) : 'Qwikker'
  const offerLine = offer ? `${offer.value} — ${offer.name}` : `Welcome! Check out ${businessName}'s latest offers.`
  return (
    <div className="overflow-hidden rounded-[20px] bg-white shadow-xl">
      {/* header: Qwikker wordmark + city */}
      <div className="flex items-start justify-between px-4 pb-2 pt-3">
        <span className="text-2xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'system-ui' }}>
          Qwikker
        </span>
        <div className="text-right leading-tight">
          <p className="text-[8px] font-bold tracking-[0.2em] text-slate-400">QWIKKER</p>
          <p className="text-sm font-semibold text-slate-800">{cityLabel}</p>
        </div>
      </div>

      {/* hero strip image — self-healing so it's never blank */}
      <div className="h-24 w-full overflow-hidden bg-slate-200">
        <StripImage primary={heroImage} placeholder={placeholderImage} />
      </div>

      {/* current offer */}
      <div className="px-4 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Your current offer:</p>
        <p className="mt-0.5 text-[13px] leading-snug text-slate-800">
          {offerLine}
          {offer ? <span className="text-slate-500"> at {businessName}</span> : null}
        </p>
      </div>

      {/* QR + business name */}
      <div className="flex flex-col items-center py-4">
        <QrPlaceholder size={116} seed={businessName} />
        <div className="mt-2 flex items-center gap-1.5">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-4 w-4 rounded object-cover" />
          )}
          <p className="text-[13px] font-medium text-slate-700">{businessName}</p>
        </div>
      </div>
    </div>
  )
}

export function WalletPassPhone(props: {
  businessName: string
  city: string
  offer: { name: string; value: string } | null
  heroImage: string | null
  placeholderImage?: string | null
  logo: string | null
}) {
  return (
    <PhoneFrame>
      <div className="relative h-full w-full bg-black">
        <StatusBar tone="light" />
        <div className="px-3 pt-6">
          <QwikkerPass {...props} />
        </div>
        {/* stacked wallet cards peeking underneath (like the real Wallet view) */}
        <div className="absolute inset-x-6 bottom-0">
          <div className="mx-1 h-10 rounded-t-2xl bg-gradient-to-r from-rose-700 to-rose-900" />
          <div className="mx-3 -mt-6 h-10 rounded-t-2xl bg-gradient-to-r from-blue-700 to-blue-900" />
        </div>
        {/* pagination dots */}
        <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 3 ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      </div>
    </PhoneFrame>
  )
}

// ---- AI chat (phone-framed, iMessage-style) ---------------------------------

export function ChatPhone({
  question,
  answer,
  followUp,
  business,
  offer,
}: {
  question: string
  answer: string
  followUp?: string | null
  business: { name: string; logo: string | null; placeholderImage?: string | null; rating: number | null; reviewCount: number | null }
  offer: { name: string; value: string } | null
}) {
  // Reveal the conversation once the phone scrolls into view: question →
  // typing… → answer → typing… → follow-up.
  // phase: 0 none · 1 question · 2 typing · 3 answer · 4 typing · 5 follow-up
  const { ref, inView } = useInView<HTMLDivElement>(0.35)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!inView) return
    const finalPhase = followUp ? 5 : 3
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPhase(finalPhase)
      return
    }
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, p: number) => timers.push(setTimeout(() => setPhase(p), ms))
    at(250, 1) // question slides in
    at(1000, 2) // AI starts typing
    at(2300, 3) // AI answer + business card
    if (followUp) {
      at(3200, 4) // AI typing again
      at(4300, 5) // follow-up
    }
    return () => timers.forEach(clearTimeout)
  }, [inView, followUp])

  return (
    <PhoneFrame>
      <div className="flex h-full w-full flex-col bg-slate-950">
        <StatusBar tone="light" />

        {/* chat header */}
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-4 pb-2.5 pt-2">
          <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg,#00d083,#34d399)' }}>
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Qwikker AI</p>
            <p className="text-[10px] text-slate-500">Your AI Local Guide</p>
          </div>
        </div>

        {/* messages */}
        <div ref={ref} className="flex min-h-0 flex-1 flex-col justify-end space-y-2 overflow-hidden px-3.5 py-3">
          {/* user question (blue, right) */}
          {phase >= 1 && (
            <div className="flex justify-end">
              <div className="animate-chat-in max-w-[78%] rounded-[20px] rounded-br-md bg-blue-600 px-3.5 py-2 text-[13px] leading-snug text-white shadow-sm">
                {question}
              </div>
            </div>
          )}

          {/* AI typing… (before the answer) */}
          {phase === 2 && <TypingBubble />}

          {/* AI reply (emerald, left) */}
          {phase >= 3 && (
            <div className="flex justify-start">
              <div className="animate-chat-in max-w-[85%] rounded-[20px] rounded-bl-md border border-[#00d083]/30 bg-[#00d083]/20 px-3.5 py-2.5 text-[13px] leading-snug text-slate-100 shadow-sm">
                {renderBold(answer)}

                {/* inline business result card */}
                <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70 p-2.5">
                  <div className="flex items-center gap-2">
                    <BrandThumb logo={business.logo} placeholder={business.placeholderImage} name={business.name} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">{business.name}</p>
                      {business.rating != null && (
                        <p className="truncate text-[11px] text-amber-300">
                          ★ {business.rating.toFixed(1)}
                          {business.reviewCount != null ? ` · ${business.reviewCount.toLocaleString()} reviews` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* offer on its own line so a long value never overflows the card */}
                  {offer && (
                    <div className="mt-2 flex items-center gap-1.5 overflow-hidden rounded-lg bg-[#00d083]/15 px-2.5 py-1.5">
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
                        Offer
                      </span>
                      <span className="truncate text-[11px] font-medium text-slate-200">{offer.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI typing… (before the follow-up) */}
          {followUp && phase === 4 && <TypingBubble />}

          {/* AI follow-up (emerald, left) */}
          {followUp && phase >= 5 && (
            <div className="flex justify-start">
              <div className="animate-chat-in max-w-[78%] rounded-[20px] rounded-bl-md border border-[#00d083]/30 bg-[#00d083]/20 px-3.5 py-2 text-[13px] leading-snug text-slate-100 shadow-sm">
                {followUp}
              </div>
            </div>
          )}
        </div>

        {/* iMessage-style input bar */}
        <div className="shrink-0 border-t border-slate-800 px-3 py-1.5">
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 py-1.5 pl-4 pr-1.5">
            <span className="flex-1 text-[13px] text-slate-500">Ask Qwikker AI…</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: ACCENT }}>
              <svg className="h-4 w-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* home indicator */}
        <div className="mx-auto mb-2 mt-1 h-1 w-28 rounded-full bg-white/50" />
      </div>
    </PhoneFrame>
  )
}
