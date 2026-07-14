'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CityLandingPage } from '@/components/marketing/city-landing-page'
import { CityComingSoonPage } from '@/components/marketing/city-coming-soon-page'
import { LandingPageConfig, resolvePublishStatus } from '@/lib/constants/landing-templates'
import { LiveOffer } from '@/components/marketing/live-offers-section'
import { getPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'

// Realistic stand-in offers so the Live Offers section renders in the preview.
const SAMPLE_OFFERS: LiveOffer[] = [
  { id: 'preview-1', offer_name: '2-for-1 Burgers', offer_value: 'Buy one get one free', offer_image: getPlaceholderUrl('restaurant', 'preview-1'), offer_end_date: null, business_id: 'p1', business_name: "David's Grill Shack", business_image: null, expiry_label: 'Until 16 Jul' },
  { id: 'preview-2', offer_name: '2 Pints for £10', offer_value: '2 pints for £10', offer_image: getPlaceholderUrl('bar', 'preview-2'), offer_end_date: null, business_id: 'p2', business_name: "Chaplin's & The Cellar Bar", business_image: null, expiry_label: 'Until 21 Jul' },
  { id: 'preview-3', offer_name: 'Free coffee with any pastry', offer_value: 'Free coffee', offer_image: getPlaceholderUrl('cafe', 'preview-3'), offer_end_date: null, business_id: 'p3', business_name: 'The Corner Café', business_image: null, expiry_label: 'Until 30 Jul' },
  { id: 'preview-4', offer_name: '20% off all treatments', offer_value: '20% off', offer_image: getPlaceholderUrl('hotel', 'preview-4'), offer_end_date: null, business_id: 'p4', business_name: 'Coastal Spa & Rooms', business_image: null, expiry_label: 'Until 5 Aug' },
]

interface BusinessOption {
  id: string
  business_name: string
  status?: string
}

interface LivePreviewProps {
  config: LandingPageConfig
  city: string
  displayName: string
  businesses: BusinessOption[]
}

// Logical viewport width for each device. The preview renders the real page
// inside an <iframe> (its own viewport) so Tailwind's responsive breakpoints
// behave exactly like a real phone / desktop, then we scale it to fit the panel.
const DEVICE_WIDTH = { mobile: 390, desktop: 1280 } as const
// Mobile is a long scrolling page → fill a fixed panel, anchored at the top.
// Desktop is a realistic LANDSCAPE viewport (1280×820, not a tall portrait) so
// `min-h-screen` / `vh` pages (e.g. the coming-soon page) look like a real screen.
const PANEL_HEIGHT = 640
const DESKTOP_HEIGHT = 820

export function LivePreview({ config, city, displayName, businesses }: LivePreviewProps) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const panelRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null)
  const [panelWidth, setPanelWidth] = useState(380)
  // Bump to force the iframe to remount and pull the latest component code/styles.
  const [reloadKey, setReloadKey] = useState(0)

  // Track the panel width so we can scale the iframe to fit.
  useEffect(() => {
    if (!panelRef.current) return
    const ro = new ResizeObserver((entries) => {
      setPanelWidth(entries[0].contentRect.width)
    })
    ro.observe(panelRef.current)
    return () => ro.disconnect()
  }, [])

  // Set up the iframe document in an effect (more reliable than onLoad for
  // about:blank). Give it a <base> so relative URLs (Next image, /placeholders,
  // CSS) resolve against the app origin, copy the parent's stylesheets in, and
  // expose a mount node for the React portal.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    let observer: MutationObserver | null = null

    // Mirror the parent document's styles into the iframe. Re-runnable so we can
    // keep them fresh when dev HMR injects/updates <style> tags (otherwise the
    // preview freezes with stale CSS and changes never appear).
    const syncStyles = (doc: Document) => {
      doc.querySelectorAll('[data-preview-style]').forEach((n) => n.remove())
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        let clone: HTMLElement
        if (node.tagName === 'LINK') {
          clone = doc.createElement('link')
          ;(clone as HTMLLinkElement).rel = 'stylesheet'
          ;(clone as HTMLLinkElement).href = (node as HTMLLinkElement).href
        } else {
          clone = node.cloneNode(true) as HTMLElement
        }
        clone.setAttribute('data-preview-style', '')
        doc.head.appendChild(clone)
      })

      // CRITICAL: Next.js + Turbopack (dev) delivers the Tailwind CSS via
      // document.adoptedStyleSheets (constructable stylesheets), NOT <link>/<style>
      // tags. Without copying these, the iframe is missing most utilities (e.g. the
      // hero logo loses its `h-8` height and renders at the SVG's intrinsic size).
      // Serialize them into an inline <style> so they apply synchronously.
      try {
        const adoptedCss = Array.from(document.adoptedStyleSheets || [])
          .map((sheet) => {
            try {
              return Array.from(sheet.cssRules)
                .map((rule) => rule.cssText)
                .join('\n')
            } catch {
              return ''
            }
          })
          .join('\n')
        if (adoptedCss) {
          const style = doc.createElement('style')
          style.setAttribute('data-preview-style', '')
          style.textContent = adoptedCss
          doc.head.appendChild(style)
        }
      } catch {
        // adoptedStyleSheets unsupported / cross-origin — <link>/<style> copy still applies.
      }
    }

    const setup = () => {
      const doc = iframe.contentDocument
      if (!doc || !doc.body) return false

      if (!doc.head.querySelector('base')) {
        const base = doc.createElement('base')
        base.href = window.location.origin + '/'
        doc.head.appendChild(base)
      }
      syncStyles(doc)

      doc.documentElement.style.background = '#ffffff'
      doc.body.style.margin = '0'
      let node = doc.getElementById('preview-root')
      if (!node) {
        node = doc.createElement('div')
        node.id = 'preview-root'
        doc.body.appendChild(node)
      }
      setMountNode(node)

      // Keep the iframe's CSS in lockstep with the parent during dev HMR.
      observer?.disconnect()
      observer = new MutationObserver(() => syncStyles(doc))
      observer.observe(document.head, { childList: true, subtree: true, attributes: true, characterData: true })
      return true
    }

    // about:blank is usually ready immediately; fall back to load event if not.
    if (!setup()) {
      iframe.addEventListener('load', setup)
      return () => {
        iframe.removeEventListener('load', setup)
        observer?.disconnect()
      }
    }
    return () => observer?.disconnect()
  }, [reloadKey])

  function refreshPreview() {
    setMountNode(null)
    setReloadKey((k) => k + 1)
  }

  // Map selected featured IDs to stub objects so the section renders in preview.
  const featuredBusinesses = (config.featured_business_ids || [])
    .map((id) => businesses.find((b) => b.id === id))
    .filter((b): b is BusinessOption => !!b)
    .map((b) => ({ id: b.id, business_name: b.business_name, business_tagline: null, business_images: null }))

  // Sample values so toggled sections actually appear in the preview.
  const foundingMemberSpotsLeft = config.show_founding_counter ? (config.founding_member_total_spots || 12) : 0
  const passHolderCount = config.show_pass_count ? 1240 : 0
  const liveOffers = config.offers_section?.enabled
    ? SAMPLE_OFFERS.slice(0, config.offers_section?.max || 6)
    : []

  const deviceWidth = DEVICE_WIDTH[device]
  // Guard against a 0/undefined panel width (panel not yet measured, or rendered
  // inside a collapsed/`display:none` container). A 0 width makes `scale` 0 and
  // `PANEL_HEIGHT / scale` = Infinity, which React rejects as a CSS height value.
  const safePanelWidth = panelWidth > 0 ? panelWidth : deviceWidth
  const scale = Math.min(1, safePanelWidth / deviceWidth)
  const visualWidth = deviceWidth * scale
  const offsetLeft = Math.max(0, (safePanelWidth - visualWidth) / 2)
  // Mobile keeps its original behaviour (fill the fixed panel at scale 1).
  // Desktop uses a realistic landscape viewport so the panel matches a real screen.
  const isDesktop = device === 'desktop'
  const iframeHeight = isDesktop ? DESKTOP_HEIGHT : PANEL_HEIGHT / scale
  const panelHeight = isDesktop ? Math.round(DESKTOP_HEIGHT * scale) : PANEL_HEIGHT

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Live preview</span>
          <span className="text-xs text-slate-500">(sample data)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshPreview}
            title="Reload the preview with the latest changes"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
            {(['mobile', 'desktop'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${device === d ? 'bg-[#00d083] text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
              >
                {d === 'mobile' ? 'Mobile' : 'Desktop'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 sm:p-4">
        <div
          ref={panelRef}
          className="relative mx-auto overflow-hidden rounded-lg border border-slate-800 bg-white"
          style={{ height: panelHeight, width: '100%' }}
        >
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src="about:blank"
            title="Landing page preview"
            style={{
              position: 'absolute',
              top: 0,
              left: offsetLeft,
              width: deviceWidth,
              height: iframeHeight,
              border: 0,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
          {mountNode &&
            createPortal(
              resolvePublishStatus(config) === 'coming_soon' ? (
                <CityComingSoonPage
                  city={city}
                  displayName={displayName}
                  landingConfig={config}
                />
              ) : (
                <CityLandingPage
                  city={city}
                  displayName={displayName}
                  subdomain={city}
                  landingConfig={config}
                  foundingMemberSpotsLeft={foundingMemberSpotsLeft}
                  featuredBusinesses={featuredBusinesses}
                  passHolderCount={passHolderCount}
                  liveOffers={liveOffers}
                  trialEnabled
                />
              ),
              mountNode
            )}
        </div>
      </div>
    </div>
  )
}
