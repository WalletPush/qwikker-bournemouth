'use client'

/**
 * Print-ready launch-pack artwork as VECTOR (SVG) templates.
 *
 * Single source of truth: the same SVG renders in the on-screen mockup preview
 * (warped onto the product) AND is what we export to print-ready PDF/PNG later.
 * Vector = crisp at any DPI; variable data (business name / live QR) is filled
 * per business.
 *
 * Branding: NO avatars/logos on the artwork — just the business NAME, the real
 * Qwikker wordmark, a "Scan to view our offers" CTA and a real scannable QR.
 *
 * Print notes:
 *  - The dark background is FULL-BLEED (fills the whole viewBox) so it can run
 *    off the trim edge — the on-screen mockup over-fills the product face by a
 *    few % to simulate that bleed.
 *  - All text/QR sits inside a generous SAFE AREA (see MX / MY) so nothing gets
 *    clipped at the trim.
 */

import { QRCodeSVG } from 'qrcode.react'

const BG = '#0E1116'
const GREEN = '#00D083'
const WHITE = '#FFFFFF'
const MUTED = '#93A1B4'
const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const QWIKKER_LOGO = '/qwikker-logo-web.svg' // white wordmark + green, transparent
const LOGO_RATIO = 357.46 / 96.77 // wordmark aspect

// ---- text helpers -----------------------------------------------------------

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w
    if (t.length <= maxChars) cur = t
    else {
      if (cur) lines.push(cur)
      cur = w
      if (lines.length === maxLines) break
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  if (lines.length > maxLines) lines.length = maxLines
  return lines
}

function MultiText({
  x, y, lines, size, fill, weight = 700, lineH, tracking, anchor = 'middle',
}: {
  x: number; y: number; lines: string[]; size: number; fill: string
  weight?: number; lineH?: number; tracking?: number; anchor?: 'start' | 'middle' | 'end'
}) {
  const lh = lineH ?? size * 1.15
  return (
    <text x={x} y={y} fill={fill} fontFamily={FONT} fontSize={size} fontWeight={weight} textAnchor={anchor} letterSpacing={tracking}>
      {lines.map((ln, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>{ln}</tspan>
      ))}
    </text>
  )
}

// ---- shared bits ------------------------------------------------------------

/** Full-bleed background + a trim/safe-area guide line set inside the margin. */
function Frame({ w, h, mx, my }: { w: number; h: number; mx: number; my: number }) {
  return (
    <>
      <rect x={0} y={0} width={w} height={h} fill={BG} />
      <rect
        x={mx * 0.55}
        y={my * 0.55}
        width={w - mx * 1.1}
        height={h - my * 1.1}
        rx={16}
        fill="none"
        stroke={GREEN}
        strokeOpacity={0.24}
        strokeWidth={1.5}
      />
    </>
  )
}

function Wordmark({ cx, y, w = 122 }: { cx: number; y: number; w?: number }) {
  const h = w / LOGO_RATIO
  return <image href={QWIKKER_LOGO} x={cx - w / 2} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
}

function QrPanel({ cx, y, qr, value }: { cx: number; y: number; qr: number; value: string }) {
  const pad = 10
  const panel = qr + pad * 2
  const x = cx - panel / 2
  const tick = 12
  const t = 2.6
  const corner = (dx: number, dy: number, sx: number, sy: number, key: string) => (
    <path key={key} d={`M ${dx + sx * tick} ${dy} L ${dx} ${dy} L ${dx} ${dy + sy * tick}`} fill="none" stroke={GREEN} strokeWidth={t} strokeLinecap="round" />
  )
  return (
    <g>
      <rect x={x} y={y} width={panel} height={panel} rx={12} fill={WHITE} />
      <g transform={`translate(${x + pad} ${y + pad})`}>
        <QRCodeSVG value={value} size={qr} bgColor={WHITE} fgColor={BG} level="M" />
      </g>
      {corner(x + 6, y + 6, 1, 1, 'tl')}
      {corner(x + panel - 6, y + 6, -1, 1, 'tr')}
      {corner(x + 6, y + panel - 6, 1, -1, 'bl')}
      {corner(x + panel - 6, y + panel - 6, -1, -1, 'br')}
    </g>
  )
}

const CTA = ['SCAN TO VIEW', 'OUR OFFERS']

// ---- Window sticker (landscape, ~0.70) — centered "featured on" cling -------

export function WindowStickerArt({ listingUrl }: { listingUrl: string }) {
  const W = 360
  const H = 252
  const MX = 30
  const MY = 26
  // Green perimeter frame → white QR panel → QR, all concentric so the QR sits
  // comfortably INSIDE the green border. Everything shifted up so the QR frame
  // clears the sticker's outer trim line.
  const G = 110 // green frame size
  const gx = (W - G) / 2
  const gy = 102
  const P = 86 // white panel
  const px = (W - P) / 2
  const py = gy + (G - P) / 2
  const qr = 70
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <Frame w={W} h={H} mx={MX} my={MY} />
      <text x={W / 2} y={44} textAnchor="middle" fill={WHITE} fontFamily={FONT} fontSize={10} fontWeight={700} letterSpacing={3}>WE&rsquo;RE FEATURED ON</text>
      <Wordmark cx={W / 2} y={42} w={146} />
      <text x={W / 2} y={96} textAnchor="middle" fill={GREEN} fontFamily={FONT} fontSize={12} fontWeight={800} letterSpacing={1.6}>SCAN TO EXPLORE US</text>
      {/* green perimeter frame */}
      <rect x={gx} y={gy} width={G} height={G} rx={16} fill="none" stroke={GREEN} strokeOpacity={0.7} strokeWidth={2.5} />
      {/* white QR panel fully inside the green frame */}
      <rect x={px} y={py} width={P} height={P} rx={10} fill={WHITE} />
      <g transform={`translate(${px + (P - qr) / 2} ${py + (P - qr) / 2})`}>
        <QRCodeSVG value={listingUrl} size={qr} bgColor={WHITE} fgColor={BG} level="M" />
      </g>
    </svg>
  )
}

