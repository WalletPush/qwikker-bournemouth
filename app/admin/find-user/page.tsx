import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { AdminToolsLayout } from '@/components/admin/admin-tools-layout'

export default async function FindUserPage() {
  const supabaseAdmin = createAdminClient()

  try {
    // Get all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      throw authError
    }

    // Get all business profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profileError) {
      throw profileError
    }

    // Match auth users with profiles
    const usersWithProfiles = authData.users.map(authUser => {
      const profile = profiles?.find(p => p.user_id === authUser.id)
      return {
        authUser,
        profile,
        emailMismatch: authUser.email !== profile?.email
      }
    })

    // Separate users with email mismatches
    const mismatchedUsers = usersWithProfiles.filter(u => u.emailMismatch && u.profile)
    const normalUsers = usersWithProfiles.filter(u => !u.emailMismatch && u.profile)

    return (
      <AdminToolsLayout>
        <div className="p-8">
          <div className="max-w-7xl mx-auto space-y-6">

          {/* Email Mismatches - PRIORITY */}
          {mismatchedUsers.length > 0 && (
            <div className="bg-red-950/30 border-2 border-red-500/50 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-400">⚠️ Email Mismatches Found!</h2>
                  <p className="text-red-300/80 text-sm">
                    These users have different emails in auth vs profile (potential lockout!)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {mismatchedUsers.map(({ authUser, profile }) => (
                  <div key={authUser.id} className="bg-slate-900/80 border-2 border-red-500/30 rounded-xl p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Business Info */}
                      <div>
                        <h3 className="text-xl font-bold text-white mb-3">
                          {profile?.business_name || 'Unknown Business'}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-slate-500">Status:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                              profile?.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              profile?.status === 'incomplete' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {profile?.status || 'Unknown'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Name:</span>
                            <span className="ml-2 text-white">{profile?.first_name} {profile?.last_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Phone:</span>
                            <span className="ml-2 text-white">{profile?.phone || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Created:</span>
                            <span className="ml-2 text-white">
                              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Email Info */}
                      <div>
                        <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-4 space-y-3">
                          <div>
                            <div className="text-red-400 font-semibold text-xs uppercase tracking-wider mb-1">
                              🔐 Auth Email (Login):
                            </div>
                            <div className="font-mono text-white bg-slate-900/50 px-3 py-2 rounded border border-slate-700">
                              {authUser.email}
                            </div>
                          </div>

                          <div>
                            <div className="text-orange-400 font-semibold text-xs uppercase tracking-wider mb-1">
                              📧 Profile Email:
                            </div>
                            <div className="font-mono text-white bg-slate-900/50 px-3 py-2 rounded border border-slate-700">
                              {profile?.email}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-red-500/30">
                            <div className="text-red-300 font-semibold text-xs uppercase tracking-wider mb-1">
                              🆔 User ID:
                            </div>
                            <div className="font-mono text-xs text-slate-400 bg-slate-900/50 px-3 py-2 rounded border border-slate-700 break-all">
                              {authUser.id}
                            </div>
                          </div>
                        </div>

                        <Link 
                          href={`/admin/emergency-email-fix?userId=${authUser.id}&oldEmail=${encodeURIComponent(authUser.email || '')}&newEmail=${encodeURIComponent(profile?.email || '')}`}
                          className="mt-3 block"
                        >
                          <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-all">
                            🚨 Fix This Email Mismatch
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Users Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">All Users ({normalUsers.length})</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Business</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Created</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {normalUsers.map(({ authUser, profile }) => (
                    <tr key={authUser.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-white font-medium">
                        {profile?.business_name || <span className="text-slate-500">No profile</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {profile?.first_name} {profile?.last_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 text-xs">
                        {authUser.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          profile?.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          profile?.status === 'incomplete' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {profile?.status || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-xs">
                        {authUser.id.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-4">
            <Link 
              href="/admin/emergency-email-fix"
              className="flex-1"
            >
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
                🔧 Manual Email Fix Tool
              </button>
            </Link>
            <Link 
              href="/admin"
              className="flex-1"
            >
              <button className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-all">
                ← Back to Admin Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <AdminToolsLayout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-950/50 border-2 border-red-500 rounded-2xl p-6">
              <h1 className="text-2xl font-bold text-red-400 mb-2">Error</h1>
              <p className="text-red-300">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
            </div>
          </div>
        </div>
      </AdminToolsLayout>
    )
  }
}

