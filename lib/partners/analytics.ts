/**
 * Fire-and-forget partners analytics. Never throws to callers.
 * No personal data (names, emails, place details).
 */

export type PartnersAnalyticsEvent =
  | 'partners_page_viewed'
  | 'partners_hero_cta_clicked'
  | 'partners_calculator_interacted'
  | 'partners_pricing_viewed'
  | 'partners_city_searched'
  | 'partners_city_available'
  | 'partners_city_unavailable'
  | 'partners_claim_started'
  | 'partners_verification_sent'
  | 'partners_email_verified'
  | 'partners_claim_submitted_for_approval'
  | 'partners_hold_approved'
  | 'partners_waitlist_joined'
  | 'partners_video_opened'

export function trackPartnersEvent(
  event: PartnersAnalyticsEvent,
  props?: Record<string, string | number | boolean | null | undefined>
): void {
  try {
    if (typeof window === 'undefined') return
    const payload = {
      event,
      props: props || {},
      ts: Date.now(),
      path: window.location.pathname,
    }
    // Prefer existing analytics if present
    const w = window as Window & {
      qwikkerTrack?: (e: string, p?: Record<string, unknown>) => void
      gtag?: (...args: unknown[]) => void
    }
    if (typeof w.qwikkerTrack === 'function') {
      w.qwikkerTrack(event, payload.props)
      return
    }
    if (typeof w.gtag === 'function') {
      w.gtag('event', event, payload.props)
      return
    }
    // Dev-friendly fallback — never blocks UX
    if (process.env.NODE_ENV === 'development') {
      console.debug('[partners-analytics]', event, props)
    }
  } catch {
    // swallow
  }
}