// ---- Table tent (~1.20) -----------------------------------------------------

export function TableTentArt({ businessName, listingUrl }: { businessName: string; listingUrl: string }) {
  const W = 360
  const H = 478 // matches the detected front-face aspect (~1.33) so text isn't stretched
  const MX = 40
  const MY = 44
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <Frame w={W} h={H} mx={MX} my={MY} />
      <MultiText x={W / 2} y={MY + 42} lines={wrapLines(businessName, 22, 2)} size={19} weight={800} fill={WHITE} lineH={22} />
      <line x1={W / 2 - 44} y1={MY + 78} x2={W / 2 + 44} y2={MY + 78} stroke={GREEN} strokeOpacity={0.4} strokeWidth={2} strokeLinecap="round" />
      <MultiText x={W / 2} y={MY + 122} lines={CTA} size={21} weight={800} fill={WHITE} lineH={24} tracking={0.5} />
      <QrPanel cx={W / 2} y={MY + 156} qr={128} value={listingUrl} />
      <text x={W / 2} y={H - MY - 22} textAnchor="middle" fill={MUTED} fontFamily={FONT} fontSize={9} fontWeight={700} letterSpacing={2}>DISCOVER US ON</text>
      <Wordmark cx={W / 2} y={H - MY - 14} w={118} />
    </svg>
  )
}

// ---- Review card (white, ~1.47) — Google + Qwikker "rate your experience" ---

function GoogleGMark({ x, y, size }: { x: number; y: number; size: number }) {
  const s = size / 48
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </g>
  )
}

export function ReviewCardArt({ reviewUrl }: { reviewUrl: string }) {
  const W = 340
  const H = 520 // matches detected card aspect (~1.53) so nothing is stretched
  const DARK = '#0E1116'
  const GRAY = '#64748B'
  const STAR = '#F5B301'
  const cx = W / 2
  const G = 206 // green frame
  const gx = (W - G) / 2
  const gy = 182
  const P = 174 // white panel
  const px = (W - P) / 2
  const py = gy + (G - P) / 2
  const qr = 148
  const logoW = 112
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <rect x={0} y={0} width={W} height={H} fill={WHITE} />
      <rect x={11} y={11} width={W - 22} height={H - 22} rx={22} fill="none" stroke="#E2E8F0" strokeWidth={1.5} />
      {/* brand row: Google G · Qwikker (larger, centred) */}
      <GoogleGMark x={90} y={52} size={32} />
      <rect x={132} y={55} width={2} height={26} fill="#CBD5E1" />
      <image href="/qwikker-logo-dark.svg" x={142} y={54} width={logoW} height={logoW / LOGO_RATIO} preserveAspectRatio="xMinYMid meet" />
      <text x={cx} y={122} textAnchor="middle" fill={DARK} fontFamily={FONT} fontSize={24} fontWeight={800}>Rate your experience</text>
      <text x={cx} y={158} textAnchor="middle" fill={STAR} fontFamily={FONT} fontSize={26} letterSpacing={4}>★★★★★</text>
      {/* green-framed QR */}
      <rect x={gx} y={gy} width={G} height={G} rx={18} fill="none" stroke={GREEN} strokeWidth={3.5} />
      <rect x={px} y={py} width={P} height={P} rx={10} fill={WHITE} />
      <g transform={`translate(${px + (P - qr) / 2} ${py + (P - qr) / 2})`}>
        <QRCodeSVG value={reviewUrl} size={qr} bgColor={WHITE} fgColor={DARK} level="M" />
      </g>
      <text x={cx} y={H - 40} textAnchor="middle" fill={GRAY} fontFamily={FONT} fontSize={12} fontWeight={700} letterSpacing={2.5}>TAP OR SCAN</text>
    </svg>
  )
}

// ---- Counter card (~1.44) ---------------------------------------------------

export function CounterCardArt({ businessName, listingUrl }: { businessName: string; listingUrl: string }) {
  const W = 360
  const H = 520
  const MX = 44
  const MY = 48
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <Frame w={W} h={H} mx={MX} my={MY} />
      <MultiText x={W / 2} y={MY + 46} lines={wrapLines(businessName, 22, 2)} size={20} weight={800} fill={WHITE} lineH={24} />
      <line x1={W / 2 - 48} y1={MY + 86} x2={W / 2 + 48} y2={MY + 86} stroke={GREEN} strokeOpacity={0.4} strokeWidth={2} strokeLinecap="round" />
      <MultiText x={W / 2} y={MY + 134} lines={CTA} size={23} weight={800} fill={WHITE} lineH={26} tracking={0.5} />
      <QrPanel cx={W / 2} y={MY + 172} qr={146} value={listingUrl} />
      <text x={W / 2} y={H - MY - 24} textAnchor="middle" fill={MUTED} fontFamily={FONT} fontSize={10} fontWeight={700} letterSpacing={2}>DISCOVER US ON</text>
      <Wordmark cx={W / 2} y={H - MY - 14} w={126} />
    </svg>
  )
}
