/**
 * Verify Resend/Svix webhook signatures without adding the svix package.
 * Secret format: whsec_<base64>
 * Signed payload: `${svix-id}.${svix-timestamp}.${rawBody}`
 */

import { createHmac, timingSafeEqual } from 'crypto'

export function verifyResendWebhookSignature(params: {
  rawBody: string
  svixId: string
  svixTimestamp: string
  svixSignature: string
  secret: string
}): boolean {
  const secret = params.secret.trim()
  if (!secret || !params.svixId || !params.svixTimestamp || !params.svixSignature) {
    return false
  }

  // Reject stale timestamps (>5 minutes)
  const ts = Number(params.svixTimestamp)
  if (!Number.isFinite(ts)) return false
  const ageMs = Math.abs(Date.now() - ts * 1000)
  if (ageMs > 5 * 60 * 1000) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const toSign = `${params.svixId}.${params.svixTimestamp}.${params.rawBody}`
  const expected = createHmac('sha256', key).update(toSign).digest('base64')

  for (const part of params.svixSignature.split(' ')) {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) continue
    try {
      const a = Buffer.from(sig)
      const b = Buffer.from(expected)
      if (a.length === b.length && timingSafeEqual(a, b)) return true
    } catch {
      // continue
    }
  }
  return false
}
