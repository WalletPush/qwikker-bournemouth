import { headers } from 'next/headers'
import { SimplifiedOnboardingForm } from '@/components/simplified-onboarding-form'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentLocation } from '@/lib/utils/location-detection'

interface OnboardingPageProps {
  searchParams: Promise<{ ref?: string; location?: string }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams
  const referralCode = params.ref || null

  const headersList = await headers()
  const hostname = headersList.get('host') || 'localhost:3000'
  const locationInfo = await getCurrentLocation(hostname, process.env.DEV_LOCATION_OVERRIDE, params.location || undefined)

  const supabase = createAdminClient()
  const { data: franchiseConfig } = await supabase
    .from('franchise_crm_configs')
    .select('default_trial_tier, founding_member_trial_days')
    .eq('city', locationInfo.city)
    .single()

  return (
    <SimplifiedOnboardingForm
      referralCode={referralCode}
      trialConfig={{
        trialTier: franchiseConfig?.default_trial_tier || 'featured',
        trialDays: franchiseConfig?.founding_member_trial_days || 90,
      }}
    />
  )
}
