/**
 * Unified contact-methods model for the Acquisition Engine.
 *
 * Every enriched business gets a normalized list of the ways we can reach it —
 * email, WhatsApp, phone, Instagram, Facebook — each with a `verified` flag and a
 * ready-to-use `url`. Storing them as one shape (rather than scattered columns)
 * future-proofs outreach: later the AI can pick a channel ("email bounced → use
 * WhatsApp → else Instagram DM") without any data-model change.
 *
 * HONESTY: `verified` is true ONLY when we have a reliable signal (a real email
 * on the site, an explicit wa.me/WhatsApp link, a known social handle). A plain
 * phone number becomes an UNverified WhatsApp candidate — we never claim a number
 * is on WhatsApp when we can't confirm it (that needs Meta's Business API).
 */
import { normalizeWhatsappNumber } from '@/lib/utils/phone'

export type ContactType = 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook'

export interface ContactMethod {
  type: ContactType
  /** The address / number (digits for whatsapp/phone) / handle. */
  value: string
  /** Convenience link: mailto:, tel:, wa.me/…, instagram/facebook URL. */
  url?: string
  /** True only when we have a reliable signal (see file header). */
  verified: boolean
  /** Where it came from, for later trust decisions. */
  source?: 'website' | 'google' | 'existing'
}

export interface BuildContactMethodsInput {
  emails?: string[] | null
  /** Digits from an explicit WhatsApp link — reliable "on WhatsApp" signal. */
  whatsapp?: string | null
  /**
   * A MOBILE number scraped from the site — a likely (but unconfirmed) WhatsApp
   * contact. Only pass mobiles here: landlines and the generic Google number are
   * NOT WhatsApp-capable and must never be offered as a WhatsApp contact.
   */
  whatsappCandidate?: string | null
  /** Phone (site tel: or Google) for tel:/manual call — never used for WhatsApp. */
  phone?: string | null
  instagramHandle?: string | null
  facebookUrl?: string | null
  /** Franchise country dialing code for normalizing national-format numbers. */
  dialCode?: string
  emailSource?: ContactMethod['source']
  phoneSource?: ContactMethod['source']
}

/** Turn an Instagram handle-or-URL into { value: handle, url }. */
function normalizeInstagram(raw: string): { value: string; url: string } | null {
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) {
    const handle = t.replace(/\/+$/, '').split('/').pop() || t
    return { value: handle.replace(/^@/, ''), url: t }
  }
  const handle = t.replace(/^@/, '')
  return { value: handle, url: `https://instagram.com/${handle}` }
}

/**
 * Build the normalized, de-duplicated contact-methods list for a business.
 * Order is outreach priority: email → whatsapp → phone → instagram → facebook.
 */
export function buildContactMethods(input: BuildContactMethodsInput): ContactMethod[] {
  const methods: ContactMethod[] = []
  const dialCode = input.dialCode || '44'

  const email = (input.emails || []).find((e) => e && e.includes('@'))
  if (email) {
    methods.push({ type: 'email', value: email, url: `mailto:${email}`, verified: true, source: input.emailSource || 'website' })
  }

  // WhatsApp: an explicit wa.me/WhatsApp link is a verified "on WhatsApp" signal.
  // Failing that, a MOBILE scraped from the site is a likely (unverified) candidate.
  // We deliberately never fall back to a plain phone/landline/Google number here —
  // those aren't WhatsApp-capable and would produce a dead chat link.
  if (input.whatsapp) {
    const num = normalizeWhatsappNumber(input.whatsapp, dialCode)
    if (num) methods.push({ type: 'whatsapp', value: num, url: `https://wa.me/${num}`, verified: true, source: 'website' })
  } else if (input.whatsappCandidate) {
    const num = normalizeWhatsappNumber(input.whatsappCandidate, dialCode)
    if (num) methods.push({ type: 'whatsapp', value: num, url: `https://wa.me/${num}`, verified: false, source: 'website' })
  }

  if (input.phone) {
    methods.push({ type: 'phone', value: input.phone, url: `tel:${input.phone.replace(/\s+/g, '')}`, verified: true, source: input.phoneSource || 'google' })
  }

  if (input.instagramHandle) {
    const ig = normalizeInstagram(input.instagramHandle)
    if (ig) methods.push({ type: 'instagram', value: ig.value, url: ig.url, verified: true, source: 'existing' })
  }

  if (input.facebookUrl) {
    const fb = input.facebookUrl.trim()
    if (fb) methods.push({ type: 'facebook', value: fb, url: /^https?:\/\//i.test(fb) ? fb : `https://${fb}`, verified: true, source: 'existing' })
  }

  return methods
}

export interface ContactabilityResult {
  score: number
  label: 'High' | 'Medium' | 'Low'
}

/**
 * A grounded "how easy is this to contact" score (NOT a fabricated response-rate
 * prediction). Rewards verified, high-conversion channels most.
 */
export function scoreContactability(methods: ContactMethod[]): ContactabilityResult {
  const has = (t: ContactType) => methods.some((m) => m.type === t)
  const verified = (t: ContactType) => methods.some((m) => m.type === t && m.verified)

  let s = 0
  if (has('email')) s += 40
  if (verified('whatsapp')) s += 30
  else if (has('whatsapp') || has('phone')) s += 12
  if (has('instagram')) s += 15
  if (has('facebook')) s += 8

  const score = Math.min(100, s)
  const label: ContactabilityResult['label'] = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low'
  return { score, label }
}
