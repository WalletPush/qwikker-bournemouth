import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

// Email-like tokens we never want to suggest (tracking, assets, examples, etc.)
const EMAIL_BLOCKLIST = [
  'sentry', 'wixpress', 'example.', '@example', 'cloudflare', 'godaddy',
  'squarespace', 'wordpress', 'yourdomain', 'domain.com', 'email.com',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js',
]

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function extractEmails(html: string): string[] {
  const found = new Set<string>()

  // mailto: links are the highest-signal source
  const mailtoRegex = /mailto:([^"'?\s>]+)/gi
  let m: RegExpExecArray | null
  while ((m = mailtoRegex.exec(html)) !== null) {
    found.add(m[1].trim().toLowerCase())
  }

  // Plain-text emails anywhere in the markup
  const matches = html.match(EMAIL_REGEX) || []
  for (const raw of matches) {
    found.add(raw.trim().toLowerCase())
  }

  return Array.from(found).filter((email) => {
    if (email.length > 254) return false
    return !EMAIL_BLOCKLIST.some((bad) => email.includes(bad))
  })
}

// Reject loopback, link-local, private ranges and cloud metadata IPs (SSRF guard)
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (['localhost', '0.0.0.0', '::1'].includes(host)) return true
  if (host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return true
  // IPv4 literal checks
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 127) return true // loopback
    if (a === 10) return true // private
    if (a === 172 && b >= 16 && b <= 31) return true // private
    if (a === 192 && b === 168) return true // private
    if (a === 169 && b === 254) return true // link-local / cloud metadata
  }
  return false
}

function normaliseUrl(url: string): string | null {
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const parsed = new URL(withProtocol)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (isBlockedHost(parsed.hostname)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

async function fetchPage(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    signal,
    redirect: 'follow',
    headers: { 'User-Agent': 'QwikkerBot/1.0 (+https://qwikker.com)' },
  })
  if (!res.ok) return ''
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return ''
  return await res.text()
}

/**
 * Admin helper: attempt to discover a contact email for a business by scraping
 * its stored website (homepage + a likely /contact page). Returns candidate
 * emails ranked by signal; the admin still chooses + confirms before saving.
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json()
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    // Admin authentication
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 })
    }

    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)

    if (!admin || !(await isAdminForCity(adminSession.adminId, requestCity))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: business, error: businessError } = await supabaseAdmin
      .from('business_profiles')
      .select('id, city, website_url')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    if (business.city !== requestCity) {
      return NextResponse.json({ error: 'Unauthorized access to this business' }, { status: 403 })
    }
    if (!business.website_url) {
      return NextResponse.json(
        { error: 'No website on file to search for an email' },
        { status: 400 }
      )
    }

    const baseUrl = normaliseUrl(business.website_url)
    if (!baseUrl) {
      return NextResponse.json({ error: 'The website on file is not a valid URL' }, { status: 400 })
    }

    // Try the homepage and a common contact page, with a hard timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const candidateUrls = [baseUrl, new URL('/contact', baseUrl).toString()]

    const emails = new Set<string>()
    try {
      const pages = await Promise.all(
        candidateUrls.map((u) => fetchPage(u, controller.signal).catch(() => ''))
      )
      for (const page of pages) {
        if (page) extractEmails(page).forEach((e) => emails.add(e))
      }
    } finally {
      clearTimeout(timeout)
    }

    const results = Array.from(emails).slice(0, 8)

    return NextResponse.json({
      success: true,
      website: baseUrl,
      emails: results,
    })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      return NextResponse.json({ error: 'The website took too long to respond' }, { status: 504 })
    }
    console.error('find-business-email API error:', error)
    return NextResponse.json({ error: 'Could not search the website' }, { status: 500 })
  }
}
