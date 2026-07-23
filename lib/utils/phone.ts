/**
 * Phone / WhatsApp number helpers for outreach.
 *
 * We discover contact numbers while enriching a business (explicit WhatsApp links
 * and `tel:` numbers on their site, plus the Google phone) and turn them into a
 * click-to-chat `wa.me` link the franchise can send by hand — no WhatsApp Business
 * API needed (which would require Meta approval + recipient opt-in for cold sends).
 */

// Franchise city → country dialing code. Used to turn a national-format number
// (e.g. UK "07911…") into the international form wa.me requires. Sub-towns inherit
// their franchise city's country, so we key off the franchise city, defaulting to
// the UK (the primary market).
const CITY_DIAL_CODES: Record<string, string> = {
  bournemouth: '44',
  brighton: '44',
  london: '44',
  poole: '44',
  christchurch: '44',
  alicante: '34',
  calpe: '34',
  bali: '62',
  bangkok: '66',
  kefalonia: '30',
}

export function dialCodeForCity(city: string | null | undefined): string {
  if (!city) return '44'
  return CITY_DIAL_CODES[city.trim().toLowerCase()] || '44'
}

/**
 * Normalize a raw phone/WhatsApp string into the digits-only international form
 * wa.me expects (e.g. "447911123456"). Returns null when it can't be made into a
 * plausible number, so we never build a broken chat link.
 *
 * @param raw       the number as found on the site / in Google (any format)
 * @param dialCode  country code to assume for national-format numbers (leading 0)
 */
export function normalizeWhatsappNumber(
  raw: string | null | undefined,
  dialCode = '44'
): string | null {
  if (!raw) return null
  const hadPlus = raw.trim().startsWith('+')
  let s = raw.replace(/[^\d]/g, '')
  if (!s) return null

  if (s.startsWith('00')) {
    s = s.slice(2) // 00 prefix = international access code
  } else if (s.startsWith('0')) {
    s = dialCode + s.slice(1) // national format → prepend country code
  } else if (!hadPlus && s.length <= 10 && !s.startsWith(dialCode)) {
    // Bare local number with no country code and no leading 0 → assume franchise country.
    s = dialCode + s
  }

  // E.164 allows up to 15 digits; anything shorter than 8 isn't a real number.
  if (s.length < 8 || s.length > 15) return null
  return s
}

// National mobile prefixes (the digits AFTER the country code) per dialing code.
// Used to tell a WhatsApp-capable mobile apart from a landline / reception line —
// only mobiles are reliably on WhatsApp, so we never treat a landline (or the
// generic Google number) as a WhatsApp contact.
const MOBILE_PREFIXES: Record<string, RegExp> = {
  '44': /^7[1-9]/, // UK: 07xxx (excludes 070 personal-numbering)
  '34': /^[67]/, // Spain: 6x / 7x
  '62': /^8/, // Indonesia: 8xx
  '66': /^[689]/, // Thailand: 6/8/9
  '30': /^69/, // Greece: 69x
}

/**
 * True when a number looks like a mobile for the given country — a WhatsApp-capable
 * signal. Landlines, freephone and the generic Google number return false so we
 * never present them as a WhatsApp contact.
 */
export function isLikelyMobile(
  raw: string | null | undefined,
  dialCode = '44'
): boolean {
  const num = normalizeWhatsappNumber(raw, dialCode)
  if (!num) return false
  // We can only judge numbers in the franchise's own country (that's where our
  // prefix table applies); be conservative and say "no" for anything else.
  if (!num.startsWith(dialCode)) return false
  const national = num.slice(dialCode.length)
  const re = MOBILE_PREFIXES[dialCode]
  if (!re) return false
  return re.test(national)
}

/** Build a wa.me click-to-chat URL with a pre-filled message, or null if no valid number. */
export function buildWhatsappLink(
  rawNumber: string | null | undefined,
  message: string,
  dialCode = '44'
): string | null {
  const number = normalizeWhatsappNumber(rawNumber, dialCode)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
