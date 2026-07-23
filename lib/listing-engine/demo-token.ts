/**
 * Signed, expiring tokens for Present Mode / prospecting demo links.
 *
 * A token encodes { businessId, city, expiry } and is HMAC-signed so it can't be
 * forged or edited. Used two ways:
 *   1. Admin "Present" launches /demo/<token> in-person (short-lived).
 *   2. A longer-lived token link dropped in the claim email / left behind.
 *
 * The route (app/demo/[token]/page.tsx) verifies the signature + expiry before
 * rendering, and always sets noindex — so demo pages are unguessable and never
 * publicly findable. Server-only (uses the service-role key as the signing secret).
 */

import crypto from 'crypto'

// Signing secret. Never shipped to the client (this module is server-only).
// Falls back through env options so it works in every environment.
const SECRET =
  process.env.DEMO_TOKEN_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXTAUTH_SECRET ||
  'qwikker-demo-token-fallback-secret'

const DEFAULT_TTL_DAYS = 30

interface DemoTokenPayload {
  b: string // businessId
  c: string // city (lowercased)
  exp: number // epoch ms expiry
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlToBuffer(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function sign(body: string): string {
  return b64url(crypto.createHmac('sha256', SECRET).update(body).digest())
}

/** Create a signed demo token for a business. Default lifetime: 30 days. */
export function signDemoToken(businessId: string, city: string, ttlDays: number = DEFAULT_TTL_DAYS): string {
  const payload: DemoTokenPayload = {
    b: businessId,
    c: (city || '').toLowerCase(),
    exp: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
  }
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

export type VerifyResult =
  | { ok: true; businessId: string; city: string; expiresAt: number }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' }

/** Verify a demo token: checks structure, HMAC signature, then expiry. */
export function verifyDemoToken(token: string): VerifyResult {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' }
  }

  const [body, sig] = token.split('.')
  if (!body || !sig) return { ok: false, reason: 'malformed' }

  // Timing-safe signature comparison.
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' }
  }

  let payload: DemoTokenPayload
  try {
    payload = JSON.parse(b64urlToBuffer(body).toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (!payload?.b || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'malformed' }
  }
  if (Date.now() > payload.exp) {
    return { ok: false, reason: 'expired' }
  }

  return { ok: true, businessId: payload.b, city: payload.c || '', expiresAt: payload.exp }
}
