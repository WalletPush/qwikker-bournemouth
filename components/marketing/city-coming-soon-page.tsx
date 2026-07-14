'use client'

import { useState, CSSProperties } from 'react'
import Link from 'next/link'
import { Sparkles, Gift, Stamp, Mail, Check, ArrowRight } from 'lucide-react'
import {
  LandingPageConfig,
  resolveTheme,
  buildThemeStyle,
  resolveTemplate,
  resolveComingSoonCopy,
} from '@/lib/constants/landing-templates'
import { joinWaitlist } from '@/lib/actions/waitlist-actions'

interface CityComingSoonPageProps {
  city: string
  displayName: string
  landingConfig?: LandingPageConfig
}

const VALUE_PROPS = [
  { icon: Gift, title: 'Exclusive local offers', body: 'Real deals from independent venues — refreshed all the time.' },
  { icon: Stamp, title: 'Loyalty that rewards you', body: 'Collect stamps and perks from your phone wallet. No app to download.' },
  { icon: Sparkles, title: 'Secret menus & hidden gems', body: 'Off-menu items and local favourites you’d never find on your own.' },
]

// Shared waitlist submit logic.
function useWaitlist(city: string) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setErrorMsg('')
    const res = await joinWaitlist({ city, email })
    if (res.success) {
      setStatus('done')
      setEmail('')
    } else {
      setStatus('error')
      setErrorMsg(res.error || 'Something went wrong.')
    }
  }

  return { email, setEmail, status, errorMsg, submit }
}

export function CityComingSoonPage({ city, displayName, landingConfig = {} }: CityComingSoonPageProps) {
  const template = resolveTemplate(landingConfig)
  const theme = resolveTheme(landingConfig)
  const themeStyle = buildThemeStyle(template.id, theme.mode, theme.accent, theme.accent_hover) as CSSProperties
  const logoSrc = theme.mode === 'dark' ? '/qwikker-logo-web.svg' : '/qwikker-logo-dark.svg'
  const copy = resolveComingSoonCopy(landingConfig, displayName)
  const waitlistEnabled = landingConfig.coming_soon_waitlist_enabled !== false
  const heroImageUrl = landingConfig.hero_image_url || template.defaultHeroImage || '/qwikkerhero.png'

  const wl = useWaitlist(city)

  if (template.id === 'vibrant') {
    return (
      <VibrantComingSoon
        displayName={displayName}
        themeStyle={themeStyle}
        heroImageUrl={heroImageUrl}
        heroWash={typeof landingConfig.hero_blur === 'number' ? landingConfig.hero_blur : 60}
        copy={copy}
        waitlistEnabled={waitlistEnabled}
        wl={wl}
      />
    )
  }

  if (template.id === 'editorial') {
    return (
      <EditorialComingSoon
        displayName={displayName}
        themeStyle={themeStyle}
        heroImageUrl={heroImageUrl}
        copy={copy}
        waitlistEnabled={waitlistEnabled}
        wl={wl}
      />
    )
  }

  return (
    <SignatureComingSoon
      displayName={displayName}
      themeStyle={themeStyle}
      logoSrc={logoSrc}
      heroImageUrl={heroImageUrl}
      copy={copy}
      waitlistEnabled={waitlistEnabled}
      wl={wl}
    />
  )
}

type Wl = ReturnType<typeof useWaitlist>
interface Copy { eyebrow: string; headline: string; subtitle: string }

// ── SIGNATURE: dark, minimal, centred ─────────────────────────────────────
function SignatureComingSoon({
  displayName, themeStyle, logoSrc, heroImageUrl, copy, waitlistEnabled, wl,
}: { displayName: string; themeStyle: CSSProperties; logoSrc: string; heroImageUrl: string; copy: Copy; waitlistEnabled: boolean; wl: Wl }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text)] relative" style={themeStyle}>
      <img src={heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.14 }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 10%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%), linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.85))' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 min-h-screen flex flex-col">
        <header className="py-8 flex items-center justify-between">
          <img src={logoSrc} alt="QWIKKER" style={{ height: 28, width: 'auto' }} />
          <Link href="/for-business" className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors">For Business</Link>
        </header>

        <main className="flex-1 flex flex-col justify-center text-center py-12">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
              {copy.eyebrow}
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]" style={{ whiteSpace: 'pre-line' }}>{copy.headline}</h1>
          <p className="mt-6 text-lg text-[var(--text-muted)] max-w-xl mx-auto">{copy.subtitle}</p>
          {waitlistEnabled && <WaitlistForm wl={wl} displayName={displayName} className="mt-10 max-w-md mx-auto w-full" rounded="rounded-xl" />}
        </main>

        <section className="grid sm:grid-cols-3 gap-6 pb-12 pt-8 border-t border-white/10">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="text-left">
              <Icon className="w-5 h-5 mb-2.5" style={{ color: 'var(--accent)' }} />
              <h3 className="font-semibold text-sm text-[var(--text)]">{title}</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

