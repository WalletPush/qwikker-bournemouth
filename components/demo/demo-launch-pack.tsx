'use client'

/**
 * "Your launch pack" — the in-store marketing materials a business gets the
 * moment they go live: table tents, window stickers, counter signs and a social
 * launch pack, all auto-branded and carrying REAL, scannable QR codes that deep
 * link to their live listing (via the wallet-pass join flow).
 *
 * Each material is a print-ready VECTOR template (launch-artwork.tsx) — the same
 * SVG that renders in the preview is what we export to PDF later. It's corner-
 * pinned (demo-corner-pin.tsx) onto a photorealistic blank product template
 * (public/demo/demo-blank-*.png) so the perspective matches the real product.
 * We over-fill the printable face by a few % (BLEED) so the dark artwork runs
 * cleanly to the trim edge with no white showing through.
 *
 * The "download print-ready pack" button is a teaser ("Coming soon") — the
 * actual PDF export is a later step.
 */

import { useEffect, useRef, useState } from 'react'
import { RealQr } from '@/components/demo/real-qr'
import { CornerPin } from '@/components/demo/demo-corner-pin'
import { WindowStickerArt, TableTentArt, CounterCardArt, ReviewCardArt } from '@/components/demo/launch-artwork'
import type { LaunchQrUrls } from '@/lib/listing-engine/ensure-launch-qr'

const ACCENT = '#00d083'

type Pt = [number, number]
type Quad = { tl: Pt; tr: Pt; br: Pt; bl: Pt }
type ProductKey = 'window' | 'table' | 'counter' | 'review'

// Blank templates + the four corners of each printable face (fractions of the
// image, from scripts/detect-face.cjs). `bleed` over-fills the face outward from
// its centre so the full-bleed dark artwork covers the trim with no white edge.
// `whiteArt` products (white card) are kept slightly INSIDE the face instead, so
// the white artwork never spills onto the darker background.
const PRODUCTS: Record<ProductKey, { img: string; corners: Quad; bleed: number; whiteArt?: boolean }> = {
  window: {
    img: '/demo/demo-blank-sticker.png',
    // Frosted panel is semi-transparent so auto-detect under-reads it — widened.
    corners: { tl: [0.208, 0.168], tr: [0.792, 0.178], br: [0.797, 0.792], bl: [0.203, 0.788] },
    bleed: 1.03,
  },
  table: {
    // Cleaner near-head-on tent (single flat face, no base-flap ambiguity).
    // Corners DETECTED programmatically (scripts/detect-tent-face.cjs) and
    // verified pixel-tight via scripts/overlay-quad.cjs — no manual guessing.
    img: '/demo/demo-blank-tent2.png',
    corners: { tl: [0.288, 0.100], tr: [0.681, 0.093], br: [0.655, 0.896], bl: [0.264, 0.860] },
    bleed: 1.006,
  },
  counter: {
    img: '/demo/demo-blank-counter.png',
    corners: { tl: [0.333, 0.087], tr: [0.688, 0.096], br: [0.712, 0.855], bl: [0.35, 0.881] },
    bleed: 1.04,
  },
  review: {
    img: '/demo/demo-blank-review.png',
    // White card in a holder next to the till. Corners DETECTED programmatically
    // (scripts/detect-tent-face.cjs) and verified via overlay-quad.cjs — fills
    // the whole card face down to the holder lip.
    corners: { tl: [0.373, 0.259], tr: [0.606, 0.259], br: [0.612, 0.806], bl: [0.370, 0.805] },
    bleed: 1.0,
    whiteArt: true,
  },
}

/** Scale a quad outward from its centroid to simulate print bleed. */
function withBleed(q: Quad, factor: number): Quad {
  const pts = [q.tl, q.tr, q.br, q.bl]
  const cx = pts.reduce((s, p) => s + p[0], 0) / 4
  const cy = pts.reduce((s, p) => s + p[1], 0) / 4
  const grow = (p: Pt): Pt => [cx + (p[0] - cx) * factor, cy + (p[1] - cy) * factor]
  return { tl: grow(q.tl), tr: grow(q.tr), br: grow(q.br), bl: grow(q.bl) }
}

/** Product photo with the print-ready artwork corner-pinned onto its real face. */
function ProductScene({ product, children }: { product: ProductKey; children: React.ReactNode }) {
  const p = PRODUCTS[product]
  const imgRef = useRef<HTMLImageElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    // Measure the IMAGE's real laid-out size (layout box, unaffected by any
    // ancestor CSS transform). This is the only reliable basis for the warp.
    const measure = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (!w || !h) return
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }))
    }
    measure()
    if (el.complete) measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [p.img])

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-slate-800 shadow-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={p.img}
        alt=""
        className="block w-full"
        onLoad={() => {
          const el = imgRef.current
          if (el && el.offsetWidth && el.offsetHeight) setSize({ w: el.offsetWidth, h: el.offsetHeight })
        }}
      />
      <CornerPin corners={withBleed(p.corners, p.bleed)} size={size}>
        <div className="relative h-full w-full">
          {children}
          {/* soft directional lighting so the flat artwork reads as a real surface.
              White cards get a much gentler multiply (a strong one would grey them). */}
          <div
            className="pointer-events-none absolute inset-0 mix-blend-multiply"
            style={{ background: `linear-gradient(135deg, rgba(255,255,255,0) 45%, rgba(0,0,0,${p.whiteArt ? 0.14 : 0.4}))` }}
          />
          {!p.whiteArt && (
            <div className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 40%)' }} />
          )}
        </div>
      </CornerPin>
    </div>
  )
}

