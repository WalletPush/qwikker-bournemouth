/**
 * Lightweight, server-side website text extractor for the Listing Engine.
 *
 * We fetch a business's OWN website (the URL Google already gave us on import)
 * and reduce it to readable text so the LLM can ground a listing draft in real
 * copy rather than inventing it. Deliberately simple + defensive:
 *   - hard timeout so a slow/broken site never blocks generation
 *   - strips scripts/styles/markup, collapses whitespace, caps length
 *   - returns null (never throws) on any failure so callers can fall back to
 *     Google-only signals
 *
 * Menu / service hunting (Jul 2026): a homepage rarely lists the actual things a
 * business offers, so we also look for the page that DOES — and that page differs
 * by trade. For food venues it's a menu (food/drinks/lunch…); for spas, salons,
 * barbers, gyms, clinics, garages etc. it's a treatments / services / price-list
 * page. We hunt links whose href/anchor mentions any of these (plus a few common
 * guessed paths) and fetch a couple of them, appending their text. This is the
 * only honest source of real item names for featured items — if we can't find a
 * readable list, we return NO items rather than inventing.
 *
 * Text-based PDF menus/price-lists are also parsed (via `unpdf`) and their text
 * appended, so venues that publish a PDF now yield real item names. Scanned/photo
 * PDFs and image menus can't be read as text — those URLs are recorded in
 * `menuLinks` so the admin knows one exists, but we never fabricate from them.
 *
 * Everything here is best-effort and non-throwing: any fetch/parse failure just
 * falls back to whatever we already have. Scope note: fetching a business's own
 * site to build THEIR listing is benign. We stay shallow (homepage + a couple of
 * same-origin menu pages/PDFs) to keep it cheap and polite.
 */

import { extractText, getDocumentProxy } from 'unpdf'
import { extractEmailsFromHtml, filterContactEmails } from '@/lib/utils/email-filter'

export interface WebsiteExtract {
  url: string
  title: string | null
  metaDescription: string | null
  text: string
  chars: number
  /** Candidate contact emails found on the page (mailto links + inline text). */
  emails: string[]
  /** WhatsApp number (digits) from an explicit wa.me / api.whatsapp link, if any. */
  whatsapp: string | null
  /** Phone numbers found in tel: links (candidates for a WhatsApp fallback). */
  phones: string[]
  /** Menu-like URLs we found but did NOT read as text (PDFs, images, off-origin). */
  menuLinks: string[]
  /** How many HTML menu sub-pages we actually read text from. */
  menuPagesRead: number
}

const MAX_HOME_CHARS = 6000
const MAX_MENU_CHARS = 4000
const MAX_TOTAL_CHARS = 12000
// Timeouts bumped Jul 2026: a slow menu/services sub-page that times out on one run
// but loads on the next was a source of inconsistent featured-item counts. Giving
// them more headroom makes extraction far more repeatable (small latency cost on
// slow sites only — fast sites still return immediately).
const HOME_TIMEOUT_MS = 10000
const MENU_TIMEOUT_MS = 9000
const MAX_MENU_PAGES = 3
// PDF menu parsing (text-based PDFs only; scanned/photo PDFs yield ~nothing).
const PDF_TIMEOUT_MS = 9000
const MAX_PDF_BYTES = 5_000_000
const MAX_MENU_PDFS = 2

// Contact-page hunting: emails almost always live on a contact/about page (or in
// the footer), not the homepage body — so we crawl a couple of likely pages for
// emails as well (text isn't needed from these, only the address).
const CONTACT_TIMEOUT_MS = 6000
const MAX_CONTACT_PAGES = 3
const CONTACT_HINT =
  /contact|kontakt|about|reach|enquir|inquir|get-?in-?touch|find-?us|imprint|impressum|team|hello|book/i
const GUESSED_CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us', '/get-in-touch']

// Words in an href or link text that suggest a page listing what the business
// offers. Covers BOTH food venues (menu/food/drinks…) AND service businesses —
// spas, salons, barbers, clinics, gyms, garages, groomers etc. — whose "menu" is
// a treatments / services / price-list page.
const MENU_HINT =
  /menu|carte|speisekart|food|drink|breakfast|brunch|lunch|dinner|takeaway|take-away|our-food|eat-in|wine-list|cocktail|dishes|specials|set-menu|a-la-carte|treatment|therap|service|price-?list|pricing|prices|our-prices|tariff|rates|packages?|our-services|what-we-(do|offer)|massage|facial|spa-menu|salon|classes|memberships?|procedures?/i
