/**
 * Franchise URL helpers — client-safe (no server-only imports), so these can be
 * used from both server routes and client components.
 *
 * IMPORTANT: there are two notions of "base URL":
 *
 *  - getFranchiseBaseUrl(city): environment-aware. In production it's the live
 *    subdomain; in dev it falls back to localhost. Good for INTERNAL navigation
 *    and previews where you want to stay on the machine you're running on.
 *
 *  - getFranchisePublicUrl(city): ALWAYS the live franchise subdomain. Use this
 *    for RECIPIENT-FACING links — claim invites, WhatsApp messages, "we're live"
 *    launch emails — because those go to real businesses/users and must never
 *    contain "localhost" (even when generated from a dev box or the admin host).
 */

/** Environment-aware base URL (localhost in dev). Mirrors the server helper. */
export function getFranchiseBaseUrl(city: string): string {
  if (process.env.NODE_ENV === 'production') {
    return `https://${(city || '').toLowerCase()}.qwikker.com`
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

/**
 * The live, public franchise subdomain — regardless of NODE_ENV or the host the
 * link was generated from. Use for any URL that will be sent to a real recipient.
 */
export function getFranchisePublicUrl(city: string): string {
  const slug = (city || '').toLowerCase().trim()
  if (slug) return `https://${slug}.qwikker.com`
  // No city (shouldn't happen for franchise flows) — safe root fallback.
  return 'https://qwikker.com'
}
