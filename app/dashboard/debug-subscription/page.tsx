import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DebugSubscriptionPage() {
  const supabase = await createClient()
  
  const { data, error: authError } = await supabase.auth.getUser()
  
  if (authError || !data?.user) {
    redirect('/signin')
  }

  // Get profile
  const { data: profile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .single()

  // Get subscription with tier info
  const { data: subscription } = await supabase
    .from('business_subscriptions')
    .select(`
      *,
      subscription_tiers (
        id,
        tier_name,
        tier_display_name,
        features
      )
    `)
    .eq('business_id', data.user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Subscription Debug</h1>
        
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-blue-400">Profile Info</h2>
            <div className="space-y-2 font-mono text-sm">
              <div><span className="text-slate-400">Business Name:</span> <span className="text-white">{profile?.business_name}</span></div>
              <div><span className="text-slate-400">User ID:</span> <span className="text-white">{data.user.id}</span></div>
              <div><span className="text-slate-400">Profile ID:</span> <span className="text-white">{profile?.id}</span></div>
              <div><span className="text-slate-400">Legacy Plan:</span> <span className="text-white">{profile?.plan || 'null'}</span></div>
            </div>
          </div>

          {/* Subscription Data */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-purple-400">Subscription Data</h2>
            {subscription ? (
              <div className="space-y-2 font-mono text-sm">
                <div><span className="text-slate-400">Subscription ID:</span> <span className="text-white">{subscription.id}</span></div>
                <div><span className="text-slate-400">Status:</span> <span className="text-white">{subscription.status}</span></div>
                <div><span className="text-slate-400">Is In Free Trial:</span> <span className={subscription.is_in_free_trial ? 'text-blue-400' : 'text-white'}>{subscription.is_in_free_trial ? 'YES' : 'NO'}</span></div>
                <div><span className="text-slate-400">Tier Name:</span> <span className="text-amber-400 font-bold">{subscription.tier_name}</span></div>
                <div><span className="text-slate-400">Tier Display Name:</span> <span className="text-white">{subscription.tier_display_name}</span></div>
                <div><span className="text-slate-400">Updated At:</span> <span className="text-white">{new Date(subscription.updated_at).toLocaleString()}</span></div>
              </div>
            ) : (
              <p className="text-red-400">❌ NO SUBSCRIPTION FOUND</p>
            )}
          </div>

          {/* Subscription Tiers Table */}
          {subscription?.subscription_tiers && (
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold mb-4 text-amber-400">Tier Details</h2>
              <div className="space-y-2 font-mono text-sm">
                <div><span className="text-slate-400">Tier Name:</span> <span className="text-white">{subscription.subscription_tiers.tier_name}</span></div>
                <div><span className="text-slate-400">Display Name:</span> <span className="text-white">{subscription.subscription_tiers.tier_display_name}</span></div>
                <div><span className="text-slate-400">Features:</span> 
                  <pre className="text-white mt-2 bg-slate-950 p-3 rounded overflow-x-auto">
                    {JSON.stringify(subscription.subscription_tiers.features, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Feature Check */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-green-400">Feature Unlock Check</h2>
            <div className="space-y-2 font-mono text-sm">
              <div><span className="text-slate-400">Tier Name Check:</span> <span className="text-white">{subscription?.subscription_tiers?.tier_name || 'null'}</span></div>
              <div><span className="text-slate-400">Is Spotlight?:</span> <span className={subscription?.subscription_tiers?.tier_name === 'spotlight' ? 'text-green-400 font-bold' : 'text-red-400'}>{subscription?.subscription_tiers?.tier_name === 'spotlight' ? '✅ YES' : '❌ NO'}</span></div>
              <div><span className="text-slate-400">Should Unlock Features?:</span> <span className={subscription?.subscription_tiers?.tier_name === 'spotlight' ? 'text-green-400 font-bold' : 'text-red-400'}>{subscription?.subscription_tiers?.tier_name === 'spotlight' ? '✅ YES - ALL PREMIUM FEATURES UNLOCKED' : '❌ NO - FEATURES LOCKED'}</span></div>
            </div>
          </div>

          {/* Raw JSON */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-slate-400">Raw Subscription JSON</h2>
            <pre className="text-xs text-white bg-slate-950 p-4 rounded overflow-x-auto">
              {JSON.stringify(subscription, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

