import type { SupabaseClient } from '@supabase/supabase-js'
import type { LoyaltyBusinessPassSource } from '@/lib/loyalty/loyalty-utils'

/**
 * Load business contact/location fields for WalletPush loyalty pass issue.
 */
export async function loadLoyaltyBusinessForPass(
  serviceRole: SupabaseClient,
  businessId: string
): Promise<LoyaltyBusinessPassSource | null> {
  const { data, error } = await serviceRole
    .from('business_profiles')
    .select(
      'business_name, phone, business_address, business_town, business_postcode, google_place_id'
    )
    .eq('id', businessId)
    .maybeSingle()

  if (error) {
    console.error('[loyalty] loadLoyaltyBusinessForPass failed:', error.message)
    return null
  }

  return data
}