// ── VIBRANT: full-bleed hero image, accent wash, bold ──────────────────────
function VibrantComingSoon({
  displayName, themeStyle, heroImageUrl, heroWash, copy, waitlistEnabled, wl,
}: { displayName: string; themeStyle: CSSProperties; heroImageUrl: string; heroWash: number; copy: Copy; waitlistEnabled: boolean; wl: Wl }) {
  const overlay = `linear-gradient(to bottom, color-mix(in srgb, var(--accent) ${Math.round(40 + heroWash * 0.5)}%, #05070a) 0%, rgba(5,7,10,0.35) 45%, color-mix(in srgb, var(--accent) ${Math.round(30 + heroWash * 0.55)}%, #05070a) 100%)`
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden text-white" style={themeStyle}>
      {/* Full-bleed washed hero image covers the entire screen */}
      <img src={heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: `blur(${(0.5 + (heroWash / 100) * 5).toFixed(1)}px)` }} />
      <div className="absolute inset-0" style={{ background: overlay }} />

      <div className="relative z-10 flex flex-col min-h-screen max-w-5xl mx-auto w-full px-6">
        <header className="py-7 flex items-center justify-between">
          <img src="/qwikker-logo-web.svg" alt="QWIKKER" style={{ height: 30, width: 'auto', filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.5))' }} />
          <Link href="/for-business" className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors">For Business</Link>
        </header>

        <main className="flex-1 flex flex-col justify-center text-center py-12">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-lg" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}>
              <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse" />
              {copy.eyebrow}
            </span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.0] mx-auto max-w-3xl" style={{ whiteSpace: 'pre-line', textShadow: '0 2px 30px rgba(0,0,0,0.4)' }}>{copy.headline}</h1>
          <p className="mt-6 text-lg sm:text-xl text-white/90 max-w-xl mx-auto">{copy.subtitle}</p>
          {waitlistEnabled && <WaitlistForm wl={wl} displayName={displayName} className="mt-10 max-w-md mx-auto w-full" rounded="rounded-2xl" onDark />}
        </main>

        {/* Glass value-prop cards pinned to the bottom, over the image (no white void) */}
        <section className="grid sm:grid-cols-3 gap-4 pb-10">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl p-5 border border-white/20 backdrop-blur-md" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3.5 shadow-lg" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white">{title}</h3>
              <p className="text-sm text-white/80 mt-1.5 leading-relaxed">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

