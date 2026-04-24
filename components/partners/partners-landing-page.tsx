'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface CityStatus {
  city_name: string
  city_slug: string
  country?: string
  status: 'live' | 'reserved' | 'claimed' | 'available'
  claimed_by?: string
}

type FormState = 'idle' | 'claim' | 'waitlist' | 'success-claim' | 'success-waitlist' | 'error-live' | 'error-reserved'

const LOGO_URL = 'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

export function PartnersLandingPage() {
  const [cities, setCities] = useState<CityStatus[]>([])
  const [loading, setLoading] = useState(true)
  const claimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/partners/cities')
      .then(r => r.json())
      .then(data => setCities(data.cities || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const scrollToClaim = useCallback(() => {
    claimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav />
      <Hero onCTA={scrollToClaim} />
      <ProblemShift />
      <ProductProof />
      <WhatIsQwikker />
      <Opportunity />
      <RoleOfPartner />
      <Scarcity />
      <div ref={claimRef}>
        <ClaimSection cities={cities} loading={loading} />
      </div>
      <Footer />
    </div>
  )
}

/* ─── Navigation ─── */

function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
        <a href="/">
          <img src={LOGO_URL} alt="QWIKKER" className="h-7" />
        </a>
        <a
          href="#claim"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('claim-section')?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Claim Your City
        </a>
      </div>
    </header>
  )
}

/* ─── Hero ─── */

function Hero({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">Limited Partnerships Open</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          Operate Qwikker
          <br />
          <span className="text-emerald-400">in Your City</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-4">
          We&rsquo;re launching city-by-city and opening a limited number of founding partnerships.
        </p>
        <p className="text-base text-slate-500 leading-relaxed max-w-xl mx-auto mb-10">
          Own and grow the local network of businesses and users &mdash; powered by a platform built for retention, not just discovery.
        </p>
        <button
          onClick={onCTA}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-8 py-3.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
        >
          Claim Your City
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>
    </section>
  )
}

/* ─── Problem / Shift ─── */

function ProblemShift() {
  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-2xl sm:text-3xl font-semibold leading-snug text-white">
          Most platforms help businesses get discovered.
          <br />
          <span className="text-slate-500">But they do nothing to bring customers back.</span>
        </p>
        <p className="mt-6 text-lg text-emerald-400 font-medium">Qwikker changes that.</p>
      </div>
    </section>
  )
}

/* ─── Product Proof ─── */

