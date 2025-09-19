import { createMockUserMember } from '@/lib/actions/create-mock-user'

export default async function InitMockUserPage() {
  const result = await createMockUserMember()
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Initialize Mock User - David</h1>
        
        {result.success ? (
          <div className="bg-green-900/20 border border-green-500/50 p-6 rounded-lg">
            <p className="text-green-400 font-semibold text-lg">✅ {result.message}</p>
            {result.walletPassId && (
              <div className="mt-4 space-y-2">
                <p className="text-slate-300">
                  <span className="text-slate-400">Wallet Pass ID:</span> {result.walletPassId}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Email:</span> david@qwikker.com (demo only)
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Auth Method:</span> Wallet Pass (NO PASSWORD!)
                </p>
              </div>
            )}
            
            <div className="mt-6 space-y-3">
              <h3 className="text-xl font-semibold text-green-300">Mock User Details:</h3>
              <ul className="text-slate-300 space-y-1">
                <li>• Name: David</li>
                <li>• Points: 1,250</li>
                <li>• Level: 3 (Insider)</li>
                <li>• Tier: insider</li>
                <li>• Referral Code: DAVID-QWK-2024</li>
                <li>• Wallet Pass ID: QWIK-BOURNEMOUTH-DAVID-2024</li>
                <li>• Wallet Pass Status: Active</li>
                <li>• Authentication: Wallet Pass (no login required)</li>
                <li>• Profile: 85% complete</li>
                <li>• Badges: 3 unlocked</li>
                <li>• Points Transactions: 3 created</li>
              </ul>
            </div>

            <div className="mt-8 p-4 bg-slate-800 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-blue-300">Next Steps:</h3>
              <ol className="text-slate-300 space-y-2 list-decimal list-inside">
                <li>Visit <a href="/debug-user-members" className="text-blue-400 underline">/debug-user-members</a> to verify the user was created</li>
                <li>Update user dashboard components to use real data instead of mock data</li>
                <li>Test user dashboard with real database integration</li>
                <li>Deploy to Vercel - everything should work seamlessly!</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg">
            <p className="text-red-400 font-semibold text-lg">❌ Failed to create mock user</p>
            <p className="text-red-300 mt-2">{result.error}</p>
            
            <div className="mt-4 p-4 bg-slate-800 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-yellow-300">Troubleshooting:</h3>
              <ul className="text-slate-300 space-y-1 text-sm">
                <li>• Check that Supabase is connected properly</li>
                <li>• Verify the user_members table exists</li>
                <li>• Check environment variables are set</li>
                <li>• Review the error message above</li>
              </ul>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <a 
            href="/debug-user-members" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Check User Members Table
          </a>
        </div>
      </div>
    </div>
  )
}
