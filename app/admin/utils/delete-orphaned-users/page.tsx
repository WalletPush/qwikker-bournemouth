import { createAdminClient } from '@/lib/supabase/admin'

export default async function DeleteOrphanedUsersPage() {
  const supabaseAdmin = createAdminClient()
  
  const orphanedEmails = [
    'fullspectrumflooring@gmail.com',
    'nuforestbotanicals@gmail.com'
  ]
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Delete Orphaned Users</h1>
          <div className="bg-red-100 p-4 rounded-lg">
            <p className="text-red-700">Error fetching users: {authError.message}</p>
          </div>
        </div>
      )
    }
    
    // Find the orphaned users
    const usersToDelete = authUsers.users.filter(user => 
      orphanedEmails.includes(user.email || '')
    )
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Delete Orphaned Auth Users</h1>
        
        {usersToDelete.length === 0 ? (
          <div className="bg-green-100 p-4 rounded-lg">
            <h2 className="text-green-800 font-semibold">✅ No Orphaned Users Found</h2>
            <p className="text-green-700">All orphaned users have already been cleaned up.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-300">
              <h2 className="text-yellow-800 font-semibold mb-2">⚠️ Users Ready for Deletion</h2>
              <p className="text-yellow-700 text-sm mb-3">
                These users exist in auth but have no business profiles:
              </p>
              <div className="space-y-2">
                {usersToDelete.map(user => (
                  <div key={user.id} className="bg-white p-3 rounded border">
                    <p className="font-medium">{user.email}</p>
                    <p className="text-xs text-gray-500">{user.id}</p>
                    <p className="text-xs text-gray-500">Created: {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-300">
              <h3 className="text-red-800 font-semibold mb-2">🚨 Manual Deletion Required</h3>
              <p className="text-red-700 text-sm mb-3">
                For security reasons, user deletion must be done manually through the Supabase Dashboard:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-red-700">
                <li>Go to <a href="https://supabase.com/dashboard/project/iiiciapavjonpmldytxf/auth/users" target="_blank" className="underline font-medium">Supabase Dashboard → Authentication → Users</a></li>
                <li>Find each user listed above</li>
                <li>Click the &quot;...&quot; menu → &quot;Delete user&quot;</li>
                <li>Confirm deletion</li>
              </ol>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-300">
              <h3 className="text-blue-800 font-semibold mb-2">✅ After Deletion</h3>
              <p className="text-blue-700 text-sm">
                Once deleted, these email addresses can be used for fresh signups that will work correctly with the current database schema.
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <a 
            href="/admin/utils/cleanup-auth" 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            ← Back to Auth Cleanup
          </a>
        </div>
      </div>
    )
    
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Delete Orphaned Users</h1>
        <div className="bg-red-100 p-4 rounded-lg">
          <p className="text-red-700">Unexpected error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }
}
