import { createHmac, timingSafeEqual } from 'crypto'

function secret(): string {
  return (
    process.env.EMAIL_UNSUB_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'qwikker-email-unsub-dev'
  )
}

export interface UnsubPayload {
  city: string
  email: string
  businessId?: string
  scope?: string
  sendId?: string
}

export function signUnsubToken(payload: UnsubPayload): string {
  const body = Buffer.from(
    JSON.stringify({
      c: payload.city.toLowerCase(),
      e: payload.email.trim().toLowerCase(),
      b: payload.businessId || '',
      s: payload.scope || 'all_marketing',
      i: payload.sendId || '',
    }),
    'utf8'
  ).toString('base64url')
  const sig = createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyUnsubToken(token: string): UnsubPayload | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret()).update(body).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      c: string
      e: string
      b?: string
      s?: string
      i?: string
    }
    if (!parsed.c || !parsed.e) return null
    return {
      city: parsed.c,
      email: parsed.e,
      businessId: parsed.b || undefined,
      scope: parsed.s || 'all_marketing',
      sendId: parsed.i || undefined,
    }
  } catch {
    return null
  }
}

export function buildUnsubUrl(baseUrl: string, payload: UnsubPayload): string {
  const token = signUnsubToken(payload)
  return `${baseUrl.replace(/\/$/, '')}/e/unsub/${token}`
}
