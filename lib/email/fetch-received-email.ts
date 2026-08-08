/**
 * Fetch full inbound email content from Resend Receiving API.
 *
 * Webhook `email.received` payloads are metadata-only. Call REST directly
 * (our pinned resend@6.1 SDK does not expose emails.receiving):
 * GET https://api.resend.com/emails/receiving/{id}
 * GET https://api.resend.com/emails/receiving (list)
 */

export interface ReceivedEmailContent {
  subject: string | null
  html: string | null
  text: string | null
}

export interface ReceivedEmailListItem {
  id: string
  from: string | null
  to: string[]
  subject: string | null
  createdAt: string | null
}

export interface FetchReceivedEmailResult {
  ok: boolean
  content: ReceivedEmailContent | null
  httpStatus: number | null
  error: string | null
}

export async function fetchReceivedEmailContent(
  apiKey: string,
  emailId: string
): Promise<FetchReceivedEmailResult> {
  if (!apiKey || !emailId) {
    return { ok: false, content: null, httpStatus: null, error: 'Missing API key or email id' }
  }

  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const raw = await res.text().catch(() => '')
    let json: Record<string, unknown> = {}
    try {
      json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    } catch {
      /* non-JSON error body */
    }

    if (!res.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) ||
        (typeof json.name === 'string' && json.name) ||
        raw.slice(0, 180) ||
        `HTTP ${res.status}`
      console.warn('[fetch-received-email] Resend Receiving API failed', res.status, msg)
      return { ok: false, content: null, httpStatus: res.status, error: msg }
    }

    // Some SDK wrappers nest under data; REST docs return the email object at top level
    const root = (json.data && typeof json.data === 'object' ? json.data : json) as Record<
      string,
      unknown
    >

    const content: ReceivedEmailContent = {
      subject: typeof root.subject === 'string' ? root.subject : null,
      html: typeof root.html === 'string' ? root.html : null,
      text: typeof root.text === 'string' ? root.text : null,
    }

    if (!content.html && !content.text) {
      return {
        ok: false,
        content,
        httpStatus: res.status,
        error: 'Resend response had no html or text body',
      }
    }

    return { ok: true, content, httpStatus: res.status, error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    console.warn('[fetch-received-email] unexpected error', e)
    return { ok: false, content: null, httpStatus: null, error: message }
  }
}

export interface ListReceivedEmailsResult {
  ok: boolean
  emails: ReceivedEmailListItem[]
  httpStatus: number | null
  error: string | null
}

/** List recent received emails (Resend Receiving). Used to backfill missed webhooks. */
export async function listReceivedEmails(
  apiKey: string,
  limit = 50
): Promise<ListReceivedEmailsResult> {
  if (!apiKey) {
    return { ok: false, emails: [], httpStatus: null, error: 'Missing API key' }
  }

  try {
    const url = new URL('https://api.resend.com/emails/receiving')
    url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)))

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const raw = await res.text().catch(() => '')
    let json: Record<string, unknown> = {}
    try {
      json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    } catch {
      /* non-JSON */
    }

    if (!res.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) ||
        raw.slice(0, 180) ||
        `HTTP ${res.status}`
      return { ok: false, emails: [], httpStatus: res.status, error: msg }
    }

    const rows = Array.isArray(json.data) ? json.data : []
    const emails: ReceivedEmailListItem[] = rows
      .map((row) => {
        const r = row as Record<string, unknown>
        const id = typeof r.id === 'string' ? r.id : null
        if (!id) return null
        const toRaw = r.to
        const to = Array.isArray(toRaw)
          ? toRaw.map(String)
          : typeof toRaw === 'string'
            ? [toRaw]
            : []
        return {
          id,
          from: typeof r.from === 'string' ? r.from : null,
          to,
          subject: typeof r.subject === 'string' ? r.subject : null,
          createdAt: typeof r.created_at === 'string' ? r.created_at : null,
        }
      })
      .filter((x): x is ReceivedEmailListItem => Boolean(x))

    return { ok: true, emails, httpStatus: res.status, error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return { ok: false, emails: [], httpStatus: null, error: message }
  }
}