// ── EDITORIAL: split, serif, image-led magazine ────────────────────────────
function EditorialComingSoon({
  displayName, themeStyle, heroImageUrl, copy, waitlistEnabled, wl,
}: { displayName: string; themeStyle: CSSProperties; heroImageUrl: string; copy: Copy; waitlistEnabled: boolean; wl: Wl }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[var(--bg)] text-[var(--text)]" style={themeStyle}>
      <header className="max-w-6xl w-full mx-auto px-6 sm:px-10 py-5 flex items-center justify-between border-b-2 border-[var(--text)]">
        <span className="text-sm font-serif uppercase tracking-[0.3em] text-[var(--text)]">{displayName}</span>
        <Link href="/for-business" className="text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">For Business</Link>
      </header>

      {/* Split fills the remaining viewport: text left, full-height image right */}
      <div className="flex-1 flex flex-col md:flex-row md:items-stretch">
        <div className="md:w-1/2 flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-faint)] mb-5 flex items-center gap-3">
            <span className="inline-block w-8 h-px bg-[var(--accent)]" />
            {copy.eyebrow}
          </p>
          <h1 className="font-serif font-medium tracking-tight text-4xl sm:text-6xl leading-[1.04]" style={{ whiteSpace: 'pre-line' }}>{copy.headline}</h1>
          <p className="mt-6 text-lg text-[var(--text-muted)] max-w-md leading-relaxed">{copy.subtitle}</p>
          {waitlistEnabled && <WaitlistForm wl={wl} displayName={displayName} className="mt-9 max-w-md w-full" rounded="rounded-none" editorial />}
        </div>

        {/* Image column — inline minHeight guarantees size on mobile; stretches full-height on desktop */}
        <div className="md:w-1/2 relative bg-[var(--surface)]" style={{ minHeight: '40vh' }}>
          <img src={heroImageUrl} alt={displayName} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </div>

      {/* Value props — numbered editorial columns */}
      <section className="max-w-6xl w-full mx-auto px-6 sm:px-10 lg:px-16 py-14 grid sm:grid-cols-3 gap-x-10 gap-y-8 border-t border-[var(--border)]">
        {VALUE_PROPS.map(({ title, body }, i) => (
          <div key={title} className="border-t border-[var(--text)] pt-4">
            <span className="text-xs tabular-nums" style={{ color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</span>
            <h3 className="font-serif text-xl text-[var(--text)] mt-1">{title}</h3>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

// ── Shared waitlist form (adapts to each template) ─────────────────────────
function WaitlistForm({
  wl, displayName, className = '', rounded = 'rounded-xl', onDark = false, editorial = false,
}: { wl: Wl; displayName: string; className?: string; rounded?: string; onDark?: boolean; editorial?: boolean }) {
  if (wl.status === 'done') {
    return (
      <div className={className}>
        <div
          className={`flex items-center gap-2 px-5 py-4 ${rounded} text-sm font-semibold ${onDark ? 'text-white' : ''}`}
          style={{ backgroundColor: onDark ? 'rgba(255,255,255,0.15)' : 'color-mix(in srgb, var(--accent) 14%, transparent)', color: onDark ? '#fff' : 'var(--accent)' }}
        >
          <Check className="w-5 h-5 shrink-0" />
          You’re on the list — we’ll email you the moment {displayName} goes live.
        </div>
      </div>
    )
  }

  const inputBase = editorial
    ? 'w-full bg-transparent border-0 border-b-2 border-[var(--text)] px-0 py-2.5 text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)] transition-colors'
    : `w-full pl-10 pr-4 py-3.5 ${rounded} ${onDark ? 'bg-white/15 border border-white/25 text-white placeholder:text-white/60' : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-faint)]'} outline-none focus:border-[var(--accent)] transition-colors`

  return (
    <div className={className}>
      <form onSubmit={wl.submit} className={editorial ? 'flex items-end gap-4' : 'flex flex-col sm:flex-row gap-3'}>
        <div className="relative flex-1">
          {!editorial && <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${onDark ? 'text-white/70' : 'text-[var(--text-faint)]'}`} />}
          <input
            type="email"
            required
            value={wl.email}
            onChange={(e) => wl.setEmail(e.target.value)}
            placeholder="you@email.com"
            className={inputBase}
          />
        </div>
        <button
          type="submit"
          disabled={wl.status === 'loading'}
          className={`inline-flex items-center justify-center gap-2 font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 whitespace-nowrap ${editorial ? 'pb-2.5 text-sm uppercase tracking-widest border-b-2 border-[var(--accent)]' : `px-6 py-3.5 ${rounded} text-sm`}`}
          style={editorial ? { color: 'var(--text)' } : { backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
        >
          {wl.status === 'loading' ? 'Joining…' : editorial ? <>Notify me <ArrowRight className="w-4 h-4" /></> : 'Notify me'}
        </button>
      </form>
      {wl.status === 'error' && <p className="mt-2 text-sm text-red-400">{wl.errorMsg}</p>}
      <p className={`mt-3 text-xs ${onDark ? 'text-white/70' : 'text-[var(--text-faint)]'}`}>Be the first to know. No spam, just the launch.</p>
    </div>
  )
}
