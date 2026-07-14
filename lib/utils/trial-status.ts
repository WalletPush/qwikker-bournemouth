/**
 * Trial-status helpers — pure functions, NO server/client imports, so they are
 * safe to import from any component or route.
 *
 * WHY THIS FILE EXISTS (added 2026-07-07):
 * `business_subscriptions` has a UNIQUE(business_id) constraint, so PostgREST
 * embeds the relation as a SINGLE OBJECT, not an array. Several public surfaces
 * (Discover, home feed, business detail, landing page) filtered out expired
 * trials using `Array.isArray(...)` / `.length` guards that silently no-op when
 * the embed is an object — so the expiry check was never reached and
 * expired-trial businesses leaked into public views. The admin dashboard and
 * the loyalty filter already normalise the shape; these helpers centralise that
 * so every surface behaves identically.
 *
 * See roadmap entry `expired-trials-public-leak` for the full write-up + risks.
 */

export type SubscriptionLike = {
  is_in_free_trial?: boolean | null
  free_trial_end_date?: string | null
  status?: string | null
} | null | undefined

/**
 * Normalise a PostgREST embed that may arrive as a single object, an array, or
 * null/undefined into a single record (or null). Use this before reading any
 * embedded to-one relation that is backed by a UNIQUE foreign key.
 */
export function normalizeSubscription<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null
  return Array.isArray(embed) ? (embed[0] ?? null) : embed
}

/**
 * Whether a business should be HIDDEN from public surfaces because its free
 * trial has expired.
 *
 * Scope is deliberately MINIMAL — it hides ONLY genuine expired trials, so the
 * only businesses whose visibility changes vs. the (buggy) previous behaviour
 * are those that are literally `is_in_free_trial = true` with a past
 * `free_trial_end_date`. Nothing else is newly hidden.
 *
 * Behaviour:
 *   - No subscription row       → NOT expired (legacy/manual businesses stay visible)
 *   - not on free trial (paid)  → NOT expired (visible) — covers cancelled/lapsed paid + downgraded-to-free
 *   - on trial + past end date  → expired (HIDDEN)  ← the actual leak we fix
 *   - on trial + no end date    → NOT expired (visible; matches prior public behaviour)
 *
 * NOTE: we intentionally do NOT treat `status = 'cancelled'` as expired here.
 * A cancelled row can belong to a business that downgraded to a free listing
 * (which should still show); the admin dashboard also keys off trial dates, not
 * the cancelled flag. Extending a trial or converting to paid un-hides a
 * business automatically. The 8 known expired trials are all `status = 'trial'`
 * with past end dates, so they are caught by the date check regardless.
 */
export function isBusinessTrialExpired(
  embed: SubscriptionLike | SubscriptionLike[],
  now: Date = new Date()
): boolean {
  const sub = normalizeSubscription(embed)
  if (!sub) return false
  if (!sub.is_in_free_trial) return false
  if (sub.free_trial_end_date) {
    return new Date(sub.free_trial_end_date) < now
  }
  return false
}

/**
 * Convenience inverse of {@link isBusinessTrialExpired} for use in `.filter(...)`.
 */
export function isBusinessTrialActive(
  embed: SubscriptionLike | SubscriptionLike[],
  now: Date = new Date()
): boolean {
  return !isBusinessTrialExpired(embed, now)
}