// "service" is broad — don't let legal/policy pages ("terms of service", cookie
// policy, delivery info…) masquerade as a menu/services page.
const MENU_EXCLUDE = /terms|privacy|policy|policies|cookie|legal|refund|gdpr|disclaimer|delivery-info|shipping|returns/i
// Guessed paths tried ONLY when a site exposes no obvious menu/services link.
// We can only fetch a few (MAX_MENU_PAGES), so we order them by business type so
// a spa doesn't burn its budget on /menu, /food… and a restaurant doesn't burn
// it on /services, /treatments…. Category is passed in by the caller.
const FOOD_MENU_PATHS = ['/menu', '/menus', '/food', '/our-menu', '/drinks', '/food-menu']
const SERVICE_MENU_PATHS = [
  '/services',
  '/our-services',
  '/treatments',
  '/treatment-menu',
  '/price-list',
  '/pricing',
  '/prices',
  '/packages',
]
// When we don't know the type, interleave the highest-signal guesses from both.
const GENERIC_MENU_PATHS = ['/menu', '/services', '/treatments', '/price-list', '/food', '/our-services']

const FOOD_CATEGORY =
  /restaurant|cafe|caf\u00e9|coffee|\bbar\b|\bpub\b|bistro|eatery|food|takeaway|take-away|diner|grill|pizz|burger|kitchen|bakery|patisserie|\bdeli\b|brasserie|gastropub|steak|brunch|breakfast|tapas|winery|brewery|ice ?cream|dessert|chippy|fish ?and ?chips/i
const SERVICE_CATEGORY =
  /spa|salon|barber|\bhair\b|beauty|\bnail|massage|therap|clinic|dental|dentist|physio|chiropract|\bgym\b|fitness|yoga|pilates|wellness|aesthetic|tattoo|groom|\bvet\b|veterinar|garage|mechanic|detailing|tanning|\blash|\bbrow|waxing|osteopath/i

/** Order the guessed fallback paths by the business's category. */
function guessedPathsFor(category: string | null | undefined): string[] {
  const cat = (category || '').toLowerCase()
  const isFood = FOOD_CATEGORY.test(cat)
  const isService = SERVICE_CATEGORY.test(cat)
  if (isService && !isFood) return [...SERVICE_MENU_PATHS, ...FOOD_MENU_PATHS]
  if (isFood && !isService) return [...FOOD_MENU_PATHS, ...SERVICE_MENU_PATHS]
  return GENERIC_MENU_PATHS
}

const HEADERS = {
  'User-Agent': 'QwikkerBot/1.0 (+https://qwikker.com; listing enrichment)',
  Accept: 'text/html,application/xhtml+xml',
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function extractTag(html: string, regex: RegExp): string | null {
  const m = html.match(regex)
  return m?.[1] ? decodeEntities(m[1].trim()) : null
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/**
 * Explicit WhatsApp numbers: wa.me/<number>, api.whatsapp.com/send?phone=<number>,
 * whatsapp://send?phone=<number>. These are the ONLY reliable "this business is on
 * WhatsApp" signal — a plain tel: number might be a landline.
 */
function extractWhatsappNumbers(html: string): string[] {
  const out: string[] = []

  // 1) Explicit click-to-chat links carrying the number:
  //    wa.me/<n>, wa.me/message/…?phone=<n>, api.whatsapp.com/send?phone=<n>,
  //    whatsapp://send?phone=<n>, and any …?phone=<n> inside a whatsapp URL.
  const linkRe =
    /(?:wa\.me\/(?:message\/[^"'\s?]*\?[^"'\s]*?phone=)?|api\.whatsapp\.com\/send\/?\?[^"'\s]*?phone=|whatsapp:\/\/send\/?\?[^"'\s]*?phone=|chat\.whatsapp\.com\/[^"'\s]*?phone=)\+?(\d{7,18})/gi
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html)) !== null && out.length < 10) out.push(m[1])

  // 2) Text/markup that names WhatsApp right next to a phone number, e.g.
  //    "WhatsApp: +44 7911 123456", "message us on WhatsApp 07911 123456",
  //    aria-label="Chat on WhatsApp" ... 07911 123456. The number must appear
  //    within a short window of the word so we don't grab an unrelated figure.
  const nearRe =
    /whats\s?app[^0-9+]{0,40}?(\+?\d[\d\s().-]{7,17}\d)/gi
  while ((m = nearRe.exec(html)) !== null && out.length < 20) {
    const digits = m[1].replace(/[^\d]/g, '')
    if (digits.length >= 8 && digits.length <= 15) out.push(digits)
  }

  return out
}

/** Phone numbers from tel: links — candidates for a WhatsApp fallback / manual call. */
function extractTelNumbers(html: string): string[] {
  const out: string[] = []
  const re = /href=["']tel:([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null && out.length < 20) {
    const num = decodeEntities(m[1].trim())
    // Ignore obviously-bogus/short values.
    if (num.replace(/[^\d]/g, '').length >= 7) out.push(num)
  }
  return out
}

/** Pull <a href> links with their visible text so we can spot menu pages. */
function extractLinks(html: string, baseUrl: string): Array<{ url: string; text: string; href: string }> {
  const out: Array<{ url: string; text: string; href: string }> = []
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null && out.length < 400) {
    const href = decodeEntities(m[1].trim())
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    try {
      const abs = new URL(href, baseUrl).toString()
      out.push({ url: abs, text, href })
    } catch {
      /* skip un-parseable href */
    }
  }
  return out
}

async function fetchDoc(
  url: string,
  timeoutMs: number
): Promise<{ html: string; contentType: string } | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: HEADERS })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('html')) return { html: '', contentType }
    return { html: await res.text(), contentType }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Download + extract text from a (text-based) PDF menu. Fully guarded: enforces a
 * timeout and a size cap, and returns null on ANY failure (network, non-PDF,
 * too-big, corrupt, password-protected, scanned-image PDF with no text layer).
 * Scanned/photo PDFs legitimately return null — we never OCR or invent here.
 */
