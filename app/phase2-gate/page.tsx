'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function Phase2GateContent() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const walletPassId = searchParams.get('wallet_pass_id');

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password === 'Admin123') {
      // Redirect to Phase 2 dashboard with wallet pass ID
      const dashboardUrl = walletPassId 
        ? `/user/dashboard?wallet_pass_id=${walletPassId}`
        : '/user/dashboard';
      
      router.push(dashboardUrl);
    } else {
      setError('Incorrect password. Contact admin for access.');
      setIsLoading(false);
    }
  };

  const handleCurrentQwikker = () => {
    // Redirect to WalletPush AI companion with user ID
    const aiUrl = walletPassId 
      ? `https://app.walletpush.io/ai/21?ID=${encodeURIComponent(walletPassId)}`
      : 'https://app.walletpush.io/ai/21';
    window.location.href = aiUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-white mb-2">
              <span className="text-[#00d083]">Q</span>wikker
            </div>
            <div className="text-slate-400 text-sm font-medium">
              BOURNEMOUTH
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              🚀 Phase 2 Demo Access
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              We&apos;re testing the next version of Qwikker Bournemouth. 
              Enter the admin password to access the new dashboard.
            </p>
          </div>

          {/* Password Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4 mb-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin Password"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d083] focus:border-transparent transition-all"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Accessing Dashboard...
                </span>
              ) : (
                '🚀 Access Phase 2 Dashboard'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-slate-800 text-slate-400">OR</span>
            </div>
          </div>

          {/* Current Qwikker Button */}
          <button
            onClick={handleCurrentQwikker}
            className="w-full bg-transparent border border-[#00d083] text-[#00d083] hover:bg-[#00d083] hover:text-black font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            🤖 Use Current Qwikker AI
          </button>

          {/* Footer */}
          <div className="text-center mt-6 text-xs text-slate-500">
            <p>Phase 2 testing • Admin access only</p>
            <p className="mt-1">Need help? Contact support</p>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="text-center mt-6 text-slate-500 text-xs">
          <p>🎫 Wallet Pass ID: {walletPassId ? `...${walletPassId.slice(-8)}` : 'Not provided'}</p>
        </div>
      </div>
    </div>
  );
}

export default function Phase2GatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <Phase2GateContent />
    </Suspense>
  );
}
