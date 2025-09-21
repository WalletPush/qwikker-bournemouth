'use client';

import { usePWA } from './pwa-provider';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'card';
}

export function PWAInstallButton({ className = "", variant = 'button' }: PWAInstallButtonProps) {
  const { installPWA, isInstalled, isSupported } = usePWA();

  // Only hide if actually installed (ignore support check for now)
  if (isInstalled) {
    return null;
  }

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
            <h3 className="text-white font-semibold mb-1">Add Qwikker to Home Screen</h3>
            <p className="text-slate-400 text-sm mb-3">
              App-like experience, no downloads needed
            </p>
            <button
              onClick={() => {
                console.log('🎯 PWA Install Button clicked!');
                try {
                  installPWA();
                } catch (error) {
                  console.error('❌ Error calling installPWA:', error);
                  // Show elegant error instead of alert
                  const toast = document.createElement('div')
                  toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full'
                  toast.innerHTML = `
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      <span class="font-medium">Installation not available</span>
                    </div>
                  `
                  document.body.appendChild(toast)
                  setTimeout(() => toast.classList.remove('translate-x-full'), 100)
                  setTimeout(() => {
                    toast.classList.add('translate-x-full')
                    setTimeout(() => document.body.removeChild(toast), 300)
                  }, 3000)
                }
              }}
              className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold px-4 py-2.5 rounded-lg transition-all duration-200 text-sm touch-manipulation min-h-[44px] w-full sm:w-auto hover:shadow-lg hover:shadow-[#00d083]/20"
            >
              Add to Home Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        console.log('🎯 PWA Install Button clicked! (regular variant)');
        try {
          installPWA();
        } catch (error) {
          console.error('❌ Error calling installPWA:', error);
          // Show elegant error instead of alert
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full'
          toast.innerHTML = `
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              <span class="font-medium">Installation not available</span>
            </div>
          `
          document.body.appendChild(toast)
          setTimeout(() => toast.classList.remove('translate-x-full'), 100)
          setTimeout(() => {
            toast.classList.add('translate-x-full')
            setTimeout(() => document.body.removeChild(toast), 300)
          }, 3000)
        }
      }}
      className={`bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold px-4 py-2.5 rounded-lg transition-all duration-200 touch-manipulation min-h-[44px] hover:shadow-lg hover:shadow-[#00d083]/20 ${className}`}
    >
      Add to Home Screen
    </button>
  );
}
