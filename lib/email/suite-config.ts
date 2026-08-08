import { createAdminClient } from '@/lib/supabase/admin'
import { getTierFeatures } from '@/lib/utils/tier-limits'

export async function isCityEmailConfigured(city: string): Promise<{
  configured: boolean
  fromEmail: string | null
  fromName: string | null
}> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('franchise_crm_configs')
      .select('resend_api_key, resend_from_email, resend_from_name')
      .eq('city', city.toLowerCase())
      .maybeSingle()

    const configured = Boolean(data?.resend_api_key && data?.resend_from_email)
    return {
      configured,
      fromEmail: configured ? `no-reply@${city.toLowerCase()}.qwikker.com` : null,
      fromName: data?.resend_from_name || (configured ? 'QWIKKER' : null),
    }
  } catch {
    return { configured: false, fromEmail: null, fromName: null }
  }
}

/** Trial tier + days for free→trial nudge emails — from City Configuration. */
export async function getFranchiseTrialEmailDefaults(city: string): Promise<{
  trialTierCode: string
  trialTierDisplayName: string
  trialDays: number
  features: string[]
}> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('franchise_crm_configs')
      .select('default_trial_tier, founding_member_trial_days')
      .eq('city', city.toLowerCase())
      .maybeSingle()

    const trialTierCode = (data?.default_trial_tier || 'featured').toLowerCase()
    const trialDays = data?.founding_member_trial_days || 30
    return {
      trialTierCode,
      trialTierDisplayName: trialTierCode.charAt(0).toUpperCase() + trialTierCode.slice(1),
      trialDays,
      features: getTierFeatures(trialTierCode),
    }
  } catch {
    return {
      trialTierCode: 'featured',
      trialTierDisplayName: 'Featured',
      trialDays: 30,
      features: getTierFeatures('featured'),
    }
  }
}
