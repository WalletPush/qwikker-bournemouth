import { createAdminClient } from '@/lib/supabase/admin'

export default async function CleanupAuthPage() {
  const supabaseAdmin = createAdminClient()
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Auth Cleanup</h1>
          <div className="bg-red-100 p-4 rounded-lg">
            <p className="text-red-700">Error fetching users: {authError.message}</p>
          </div>
        </div>
      )
    }
    
    // Get all business profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('user_id, email, business_name')
    
    if (profileError) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Auth Cleanup</h1>
          <div className="bg-red-100 p-4 rounded-lg">
            <p className="text-red-700">Error fetching profiles: {profileError.message}</p>
          </div>
        </div>
      )
    }
    
    // Find orphaned auth users (users without profiles)
    const profileUserIds = new Set(profiles?.map(p => p.user_id) || [])
    const orphanedUsers = authUsers.users.filter(user => !profileUserIds.has(user.id))
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Auth Users vs Business Profiles</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auth Users */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-800 mb-3">Auth Users ({authUsers.users.length})</h2>
            <div className="space-y-2">
              {authUsers.users.map(user => (
                <div key={user.id} className="bg-white p-2 rounded border">
                  <p className="font-medium">{user.email}</p>
                  <p className="text-xs text-gray-500">{user.id}</p>
                  <p className="text-xs text-gray-500">Created: {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Business Profiles */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800 mb-3">Business Profiles ({profiles?.length || 0})</h2>
            <div className="space-y-2">
              {profiles?.map(profile => (
                <div key={profile.user_id} className="bg-white p-2 rounded border">
                  <p className="font-medium">{profile.email}</p>
                  <p className="text-sm text-gray-600">{profile.business_name}</p>
                  <p className="text-xs text-gray-500">{profile.user_id}</p>
                </div>
              )) || <p className="text-gray-500">No profiles found</p>}
            </div>
          </div>
        </div>
        
        {/* Orphaned Users */}
        {orphanedUsers.length > 0 && (
          <div className="mt-6 bg-red-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800 mb-3">
              🚨 Orphaned Auth Users ({orphanedUsers.length})
            </h2>
            <p className="text-red-700 mb-3">
              These users exist in auth but have no business profile:
            </p>
            <div className="space-y-2">
              {orphanedUsers.map(user => (
                <div key={user.id} className="bg-white p-2 rounded border border-red-200">
                  <p className="font-medium text-red-800">{user.email}</p>
                  <p className="text-xs text-red-600">{user.id}</p>
                  <p className="text-xs text-red-600">Created: {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-yellow-100 rounded border border-yellow-300">
              <h3 className="font-semibold text-yellow-800">⚠️ Recommendation:</h3>
              <p className="text-yellow-700 text-sm">
                These orphaned users should be removed to prevent authentication confusion.
                They can cause &quot;empty profile&quot; issues when logging in.
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Next Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Review the orphaned users above</li>
            <li>Confirm they&apos;re from old deployments</li>
            <li>Use Supabase Dashboard to manually delete them from auth.users</li>
            <li>Or create matching business profiles if they should exist</li>
          </ol>
        </div>
      </div>
    )
    
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Auth Cleanup</h1>
        <div className="bg-red-100 p-4 rounded-lg">
          <p className="text-red-700">Unexpected error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }
}
