'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function WalletPassUpdatePage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ success: boolean; message: string; updated?: number } | null>(null);
  const [error, setError] = useState<string>('');

  const updateExistingPasses = async () => {
    setIsUpdating(true);
    setError('');
    setUpdateResult(null);

    try {
      const response = await fetch('/api/wallet/update-existing-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setUpdateResult(data);
      } else {
        setError(data.error || 'Failed to update passes');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error updating passes:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🎫 Wallet Pass Management
          </h1>
          <p className="text-slate-400">
            Update all existing wallet passes with Phase 2 demo access
          </p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              Add Phase 2 Demo Link to Existing Passes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-2">What this does:</h3>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>• Adds &quot;🚀 QWIKKER PHASE 2 DEMO&quot; link to ALL existing wallet passes</li>
                <li>• Users will see the new link on the back of their pass</li>
                <li>• Link directs to password gate page for Phase 2 access</li>
                <li>• No reinstall required - updates happen automatically</li>
              </ul>
            </div>

            {/* Warning */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <h3 className="text-orange-400 font-semibold mb-2">⚠️ Important:</h3>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>• This will update ALL passes in your WalletPush template</li>
                <li>• Changes are immediate and cannot be easily reversed</li>
                <li>• Test with a few passes first if possible</li>
              </ul>
            </div>

            {/* Update Button */}
            <Button
              onClick={updateExistingPasses}
              disabled={isUpdating}
              className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold py-3 text-lg"
            >
              {isUpdating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating All Passes...
                </span>
              ) : (
                '🚀 Update All Existing Passes'
              )}
            </Button>

            {/* Results */}
            {updateResult && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h3 className="text-green-400 font-semibold mb-2">✅ Success!</h3>
                <div className="text-slate-300 text-sm space-y-1">
                  <p>• {updateResult.message}</p>
                  <p>• Updated passes: {updateResult.updatedPasses}</p>
                  <p>• Users will see the new link within minutes</p>
                </div>
                {updateResult.details && (
                  <details className="mt-3">
                    <summary className="text-slate-400 text-xs cursor-pointer">View technical details</summary>
                    <pre className="text-xs text-slate-500 mt-2 bg-slate-900/50 p-2 rounded overflow-auto">
                      {JSON.stringify(updateResult.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <h3 className="text-red-400 font-semibold mb-2">❌ Error</h3>
                <p className="text-slate-300 text-sm">{error}</p>
              </div>
            )}

            {/* Environment Info */}
            <div className="text-xs text-slate-500 space-y-1">
              <p>Environment: {typeof window !== 'undefined' ? 'client' : 'server'}</p>
              <p>App URL: http://localhost:3001 (local testing)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
