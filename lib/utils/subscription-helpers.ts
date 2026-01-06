/**
 * Subscription and Tier Helper Functions
 * Handles both old and new subscription systems
 */

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface BusinessTierInfo {
  tier: 'free' | 'starter' | 'featured' | 'spotlight'
  displayName: string
  hasAnalyticsAccess: boolean
  hasAdvancedQR: boolean
  hasPushNotifications: boolean
  maxOffers: number
  isInTrial: boolean
  trialEndsAt?: string
}

/**
 * Get comprehensive tier information for a business
 */
export async function getBusinessTierInfo(businessId: string): Promise<BusinessTierInfo> {
  const supabase = createServiceRoleClient()
  
  try {
    // FIRST: Get business profile for individual feature overrides
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('plan, trial_expiry, features')
      .eq('id', businessId)
      .single()
    
    const profileFeatures = (profile?.features as any) || {}
    
    // SECOND: Check the new subscription system
    const { data: subscription } = await supabase
      .from('business_subscriptions')
      .select(`
        *,
        subscription_tiers (
          tier_name,
          tier_display_name,
          features
        )
      `)
      .eq('business_id', businessId)
      .eq('status', 'active')
      .single()

    if (subscription?.subscription_tiers) {
      const tier = subscription.subscription_tiers
      const tierFeatures = tier.features as any || {}
      
      // 🎯 PRIORITY ORDER:
      // 1. Individual feature override from business_profiles.features
      // 2. Tier-based access (spotlight gets all features)
      // 3. Specific tier features from subscription_tiers.features
      
      const hasAnalytics = profileFeatures.analytics === true || 
                          tier.tier_name === 'spotlight' || 
                          tierFeatures.analytics === true || 
                          tierFeatures.analytics_qr_stands === true
      
      const hasPushNotifs = profileFeatures.push_notifications === true || 
                           tier.tier_name === 'spotlight' || 
                           tierFeatures.push_notifications === true
      
      return {
        tier: tier.tier_name as any,
        displayName: tier.tier_display_name,
        hasAnalyticsAccess: hasAnalytics,
        hasAdvancedQR: hasAnalytics, // Same as analytics
        hasPushNotifications: hasPushNotifs,
        maxOffers: tierFeatures.max_offers || 1,
        isInTrial: subscription.is_in_free_trial || false,
        trialEndsAt: subscription.free_trial_end_date
      }
    }

    // Fallback to old system (profiles.plan) - profile is already fetched above
    if (profile) {
      const isInTrial = profile.trial_expiry ? new Date(profile.trial_expiry) > new Date() : false
      
      // Check individual feature overrides FIRST, then tier defaults
      const hasAnalytics = profileFeatures.analytics === true || 
                          profile.plan === 'spotlight' || 
                          profile.plan === 'pro'
      
      const hasPushNotifs = profileFeatures.push_notifications === true || 
                           profile.plan === 'spotlight' || 
                           profile.plan === 'pro'
      
      return {
        tier: profile.plan || 'starter',
        displayName: getTierDisplayName(profile.plan || 'starter'),
        hasAnalyticsAccess: hasAnalytics,
        hasAdvancedQR: hasAnalytics,
        hasPushNotifications: hasPushNotifs,
        maxOffers: getMaxOffers(profile.plan || 'starter'),
        isInTrial,
        trialEndsAt: profile.trial_expiry
      }
    }

    // Default fallback
    return {
      tier: 'starter',
      displayName: 'Starter',
      hasAnalyticsAccess: false,
      hasAdvancedQR: false,
      hasPushNotifications: false,
      maxOffers: 3,
      isInTrial: false
    }

  } catch (error) {
    console.error('Error getting business tier info:', error)
    
    // Return safe defaults
    return {
      tier: 'starter',
      displayName: 'Starter',
      hasAnalyticsAccess: false,
      hasAdvancedQR: false,
      hasPushNotifications: false,
      maxOffers: 3,
      isInTrial: false
    }
  }
}

/**
 * Check if a business has access to a specific feature
 */
export async function hasFeatureAccess(businessId: string, feature: 'analytics' | 'advanced_qr' | 'push_notifications'): Promise<boolean> {
  const tierInfo = await getBusinessTierInfo(businessId)
  
  switch (feature) {
    case 'analytics':
      return tierInfo.hasAnalyticsAccess
    case 'advanced_qr':
      return tierInfo.hasAdvancedQR
    case 'push_notifications':
      return tierInfo.hasPushNotifications
    default:
      return false
  }
}

/**
 * Get tier display name from tier code
 */
function getTierDisplayName(tier: string): string {
  const names: Record<string, string> = {
    'free': 'Free Trial',
    'starter': 'Starter',
    'featured': 'Featured',
    'spotlight': 'Spotlight',
    'pro': 'Pro'
  }
  return names[tier] || 'Starter'
}

/**
 * Get max offers for a tier
 */
function getMaxOffers(tier: string): number {
  const limits: Record<string, number> = {
    'free': 1,
    'starter': 3,
    'featured': 5,
    'spotlight': 10,
    'pro': 10
  }
  return limits[tier] || 3
}

/**
 * Upgrade business to Spotlight tier
 */
export async function upgradeToSpotlight(businessId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = createServiceRoleClient()
  
  try {
    // Get Spotlight tier ID
    const { data: spotlightTier } = await supabase
      .from('subscription_tiers')
      .select('id')
      .eq('tier_name', 'spotlight')
      .single()

    if (!spotlightTier) {
      return { success: false, error: 'Spotlight tier not found' }
    }

    // Create or update subscription
    const { error } = await supabase
      .from('business_subscriptions')
      .upsert({
        business_id: businessId,
        tier_id: spotlightTier.id,
        status: 'active',
        subscription_start_date: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        base_price: 89.00,
        billing_cycle: 'monthly'
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
