'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Debug function to see what businesses exist and their data
 */
export async function debugBusinessData() {
  const supabase = createServiceRoleClient()

  try {
    // Get ALL businesses to see what we have
    const { data: allBusinesses, error: allError } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_tier, slug, business_town, status, city')
      .limit(20)

    console.log('🔍 ALL BUSINESSES:', allBusinesses)
    console.log('❌ ALL BUSINESSES ERROR:', allError)

    // Get businesses by status
    const { data: approvedBusinesses, error: approvedError } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_tier, slug, business_town, status, city')
      .eq('status', 'approved')

    console.log('✅ APPROVED BUSINESSES:', approvedBusinesses)
    console.log('❌ APPROVED ERROR:', approvedError)

    // Get businesses by franchise area (Bournemouth covers 3 cities)
    const { data: franchiseBusinesses, error: franchiseError } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_tier, slug, business_town, status, city')
      .in('business_town', ['bournemouth', 'christchurch', 'poole'])

    console.log('🏙️ BOURNEMOUTH FRANCHISE BUSINESSES (all 3 cities):', franchiseBusinesses)
    console.log('❌ FRANCHISE ERROR:', franchiseError)

    // Get businesses by individual cities
    const { data: bournemouthOnly, error: bournemouthError } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_tier, slug, business_town, status, city')
      .eq('business_town', 'bournemouth')

    const { data: christchurchOnly, error: christchurchError } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_tier, slug, business_town, status, city')
      .eq('business_town', 'christchurch')

    const { data: pooleOnly, error: pooleError } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_tier, slug, business_town, status, city')
      .eq('business_town', 'poole')

    console.log('🏙️ BOURNEMOUTH ONLY:', bournemouthOnly)
    console.log('🏙️ CHRISTCHURCH ONLY:', christchurchOnly)
    console.log('🏙️ POOLE ONLY:', pooleOnly)

    return {
      allBusinesses: allBusinesses || [],
      approvedBusinesses: approvedBusinesses || [],
      franchiseBusinesses: franchiseBusinesses || [],
      bournemouthOnly: bournemouthOnly || [],
      christchurchOnly: christchurchOnly || [],
      pooleOnly: pooleOnly || []
    }

  } catch (error) {
    console.error('❌ Debug error:', error)
    return {
      allBusinesses: [],
      approvedBusinesses: [],
      franchiseBusinesses: [],
      bournemouthOnly: [],
      christchurchOnly: [],
      pooleOnly: []
    }
  }
}
