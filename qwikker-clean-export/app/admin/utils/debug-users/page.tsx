import { getAppUsers } from '@/lib/actions/user-member-actions'

export default async function DebugAppUsersPage() {
  const result = await getAppUsers()
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug: App Users Table</h1>
        
        {result.success ? (
          <div>
            <p className="mb-4 text-green-400">
              ✅ Successfully fetched user members. Count: {result.data?.length || 0}
            </p>
            
            {result.data && result.data.length > 0 ? (
              <div className="space-y-4">
                {result.data.map((user: any) => (
                  <div key={user.id} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-slate-400 text-sm">ID</p>
                        <p className="font-mono text-sm">{user.id}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Name</p>
                        <p>{user.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Email</p>
                        <p>{user.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">City</p>
                        <p>{user.city}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Level</p>
                        <p>{user.level}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Total Points</p>
                        <p>{user.total_points}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Tier</p>
                        <p className="capitalize">{user.tier}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Referral Code</p>
                        <p className="font-mono text-sm">{user.referral_code}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Wallet Pass Status</p>
                        <p className="capitalize">{user.wallet_pass_status}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Joined Date</p>
                        <p className="text-sm">{new Date(user.joined_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Profile Complete</p>
                        <p>{user.profile_completion_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Onboarding</p>
                        <p>{user.onboarding_completed ? '✅ Complete' : '❌ Incomplete'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Stats</p>
                        <pre className="bg-slate-900 p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(user.stats, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Notification Preferences</p>
                        <pre className="bg-slate-900 p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(user.notification_preferences, null, 2)}
                        </pre>
                      </div>
                    </div>
                    
                    {user.badges && user.badges.length > 0 && (
                      <div className="mt-4">
                        <p className="text-slate-400 text-sm mb-2">Badges ({user.badges.length})</p>
                        <pre className="bg-slate-900 p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(user.badges, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
                <p className="text-slate-400 text-lg">No user members found in the database.</p>
                <p className="text-slate-500 text-sm mt-2">
                  User members will be automatically created when users sign up for the app.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg">
            <p className="text-red-400 font-semibold">❌ Error fetching user members</p>
            <p className="text-red-300 mt-2">{result.error}</p>
          </div>
        )}
        
        <div className="mt-8 bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold mb-4">Database Schema Info</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-400">Table:</span> user_members</p>
            <p><span className="text-slate-400">Purpose:</span> Store profiles for people who use the Qwikker app (not businesses)</p>
            <p><span className="text-slate-400">Auto-created:</span> When users sign up via auth trigger</p>
            <p><span className="text-slate-400">Gamification:</span> Points, levels, tiers, badges, streaks</p>
            <p><span className="text-slate-400">Wallet Pass:</span> wallet_pass_id for Apple/Google Wallet integration</p>
          </div>
        </div>
      </div>
    </div>
  )
}
