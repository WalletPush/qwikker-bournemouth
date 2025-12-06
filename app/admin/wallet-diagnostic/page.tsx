import { createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function WalletDiagnosticPage() {
  const supabase = createServiceRoleClient()

  // Fetch all users
  const { data: users, error } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">Wallet Pass Diagnostic</h1>
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
            <p className="text-white">Error loading users: {error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🔍 Wallet Pass Diagnostic</h1>
          <p className="text-slate-400">Check wallet pass user creation and status</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{users?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400">Active Passes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">
                {users?.filter(u => u.wallet_pass_status === 'active').length || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400">Pending Passes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-400">
                {users?.filter(u => u.wallet_pass_status === 'pending').length || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400">Missing Names</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-400">
                {users?.filter(u => !u.name || u.name === 'New Qwikker User').length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Users (Last 20)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users?.map((user) => (
                <div 
                  key={user.id} 
                  className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {user.name || '❌ NO NAME'}
                        </h3>
                        {user.wallet_pass_status === 'active' ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                            Active
                          </Badge>
                        ) : user.wallet_pass_status === 'pending' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                            Pending
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/50">
                            {user.wallet_pass_status || 'No Status'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{user.email || 'No email'}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(user.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Wallet Pass ID:</span>
                      <p className="text-white font-mono text-xs break-all">
                        {user.wallet_pass_id || '❌ Missing'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">City:</span>
                      <p className="text-white">{user.city || '❌ Missing'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tier/Level:</span>
                      <p className="text-white">{user.tier || 'explorer'} - Level {user.level || 1}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">GHL Contact ID:</span>
                      <p className="text-white font-mono text-xs">
                        {user.ghl_contact_id || '❌ Missing'}
                      </p>
                    </div>
                  </div>

                  {/* Shortlink Test */}
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <span className="text-slate-500 text-sm">Test Links:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {user.wallet_pass_id && (
                        <>
                          <a
                            href={`/user/dashboard?wallet_pass_id=${user.wallet_pass_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-[#00d083] text-black px-3 py-1 rounded hover:bg-[#00b86f] transition-colors"
                          >
                            Dashboard
                          </a>
                          <a
                            href={`/user/chat?wallet_pass_id=${user.wallet_pass_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600 transition-colors"
                          >
                            Chat
                          </a>
                          <a
                            href={`/user/discover?wallet_pass_id=${user.wallet_pass_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                          >
                            Discover
                          </a>
                          {user.wallet_pass_id.length > 8 && (
                            <a
                              href={`/s/${user.wallet_pass_id.slice(-8)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors"
                            >
                              Shortlink (last 8)
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Issues */}
                  {(!user.name || user.name === 'New Qwikker User' || user.wallet_pass_status !== 'active') && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <p className="text-sm font-semibold text-red-400 mb-1">⚠️ Issues Found:</p>
                      <ul className="text-xs text-slate-300 space-y-1">
                        {(!user.name || user.name === 'New Qwikker User') && (
                          <li>• Name is missing or default - WalletPush template needs configuration</li>
                        )}
                        {user.wallet_pass_status !== 'active' && (
                          <li>• Pass status is "{user.wallet_pass_status}" instead of "active"</li>
                        )}
                        {!user.ghl_contact_id && (
                          <li>• GHL Contact ID missing - user might not be synced with GHL</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}

              {users?.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p>No users found in database</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-slate-800 border-slate-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white">🔧 How to Fix Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div>
              <h4 className="font-semibold text-white mb-2">1. Name Not Showing on Pass</h4>
              <p className="text-slate-400">
                The WalletPush template needs to be configured with dynamic fields. In your WalletPush dashboard:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Edit your template</li>
                <li>Set "Card Holder Name" field to use the <code className="text-[#00d083]">name</code> variable</li>
                <li>Add fields like: <code className="text-[#00d083]">{'{{name}}'}</code>, <code className="text-[#00d083]">{'{{email}}'}</code></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">2. Status is "Pending"</h4>
              <p className="text-slate-400">
                The GHL webhook is creating users with <code>wallet_pass_status: 'pending'</code>. 
                Check <code>/app/api/ghl-webhook/user-creation/route.ts</code> and ensure it sets <code>wallet_pass_status: 'active'</code>.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">3. Links Redirect to Login</h4>
              <p className="text-slate-400">
                Check your wallet pass template links. They should use the shortlink format:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li><code className="text-[#00d083]">https://qwikkerdashboard-theta.vercel.app/s/{'{{last_8_of_pass_id}}'}</code></li>
                <li><code className="text-[#00d083]">https://qwikkerdashboard-theta.vercel.app/c/{'{{last_8_of_pass_id}}'}</code> (for chat)</li>
              </ul>
              <p className="mt-2 text-slate-400">
                DO NOT use <code>/dashboard</code> - that's for business owners and requires Supabase auth!
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">4. Test the Links Above</h4>
              <p className="text-slate-400">
                Click the test buttons for each user to verify they work without login.
                If they redirect to login, the middleware or route configuration needs adjustment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

