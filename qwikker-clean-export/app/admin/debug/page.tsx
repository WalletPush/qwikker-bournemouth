import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminDebugPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }
  
  // Fetch ALL profiles to debug
  const { data: allProfiles, error: profileError } = await supabase
    .from('business_profiles')
    .select(`
      id,
      user_id,
      email,
      first_name,
      last_name,
      business_name,
      business_category,
      business_town,
      status,
      created_at
    `)
    .order('created_at', { ascending: false })
  
  if (profileError) {
    console.error('Error fetching profiles:', profileError)
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Admin Debug - All Profiles</h1>
          <p className="text-gray-400">Showing all profiles in the database</p>
        </div>
        
        {allProfiles && allProfiles.length > 0 ? (
          <div className="space-y-4">
            {allProfiles.map((profile) => (
              <div key={profile.id} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <p className="text-white font-medium">
                      {profile.first_name} {profile.last_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <p className="text-white font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Business:</span>
                    <p className="text-white font-medium">
                      {profile.business_name || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <p className={`font-medium ${
                      profile.status === 'approved' ? 'text-emerald-400' :
                      profile.status === 'pending_review' ? 'text-orange-400' :
                      profile.status === 'incomplete' ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      {profile.status || 'No status'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Category:</span>
                    <p className="text-white font-medium">
                      {profile.business_category || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Town:</span>
                    <p className="text-white font-medium">
                      {profile.business_town || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <p className="text-white font-medium">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">User ID:</span>
                    <p className="text-xs text-gray-500 font-mono">
                      {profile.user_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No profiles found in database</p>
            {profileError && (
              <p className="text-red-400 mt-2">Error: {profileError.message}</p>
            )}
          </div>
        )}
        
        <div className="mt-8 p-4 bg-slate-800/30 rounded-xl border border-slate-600">
          <h3 className="font-semibold text-white mb-2">Debug Info:</h3>
          <p className="text-sm text-gray-400">
            Total profiles: {allProfiles?.length || 0}
          </p>
          <p className="text-sm text-gray-400">
            Current user: {user.email}
          </p>
        </div>
        
        <div className="mt-4">
          <a 
            href="/admin" 
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            ← Back to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

