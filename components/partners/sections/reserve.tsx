'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { commercialCopy } from '@/lib/partners/commercial-copy'
import { trackPartnersEvent } from '@/lib/partners/analytics'
import { slugifyCityName } from '@/lib/partners/availability'
import type { FoundingMeta, PublicCity } from '@/components/partners/partners-opportunity-page'
import { PartnersTerritoryMap } from '@/components/partners/sections/territory-map'
import { PartnersRecentlyReserved } from '@/components/partners/sections/recently-reserved'

type FormState =
  | 'idle'
  | 'claim'
  | 'waitlist'
  | 'success-verify'
  | 'success-waitlist'
  | 'error-owned'
  | 'error-reserved'

interface PlaceSuggestion {
  description: string
  place_id: string
  city_name: string
  country?: string
  region?: string
  types: string[]
}

type GoogleMapsWindow = Window & {
  google?: {
    maps: {
      places: {
        AutocompleteService: new () => {
          getPlacePredictions: (
            req: { input: string; types: string[] },
            cb: (preds: Array<{
              description: string
              place_id: string
              types?: string[]
              structured_formatting?: { main_text?: string; secondary_text?: string }
            }> | null) => void
          ) => void
        }
      }
    }
  }
}

export function PartnersReserve({
  cities,
  recentlyReserved = [],
  loading,
  founding,
  mapToken = null,
  mapStyle = 'mapbox://styles/mapbox/dark-v11',
  mapSelectedSlug = null,
  onMapSelect,
  registerSelectHandler,
}: {
  cities: PublicCity[]
  recentlyReserved?: PublicCity[]
  loading: boolean
  founding: FoundingMeta
  mapToken?: string | null
  mapStyle?: string
  mapSelectedSlug?: string | null
  onMapSelect?: (city: PublicCity) => void
  registerSelectHandler?: (fn: (city: PublicCity) => void) => void
}) {
  const [formState, setFormState] = useState<FormState>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [selected, setSelected] = useState<PlaceSuggestion | null>(null)
  const [selectedPublic, setSelectedPublic] = useState<PublicCity | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [enquiryConsent, setEnquiryConsent] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [mapsReady, setMapsReady] = useState(false)
  const autocompleteService = useRef<{
    getPlacePredictions: (
      req: { input: string; types: string[] },
      cb: (preds: Array<{
        description: string
        place_id: string
        types?: string[]
        structured_formatting?: { main_text?: string; secondary_text?: string }
      }> | null) => void
    ) => void
  } | null>(null)
  const attributionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!key) return
    const w = window as GoogleMapsWindow

    if (w.google?.maps?.places) {
      autocompleteService.current = new w.google.maps.places.AutocompleteService()
      setMapsReady(true)
      return
    }

    const existing = document.querySelector('script[data-partners-places]')
    if (existing) {
      existing.addEventListener('load', () => {
        const gw = window as GoogleMapsWindow
        if (gw.google?.maps?.places) {
          autocompleteService.current = new gw.google.maps.places.AutocompleteService()
          setMapsReady(true)
        }
      })
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.dataset.partnersPlaces = '1'
    script.onload = () => {
      const gw = window as GoogleMapsWindow
      if (gw.google?.maps?.places) {
        autocompleteService.current = new gw.google.maps.places.AutocompleteService()
        setMapsReady(true)
      }
    }
    document.head.appendChild(script)
  }, [])

  const owned = cities.filter((c) => c.status === 'owned')
  const reserved = cities.filter((c) => c.status === 'reserved')

  const runPlacesPredict = useCallback(
    (input: string) => {
      if (!mapsReady || !autocompleteService.current || input.trim().length < 2) {
        setSuggestions([])
        return
      }
      autocompleteService.current.getPlacePredictions(
        {
          input,
          types: ['(cities)'],
        },
        (preds: any[] | null) => {
          const mapped: PlaceSuggestion[] = (preds || []).map((p) => {
            const main = p.structured_formatting?.main_text || p.description
            const secondary = p.structured_formatting?.secondary_text || ''
            const parts = secondary.split(',').map((s: string) => s.trim())
            return {
              description: p.description,
              place_id: p.place_id,
              city_name: main,
              region: parts[0] || undefined,
              country: parts[parts.length - 1] || undefined,
              types: p.types || ['locality'],
            }
          })
          setSuggestions(mapped)
        }
      )
    },
    [mapsReady]
  )

  useEffect(() => {
    const t = setTimeout(() => runPlacesPredict(searchQuery), 200)
    return () => clearTimeout(t)
  }, [searchQuery, runPlacesPredict])

  const applyAvailability = useCallback(
    (cityName: string, slug: string, place?: PlaceSuggestion) => {
      trackPartnersEvent('partners_city_searched')
      setSelected(
        place || {
          description: cityName,
          place_id: '',
          city_name: cityName,
          types: ['locality'],
        }
      )
      setErrorMessage('')
      setSuggestions([])

      const existing = cities.find(
        (c) => c.city_slug === slug || c.city_name.toLowerCase() === cityName.toLowerCase()
      )
      setSelectedPublic(existing || null)

      if (existing?.status === 'owned') {
        trackPartnersEvent('partners_city_unavailable')
        setFormState('error-owned')
        return
      }
      if (existing?.status === 'reserved') {
        trackPartnersEvent('partners_city_unavailable')
        setFormState('waitlist')
        return
      }
      trackPartnersEvent('partners_city_available')
      setFormState('claim')
    },
    [cities]
  )

  const selectFromPublicCity = useCallback(
    (city: PublicCity) => {
      setSearchQuery(city.country ? `${city.city_name}, ${city.country}` : city.city_name)
      applyAvailability(city.city_name, city.city_slug, {
        description: city.country ? `${city.city_name}, ${city.country}` : city.city_name,
        place_id: '',
        city_name: city.city_name,
        country: city.country,
        types: ['locality'],
      })
      // Highlight only — never call a parent handler that re-enters this function
      onMapSelect?.(city)
    },
    [applyAvailability, onMapSelect]
  )

  useEffect(() => {
    registerSelectHandler?.(selectFromPublicCity)
  }, [registerSelectHandler, selectFromPublicCity])

  const handleCheckManual = () => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) return
    if (/\d{3,}/.test(trimmed) || /[^a-zA-ZÀ-ÿ\s\-'.(),]/.test(trimmed)) {
      setErrorMessage('Please enter a valid city name')
      return
    }
    applyAvailability(trimmed, slugifyCityName(trimmed))
  }

  const handleSubmit = async (type: 'claim' | 'waitlist') => {
    if (!fullName.trim() || !email.trim() || !enquiryConsent) return
    if (!selected) return
    setSubmitting(true)
    setErrorMessage('')
    trackPartnersEvent(type === 'claim' ? 'partners_claim_started' : 'partners_waitlist_joined')

    try {
      const endpoint = type === 'claim' ? '/api/partners/claim' : '/api/partners/waitlist'
      const slug = slugifyCityName(selected.city_name)
      const body =
        type === 'claim'
          ? {
              city_name: selected.city_name,
              city_slug: slug,
              country: selected.country || null,
              region: selected.region || null,
              place_id: selected.place_id || null,
              place_types: selected.types,
              full_name: fullName,
              email,
              marketing_opt_in: marketingOptIn,
              enquiry_consent: true,
              website,
            }
          : {
              city_slug: slug,
              city_name: selected.city_name,
              full_name: fullName,
              email,
            }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.waitlist) {
          setFormState('waitlist')
          setErrorMessage(data.error || 'This territory is not available. You can join the waitlist.')
        } else {
          setErrorMessage(data.error || 'Something went wrong')
        }
        return
      }

      if (type === 'claim') {
        trackPartnersEvent('partners_verification_sent')
        setFormState('success-verify')
      } else {
        setFormState('success-waitlist')
      }
    } catch {
      setErrorMessage('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="claim-section" className="py-24 px-5 sm:px-6 border-t border-[var(--p-border)] pb-28 sm:pb-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Reserve Your Territory
          </h2>
          <p className="text-[var(--p-muted)] mb-2">
            Search for a city, verify your email, and our team will review your enquiry.
          </p>
          <p className="text-sm text-[var(--p-faint)]">{commercialCopy.slaReviewCopy}</p>
          <p className="text-sm text-[var(--p-accent)] mt-3" aria-live="polite">
            {commercialCopy.foundingCounterLabel(founding.secured, founding.total)}
          </p>
        </div>

        <div className="mb-10">
          <PartnersTerritoryMap
            variant="reserve"
            cities={cities}
            selectedSlug={mapSelectedSlug || selectedPublic?.city_slug || null}
            onSelectCity={selectFromPublicCity}
          />
          <PartnersRecentlyReserved cities={recentlyReserved} onSelect={selectFromPublicCity} />
        </div>

        <div className="mx-auto max-w-xl mb-12">
          <div className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-6 sm:p-8 relative">
            <label htmlFor="city-search" className="sr-only">
              Search for a city
            </label>
            <div className="flex gap-2">
              <input
                id="city-search"
                type="text"
                value={searchQuery}
                autoComplete="off"
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (formState !== 'idle') {
                    setFormState('idle')
                    setErrorMessage('')
                    setSelected(null)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (suggestions[0]) {
                      applyAvailability(
                        suggestions[0].city_name,
                        slugifyCityName(suggestions[0].city_name),
                        suggestions[0]
                      )
                      setSearchQuery(suggestions[0].description)
                    } else {
                      handleCheckManual()
                    }
                  }
                }}
                placeholder="Search for a city…"
                className="flex-1 rounded-xl border border-[var(--p-border)] bg-[#050505] py-3.5 px-4 text-white placeholder:text-[var(--p-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--p-accent)]"
              />
              <button
                type="button"
                onClick={handleCheckManual}
                disabled={searchQuery.trim().length < 2}
                className="rounded-xl bg-[var(--p-accent)] px-4 py-3.5 text-sm font-semibold text-[#050505] disabled:opacity-30"
              >
                Check
              </button>
            </div>

            {suggestions.length > 0 && formState === 'idle' && (
              <ul
                className="absolute left-6 right-6 mt-2 z-20 rounded-xl border border-[var(--p-border)] bg-[var(--p-elevated)] overflow-hidden shadow-xl"
                role="listbox"
              >
                {suggestions.map((s) => (
                  <li key={s.place_id}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/[0.04]"
                      onClick={() => {
                        setSearchQuery(s.description)
                        applyAvailability(s.city_name, slugifyCityName(s.city_name), s)
                      }}
                    >
                      {s.description}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!mapsReady && (
              <p className="text-xs text-[var(--p-faint)] mt-3">
                City search works with typed names. Enable Google Places for autocomplete suggestions.
              </p>
            )}
            {errorMessage && formState === 'idle' && (
              <p className="text-sm text-red-400 mt-3" role="alert">
                {errorMessage}
              </p>
            )}
            <div ref={attributionRef} className="hidden" aria-hidden />
          </div>
        </div>

        {!loading && (owned.length > 0 || reserved.length > 0) && formState === 'idle' && (
          <div className="mb-12 space-y-8">
            {reserved.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--p-reserved)] uppercase tracking-wider text-center mb-4">
                  Reserved territories
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {reserved.map((c) => (
                    <CityBadge
                      key={c.city_slug}
                      name={c.city_name}
                      status="reserved"
                      country={c.country}
                    />
                  ))}
                </div>
              </div>
            )}
            {owned.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--p-faint)] uppercase tracking-wider text-center mb-4">
                  Live territories
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {owned.map((c) => (
                    <CityBadge
                      key={c.city_slug}
                      name={c.city_name}
                      status="owned"
                      country={c.country}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mx-auto max-w-lg space-y-4">
          {formState === 'error-owned' && selected && (
            <StatusMessage message={`${selected.city_name} is already live on Qwikker.`} />
          )}
          {formState === 'error-reserved' && selected && (
            <StatusMessage
              message={`${selected.city_name} is reserved and not open for new partners.`}
            />
          )}

          {(formState === 'claim' || formState === 'waitlist') && selected && (
            <div
              className={`rounded-xl border p-6 space-y-4 ${
                formState === 'claim'
                  ? 'border-[var(--p-accent)]/30 bg-[var(--p-accent-dim)]'
                  : 'border-[var(--p-reserved)]/30 bg-[rgba(245,165,36,0.06)]'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  formState === 'claim' ? 'text-[var(--p-accent)]' : 'text-[var(--p-reserved)]'
                }`}
                aria-live="polite"
              >
                {formState === 'claim'
                  ? `${selected.city_name} appears available`
                  : `${selected.city_name} is reserved — join the waitlist`}
              </p>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg border border-[var(--p-border)] bg-[#050505] py-3 px-4 text-white placeholder:text-[var(--p-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--p-accent)]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full rounded-lg border border-[var(--p-border)] bg-[#050505] py-3 px-4 text-white placeholder:text-[var(--p-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--p-accent)]"
              />

              {/* Honeypot */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden
              />

              <label className="flex items-start gap-3 text-xs text-[var(--p-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enquiryConsent}
                  onChange={(e) => setEnquiryConsent(e.target.checked)}
                  className="mt-0.5 accent-[var(--p-accent)]"
                  required
                />
                <span>
                  {commercialCopy.privacyConsentEnquiry}{' '}
                  <a href="/privacy-policy" className="text-[var(--p-accent)] underline underline-offset-2">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>

              <label className="flex items-start gap-3 text-xs text-[var(--p-faint)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5 accent-[var(--p-accent)]"
                />
                <span>{commercialCopy.marketingConsentOptional}</span>
              </label>

              {errorMessage && (
                <p className="text-sm text-red-400" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                type="button"
                onClick={() => handleSubmit(formState === 'claim' ? 'claim' : 'waitlist')}
                disabled={submitting || !fullName.trim() || !email.trim() || !enquiryConsent}
                className={`w-full rounded-lg py-3 text-sm font-semibold text-[#050505] disabled:opacity-50 ${
                  formState === 'claim' ? 'bg-[var(--p-accent)]' : 'bg-[var(--p-reserved)]'
                }`}
              >
                {submitting
                  ? 'Submitting…'
                  : formState === 'claim'
                    ? 'Submit enquiry'
                    : 'Join waitlist'}
              </button>
              {formState === 'claim' && (
                <p className="text-xs text-[var(--p-faint)] text-center">
                  We&apos;ll email a verification link. Holds only start after HQ approval.
                </p>
              )}
            </div>
          )}

          {formState === 'success-verify' && (
            <div className="rounded-xl border border-[var(--p-accent)]/30 bg-[var(--p-accent-dim)] p-8 text-center">
              <h3 className="text-xl font-semibold mb-2">Check your email</h3>
              <p className="text-[var(--p-muted)] text-sm leading-relaxed">
                We sent a verification link. After you verify,{' '}
                {commercialCopy.slaReviewCopy.replace(/^After verification, /, '')}
              </p>
            </div>
          )}

          {formState === 'success-waitlist' && selected && (
            <div className="rounded-xl border border-[var(--p-reserved)]/30 p-8 text-center">
              <h3 className="text-xl font-semibold mb-2">You&apos;re on the waitlist</h3>
              <p className="text-[var(--p-muted)] text-sm">
                We&apos;ll notify you if {selected.city_name} becomes available.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function CityBadge({
  name,
  status,
  country,
}: {
  name: string
  status: 'owned' | 'reserved'
  country?: string
}) {
  const config = {
    owned: {
      label: 'Live',
      dot: 'bg-[var(--p-owned)]',
      border: 'border-[var(--p-owned)]/25',
      text: 'text-[var(--p-owned)]',
    },
    reserved: {
      label: 'Reserved',
      dot: 'bg-[var(--p-reserved)]',
      border: 'border-[var(--p-reserved)]/25',
      text: 'text-[var(--p-reserved)]',
    },
  }[status]

  return (
    <div className={`flex items-center justify-between rounded-lg border ${config.border} bg-[var(--p-surface)] px-4 py-3`}>
      <div>
        <p className="text-sm font-medium text-white">{name}</p>
        {country && <p className="text-xs text-[var(--p-faint)]">{country}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden />
        <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      </div>
    </div>
  )
}

function StatusMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[var(--p-border)] bg-[var(--p-surface)] px-4 py-3 mb-2">
      <p className="text-sm text-[var(--p-muted)]">{message}</p>
    </div>
  )
}
