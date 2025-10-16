import { createClient } from '@/lib/supabase/server'
import { createMockUserMember } from '@/lib/actions/create-mock-user'
// redirect import removed - not used

export default async function ResetDavidPage() {
  const supabase = await createClient()
  
  try {
    // Delete existing David
    await supabase
      .from('app_users')
      .delete()
      .eq('wallet_pass_id', 'QWIK-BOURNEMOUTH-DAVID-2024')
    
    // Recreate fresh David
    await createMockUserMember() // Result not used
    
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">✅ David Reset Successfully!</h1>
          
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
            <h2 className="text-xl font-semibold text-green-400">Fresh Start for David</h2>
            
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-400">Name:</span> David</p>
              <p><span className="text-slate-400">Level:</span> 1 (Brand New!)</p>
              <p><span className="text-slate-400">Tier:</span> Explorer</p>
              <p><span className="text-slate-400">Points:</span> 0</p>
              <p><span className="text-slate-400">Badges:</span> None (Ready to earn!)</p>
              <p><span className="text-slate-400">Activity:</span> All reset to zero</p>
              <p><span className="text-slate-400">Wallet Pass:</span> QWIK-BOURNEMOUTH-DAVID-2024</p>
            </div>
            
            <div className="pt-4 border-t border-slate-700">
              <h3 className="font-semibold mb-2">Perfect for testing:</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Earning first badges</li>
                <li>• Level progression</li>
                <li>• Points accumulation</li>
                <li>• New user onboarding</li>
                <li>• Achievement unlocks</li>
              </ul>
            </div>
            
            <div className="flex gap-3 pt-4">
              <a 
                href="/user/dashboard" 
                className="bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black px-4 py-2 rounded-lg font-semibold hover:from-[#00b86f] hover:to-[#00a05f] transition-all"
              >
                View Fresh Dashboard
              </a>
              <a 
                href="/debug-user-members" 
                className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition-all"
              >
                Debug User Data
              </a>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700/30 rounded-lg">
            <h3 className="font-semibold text-blue-300 mb-2">🔄 Sharing Behavior:</h3>
            <p className="text-sm text-blue-200">
              <strong>Same User = Shared Progress:</strong> You and your dad will see the SAME David. 
              If one person earns a badge or points, the other will see it too. This is because 
              you&apos;re both using the same wallet pass ID.
            </p>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-red-400 mb-4">❌ Reset Failed</h1>
          <p className="text-slate-300">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }
}
