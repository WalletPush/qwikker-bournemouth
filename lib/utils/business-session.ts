import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface BusinessOwner {
  userId: string
  businessId: string
  city: string
}

/**
 * Verify the current Supabase Auth session owns the given businessId.
 * Returns the authenticated owner info, or null if unauthenticated / not the owner.
 */
export async function verifyBusinessOwner(businessId: string): Promise<BusinessOwner | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const admin = createAdminClient()
    const { data: business } = await admin
      .from('business_profiles')
      .select('id, user_id, city')
      .eq('id', businessId)
      .single()

    if (!business || business.user_id !== user.id) return null

    return {
      userId: user.id,
      businessId: business.id,
      city: business.city,
    }
  } catch {
    return null
  }
}