function Mockup({ caption, title, children }: { caption: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      <p className="mt-2.5 text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{caption}</p>
    </div>
  )
}

export function DemoLaunchPack({
  businessName,
  listingUrl,
  reviewUrl,
  walletTryUrl,
  qrUrls,
}: {
  businessName: string
  listingUrl: string
  reviewUrl: string
  walletTryUrl: string
  /** Tracked, registered scan URLs per material (falls back to direct links). */
  qrUrls?: LaunchQrUrls | null
}) {
  // Prefer the registered, tracked scan URLs; fall back to direct deep links.
  const windowUrl = qrUrls?.window ?? listingUrl
  const tableUrl = qrUrls?.table ?? listingUrl
  const counterUrl = qrUrls?.counter ?? listingUrl
  const reviewQrUrl = qrUrls?.review ?? reviewUrl
  const includes = [
    'Personalised QR codes',
    'Deep links directly to your listing',
    'Wallet pass installation',
    'Google + Qwikker review cards',
    'Live offers & loyalty',
    'AI discovery',
    'Ready-to-print artwork',
  ]

  return (
    <div className="space-y-8">
      {/* ── 2×2 mockup grid ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Window sticker */}
        <Mockup title="Window Sticker" caption="Catch people before they even walk through the door.">
          <ProductScene product="window">
            <WindowStickerArt listingUrl={windowUrl} />
          </ProductScene>
        </Mockup>

        {/* Table tent */}
        <Mockup title="Table Tent" caption="Every table becomes a way to gain loyal customers.">
          <ProductScene product="table">
            <TableTentArt businessName={businessName} listingUrl={tableUrl} />
          </ProductScene>
        </Mockup>

        {/* Counter display */}
        <Mockup title="Counter Display" caption="Perfect beside the till while customers are already paying.">
          <ProductScene product="counter">
            <CounterCardArt businessName={businessName} listingUrl={counterUrl} />
          </ProductScene>
        </Mockup>

        {/* Review card (Google + Qwikker) */}
        <Mockup title="Review Card" caption="One scan leaves a Qwikker vibe — then invites a Google review. Grow both at once.">
          <ProductScene product="review">
            <ReviewCardArt reviewUrl={reviewQrUrl} />
          </ProductScene>
        </Mockup>
      </div>

      {/* ── Every pack includes ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <p className="text-sm font-semibold text-white">Every pack includes</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {includes.map((f) => (
            <p key={f} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-0.5" style={{ color: ACCENT }}>✓</span>
              {f}
            </p>
          ))}
        </div>
      </div>

      {/* ── We've already done the work panel ── */}
      <div className="rounded-2xl border border-[#00d083]/30 bg-gradient-to-br from-[#00d083]/10 to-emerald-900/10 p-6 text-center">
        <p className="text-lg font-bold text-white">We&rsquo;ve already done the work.</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-300">
          Everything is generated automatically using <span className="font-semibold text-white">your</span> branding.
          Just download, print and place in your business.
        </p>
      </div>

      {/* ── Why these QR codes are different ── */}
      <p className="mx-auto max-w-xl text-center text-sm font-medium leading-relaxed text-slate-200">
        Every scan goes directly to your Qwikker listing, wallet pass or live offer.
        <span className="text-slate-400"> No searching required.</span>
      </p>

      {/* ── Try it now ── */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <RealQr value={walletTryUrl} size={92} padding={6} />
          <div>
            <p className="text-sm font-semibold text-white">Try it now</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
              Scan this with your phone to run the real flow — add the Qwikker wallet pass and land straight on
              <span className="text-slate-200"> {businessName}</span>&rsquo;s live page.
            </p>
          </div>
        </div>
        <a
          href={walletTryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl border border-[#00d083]/40 bg-[#00d083]/10 px-4 py-2.5 text-sm font-semibold text-[#00d083] transition-colors hover:bg-[#00d083]/20"
        >
          Open the flow →
        </a>
      </div>

      {/* ── Generated-on-claim statement ── */}
      <div className="flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#00d083]/30 bg-[#00d083]/10 px-5 py-3 text-sm font-bold text-[#00d083]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Your marketing pack is generated when you claim your listing.
        </div>
        <p className="text-xs text-slate-500">We&rsquo;ll generate the print-ready artwork for you — or bring it printed to your door.</p>
      </div>
    </div>
  )
}
