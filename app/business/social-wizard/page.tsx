/**
 * SOCIAL WIZARD v1 — MAIN PAGE
 * /business/social-wizard
 * 
 * Full-screen "Creative War Room" for AI social content generation
 * CREATION + EXPORT ONLY (no publishing)
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessSocialWizard } from '@/lib/social-wizard/featureFlags'
import { SocialWizardShell } from './_components/SocialWizardShell'
import { StarterLockedView } from './_components/StarterLockedView'

export default async function SocialWizardPage() {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's business via business_user_roles (supports multi-user access)
  const { data: membership, error: membershipError } = await supabase
    .from('business_user_roles')
    .select('business_id, role')
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
        <div className="text-center max-w-2xl">
          <h1 className="text-2xl font-bold mb-4">Setup Required</h1>
          <p className="text-neutral-400 mb-4">
            The business_user_roles table hasn't been set up yet.
          </p>
          <div className="bg-neutral-900 p-4 rounded-lg text-left text-sm">
            <p className="text-red-400 mb-2">Error: {membershipError?.message || 'No membership found'}</p>
            <p className="text-neutral-500">
              Run migration: <code className="text-cyan-400">20260204000000_create_business_user_roles.sql</code>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Get business details
  const { data: business, error: businessError } = await supabase
    .from('business_profiles')
    .select('id, business_name, plan')
    .eq('id', membership.business_id)
    .single()

  if (businessError || !business) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
        <div className="text-center max-w-2xl">
          <h1 className="text-2xl font-bold mb-4">Business Not Found</h1>
          <p className="text-red-400 text-sm">Error: {businessError?.message || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Business Found</h1>
          <p className="text-neutral-400">You must be a member of a business to access Social Wizard.</p>
        </div>
      </div>
    )
  }

  const tier = business.plan || 'starter'

  // Tier gate: Starter users see locked view
  if (!canAccessSocialWizard(tier)) {
    return <StarterLockedView businessName={business.business_name} />
  }

  // Featured/Spotlight: show full wizard
  return (
    <SocialWizardShell
      businessId={business.id}
      businessName={business.business_name}
      tier={tier}
    />
  )
}
