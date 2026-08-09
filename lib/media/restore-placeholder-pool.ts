import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Restore an unclaimed listing to the generated placeholder pool.
 * Clears hero_media_id / custom URL / legacy image array so pool variants win again.
 * Archives the previous hero asset after the pointer is cleared.
 */
export async function restoreUnclaimedToPlaceholderPool(
  city: string,
  businessId: string
): Promise<{ previousHeroId: string | null }> {
  const supabase = createServiceRoleClient()

  const { data: profile, error } = await supabase
    .from('business_profiles')
    .select('id, status, hero_media_id, city')
    .eq('id', businessId)
    .eq('city', city)
    .single()

  if (error || !profile) {
    throw new Error('Business not found')
  }
  if (profile.status !== 'unclaimed') {
    throw new Error('Only unclaimed listings can restore the placeholder pool')
  }

  const previousHeroId = profile.hero_media_id || null

  // Clear pointer first — archive is blocked while asset is selected hero
  const { error: clearErr } = await supabase
    .from('business_profiles')
    .update({
      hero_media_id: null,
      placeholder_custom_url: null,
      business_images: [],
    })
    .eq('id', businessId)
    .eq('city', city)

  if (clearErr) throw new Error(clearErr.message)

  if (previousHeroId) {
    const { error: archErr } = await supabase
      .from('media_assets')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .eq('id', previousHeroId)
      .eq('city', city)
      .eq('business_id', businessId)

    if (archErr) {
      console.warn('[restore-placeholder-pool] archive previous hero failed:', archErr.message)
    }
  }

  return { previousHeroId }
}
