/**
 * Fetch full inbound email content from Resend Receiving API.
 *
 * Webhook `email.received` payloads are metadata-only. The Node SDK we ship
 * (resend@6) does not expose `emails.receiving.get`, so call REST directly:
 * GET https://api.resend.com/emails/receiving/{id}
 */

export interface ReceivedEmailContent {
  subject: string | null
  html: string | null
  text: string | null
}

export async function fetchReceivedEmailContent(
  apiKey: string,
  emailId: string
): Promise<ReceivedEmailContent | null> {
  if (!apiKey || !emailId) return null

  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.warn(
        '[fetch-received-email] Resend Receiving API failed',
        res.status,
        detail.slice(0, 200)
      )
      return null
    }

    const json = (await res.json()) as {
      subject?: string | null
      html?: string | null
      text?: string | null
    }

    return {
      subject: json.subject ?? null,
      html: json.html ?? null,
      text: json.text ?? null,
    }
  } catch (e) {
    console.warn('[fetch-received-email] unexpected error', e)
    return null
  }
}
