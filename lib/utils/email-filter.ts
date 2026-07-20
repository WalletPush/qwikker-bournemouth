/**
 * Shared contact-email junk filter for the Listing/Acquisition engines.
 *
 * Website scrapes turn up a lot of non-contact "emails": asset filenames, tracking
 * IDs, and — most annoyingly — TEMPLATE PLACEHOLDERS that ship with website builders
 * (e.g. `example@mysite.com`, `yourname@yourdomain.com`, `info@example.com`). Sending
 * a claim invite to one of those is worse than finding nothing, so we filter them
 * out everywhere email discovery happens (enrichment scrape + the admin "find email"
 * helper) using this single source of truth.
 */

// Asset filenames that match the email regex (logo@2x.png, etc.)
const ASSET_EXT = /\.(png|jpe?g|gif|webp|svg|css|js|ico|bmp|tiff?|woff2?)$/i

// A long hex string local-part is almost always a tracking/build id, not a person.
const HEX_HASH_LOCAL = /^[0-9a-f]{16,}@/i

// Placeholder LOCAL parts that ship in templates / demo copy.
const PLACEHOLDER_LOCAL =
  /^(example|examples?|your-?name|your-?email|your-?business|your-?company|your-?address|firstname|lastname|first\.?last|john\.?doe|jane\.?doe|name|names?|email|e-?mail|user|username|test|testing|sample|placeholder|demo|dummy|someone|somebody|address)@/i

// Placeholder / vendor DOMAINS that are never a real business inbox.
const PLACEHOLDER_DOMAIN =
  /@(example\.(com|org|net)|mysite\.com|wixsite\.com|wix\.com|your-?domain\.[a-z.]+|your-?site\.[a-z.]+|your-?website\.[a-z.]+|my-?domain\.[a-z.]+|domain\.(com|net)|email\.com|test\.(com|org)|sample\.com|sentry\.(io|wixpress\.com)|wixpress\.com|godaddy\.com|squarespace\.com|wordpress\.(com|org))$/i

// Extra substring safety-net (vendors that can appear in odd shapes).
const VENDOR_SUBSTRINGS = ['sentry', 'wixpress', 'cloudflare', 'sentry.io']

/**
 * True if the given string is NOT a usable business contact email (asset, tracking
 * id, or a template placeholder). Case-insensitive; expects a raw scraped token.
 */
export function isJunkEmail(raw: string | null | undefined): boolean {
  if (!raw) return true
  const email = raw.trim().toLowerCase()
  if (!email.includes('@') || email.length < 6 || email.length > 254) return true
  if (ASSET_EXT.test(email)) return true
  if (HEX_HASH_LOCAL.test(email)) return true
  if (PLACEHOLDER_LOCAL.test(email)) return true
  if (PLACEHOLDER_DOMAIN.test(email)) return true
  if (VENDOR_SUBSTRINGS.some((v) => email.includes(v))) return true
  return false
}

/**
 * Normalise (lowercase/trim), de-dupe, and drop junk from a list of scraped emails.
 * Preserves input order and caps the result.
 */
export function filterContactEmails(raw: Iterable<string>, limit = 8): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const email = (item || '').trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    if (isJunkEmail(email)) continue
    out.push(email)
    if (out.length >= limit) break
  }
  return out
}

// ---------------------------------------------------------------------------
// HTML → email extraction (the "look harder" layer)
//
// Businesses hide their email in many ways beyond a plain mailto:. This single
// extractor is used by every scrape path (enrichment + the admin find-email
// helper) so improvements land everywhere at once. It handles:
//   - mailto: links
//   - Cloudflare "email protection" obfuscation (data-cfemail / #hex)
//   - JSON-LD / inline JSON  "email": "..."  (schema.org LocalBusiness etc.)
//   - HTML entity-encoded addresses (info&#64;domain&#46;com)
//   - human obfuscation: "info [at] domain [dot] com", "info (at) ... (dot) ..."
//   - plain inline text addresses
// Everything is then run through filterContactEmails() to drop junk/placeholders.
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16))
      } catch {
        return ' '
      }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(parseInt(d, 10))
      } catch {
        return ' '
      }
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Decode a Cloudflare "email protection" token. Cloudflare replaces an address
 * with a hex string XOR-encoded against its first byte (data-cfemail="..." and
 * /cdn-cgi/l/email-protection#...). Returns the plaintext email or null.
 */
function decodeCloudflareEmail(hex: string): string | null {
  try {
    if (!hex || hex.length < 4 || hex.length % 2 !== 0) return null
    const key = parseInt(hex.substr(0, 2), 16)
    let out = ''
    for (let i = 2; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ key)
    }
    return out.includes('@') ? out : null
  } catch {
    return null
  }
}

/**
 * Turn common human "anti-spam" obfuscation back into real addresses so the
 * email regex can catch them. Deliberately conservative: bracketed [at]/(at)
 * forms are unambiguous, and the spaced "word at word dot tld" form requires the
 * full shape before it fires (junk is filtered afterwards regardless).
 */
function deobfuscateEmails(text: string): string {
  return (
    text
      // [at] (at) {at} <at>  →  @   (and the same for dot)
      .replace(/\s*[[({<]\s*at\s*[\])}>]\s*/gi, '@')
      .replace(/\s*[[({<]\s*dot\s*[\])}>]\s*/gi, '.')
      // "name at domain dot com"  →  name@domain.com
      .replace(
        /([A-Za-z0-9._%+-]+)\s+at\s+([A-Za-z0-9.-]+)\s+dot\s+([A-Za-z]{2,})/gi,
        '$1@$2.$3'
      )
  )
}

/**
 * Extract every plausible contact email from a raw HTML document, de-obfuscating
 * and decoding as needed, then filter out junk/placeholders. Highest-signal
 * sources (mailto, Cloudflare-protected, structured data) are collected first so
 * the ordered result puts the most likely real inbox at the front.
 */
export function extractEmailsFromHtml(html: string): string[] {
  if (!html) return []
  const found: string[] = []
  let m: RegExpExecArray | null

  // 1. mailto: links — the highest-confidence signal
  const mailtoRe = /mailto:([^"'?\s>]+)/gi
  while ((m = mailtoRe.exec(html)) !== null) found.push(decodeHtmlEntities(m[1]))

  // 2. Cloudflare email protection (very common on small-business sites)
  const cfAttrRe = /data-cfemail=["']([0-9a-fA-F]+)["']/g
  while ((m = cfAttrRe.exec(html)) !== null) {
    const d = decodeCloudflareEmail(m[1])
    if (d) found.push(d)
  }
  const cfHrefRe = /email-protection#([0-9a-fA-F]+)/g
  while ((m = cfHrefRe.exec(html)) !== null) {
    const d = decodeCloudflareEmail(m[1])
    if (d) found.push(d)
  }

  // 3. JSON-LD / inline JSON  "email": "..."  (schema.org, config blobs)
  const jsonEmailRe = /["']email["']\s*:\s*["'](?:mailto:)?([^"']+)["']/gi
  while ((m = jsonEmailRe.exec(html)) !== null) found.push(decodeHtmlEntities(m[1]))

  // 4. Inline text — strip tags, decode entities, de-obfuscate, then regex
  const text = deobfuscateEmails(decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ')))
  for (const raw of text.match(EMAIL_RE) || []) found.push(raw)

  return filterContactEmails(found)
}
