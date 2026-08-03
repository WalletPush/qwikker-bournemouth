'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { commercialCopy } from '@/lib/partners/commercial-copy'
import { trackPartnersEvent } from '@/lib/partners/analytics'
import { PartnersNav } from '@/components/partners/sections/nav'
import { PartnersHero } from '@/components/partners/sections/hero'
import { PartnersNarrative } from '@/components/partners/sections/narrative'
import { PartnersWhatYouGet } from '@/components/partners/sections/what-you-get'
import { PartnersPricing } from '@/components/partners/sections/pricing'
import { PartnersCalculator } from '@/components/partners/sections/calculator'
import { PartnersBusinessTiers } from '@/components/partners/sections/business-tiers'
import { PartnersFaq } from '@/components/partners/sections/faq'
import { PartnersFinalCta } from '@/components/partners/sections/final-cta'
import { PartnersReserve } from '@/components/partners/sections/reserve'
import { PartnersProductProof } from '@/components/partners/sections/product-proof'
import { PartnersFooter } from '@/components/partners/sections/footer'
import { PartnersMobileStickyCta } from '@/components/partners/sections/mobile-sticky-cta'
import { PartnersProof, type PartnersProofStats } from '@/components/partners/sections/proof-stats'
import { PartnersDayOne } from '@/components/partners/sections/day-one'
import { PartnersManifesto } from '@/components/partners/sections/manifesto'
import { PartnersCinematicLock } from '@/components/partners/sections/cinematic-lock'

export interface PublicCity {
  city_name: string
  city_slug: string
  country?: string
  status: 'owned' | 'reserved' | 'available'
  lat?: number | null
  lng?: number | null
  thumbnail_url?: string | null
  tier?: 'hub' | 'partner'
  reserved_at?: string | null
}

export interface FoundingMeta {
  secured: number
  converted: number
  total: number
  open: boolean
}

export interface PartnersMapConfig {
  token: string | null
  style: string
}

export function PartnersOpportunityPage() {
  const [cities, setCities] = useState<PublicCity[]>([])
  const [recentlyReserved, setRecentlyReserved] = useState<PublicCity[]>([])
  const [mapConfig, setMapConfig] = useState<PartnersMapConfig>({
    // NEXT_PUBLIC_* is inlined at build/dev start — don't wait on cities API
    token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null,
    style:
      process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL || 'mapbox://styles/mapbox/dark-v11',
  })
  const [founding, setFounding] = useState<FoundingMeta>({
    secured: 0,
    converted: 0,
    total: 100,
    open: true,
  })
  const [proof, setProof] = useState<PartnersProofStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapSelectedSlug, setMapSelectedSlug] = useState<string | null>(null)
  const reserveRef = useRef<HTMLDivElement>(null)
  const reserveSelectRef = useRef<((city: PublicCity) => void) | null>(null)

  useEffect(() => {
    trackPartnersEvent('partners_page_viewed')
    fetch('/api/partners/cities', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setCities(data.cities || [])
        setRecentlyReserved(data.recently_reserved || [])
        if (data.founding) setFounding(data.founding)
        if (data.proof) setProof(data.proof)
        if (data.map) {
          setMapConfig({
            token: data.map.token || null,
            style: data.map.style || 'mapbox://styles/mapbox/dark-v11',
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const scrollToReserve = useCallback(() => {
    trackPartnersEvent('partners_hero_cta_clicked')
    reserveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Highlight slug for globe fly/pulse only — must NOT call reserveSelectRef
  // (that re-enters selectFromPublicCity → stack overflow).
  const handleMapSelect = useCallback((city: PublicCity) => {
    setMapSelectedSlug(city.city_slug)
  }, [])

  return (
    <div
      className="min-h-screen text-[var(--p-text)] antialiased"
      style={
        {
          '--p-bg': '#050505',
          '--p-surface': '#0c0c0c',
          '--p-elevated': '#121212',
          '--p-border': 'rgba(255,255,255,0.08)',
          '--p-text': '#f5f5f5',
          '--p-muted': '#8a8a8a',
          '--p-faint': '#5c5c5c',
          '--p-accent': '#00C46A',
          '--p-accent-dim': 'rgba(0,196,106,0.12)',
          '--p-owned': '#00C46A',
          '--p-reserved': '#F5A524',
          '--p-available': '#E5484D',
          background: 'var(--p-bg)',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        } as React.CSSProperties
      }
    >
      <PartnersNav onReserve={scrollToReserve} />
      <main>
        <PartnersHero
          founding={founding}
          cities={cities}
          onReserve={scrollToReserve}
          onSelectCity={(city) => {
            setMapSelectedSlug(city.city_slug)
            reserveSelectRef.current?.(city)
          }}
        />
        <PartnersNarrative />
        <PartnersPricing foundingOpen={founding.open} onReserve={scrollToReserve} />
        <PartnersCalculator />
        <PartnersProof proof={proof} />
        <PartnersDayOne />
        <PartnersBusinessTiers />
        <PartnersWhatYouGet />
        <PartnersProductProof />
        <PartnersFaq />
        <PartnersManifesto />
        <PartnersFinalCta founding={founding} onReserve={scrollToReserve} />
        <PartnersCinematicLock />
        <div ref={reserveRef} id="reserve">
          <PartnersReserve
            cities={cities}
            recentlyReserved={recentlyReserved}
            loading={loading}
            founding={founding}
            mapToken={mapConfig.token}
            mapStyle={mapConfig.style}
            mapSelectedSlug={mapSelectedSlug}
            onMapSelect={handleMapSelect}
            registerSelectHandler={(fn) => {
              reserveSelectRef.current = fn
            }}
          />
        </div>
      </main>
      <PartnersFooter />
      <PartnersMobileStickyCta onReserve={scrollToReserve} />
      <p className="sr-only">{commercialCopy.framing}</p>
    </div>
  )
}