async function fetchPdfText(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PDF_TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: HEADERS })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    // Some servers mislabel PDFs; we also sniff the magic bytes below.
    if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) return null

    const contentLength = Number(res.headers.get('content-length') || 0)
    if (contentLength && contentLength > MAX_PDF_BYTES) return null

    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.byteLength === 0 || buf.byteLength > MAX_PDF_BYTES) return null
    // Magic bytes: "%PDF"
    if (!(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) return null

    const pdf = await getDocumentProxy(buf)
    const { text } = await extractText(pdf, { mergePages: true })
    const clean = text.replace(/\s+/g, ' ').trim()
    return clean.length >= 40 ? clean : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchWebsiteText(
  rawUrl: string | null | undefined,
  opts?: { category?: string | null }
): Promise<WebsiteExtract | null> {
  if (!rawUrl) return null

  let url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  // Homepage is best-effort: if it's blocked/timed-out/JS-only we DON'T give up —
  // small-business hosts (Wix, Squarespace, GoDaddy) often throttle the homepage
  // to bots but serve /contact and /menu fine. We fall through to guessed paths.
  const home = await fetchDoc(url, HOME_TIMEOUT_MS)
  const html = home?.html || ''
  const homeOk = html.length > 0

  const title = homeOk ? extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) : null
  const metaDescription = homeOk
    ? extractTag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
      extractTag(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']/i)
    : null

  let combinedText = homeOk ? htmlToText(html).slice(0, MAX_HOME_CHARS) : ''
  // Emails are gathered from every page we touch (homepage first for ranking),
  // then de-duped/filtered once at the end. WhatsApp/phone numbers likewise.
  const emailCandidates: string[] = homeOk ? extractEmailsFromHtml(html) : []
  const whatsappCandidates: string[] = homeOk ? extractWhatsappNumbers(html) : []
  const phoneCandidates: string[] = homeOk ? extractTelNumbers(html) : []

  // ---- Hunt for menu + contact pages -------------------------------------
  let origin = ''
  try {
    origin = new URL(url).origin
  } catch {
    /* ignore */
  }

  const sameOriginNonHome = (u: string): string | null => {
    try {
      const clean = u.replace(/#.*$/, '')
      if (origin && new URL(clean).origin === origin && clean !== url) return clean
    } catch {
      /* skip */
    }
    return null
  }

  const links = homeOk ? extractLinks(html, url) : []
  const menuLinks = new Set<string>() // menus we could NOT read as text (images / scanned PDFs)
  const htmlMenuPages = new Set<string>() // same-origin HTML menu pages we CAN read
  const pdfMenuLinks = new Set<string>() // PDF menus we'll try to parse for text
  const contactPages = new Set<string>() // same-origin pages likely to hold an email

  for (const l of links) {
    // Contact/about pages — crawled for emails only (not menu text).
    if (CONTACT_HINT.test(l.href) || CONTACT_HINT.test(l.text)) {
      const clean = sameOriginNonHome(l.url)
      if (clean) contactPages.add(clean)
    }

    const isMenuish =
      (MENU_HINT.test(l.href) || MENU_HINT.test(l.text)) &&
      !(MENU_EXCLUDE.test(l.href) || MENU_EXCLUDE.test(l.text))
    if (!isMenuish) continue
    const lower = l.url.toLowerCase()
    const isPdf = /\.pdf(\?|#|$)/.test(lower)
    const isImage = /\.(png|jpe?g|gif|webp)(\?|#|$)/.test(lower)
    if (isPdf) {
      pdfMenuLinks.add(l.url.replace(/#.*$/, ''))
      continue
    }
    if (isImage) {
      menuLinks.add(l.url) // can't read image menus as text
      continue
    }
    // HTML page we can read — same origin only, and not the homepage itself.
    const clean = sameOriginNonHome(l.url)
    if (clean) htmlMenuPages.add(clean)
  }

  // If nothing obvious, try a few common guessed paths on the same origin,
  // ordered by the business's category (food vs service) so the limited budget
  // is spent on the right kind of page.
  if (htmlMenuPages.size === 0 && origin) {
    for (const p of guessedPathsFor(opts?.category)) htmlMenuPages.add(`${origin}${p}`)
  }
  if (contactPages.size === 0 && origin) {
    for (const p of GUESSED_CONTACT_PATHS) contactPages.add(`${origin}${p}`)
  }

  const pagesToTry = Array.from(htmlMenuPages).slice(0, MAX_MENU_PAGES)
  const contactToTry = Array.from(contactPages).slice(0, MAX_CONTACT_PAGES)
  let menuPagesRead = 0

  // Fetch menu pages and contact pages concurrently so the extra email hunting
  // costs latency=max(menu,contact) rather than the sum.
  const [menuResults, contactResults] = await Promise.all([
    pagesToTry.length > 0
      ? Promise.allSettled(pagesToTry.map((p) => fetchDoc(p, MENU_TIMEOUT_MS)))
      : Promise.resolve([] as PromiseSettledResult<Awaited<ReturnType<typeof fetchDoc>>>[]),
    contactToTry.length > 0
      ? Promise.allSettled(contactToTry.map((p) => fetchDoc(p, CONTACT_TIMEOUT_MS)))
      : Promise.resolve([] as PromiseSettledResult<Awaited<ReturnType<typeof fetchDoc>>>[]),
  ])

  // Contact/about pages: harvest emails + WhatsApp/phone (the most likely place).
  for (const r of contactResults) {
    if (r.status !== 'fulfilled' || !r.value || !r.value.html) continue
    emailCandidates.push(...extractEmailsFromHtml(r.value.html))
    whatsappCandidates.push(...extractWhatsappNumbers(r.value.html))
    phoneCandidates.push(...extractTelNumbers(r.value.html))
  }

  // Menu pages: append readable text for grounding AND harvest any contacts.
  for (const r of menuResults) {
    if (r.status !== 'fulfilled' || !r.value || !r.value.html) continue
    emailCandidates.push(...extractEmailsFromHtml(r.value.html))
    whatsappCandidates.push(...extractWhatsappNumbers(r.value.html))
    phoneCandidates.push(...extractTelNumbers(r.value.html))
    if (combinedText.length >= MAX_TOTAL_CHARS) continue
    const menuText = htmlToText(r.value.html).slice(0, MAX_MENU_CHARS)
    if (menuText.length < 40) continue // a shell page with no real content
    combinedText = `${combinedText}\n\n[MENU / SERVICES]\n${menuText}`.slice(0, MAX_TOTAL_CHARS)
    menuPagesRead++
  }

  // Parse text-based PDF menus. Anything that yields no text (scanned/photo PDFs)
  // is kept as an unreadable menuLink instead — never fabricated from.
  const pdfsToTry = Array.from(pdfMenuLinks).slice(0, MAX_MENU_PDFS)
  if (pdfsToTry.length > 0 && combinedText.length < MAX_TOTAL_CHARS) {
    const results = await Promise.allSettled(pdfsToTry.map((p) => fetchPdfText(p)))
    results.forEach((r, i) => {
      const pdfUrl = pdfsToTry[i]
      if (combinedText.length >= MAX_TOTAL_CHARS) {
        menuLinks.add(pdfUrl)
        return
      }
      if (r.status === 'fulfilled' && r.value) {
        const pdfText = r.value.slice(0, MAX_MENU_CHARS)
        combinedText = `${combinedText}\n\n[MENU / SERVICES PDF]\n${pdfText}`.slice(0, MAX_TOTAL_CHARS)
        menuPagesRead++
      } else {
        // Couldn't read it (scanned image / failed) — record so the admin knows.
        menuLinks.add(pdfUrl)
      }
    })
  }

  const emails = filterContactEmails(emailCandidates)
  const whatsapp = whatsappCandidates.find((n) => n.replace(/[^\d]/g, '').length >= 8) || null
  const phones = Array.from(new Set(phoneCandidates)).slice(0, 5)

  // Only give up if we truly recovered nothing useful. An extract with no body
  // text but a real contact email/WhatsApp (found on a /contact page when the
  // homepage was blocked) is still valuable, so we keep it.
  if (!combinedText && emails.length === 0 && !whatsapp && phones.length === 0 && menuLinks.size === 0) {
    return null
  }

  return {
    url,
    title,
    metaDescription,
    text: combinedText,
    chars: combinedText.length,
    emails,
    whatsapp,
    phones,
    menuLinks: Array.from(menuLinks).slice(0, 5),
    menuPagesRead,
  }
}
