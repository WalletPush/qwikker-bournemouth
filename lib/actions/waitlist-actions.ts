'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface JoinWaitlistInput {
  city: string
  email: string
  source?: string
}

interface JoinWaitlistResult {
  success: boolean
  error?: string
}

/**
 * Capture an interested visitor on a city's "coming soon" page.
 *
 * Multi-tenant safe: every row is stamped with the city so franchises only ever
 * see their own list. Writes go through the service-role client (RLS stays
 * locked down for anon). Idempotent on (city, email) so repeat submits are fine.
 */
export async function joinWaitlist(input: JoinWaitlistInput): Promise<JoinWaitlistResult> {
  const city = (input.city || '').trim().toLowerCase()
  const email = (input.email || '').trim().toLowerCase()

  if (!city) return { success: false, error: 'Missing city' }
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('city_waitlist')
      .upsert(
        { city, email, source: input.source || 'coming_soon' },
        { onConflict: 'city,email', ignoreDuplicates: true }
      )

    if (error) {
      console.error('joinWaitlist insert error:', error)
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    return { success: true }
  } catch (err) {
    console.error('joinWaitlist unexpected error:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
