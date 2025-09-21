'use client';

import { usePWA } from './pwa-provider';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'card';
}

export function PWAInstallButton({ className = "", variant = 'button' }: PWAInstallButtonProps) {
  const { installPWA, isInstalled, isSupported } = usePWA();

  console.log('🎯 PWA Install Button:', { isInstalled, isSupported, variant });

  if (isInstalled || !isSupported) {
    console.log('❌ PWA Install Button hidden:', { isInstalled, isSupported });
    return null;
  }

  console.log('✅ PWA Install Button showing');

  // Always show for debugging
  // if (isInstalled || !isSupported) {
  //   return null;
  // }

  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-r from-[#00d083]/10 to-[#00b86f]/10 border border-[#00d083]/20 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Add to Home Screen</h3>
            <p className="text-slate-400 text-sm mb-3">
              Get app-like access to your Qwikker dashboard
            </p>
            <button
              onClick={installPWA}
              className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-medium px-4 py-2 rounded-lg transition-all duration-200 text-sm"
            >
              Click here to add Qwikker to your home screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={installPWA}
      className={`bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-medium px-4 py-2 rounded-lg transition-all duration-200 ${className}`}
    >
      Add to Home Screen
    </button>
  );
}