function ProductProof() {
  const videos = [
    { title: 'User Experience', id: '-n8up4zOkjc' },
    { title: 'Business Dashboard', id: 'pf6NQKAvIgA' },
    { title: 'Franchise Admin', id: 'PLhVjjpShF4' },
  ]

  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">See It in Action</h2>
          <p className="text-slate-400">This is the live platform &mdash; from discovery to loyalty to analytics.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {videos.map(v => (
            <div key={v.title} className="space-y-3">
              <div className="aspect-video rounded-lg bg-slate-900 border border-white/5 overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${v.id}`}
                  title={v.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <p className="text-sm font-medium text-center text-slate-300">{v.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── What Qwikker Is ─── */

function WhatIsQwikker() {
  const features = [
    { icon: WalletIcon, title: 'Wallet Offers', text: 'Delivered directly to Apple and Google Wallet' },
    { icon: StampIcon, title: 'Loyalty Cards', text: 'Digital stamp cards that drive repeat visits' },
    { icon: LockIcon, title: 'Secret Menus', text: 'Exclusive items and deals for pass holders' },
    { icon: BellIcon, title: 'Push Notifications', text: 'Reach customers without an app download' },
    { icon: SparklesIcon, title: 'AI Discovery', text: 'Intelligent local search and recommendations' },
  ]

  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">What Qwikker Is</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {features.map((f, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <f.icon />
              </div>
              <p className="text-sm font-semibold text-white">{f.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── The Opportunity ─── */

function Opportunity() {
  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">The Opportunity</h2>
        <p className="text-lg text-slate-400 leading-relaxed">
          Qwikker is built to scale city-by-city. Each city operates as its own local network.
          As a city partner, you build and own that network.
        </p>
      </div>
    </section>
  )
}

/* ─── Role of a City Partner ─── */

function RoleOfPartner() {
  const youDo = [
    'Onboard local businesses',
    'Drive adoption and build relationships',
    'Execute local growth strategies',
  ]

  const youGet = [
    'Your own branded subdomain',
    'Business import and CRM tools',
    'AI knowledge base',
    'QR marketing system',
    'Loyalty programme builder',
    'Push notification engine',
    'Real-time analytics dashboard',
    'Central product updates and support',
  ]

  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Role of a City Partner</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">You Do</h3>
            <ul className="space-y-4">
              {youDo.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-8">
            <h3 className="text-sm font-semibold text-emerald-400/70 uppercase tracking-wider mb-6">You Get</h3>
            <ul className="space-y-4">
              {youGet.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Scarcity ─── */

function Scarcity() {
  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.05] px-4 py-1.5 mb-6">
          <span className="text-xs font-medium text-amber-400 tracking-wide uppercase">Limited Availability</span>
        </div>
        <p className="text-xl sm:text-2xl text-slate-300 leading-relaxed">
          We are only onboarding a limited number of cities during the initial rollout.
          Early partners will secure significantly better terms than future launches.
        </p>
      </div>
    </section>
  )
}

/* ─── Claim Section ─── */

function ClaimSection({ cities, loading }: { cities: CityStatus[]; loading: boolean }) {
  const [formState, setFormState] = useState<FormState>('idle')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedCityName, setSelectedCityName] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const liveCities = cities.filter(c => c.status === 'live')
  const reservedCities = cities.filter(c => c.status === 'reserved')
  const claimedCities = cities.filter(c => c.status === 'claimed')

  const handleCheckCity = useCallback((cityName: string) => {
    const trimmed = cityName.trim()
    if (trimmed.length < 2) return

    // Basic validation: must look like a real place name
    if (/\d/.test(trimmed) || /[^a-zA-ZÀ-ÿ\s\-'.()]/.test(trimmed)) {
      setErrorMessage('Please enter a valid city name')
      return
    }

    const slug = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setSelectedCity(slug)
    setSelectedCityName(trimmed)
    setErrorMessage('')

    const existing = cities.find(c =>
      c.city_slug === slug || c.city_name.toLowerCase() === trimmed.toLowerCase()
    )

    if (existing) {
      if (existing.status === 'live') setFormState('error-live')
      else if (existing.status === 'reserved') setFormState('error-reserved')
      else if (existing.status === 'claimed') setFormState('waitlist')
    } else {
      setFormState('claim')
    }
  }, [cities])

  const resetSearch = useCallback(() => {
    setSearchQuery('')
    setFormState('idle')
    setErrorMessage('')
    setSelectedCity('')
    setSelectedCityName('')
  }, [])

  const handleSubmit = useCallback(async (type: 'claim' | 'waitlist') => {
    if (!fullName.trim() || !email.trim()) return
    setSubmitting(true)
    setErrorMessage('')

    try {
      const endpoint = type === 'claim' ? '/api/partners/claim' : '/api/partners/waitlist'
      const body = type === 'claim'
        ? { city_name: selectedCityName, city_slug: selectedCity, country: selectedCountry, place_id: selectedPlaceId, full_name: fullName, email }
        : { city_slug: selectedCity, city_name: selectedCityName, full_name: fullName, email }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.waitlist) {
          setFormState('waitlist')
          setErrorMessage('This city has already been claimed. You can join the waitlist instead.')
        } else {
          setErrorMessage(data.error || 'Something went wrong')
        }
        return
      }

      setFormState(type === 'claim' ? 'success-claim' : 'success-waitlist')
    } catch {
      setErrorMessage('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [fullName, email, selectedCity, selectedCityName, selectedCountry, selectedPlaceId])

  return (
    <section id="claim-section" className="py-24 px-6 border-t border-white/5">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Claim Your City</h2>
          <p className="text-xl text-slate-300 mb-2">Search for a city, claim it, and it&rsquo;s yours for 30 days.</p>
          <p className="text-slate-500">We&rsquo;ll be in touch within 48 hours to discuss your partnership.</p>
        </div>

        {/* Search -- FRONT AND CENTRE */}
        <div className="mx-auto max-w-xl mb-16">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-8">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value)
                    if (formState !== 'idle') {
                      setFormState('idle')
                      setErrorMessage('')
                      setSelectedCity('')
                      setSelectedCityName('')
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCheckCity(searchQuery)
                    }
                  }}
                  placeholder="Enter your city name..."
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] py-4 pl-12 pr-4 text-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
              <button
                onClick={() => handleCheckCity(searchQuery)}
                disabled={searchQuery.trim().length < 2}
                className="rounded-xl bg-emerald-500 px-6 py-4 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                Check Availability
              </button>
            </div>
            {errorMessage && formState === 'idle' && (
              <p className="text-sm text-red-400 text-center mt-3">{errorMessage}</p>
            )}
          </div>
        </div>

        {/* Existing Cities Grid (below the search) */}
        {(liveCities.length > 0 || reservedCities.length > 0 || claimedCities.length > 0) && formState === 'idle' && (
          <div className="mb-12">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider text-center mb-4">Current Cities</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {liveCities.map(c => (
                <CityBadge key={c.city_slug} name={c.city_name} status="live" country={c.country} />
              ))}
              {claimedCities.map(c => (
                <CityBadge key={c.city_slug} name={c.city_name} status="claimed" country={c.country} />
              ))}
              {reservedCities.map(c => (
                <CityBadge key={c.city_slug} name={c.city_name} status="reserved" country={c.country} />
              ))}
            </div>
          </div>
        )}

        {/* Form Area */}
        <div className="mx-auto max-w-lg">

          {/* Status messages */}
          {formState === 'error-live' && (
            <StatusMessage type="info" message={`${selectedCityName} is already live and operating on Qwikker.`} />
          )}

          {formState === 'error-reserved' && (
            <StatusMessage type="info" message={`${selectedCityName} is reserved for an existing partner.`} />
          )}

          {/* Claim Form */}
          {formState === 'claim' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">{selectedCityName} is available</p>
              </div>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
              <button
                onClick={() => handleSubmit('claim')}
                disabled={submitting || !fullName.trim() || !email.trim()}
                className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Claiming...' : 'Claim This City'}
              </button>
              <p className="text-xs text-slate-500 text-center">Your claim will be held for 30 days.</p>
            </div>
          )}

          {/* Waitlist Form */}
          {formState === 'waitlist' && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-medium text-amber-400">{selectedCityName} has been claimed</p>
              </div>
              <p className="text-sm text-slate-400">Join the waitlist and we&rsquo;ll notify you if this city becomes available.</p>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
              <button
                onClick={() => handleSubmit('waitlist')}
                disabled={submitting || !fullName.trim() || !email.trim()}
                className="w-full rounded-lg bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
          )}

          {/* Success: Claim */}
          {formState === 'success-claim' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">You&rsquo;ve claimed {selectedCityName}</h3>
              <p className="text-slate-400">
                We&rsquo;ll be in touch within 48 hours to discuss next steps.
                <br />
                Your claim is held for 30 days.
              </p>
            </div>
          )}

          {/* Success: Waitlist */}
          {formState === 'success-waitlist' && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">You&rsquo;re on the waitlist</h3>
              <p className="text-slate-400">
                We&rsquo;ll notify you if {selectedCityName} becomes available.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ─── City Badge ─── */

function CityBadge({ name, status, country }: { name: string; status: 'live' | 'reserved' | 'claimed'; country?: string }) {
  const config = {
    live: { label: 'Live', dotClass: 'bg-emerald-400', borderClass: 'border-emerald-500/20', bgClass: 'bg-emerald-500/[0.03]', textClass: 'text-emerald-400' },
    claimed: { label: 'Claimed', dotClass: 'bg-amber-400', borderClass: 'border-amber-500/20', bgClass: 'bg-amber-500/[0.03]', textClass: 'text-amber-400' },
    reserved: { label: 'Reserved', dotClass: 'bg-slate-400', borderClass: 'border-slate-500/20', bgClass: 'bg-slate-500/[0.03]', textClass: 'text-slate-400' },
  }[status]

  return (
    <div className={`flex items-center justify-between rounded-lg border ${config.borderClass} ${config.bgClass} px-4 py-3`}>
      <div>
        <p className="text-sm font-medium text-white">{name}</p>
        {country && <p className="text-xs text-slate-500">{country}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
        <span className={`text-xs font-medium ${config.textClass}`}>{config.label}</span>
      </div>
    </div>
  )
}

/* ─── Status Message ─── */

function StatusMessage({ type, message }: { type: 'info' | 'error'; message: string }) {
  return (
    <div className={`rounded-lg border px-4 py-3 mb-4 ${
      type === 'info' ? 'border-slate-500/20 bg-slate-500/[0.03]' : 'border-red-500/20 bg-red-500/[0.03]'
    }`}>
      <p className={`text-sm ${type === 'info' ? 'text-slate-400' : 'text-red-400'}`}>{message}</p>
    </div>
  )
}

/* ─── Footer ─── */

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <img src={LOGO_URL} alt="QWIKKER" className="h-6 opacity-40" />
        <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Qwikker. All rights reserved.</p>
      </div>
    </footer>
  )
}

/* ─── Icons ─── */

function WalletIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function StampIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}
